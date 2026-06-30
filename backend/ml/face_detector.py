import onnxruntime as ort 
import cv2
import numpy as np

from django.conf import settings


opts = ort.SessionOptions()
opts.intra_op_num_threads = 1
opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

class MLBaseException(Exception):
    data:dict = None
    
    def __init__(
        self,message="",data=None):
        self.data = data or {}
        super().__init__(message)
    
class NotFrontLooking(MLBaseException):
    pass

class MultipleFacesFound(MLBaseException):
    pass

class NoFaceFound(MLBaseException):
    pass

class CoveredFace(MLBaseException):
    pass
class GlassesFound(MLBaseException):
    pass

class DarkImageFound(MLBaseException):
    pass

class BlurryImageFound(MLBaseException):
    pass


class FaceDetector:

    MASK_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/mask_detection.onnx',opts, providers=["CPUExecutionProvider"])
    GLASS_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/glass_detection.onnx',opts, providers=["CPUExecutionProvider"])
    FACE_LOCATION_DETECTOR_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/ultra_light_320.onnx', providers=["CPUExecutionProvider"])
    EMBEDDING_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/mobilefacenet.onnx', providers=["CPUExecutionProvider"])
    
    # MAX_YAW_DEGREES = 25     # left/right turn
    # MAX_PITCH_DEGREES = 20   # up/down tilt
    # MAX_ROLL_DEGREES = 20    # head tilt sideways
    INPUT_WIDTH, INPUT_HEIGHT = 320, 240



        
    
    def identify_user(self, photo) -> dict:
        image_bytes = np.frombuffer(
            photo.read() if hasattr(photo, "read") else photo,
            dtype=np.uint8
        )
        
        img = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)
        
        
        faces = self.__class__._predict_all_faces(img)
        print(faces)
        num_faces = len(faces)
        
        if num_faces == 0:
            raise NoFaceFound("No face found")
        
        elif num_faces > 1:
            raise MultipleFacesFound("More than one face found", data={
                "face_location": [
                    face[0]  # Extracts just the coordinate sub-lists safely
                    for face in faces
                ]
            })
        
        # --- FIX: Two-step unpacking execution ---
        face_tuple = faces[0]
        face_location, score = face_tuple  # Unpack tuple into: (list, float)
        x1, y1, x2, y2 = face_location     # Safely unpack the 4 bounding values
        
        # Slice image using clean pixel parameters
        face_crop = img[y1:y2, x1:x2]
        if self.__class__.is_too_dark(face_crop):
            raise DarkImageFound(message='Image is too dark, Please stand in brighter place',data={'face_location': face_location})
        
        if self.__class__.is_too_blurry(face_crop):
            raise BlurryImageFound(message='Image is too blurry. Please clean your camera.',data={'face_location': face_location})
        
        # Class compliance validation checkpoints
        has_glass = self.__class__._has_glasses(face_crop)
        if has_glass:
            raise GlassesFound('Glass is found, Make sure face is clean', data={'face_location': face_location})
            
        has_mask = self.__class__._has_mask(face_crop)
        if has_mask:
            raise CoveredFace('Face is covered, Make sure face is clean', data={'face_location': face_location})
        
        # Calculate raw mathematical feature map vector
        embedding = self.__class__._get_face_embedding(face_crop)
        
        # L2 Vector normalization matching standard database cosine metric comparisons
        embedding = embedding / np.linalg.norm(embedding)
       
        
        return {
            "embedding": embedding,
            "face_location": face_location
        }
        
        
    @classmethod
    def _has_mask(cls,face_crop_np_arr)->bool:
        img = cv2.resize(face_crop_np_arr,(224,224))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        img = img.transpose(2, 0, 1)[np.newaxis]
        out = cls.MASK_MODEL.run(None, {cls.MASK_MODEL.get_inputs()[0].name: img})[0][0]
        e = np.exp(out - out.max())
        probs = e / e.sum()
        top_i = int(np.argmax(probs))
        return top_i == 0 and float(probs[top_i]) >= 0.5
    

    @classmethod
    def _has_glasses(cls,face_crop):
        h, w = face_crop.shape[:2]
        scale = 640 / max(h, w)
        nh, nw = int(h * scale), int(w * scale)
        canvas = np.full((640, 640, 3), 114, dtype=np.uint8)
        pad_y, pad_x = (640 - nh) // 2, (640 - nw) // 2
        canvas[pad_y:pad_y+nh, pad_x:pad_x+nw] = cv2.resize(face_crop, (nw, nh))

        img = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        img = img.transpose(2, 0, 1)[np.newaxis]
        out = cls.GLASS_MODEL.run(None, {cls.GLASS_MODEL.get_inputs()[0].name: img})[0]

        detections = out[0] 
        return any(conf >= 0.5 for *_, conf, cls in detections)
    
    
    @classmethod
    def _get_face_embedding(cls,face_crop):
        if face_crop is None or face_crop.size == 0:
            return None

        img = cv2.resize(face_crop, (112, 112))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32)
        img = (img - 127.5) / 128.0
        
        img = np.transpose(img, (2, 0, 1))  
        input_blob = np.expand_dims(img, axis=0)
        
        raw_output = cls.EMBEDDING_MODEL.run(None, {cls.EMBEDDING_MODEL.get_inputs()[0].name: input_blob})
        return raw_output[0].flatten()


    @classmethod
    def _predict_all_faces(cls,frame, conf_threshold=0.7):
        """Scans frame and returns ALL faces that cross the confidence threshold."""
        h_orig, w_orig, _ = frame.shape
        blob = cls._preprocess_detector(frame)
        
        scores, boxes = cls.FACE_LOCATION_DETECTOR_MODEL.run(None, {cls.FACE_LOCATION_DETECTOR_MODEL.get_inputs()[0].name: blob})
        scores = scores[0][:, 1] 
        boxes = boxes[0]
        
        mask = scores > conf_threshold
        filtered_boxes = boxes[mask]
        filtered_scores = scores[mask]
        
        if len(filtered_scores) == 0:
            return [] 
            
        keep_indices = cls._hard_nms(filtered_boxes, filtered_scores, iou_threshold=0.3)
        final_boxes = filtered_boxes[keep_indices]
        final_scores = filtered_scores[keep_indices]
        
        detected_faces = []
        for idx in range(len(final_boxes)):
            box = final_boxes[idx]
            score = final_scores[idx]
            
            x1 = int(np.clip(box[0] * w_orig, 0, w_orig))
            y1 = int(np.clip(box[1] * h_orig, 0, h_orig))
            x2 = int(np.clip(box[2] * w_orig, 0, w_orig))
            y2 = int(np.clip(box[3] * h_orig, 0, h_orig))
            
            detected_faces.append(([x1, y1, x2, y2], score))
            
        return detected_faces
    
    
    
    @classmethod
    def _preprocess_detector(cls,frame):
        """Resizes and formats frame for the 320x240 detector model."""
        image = cv2.resize(frame, (cls.INPUT_WIDTH, cls.INPUT_HEIGHT))
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = (image - 127.0) / 128.0  
        image = np.transpose(image, (2, 0, 1))  
        image = np.expand_dims(image, axis=0).astype(np.float32)  
        return image
    
    @classmethod
    def _hard_nms(cls,boxes, scores, iou_threshold=0.3):
        if len(boxes) == 0:
            return []
        
        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = boxes[:, 2]
        y2 = boxes[:, 3]
        
        areas = (x2 - x1) * (y2 - y1)
        order = scores.argsort()[::-1]

        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            
            w = np.maximum(0.0, xx2 - xx1)
            h = np.maximum(0.0, yy2 - yy1)
            inter = w * h
            
            iou = inter / (areas[i] + areas[order[1:]] - inter)
            inds = np.where(iou <= iou_threshold)[0]
            order = order[inds + 1]
            
        return keep
    
    
    @classmethod
    def is_too_dark(cls,image,threshold =50):
        gray = cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
        
        avg_brightness = np.mean(gray)
        
        return avg_brightness<threshold
    
    
    @classmethod
    def is_too_blurry(cls,image,threshold =0.80):
        gray = cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
        
        variance = cv2.Laplacian(gray,cv2.CV_64F).var()
        
        
        return variance<threshold