from rest_framework.generics import CreateAPIView,ListAPIView,GenericAPIView,RetrieveAPIView
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser,FormParser
from rest_framework.permissions import IsAuthenticated,AllowAny

import numpy as np
import os 

from django.contrib.auth import authenticate
from apps.users.models import User
from apps.users.api.serializers import (UserRegsiterSerializer,
                                        FaceVerificationSerializer,
                                        # UserSelfieSerializer,
                                        # SelfieVerificationResponseSerializer,
                                        UserLoginSerializer)

from apps.users.services.face_verification import FaceVerificationService
from apps.users.tokens import TemporaryLoginToken



class UserCreateGenericAPIView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegsiterSerializer

   
    
    

# class UserSelfieUploadAPIView(APIView):
#     parser_classes = [MultiPartParser]
#     serializer_class = UserSelfieSerializer

#     def put(self,request,id,*args,**kwargs):
#         user = User.objects.get(id=id)
#         serializer = UserSelfieSerializer(user,data = request.data)
#         if not serializer.is_valid():
#             return Response(serializer.errors)

#         print(serializer.validated_data)
#         data = serializer.validated_data
#         try:
#             image_bytes = np.frombuffer(
#                 data['image'].read(),
#                 dtype=np.uint8
#             )
        
#             model = FaceDetector()
#             model.register_selfie(image_bytes,id)

#         except Exception as e:
#             return Response({"detail":str(e)},status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        

#         if user.image is not None:
#             if os.path.isfile(user.image.path):
#                 os.remove(user.image.path)

#         user.image = data['image']
#         user.verified = True
#         user.save()
#         # print(response)
        
#         return Response(serializer.data,status=status.HTTP_200_OK)
    







        

from apps.users.authentication import TemporaryTokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
class VerificationAPIView(GenericAPIView):
    serializer_class = FaceVerificationSerializer
    authentication_classes = [TemporaryTokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser,FormParser]
    def put(self,request,*args,**kwargs):
        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception = True)
       
        try:
            FaceVerificationService.verify_user_selfie(serializer.validated_data['image'],request.user)
        
        except AuthenticationFailed as e:
            return Response({"detail":str(e)},status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"detail":str(e)},status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        refresh_token = RefreshToken().for_user(request.user)
        access_token = refresh_token.access_token
        return Response({
            "access_token":str(access_token),
            "refresh_token":str(refresh_token),
        })



class GetMyInfoGenericView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserRegsiterSerializer
    def get_object(self):
        return self.request.user
    


#ready one
class LoginAPIView(GenericAPIView):
    serializer_class = UserLoginSerializer
    queryset = User.objects.all()
    def post(self,request,*args,**kwargs):
        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception = True)
        return Response(serializer.validated_data,status=status.HTTP_200_OK)


