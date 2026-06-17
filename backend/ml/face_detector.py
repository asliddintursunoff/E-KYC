import onnxruntime as ort 
import insightface
import cv2
import numpy as np
from uuid import UUID

from pgvector.django import CosineDistance

from django.conf import settings
from apps.users.models import User



class NotFrontLooking(Exception):
    pass

class MultipleFacesFound(Exception):
    pass

class NoFaceFound(Exception):
    pass

class CoveredFace(Exception):
    pass
class GlassesFound(Exception):
    pass


class FaceDetector:

    MASK_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/mask_detection.onnx')
    GLASS_MODEL = ort.InferenceSession(settings.BASE_DIR / 'ml/weights/glass_detection.onnx')
    FACE_MODEL = insightface.app.FaceAnalysis("buffalo_s")
    
    def __init__(self):
        self.model = User



    
    def register_selfie(self,photo,id:UUID):
        img = cv2.imdecode(photo,cv2.IMREAD_COLOR)

       
        face_info = self._face_info(img)

        x1, y1, x2, y2 = [int(v) for v in face_info["face_location"]]
        face_crop = img[y1:y2, x1:x2]

        has_mask = self.__class__._has_mask(face_crop)

        if has_mask:
            raise CoveredFace('Face is covered, Make sure face is clean')
        
        has_glass = self.__class__._has_glasses(face_crop)

        if has_glass:
            raise GlassesFound('Glass is found, Make sure face is clean')
        
        embedding = face_info["embedding"]
        embedding = embedding / np.linalg.norm(embedding)

        obj = self.model.objects.filter(id = id).update(embedding = embedding)

        return obj

        
    
    def verify_user(self,photo)->bool:
        image_bytes = np.frombuffer(
                    photo.read(),
                    dtype=np.uint8
                )
        img = cv2.imdecode(image_bytes,cv2.IMREAD_COLOR)
        face_info = self._face_info(img)

        x1, y1, x2, y2 = [int(v) for v in face_info["face_location"]]
        face_crop = img[y1:y2, x1:x2]


        has_glass = self.__class__._has_glasses(face_crop)

        if has_glass:
            raise GlassesFound('Glass is found, Make sure face is clean')
        has_mask = self.__class__._has_mask(face_crop)
        if has_mask:
            raise CoveredFace('Face is covered, Make sure face is clean')
        
        
        embedding = face_info["embedding"]
        embedding = embedding / np.linalg.norm(embedding)

        return embedding
        
        

        


    @classmethod
    def _face_info(cls,img_np_array)->dict:
        faces = cls.FACE_MODEL.get(img_np_array)

        if len(faces) >1:
            raise MultipleFacesFound("More than one face found")
        
        elif len(faces) == 0:
            raise NoFaceFound("No face found")
        
        face = faces[0]

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