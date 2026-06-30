import json
from PIL import Image
import io

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.services.face_verification import FaceVerificationService
from apps.common.exceptions import AppException


#Exception raise with data {"face_location":"face coordinates"}
#NoFace and MultipleFace sends empty data
class FaceIdConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if user.is_anonymous:
            await self.accept()
            await self.send(json.dumps({
                "type":"error",
                "code":"authentication_failed",
                "message":self.scope["temp_token_error"]
            }))
            await self.close(code=4003,reason="Invalid Token")
            return
        await self.accept()
        
    async def disconnect(self, code):
        pass
    
    async def receive(self, text_data = None, bytes_data = None):
        
        try:
            if text_data is not None:
                raise Exception("Invalid data type, only binary is allowed")
            
            if bytes_data is None:
                raise Exception("No binary data found")
            
            if not self.is_valid_image(bytes_data):
                raise Exception("Invalid file type. Only JPEG, PNG, and WebP images are allowed.")
            
            await sync_to_async(FaceVerificationService().verify_user_selfie)(bytes_data,self.scope['user'])
            refresh_token = RefreshToken().for_user(self.scope["user"])
            access_token = refresh_token.access_token
            data={
                    "access_token": str(access_token),
                    "refresh_token": str(refresh_token),
                }
            message = "User identified successfully"
            await self.send_success("verified",data,message=message)
            await self.close(4000,reason=message)
            return
        
        except AppException as exc:
            await  self.send_error(exc)
            
        except Exception as e:
            error_message = str(e)
            
            await self.send(text_data=json.dumps({
                "type": "error",
                "code": "server_error",
                "message": error_message,
                "data":None
            }))
            
            
        
        
    async def send_error(self,exc:AppException):
        print(exc.data)
        await self.send(json.dumps({
            "type":"error",
            "code":exc.code,
            "message":exc.message,
            "data":exc.data
        }))
        
        
    async def send_success(self,code,data,message):
        
        await self.send(text_data=json.dumps({
            "type": "success",
            "message":message,
            "code":code,
            "data": data
        }))
        
    def is_valid_image(self, bytes_data: bytes) -> bool:
        ALLOWED_FORMATS = ['JPEG', 'PNG', 'WEBP']
        try:
            with Image.open(io.BytesIO(bytes_data)) as img:
                return img.format in ALLOWED_FORMATS
        except Exception:
            return False