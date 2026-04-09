#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py create_admin \
  --username "${ADMIN_USERNAME:-admin}" \
  --email "${ADMIN_EMAIL:-admin@citybyo.co.zw}" \
  --password "${ADMIN_PASSWORD:-bccit}" \
  --name "${ADMIN_NAME:-System Administrator}"
python manage.py collectstatic --noinput

exec gunicorn bcc_backend.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout "${GUNICORN_TIMEOUT:-120}"
