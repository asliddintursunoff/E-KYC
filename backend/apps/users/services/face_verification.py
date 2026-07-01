import numpy as np
from pgvector.django import CosineDistance


from django.apps import apps

from ml.face_detector import ( FaceDetector,
                                MultipleFacesFound,
                                NoFaceFound,
                                GlassesFound,
                                CoveredFace,
                                NotFrontLooking,
                                DarkImageFound,
                                BlurryImageFound,
                                NotRealPerson,
                                BacklightImageFound
                                )
from apps.common.exceptions import (DarkImageException,
                                    BlurImageException,
                                    GlassFoundException,
                                    MaskFoundException,
                                    NoFaceFoundException,
                                    MultipleFaceFoundException,
                                    DifferentPersonException,
                                    NotFrontLookingException,
                                    NotRealPersonException,
                                    BacklightImageFoundException
                                    )


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
            
            ml_result = model.identify_user(image)
            embedding= ml_result['embedding']
            person = User.objects.filter(id=user.id).annotate(
                        distance=CosineDistance('embedding', embedding)
                        ).order_by('distance').first()

            
            if (person.distance<0 or person.distance>0.5):
                raise DifferentPersonException(data={'face_location':ml_result["face_location"]})
            
        
        except NotFrontLooking as e:
            raise NotFrontLookingException(data=e.data)
        except MultipleFacesFound as e:
            raise MultipleFaceFoundException(data=e.data)
        except NoFaceFound as e:
            raise NoFaceFoundException(data=e.data)
        
        except GlassesFound as e:
            raise GlassFoundException(data=e.data)
        except CoveredFace as e:
            raise MaskFoundException(data=e.data)
        
        except DarkImageFound as e:
            raise DarkImageException(data = e.data)
        except BlurryImageFound as e:
            raise BlurImageException(data=e.data)
        except NotRealPerson as e:
            raise NotRealPersonException(data=e.data)
        
        except BacklightImageFound as e:
            raise BacklightImageFoundException(data=e.data)
        
        

    @staticmethod
    def register_user_selfie(image,user):
        model = FaceVerificationService.get_model()
        try:
            ml_result = model.identify_user(image)
            print(ml_result)
            embedding = ml_result["embedding"]
            user.embedding = embedding
            user.verified = True
            user.save()
            return user
        
        except NotFrontLooking as e:
            raise NotFrontLookingException()
        except MultipleFacesFound as e:
            raise MultipleFaceFoundException()
        except NoFaceFound as e:
            raise NoFaceFoundException()
        
        except GlassesFound as e:
            raise GlassFoundException()
        except CoveredFace as e:
            raise MaskFoundException()
        