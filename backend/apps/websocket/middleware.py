from channels.middleware import BaseMiddleware
from apps.users.tokens import TemporaryLoginToken
from urllib.parse import parse_qs

from django.contrib.auth.models import AnonymousUser
from django.apps import apps
from rest_framework_simplejwt.exceptions import InvalidToken

User = apps.get_model('users','User')

class UserAuthenticateMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        
        query_string =scope['query_string'].decode()
        
        try:
            token = parse_qs(query_string).get("token",[None])[0]
            if token is None:
                raise ValueError("Query Param does not include token")
            decoded_data = TemporaryLoginToken(token)
            user_id = decoded_data.payload['user_id']
            
            user = await User.objects.aget(id=user_id)
            
        except Exception as e:  
            scope['temp_token_error'] = str(e)   
            user = AnonymousUser()
            
        scope['user'] = user
        return await super().__call__(scope, receive, send)