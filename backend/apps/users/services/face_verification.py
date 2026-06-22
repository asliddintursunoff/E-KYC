import numpy as np
from pgvector.django import CosineDistance

from ml.face_detector import FaceDetector
from apps.common.exceptions import FaceVerificationException
from django.apps import apps
from rest_framework.exceptions import AuthenticationFailed

User = apps.get_model('users',"User")

# I used singleton pattern in here for not initializing AI models again and again
class FaceVerificationService:
    __model:FaceDetector = None

    @staticmethod
    def get_model() -> FaceDetector:
        if FaceVerificationService.__model is None:
            FaceVerificationService.__model = FaceDetector()
        return FaceVerificationService.__model
    

    @staticmethod
    def verify_user_selfie(image,user):

        model = FaceVerificationService.get_model()
        try:
            
            embedding = model.identify_user(image)
       
            person = User.objects.filter(id=user.id).annotate(
                        distance=CosineDistance('embedding', embedding)
                        ).order_by('distance').first()

            if (person.distance<0 or person.distance>0.5):
                raise AuthenticationFailed('Person from photo can not be identified')

        
        except AuthenticationFailed as e:
            raise AuthenticationFailed(str(e))
           
        except Exception as e:
            raise FaceVerificationException(str(e))
        

    @staticmethod
    def register_user_selfie(image,user_id):
        model = FaceVerificationService.get_model()
        try:
            embedding = model.identify_user(image)
            
            User.objects.filter(id = user_id).update(embedding = embedding,verified = True)

         
        except Exception as e:
            raise FaceVerificationException(str(e))
        