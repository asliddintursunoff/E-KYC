import base64
from django.core.files.base import ContentFile
from django.db import transaction
from celery import shared_task
from apps.users.services.face_verification import FaceVerificationService
from apps.users.models import User

@shared_task
def face_register_task(image, user_id):
    try:
        image_bytes = base64.b64decode(image)
    except Exception as e:
        raise
    FaceVerificationService.register_user_selfie(image_bytes, user_id)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return
    
    old_image = user.image if user.image else None


    try:
        with transaction.atomic():
            FaceVerificationService.register_user_selfie(image_bytes, user_id)
            if old_image:
                old_image.delete(save=False)
            user.verified = True
            user.image.save(
                f"selfie_{user_id}.jpg",
                ContentFile(image_bytes),
                save=True
            )
    except Exception as e:
        raise 

 