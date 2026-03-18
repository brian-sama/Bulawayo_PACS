import os
import sys
from pathlib import Path
# Ensure `backend` is on sys.path so `bcc_backend` package imports correctly
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bcc_backend.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
email = 'dev+tester@local.test'
user = User.objects.filter(email=email).first()
if not user:
    user = User.objects.create_user(email=email, password='Testpass123!', full_name='Dev Tester', username='devtester')
    print('created')
else:
    print('found')
refresh = RefreshToken.for_user(user)
print('ACCESS', str(refresh.access_token))
