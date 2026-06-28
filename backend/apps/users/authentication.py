from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken
from apps.users.tokens import TemporaryLoginToken

class TemporaryTokenAuthentication(JWTAuthentication):

    def get_validated_token(self, raw_token):
        try:
            return TemporaryLoginToken(raw_token)
        except Exception:
            pass

        try:
            return AccessToken(raw_token)
        except Exception:
            pass

        raise InvalidToken("Invalid token")
    

# authentication.py
from drf_spectacular.extensions import OpenApiAuthenticationExtension

class TemporaryTokenAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'apps.users.authentication.TemporaryTokenAuthentication'
    name = 'TemporaryTokenAuth'

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }