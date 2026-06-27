class VerificationException(Exception):
    code = "verification_failed"
    message = "Verification failed"
    
class GlassFoundException(Exception):
    code = "glass_found"
    message = "Glasses found"

class MaskFoundException(Exception):
    code = "mask_found"
    message = "Mask found"
    
class NoFaceFoundException(Exception):
    code = "no_face"
    message = "No Face Found"
    
class MultipleFaceFoundException(Exception):
    code = "multiple_face"
    message = "Multiple faces found"
    
class DifferentPersonException(Exception):
    code = "different_person"
    message = "Different Person"