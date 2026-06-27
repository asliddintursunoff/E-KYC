from django.urls import path,include

from apps.users.api.views import (UserCreateGenericAPIView,
                                  get_job_info,
                                  LoginAPIView,
                                  GetMyInfoGenericView,
                                  SelfieUploadVerificationAPIView
                                  )


urlpatterns = [
    path('register/',UserCreateGenericAPIView.as_view(),name='register'),
    path('login/',LoginAPIView.as_view()),
    path('register/selfie/',SelfieUploadVerificationAPIView.as_view()),
    path('me/',GetMyInfoGenericView.as_view()),
    path('job/<job_id>/',get_job_info)


]