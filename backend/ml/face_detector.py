import onnxruntime as ort 
import insightface
import cv2
import numpy as np

from django.conf import settings



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


class FaceDetector:

    MASK_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/mask_detection.onnx')
    GLASS_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/glass_detection.onnx')
    FACE_MODEL = insightface.app.FaceAnalysis("buffalo_s")
    
    
    MAX_YAW_DEGREES = 25     # left/right turn
    MAX_PITCH_DEGREES = 20   # up/down tilt
    MAX_ROLL_DEGREES = 20    # head tilt sideways



        
    
    def identify_user(self,photo)->dict:
        
        image_bytes = np.frombuffer(
            photo.read() if hasattr(photo, "read") else photo,
            dtype=np.uint8
        )
        
        img = cv2.imdecode(image_bytes,cv2.IMREAD_COLOR)
        face_info = self._face_info(img)

        x1, y1, x2, y2 = [int(v) for v in face_info["face_location"]]
        face_crop = img[y1:y2, x1:x2]


        has_glass = self.__class__._has_glasses(face_crop)

        if has_glass:
            raise GlassesFound('Glass is found, Make sure face is clean',data={'face_location':face_info["face_location"].tolist()})
        has_mask = self.__class__._has_mask(face_crop)
        if has_mask:
            raise CoveredFace('Face is covered, Make sure face is clean',data={'face_location':face_info["face_location"].tolist()})
        
        
        embedding = face_info["embedding"]
        embedding = embedding / np.linalg.norm(embedding)

        return {
            "embedding":embedding,
            "face_location":face_info["face_location"].tolist()
        }
        
        

        


    @classmethod
    def _face_info(cls,img_np_array)->dict:
        faces = cls.FACE_MODEL.get(img_np_array)

        if len(faces) >1:
            raise MultipleFacesFound("More than one face found",data={
                "face_location": [
                    face["bbox"].tolist()
                    for face in faces
                ]
            })
        
        elif len(faces) == 0:
            raise NoFaceFound("No face found")
        
        face = faces[0]
        cls._check_frontal(face)

        data = {
            "face_location":face["bbox"],
            "confidence":face["det_score"],
            "embedding":face["embedding"]
        }
        return data
    
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
    def _check_frontal(cls, face) -> None:
        pose = face.get("pose")
        if pose is None:
            # pose unavailable on this model pack — skip the check
            # rather than silently passing bad data through
            return

        pitch, yaw, roll = pose

        if abs(yaw) > cls.MAX_YAW_DEGREES:
            raise NotFrontLooking(
                "Please face the camera directly",
                data={
                    "face_location": face["bbox"].tolist(),
                    "pose": {"pitch": float(pitch), "yaw": float(yaw), "roll": float(roll)},
                    "reason": "yaw",
                },
            )

        if abs(pitch) > cls.MAX_PITCH_DEGREES:
            raise NotFrontLooking(
                "Please look straight at the camera, not up or down",
                data={
                    "face_location": face["bbox"].tolist(),
                    "pose": {"pitch": float(pitch), "yaw": float(yaw), "roll": float(roll)},
                    "reason": "pitch",
                },
            )

        if abs(roll) > cls.MAX_ROLL_DEGREES:
            raise NotFrontLooking(
                "Please keep your head level",
                data={
                    "face_location": face["bbox"].tolist(),
                    "pose": {"pitch": float(pitch), "yaw": float(yaw), "roll": float(roll)},
                    "reason": "roll",
                },
            )