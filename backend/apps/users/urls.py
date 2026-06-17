from django.urls import path,include

from apps.users.api.views import (UserCreateGenericAPIView,
                                #   UserSelfieUploadAPIView,
                                  VerificationAPIView,
                                  LoginAPIView,
                                  GetMyInfoGenericView)


urlpatterns = [
    path('register/',UserCreateGenericAPIView.as_view(),name='register'),
    # path('selfie/<id>',UserSelfieUploadAPIView.as_view()),
    path('verify/',VerificationAPIView.as_view()),
    path('login/',LoginAPIView.as_view()),
    path('me/',GetMyInfoGenericView.as_view())


]