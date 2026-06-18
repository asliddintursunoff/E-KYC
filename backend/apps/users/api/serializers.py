from rest_framework import serializers

from apps.users.models import User


class UserRegsiterSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only = True)
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    middle_name = serializers.CharField()
    passport_id = serializers.CharField()
    password = serializers.CharField(write_only = True)
    date_of_birth = serializers.DateField(format="%d-%m-%Y")

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
    

class UserInformationSerializer(UserRegsiterSerializer):
    image = serializers.ImageField(read_only = True)
    verified = serializers.BooleanField(read_only = True)


     

class FaceVerificationSerializer(serializers.Serializer):
    image = serializers.ImageField()
    



    




from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from rest_framework.exceptions import AuthenticationFailed
from apps.users.tokens import TemporaryLoginToken
import re





#Login Serializer
class UserLoginSerializer(serializers.Serializer):
    passport_id = serializers.CharField()
    password = serializers.CharField()

    # def validate_passport_id(self,value):
    #     pattern_exact = r"^[A-Z]{2}\d{7}$"
    #     if len(value)!=9 or not re.match(pattern_exact, value.upper()):
    #         raise serializers.ValidationError('Passport Id should be exactly 2 chars and 7 digits')
    #     return value
    
    # def validate_password(self,value):
    #     try:
    #         validate_password(value)
    #     except ValidationError as e:
    #         raise serializers.ValidationError(str(e))
    #     return value
        
    
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
        





