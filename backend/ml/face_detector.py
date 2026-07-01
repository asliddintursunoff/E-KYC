import onnxruntime as ort 
import cv2
import numpy as np

from django.conf import settings


opts = ort.SessionOptions()
opts.intra_op_num_threads = 1

class MLBaseException(Exception):
    data:dict = None
    
    def __init__(
        self,message="",data=None):
        self.data = data or {}
        super().__init__(message)
    
class NotFrontLooking(MLBaseException):
    pass

class BacklightImageFound(MLBaseException):
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

class NotRealPerson(MLBaseException):
    pass
class FaceDetector:

    MASK_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/mask_detection.onnx', opts, providers=["CPUExecutionProvider"])
    GLASS_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/glass_detection.onnx', opts, providers=["CPUExecutionProvider"])
    FACE_LOCATION_DETECTOR_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/ultra_light_320.onnx',opts, providers=["CPUExecutionProvider"])
    EMBEDDING_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/mobilefacenet.onnx',opts, providers=["CPUExecutionProvider"])
    INPUT_WIDTH, INPUT_HEIGHT = 320, 240



        
    
    def identify_user(self, photo) -> dict:
        image_bytes = np.frombuffer(
            photo.read() if hasattr(photo, "read") else photo,
            dtype=np.uint8
        )
        
        img = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)
        
        
        faces = self.__class__._predict_all_faces(img)
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
        
        # if self.__class__.is_backlight_detected(img,face_location):
            
        #     raise BacklightImageFound(
        #         message="Strong light detected behind your head. Please change your position.",
        #         data={'face_location': face_location}
        #     )
        # if self.__class__.is_spoof_laplacian_depth(face_crop):
        #     raise NotRealPerson(message='Person in the photo is not real',data={'face_location': face_location})
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
        
        
    #OBJECT CLASSIFICATION
    @classmethod
    def _has_mask(cls,face_crop_np_arr)->bool:
        img = cv2.resize(face_crop_np_arr,(224,224))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        img = img.transpose(2, 0, 1)[np.newaxis]
        # index 0- mask,index 1 - no mask
        # [
        # array([[ 4.25, -3.82]], dtype=float32)
        # ]
        out = cls.MASK_MODEL.run(None, {cls.MASK_MODEL.get_inputs()[0].name: img})[0][0]
        e = np.exp(out - out.max())
        probs = e / e.sum()
        top_i = int(np.argmax(probs))
        
        return top_i == 0 and float(probs[top_i]) >= 0.5
    

    # [
    #   [x1, y1, x2, y2, confidence, class_id],
    #   [x1, y1, x2, y2, confidence, class_id]
    # ]

    # [
    # [108.96, 198.38, 533.68, 369.18,  0.88,  0.0],
    # ]
    #OBJECT DETECTION
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
    
    
    #[
    #     array([[[ 0.01452, -0.05321,  0.12874,  ..., -0.01245]]], dtype=float32)
    # ]
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




    #     [
    # # 1-Chiqish (scores): Shakli (1, 4420, 2) bo'lgan 3D NumPy massivi
    # array([[[0.999, 0.001],
    #         [0.985, 0.015],
    #         [0.015, 0.985],  # <-- Masalan, shu yerda yuz topilgan (Yuz foizi 0.985)
    #         ...
    #         [0.999, 0.000]]], dtype=float32),

    # # 2-Chiqish (boxes): Shakli (1, 4420, 4) bo'lgan 3D NumPy massivi
    # array([[[0.01, 0.02, 0.05, 0.06],
    #         [0.02, 0.02, 0.06, 0.07],
    #         [0.32, 0.15, 0.58, 0.62],  # <-- O'sha topilgan yuzning normallashgan koordinatalari
    #         ...
    #         [0.95, 0.92, 0.99, 0.99]]], dtype=float32)
    # ]
    @classmethod
    def _predict_all_faces(cls,frame, conf_threshold=0.7):
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
    def is_too_blurry(cls,image,threshold =20.0):
        gray = cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
        
        variance = cv2.Laplacian(gray,cv2.CV_64F).var()
        
        
        return variance<threshold
    
    
    @classmethod
    def is_spoof_laplacian_depth(cls, face_crop):
        if face_crop is None or face_crop.size == 0:
            return True

        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # --- TUGATISH: Orqa fon chiziqlarini kesib tashlaymiz ---
        # Yuzning chetidagi 10% qismni hisobga olmaymiz, shunda fon aralashmaydi
        margin_w, margin_h = int(w * 0.1), int(h * 0.1)
        pure_face = gray[margin_h:h-margin_h, margin_w:w-margin_w]
        pf_h, pf_w = pure_face.shape

        # Endi zonalarni faqat mana shu toza yuz ichidan olamiz
        cx, cy = pf_w // 2, pf_h // 2
        r_w, r_h = pf_w // 4, pf_h // 4
        
        center_zone = pure_face[cy - r_h : cy + r_h, cx - r_w : cx + r_w]
        
        # Chetki zona (Fondan tozalangan faqat yonoq va peshona qismi)
        edge_zone = pure_face.copy()
        edge_zone[cy - r_h : cy + r_h, cx - r_w : cx + r_w] = 0

        center_var = cv2.Laplacian(center_zone, cv2.CV_64F).var()
        edge_var = cv2.Laplacian(edge_zone, cv2.CV_64F).var()

        if edge_var == 0: 
            return True

        ratio = center_var / edge_var

        # --- DEBUG REJASI ---
        # O'zing normal tushganingda ratio nechchi chiqyapti, telefonda nechchi chiqyapti, 
        # terminalda ko'rib chegarani (threshold) kengaytirib olasan:
        # print(f"[DEBUG RATIO]: {ratio:.2f}")

        # Chegarani biroz yumshatamiz (Haqiqiy odamni ko'proq o'tkazishi uchun)
        if ratio < 0.3 or ratio > 3.5:
            return True # Spoof (Soxta)

        return False # Real (Jonli odam)
    
    @classmethod
    def is_backlight_detected(cls, img, face_location, threshold_ratio=1.5):
        """
        Kengaytirilgan fon tahlili orqali orqa yorug'likni (backlight) aniqlash.
        Sezgirlikni oshirish uchun ratio 1.5 dan 1.3 ga tushirildi.
        """
        x1, y1, x2, y2 = face_location
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # 1. Yuzning o'zining yorug'ligi
        face_zone = gray[y1:y2, x1:x2]
        if face_zone.size == 0:
            return False
        face_brightness = np.mean(face_zone)

        # 2. Yuz atrofidagi 3 ta fon zonasini olamiz (Tepa, Chap, O'ng)
        pad_w = int((x2 - x1) * 0.5)  # Yon atrofdagi qamrov kengligi
        pad_h = int((y2 - y1) * 0.5)  # Tepadagi qamrov balandligi

        # Tepa fon zonasi
        top_bg = gray[max(0, y1 - pad_h):max(1, y1), max(0, x1 - pad_w):min(w, x2 + pad_w)]
        # Chap fon zonasi
        left_bg = gray[y1:y2, max(0, x1 - pad_w):max(1, x1)]
        # O'ng fon zonasi
        right_bg = gray[y1:y2, min(w, x2):min(w, x2 + pad_w)]

        # Barcha mavjud fon zonalarini birlashtiramiz
        bg_pencils = []
        if top_bg.size > 0: bg_pencils.append(np.mean(top_bg))
        if left_bg.size > 0: bg_pencils.append(np.mean(left_bg))
        if right_bg.size > 0: bg_pencils.append(np.mean(right_bg))

        if not bg_pencils:
            return False

        # Eng yorug' fon nuqtasini olamiz
        max_bg_brightness = max(bg_pencils)

        # --- DEBUG: Haqiqiy raqamlarni konsolda ko'rish ---
        # print(f"[BACKLIGHT DETECT] Face: {face_brightness:.2f} | Max BG: {max_bg_brightness:.2f} | Ratio: {max_bg_brightness / max(1, face_brightness):.2f}")

        # 3. Nisbatni tekshirish
        # Agar fon yuzdan 1.3 marta yorug' bo'lsa va yuz biroz soyada bo'lsa (yorug'ligi 110 dan past)
        if face_brightness < 90 and (max_bg_brightness / max(1, face_brightness)) > threshold_ratio:
            return True

        return False