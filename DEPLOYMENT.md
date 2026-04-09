# VPS Deployment

This project is set up to run on your VPS at:

- App URL: `http://89.116.26.24:8006`
- Admin URL: `http://89.116.26.24:8006/admin/`

## 1. Prepare the backend environment file

On the VPS, create `backend/.env` from `backend/.env.example` and set:

- `SECRET_KEY` to a strong random value
- `DATABASE_URL` to your Neon connection string
- `ALLOWED_HOSTS=localhost,127.0.0.1,89.116.26.24`
- `CORS_ALLOWED_ORIGINS=http://89.116.26.24:8006`
- `CSRF_TRUSTED_ORIGINS=http://89.116.26.24:8006`
- `ADMIN_USERNAME=admin`
- `ADMIN_EMAIL=admin@citybyo.co.zw`
- `ADMIN_PASSWORD=bccit`

## 2. Upload the project to the VPS

Clone or copy the repo to the server, then go to the project folder.

## 3. Build and start the containers

```bash
docker compose up -d --build
```

## 4. Open the port if your firewall is enabled

```bash
sudo ufw allow 8006/tcp
```

## 5. Check the containers

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f web
```

## Notes

- Port `8006` was chosen because your current VPS output shows it is free.
- Neon is external, so you do not need to expose PostgreSQL on the VPS.
- Uploaded files are stored in Docker volumes named `media_volume` and `static_volume`.
- On startup, the backend runs migrations and ensures the default admin account exists.
