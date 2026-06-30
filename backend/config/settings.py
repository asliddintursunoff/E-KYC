from datetime import timedelta
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')

import os

# ==========================================
# 1. ENVIROMENT & DEBUG CONFIGURATION
# ==========================================
# .env fayldan DEBUG qiymatini o'qiymiz. os.getenv har doim string qaytargani uchun 
# uni haqiqiy Boolean (True/False) holatiga xavfsiz o'tkazib olamiz.
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')


# ==========================================
# 2. ALLOWED_HOSTS (Eshikdagi Qorovul)
# ==========================================
# Django serveringiz aynan qaysi domen nomidan kelayotgan so'rovlarni qabul qilishini belgilaydi.
# HTTP Host header xurujlaridan himoya qilish uchun faqat backend domenini yozamiz.
ALLOWED_HOSTS = [
                    "api.my-face-info.uz",
                    "my-face-info.com",      
                    "www.my-face-info.com",
                    "web_backend",
                    "localhost",             # Docker ichki sog'liqni tekshirish (Healthcheck) skriptlari uchun
                    "127.0.0.1",
                ]


# ==========================================
# 3. CORS CONFIGURATION (Frontend bilan aloqa)
# ==========================================
# CORS_ALLOW_ALL_ORIGINS: Hamma saytga ruxsat berishni o'chiramiz (Xavfsizlik uchun).
# CORS_ALLOW_CREDENTIALS: Frontend va Backend alohida turganda Cookie va Sessionlar o'tishi uchun ruxsat beradi.
# CORS_ALLOWED_ORIGINS: Faqat biz ishonadigan va ruxsat berilgan frontend domenlari ro'yxati (Protokol bilan!).
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    'https://my-face-info.uz',
    'https://www.my-face-info.uz',
]


# ==========================================
# 4. LOCAL DEVELOPMENT EXTRA CONFIG (Lokal muhit)
# ==========================================
# Agar loyiha lokal kompyuterda ishlayotgan bo'lsa (DEBUG=True), dasturchi qiynalmasligi uchun
# localhost manzillarini va frontend portlarini avtomatik ruxsat etilganlar ro'yxatiga qo'shamiz.
if DEBUG:
    ALLOWED_HOSTS += ["localhost", "127.0.0.1"]
    CORS_ALLOWED_ORIGINS += [
        "http://localhost:3000",  # React
        "http://localhost:5173",  # Vite
    ]


# ==========================================
# 5. CSRF TRUSTED ORIGINS (Ishonchli Manbalar)
# ==========================================
# Django 4.0+ versiyalaridan boshlab, xavfsiz (POST/PUT) so'rovlar yuboradigan frontend
# manzillarini bu yerda aniq ko'rsatish majburiy. Bo'lmasa CSRF tekshiruvi o'tmaydi.
CSRF_TRUSTED_ORIGINS = [
    'https://my-face-info.uz',
    'https://www.my-face-info.uz',
]


# ==========================================
# 6. DEFAULT COOKIE SECURITY (Boshlang'ich holat)
# ==========================================
# Lokal kompyuterda (HTTP muhitida) muammosiz ishlash va test qilish uchun 
# cookielarning faqat HTTPSda ishlash majburiyatini default holatda o'chirib turamiz.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False


# ==========================================
# 7. PRODUCTION SECURITY SETTINGS (Jonli server xavfsizligi)
# ==========================================
# Loyiha real serverga yuklanganda (DEBUG=False bo'lganda) ishga tushadigan qattiq xavfsizlik filtri.
if not DEBUG:
    # Cookielar faqat va faqat HTTPS (shifrlangan) tarmoq orqali uzatilishini majburlaydi.
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    
    # Nginx yoki AWS Load Balancer orqasida turganda Django HTTPS so'rovlarini to'g'ri tanib olishi uchun.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    
    # Har qanday HTTP so'rovni avtomatik ravishda xavfsiz HTTPSga yo'naltiradi (Redirect).
    SECURE_SSL_REDIRECT = True
    
    # Cookie fayllari subdomenlar (api. va www.) o'rtasida o'zaro o'qilishi uchun umumiy asosiy domenni belgilaydi.
    SESSION_COOKIE_DOMAIN = '.my-face-info.uz'
    CSRF_COOKIE_DOMAIN = '.my-face-info.uz'
    
    # Saytlararo (CSRF) hujumlardan himoya qilish uchun eng optimal va zamonaviy cookie filtri rejimi.
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'apps.users',
    'apps.websocket',
    'apps.monitoring',
    'rest_framework',
    'drf_spectacular'
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases



DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'HOST': os.getenv('DB_HOST'),
        'USER': os.getenv('DB_USER'),
        'PORT': os.getenv('DB_PORT'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
    }
}



# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR /'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'



AUTH_USER_MODEL='users.User'



REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '100/minute',
        'image_registration': '3/minute'
    }
}


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
}
SPECTACULAR_SETTINGS = {
    'TITLE':'E-KYC system (Face ID)',
    'DESCRIPTION':'This is for projects which works with django',
    'VERSION':'1.0.0',
    'COMPONENT_SPLIT_REQUEST': True,
    'SERVE_INCLUDE_SCHEMA':False,
}





CELERY_BROKER_URL = "redis://redis_db:6379/0"
CELERY_RESULT_BACKEND = "redis://redis_db:6379/1"

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True





# it should be uncomment when nginx puts a limit for size of the incoming payload
#  DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760   # 10MB, in bytes
#  FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760