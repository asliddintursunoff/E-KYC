from django.urls import path
from apps.monitoring.views import HealthCheckAPIView

urlpatterns = [
    path('health/',HealthCheckAPIView.as_view())
]
