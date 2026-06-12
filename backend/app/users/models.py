from django.db import models
from django.contrib.auth.models import AbstractUser
from pgvector.django import VectorField
class User(AbstractUser):
    username = None
    email = None
    middle_name = models.CharField(max_length=50)
    passport_id = models.CharField(unique=True,db_index=True,max_length=9)
    date_of_birth = models.DateField()
    image = models.ImageField(upload_to='user_images',null=True,blank=True)
    embedding = VectorField(dimensions=512,null=True, blank=True)


    USERNAME_FIELD = 'passport_id'
    REQUIRED_FIELDS = []

