# BCC Plan Approval System — Backend

## Setup

### 1. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 2. Configure environment

Copy `.env.example` to `.env` and set your database connection string:

```
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
```
### 3. Run migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create superuser (Admin)

```bash
python manage.py createsuperuser
```

### 5. Seed departments

```bash
python manage.py seed_departments
```

### 6. Run development server

```bash
python manage.py runserver
```

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/register/` | Register new client |
| POST | `/api/auth/login/` | Get JWT tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET  | `/api/auth/me/` | Current user profile |
| GET/POST | `/api/plans/` | List / create plans |
| GET/PUT | `/api/plans/{id}/` | Plan detail / update |
| POST | `/api/plans/{id}/submit_to_review/` | Reception approves to review pool |
| POST | `/api/plans/{id}/compute_status/` | Aggregate department votes |
| POST | `/api/plans/{id}/approve_final/` | Final approval + signature |
| GET/POST | `/api/comments/` | Department comments |
| GET/POST | `/api/flags/` | Plan flags |
| POST | `/api/flags/{id}/resolve/` | Resolve a flag |
| GET | `/api/departments/` | List departments |
| GET | `/api/architects/` | List architects |
| GET | `/api/properties/` | List properties |
| GET | `/api/audit-logs/` | Audit trail (Admin only) |

## Django Admin

Available at `/admin/` — full management interface for all models.
