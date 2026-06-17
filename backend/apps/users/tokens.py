from rest_framework_simplejwt.tokens import Token
from datetime import timedelta

class TemporaryLoginToken(Token):
    token_type = 'temp'
    lifetime = timedelta(minutes=60)