import base64
from django.core.files.base import ContentFile
from django.db import transaction
from celery import shared_task
from apps.users.services.face_verification import FaceVerificationService
from apps.users.models import User

@shared_task
def face_register_task(image, user_id):
   
    image_bytes = base64.b64decode(image)
    try:
        user = User.objects.get(id=user_id)
        old_image = user.image if user.image else None
        if  user.verified and user.embedding is not None:
            FaceVerificationService.verify_user_selfie(image_bytes, user)
        
        
        FaceVerificationService.register_user_selfie(image_bytes, user)
        
        if old_image:
            old_image.delete(save=False)
        user.image.save(
            f"selfie_{user_id}.jpg",
            ContentFile(image_bytes),
            save=True
        )
        
    except User.DoesNotExist:
        raise
    except Exception as e:
        raise
    
    
        

    

 