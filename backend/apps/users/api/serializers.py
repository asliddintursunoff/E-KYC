from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

import re

from apps.users.models import User
from apps.users.tokens import TemporaryLoginToken




class UserRegsiterSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only = True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    middle_name = serializers.CharField(write_only=True)
    passport_id = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only = True)
    date_of_birth = serializers.DateField(format="%d-%m-%Y")
    selfie_verification_token = serializers.CharField(read_only = True)

    def validate_passport_id(self,value):
        pattern_exact = r"^[A-Z]{2}\d{7}$"
        if len(value)!=9 or not re.match(pattern_exact, value.upper()):
            raise serializers.ValidationError('Passport Id should be exactly 2 chars and 7 digits')
        return value
    
    def validate_password(self,value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(str(e))
        return value

   
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)

        user.set_password(password)
        user.save()
        return user
    

class UserInformationSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    middle_name = serializers.CharField()
    passport_id = serializers.CharField()
    date_of_birth = serializers.DateField(format="%d-%m-%Y")
    image = serializers.ImageField(read_only = True)
    verified = serializers.BooleanField(read_only = True)
    selfie_verification_token = None



     

class FaceVerificationSerializer(serializers.Serializer):
    image = serializers.ImageField(write_only = True)
    access_token = serializers.CharField(read_only = True)
    refresh_token = serializers.CharField(read_only = True)

    def validate_image(self,value):
        max_size = 1024*1024*5
        ALLOWED_FORMATS = ['png','jpeg','jpg','webp']
        
        if value.size > max_size:
            raise serializers.ValidationError('Image file size cannot be more than 2 MB')
        
        # image = value.image
        # width, height = image.size
        # if width < 200 or height < 200:
        #     raise serializers.ValidationError("Image dimensions must be at least 200x200 pixels.")
        
        if value.content_type not in ALLOWED_FORMATS:
            raise serializers.ValidationError('Only PNG, JPEG, JPG, WEBP is allowed')

        return value
    
class UserSelfieUploadVerificationSerializer(serializers.Serializer):
    image = serializers.ImageField(write_only = True)
    job_id = serializers.UUIDField(read_only = True)
       




#Login Serializer
class UserLoginSerializer(serializers.Serializer):
    passport_id = serializers.CharField(write_only = True)
    password = serializers.CharField(write_only = True)
    temporary_login_token = serializers.CharField(read_only = True)
    def validate_passport_id(self,value):
        pattern_exact = r"^[A-Z]{2}\d{7}$"
        if len(value)!=9 or not re.match(pattern_exact, value.upper()):
            raise serializers.ValidationError('Passport Id should be exactly 2 chars and 7 digits')
        return value
    
    def validate_password(self,value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(str(e))
        return value
        
    
    def validate(self, attrs):
        super().validate(attrs)
        user = authenticate(**attrs)
        if not user:
            raise AuthenticationFailed("Invalid Credentials")
        temporary_token = TemporaryLoginToken().for_user(user)
        attrs = {
            "temporary_login_token":str(temporary_token)
        }
        return attrs
        





