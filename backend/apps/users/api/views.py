from rest_framework.exceptions import AuthenticationFailed,ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.generics import CreateAPIView,GenericAPIView,RetrieveAPIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser,FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view,authentication_classes,permission_classes,throttle_classes
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.throttling import AnonRateThrottle,UserRateThrottle

from celery.result import AsyncResult
from django.db.utils import IntegrityError

import base64

from apps.users.tasks import face_register_task
from apps.users.authentication import TemporaryTokenAuthentication
from apps.users.models import User
from apps.users.services.face_verification import FaceVerificationService
from apps.users.tokens import TemporaryLoginToken
from apps.users.api.serializers import (UserInformationSerializer, 
                                        UserRegsiterSerializer,
                                        FaceVerificationSerializer,
                                        UserLoginSerializer, 
                                        UserSelfieUploadVerificationSerializer)


class UserCreateGenericAPIView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegsiterSerializer
    throttle_classes = [AnonRateThrottle]
    def perform_create(self, serializer):
        try:
            self.instance = serializer.save()
            self.serializer = serializer
        except IntegrityError as e:
            raise ValidationError(str(e))  

    def create(self, request, *args, **kwargs):
        super().create(request, *args, **kwargs)

        user = self.instance
        temporary_token = TemporaryLoginToken.for_user(user)

        return Response({
            **self.serializer.data,
            "selfie_verification_token": str(temporary_token)
        }, status=status.HTTP_201_CREATED)
   
    
class SelfieUploadVerificationAPIView(GenericAPIView):
    serializer_class = UserSelfieUploadVerificationSerializer
    authentication_classes = [TemporaryTokenAuthentication,JWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser,FormParser]
    throttle_classes = [UserRateThrottle]
    throttle_scope = 'image_registration'

    def post(self,request,*args,**kwargs):
        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception = True)
        try:
            image  = serializer.validated_data['image']
            image_b64 = base64.b64encode(image.read()).decode('utf-8')
            task = face_register_task.delay(image_b64, request.user.id)
            return Response({
                    "job_id":task.id
                },status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"detail":str(e)},status=status.HTTP_422_UNPROCESSABLE_ENTITY)


@api_view(['GET'])
@authentication_classes([TemporaryTokenAuthentication,JWTAuthentication])
@permission_classes([IsAuthenticated])
@throttle_classes([UserRateThrottle])
def get_job_info(request,job_id):
    result = AsyncResult(job_id)
    access_token = None
    refresh_token = None
    if result.status == 'SUCCESS':
        refresh_token = RefreshToken().for_user(request.user)
        access_token = str(refresh_token.access_token)
        
    return Response({
        "job_id": job_id,
        "status": result.status,
        "error": str(result.result) if result.failed() else None,
        "access_token":access_token,
        "refresh_token":None if not refresh_token else str(refresh_token)
    })




#login side
class LoginAPIView(GenericAPIView):
    serializer_class = UserLoginSerializer
    queryset = User.objects.all()
    throttle_classes = [AnonRateThrottle]
    def post(self,request,*args,**kwargs):
        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception = True)
        return Response(serializer.validated_data,status=status.HTTP_200_OK)




class VerificationAPIView(GenericAPIView):
    serializer_class = FaceVerificationSerializer
    authentication_classes = [TemporaryTokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser,FormParser]
    throttle_classes = [UserRateThrottle]
    def post(self,request,*args,**kwargs):
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
    serializer_class = UserInformationSerializer
    def get_object(self):
        return self.request.user
    



