import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bcc_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

if not User.objects.filter(username='admin').exists():
    try:
        User.objects.create_superuser(username='admin', email='admin@bccit.co.zw', password='bccit')
        print("Superuser admin created successfully.")
    except Exception as e:
        print(f"Error creating superuser: {e}")
        # fallback if email is not required or username is different
        try:
            User.objects.create_superuser('admin', 'bccit')
            print("Superuser admin created with only username and password.")
        except Exception as e2:
            print(f"Error creating superuser fallback: {e2}")
else:
    print("Superuser admin already exists.")
