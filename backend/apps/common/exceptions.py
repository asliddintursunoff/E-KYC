class FaceVerificationException(Exception):
    "pass"
    pass


class AppException(Exception):
    code: str = "app_error"
    message: str = "Application error"

    def __init__(
        self,
        message: str | None = None,
        data: dict | None = None,
    ):
        self.message = message or self.message
        self.data = data or {}

        super().__init__(self.message)
class VerificationException(AppException):
    code = "verification_failed"
    message = "Verification failed"
    
class GlassFoundException(AppException):
    code = "glass_found"
    message = "Glasses found"

class MaskFoundException(AppException):
    code = "mask_found"
    message = "Mask found"
    
class NoFaceFoundException(AppException):
    code = "no_face"
    message = "No Face Found"
    
class MultipleFaceFoundException(AppException):
    code = "multiple_face"
    message = "Multiple faces found"
    
class DifferentPersonException(AppException):
    code = "different_person"
    message = "Different Person"
    
class NotFrontLookingException(AppException):
    code = "not_looking_front"
    message = "Look to the camera"
    

class BlurImageException(AppException):
    code = "blur_image"
    message = "Image is too blurry. Please clean your camera."
    
class DarkImageException(AppException):
    code = "dark_image"
    message = "Image is too dark, Please stand in brighter place"
    
class NotRealPersonException(AppException):
    code = "not_real_person"
    message = "Fake photo detected"
    
class BacklightImageFoundException(AppException):
    code = "blacklight_image"
    message = "Strong light detected behind your head. Please change your position."