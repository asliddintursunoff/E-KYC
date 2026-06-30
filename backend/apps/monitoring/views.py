from django.db import connection
from django.core.cache import cache

from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView


class HealthCheckAPIView(APIView):
    permission_classes = [AllowAny]
    
    def get(self,request):
        status_code = status.HTTP_200_OK
        health_summary = {
            "status": "healthy",
            "services": {
                "database": "healthy",
                "cache": "healthy"
            }
        }
        
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
        except Exception as e:
            health_summary['status'] = 'unhealthy'
            health_summary["services"]["database"] = f"unhealthy: {str(e)}"
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            
        
        try:
            # Attempt to set and get a dummy key with a tiny timeout
            cache.set("_health_check", "ok", timeout=5)
            if cache.get("_health_check") != "ok":
                raise ValueError("Cache read/write mismatch")
        except Exception as e:
            health_summary["services"]["cache"] = f"unhealthy: {str(e)}"
            health_summary["status"] = "unhealthy"
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            
        return Response(health_summary,status=status_code)
            
            