@echo off
set "VENV_DIR=..\.venv"

if not exist "%VENV_DIR%" (
    echo Creating virtual environment...
    python -m venv "%VENV_DIR%"
)

echo Installing dependencies...
"%VENV_DIR%\Scripts\python.exe" -m pip install dj-database-url psycopg2-binary

echo Running makemigrations...
"%VENV_DIR%\Scripts\python.exe" manage.py makemigrations

echo Running migrate...
"%VENV_DIR%\Scripts\python.exe" manage.py migrate

echo Seeding admin...
"%VENV_DIR%\Scripts\python.exe" ..\seed_admin.py

echo Setup successful!
