from django.db import models
from django.contrib.auth.models import AbstractBaseUser,PermissionsMixin,BaseUserManager
from pgvector.django import VectorField

from apps.common.models import BaseModel


class UserManager(BaseUserManager):
    def create_user(self,passport_id,password = None,**extra_fields):
        if not passport_id:
            raise ValueError('Passport ID is required!')
        
        user = self.model(passport_id = passport_id,**extra_fields)
        user.set_password(password)
        user.save(using = self._db)
        return user
    
    def create_superuser(self,passport_id,password = None,**extra_fields):
        extra_fields.setdefault('is_staff',True)
        extra_fields.setdefault('is_superuser',True)
        return self.create_user(passport_id,password,**extra_fields)
    

        
class User(BaseModel,AbstractBaseUser,PermissionsMixin):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=50)
    passport_id = models.CharField(unique=True,db_index=True,max_length=9)
    date_of_birth = models.DateField()
    image = models.ImageField(upload_to='user_images',null=True,blank=True)
    embedding = VectorField(dimensions=512,null=True, blank=True)
    verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)   # ← add this
    is_active = models.BooleanField(default=True)

    
    USERNAME_FIELD = 'passport_id'
    REQUIRED_FIELDS = ['date_of_birth']


    objects = UserManager()

