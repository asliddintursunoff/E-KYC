from django.urls import path
from apps.websocket import consumers

websocket_urlpatterns = [
    path('ws/verification/',consumers.FaceIdConsumer.as_asgi()),
    
]
