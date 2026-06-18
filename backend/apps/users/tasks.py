import base64

from celery import shared_task
from apps.users.services.face_verification import FaceVerificationService

@shared_task
def face_register_task(image,user_id):
    FaceVerificationService.register_user_selfie(base64.b64decode(image),user_id)