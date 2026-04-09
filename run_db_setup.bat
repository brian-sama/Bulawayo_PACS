@echo off
set "VENV_DIR=%~dp0.venv"

if not exist "%VENV_DIR%" (
    echo Creating virtual environment...
    python -m venv "%VENV_DIR%"
)

echo Installing dependencies...
"%VENV_DIR%\Scripts\python.exe" -m pip install --upgrade pip
"%VENV_DIR%\Scripts\python.exe" -m pip install django dj-database-url psycopg2-binary
if %ERRORLEVEL% neq 0 (
    echo Error installing dependencies.
    exit /b %ERRORLEVEL%
)

echo Running makemigrations...
"%VENV_DIR%\Scripts\python.exe" manage.py makemigrations
if %ERRORLEVEL% neq 0 (
    echo Error running makemigrations.
    exit /b %ERRORLEVEL%
)

echo Running migrate...
"%VENV_DIR%\Scripts\python.exe" manage.py migrate
if %ERRORLEVEL% neq 0 (
    echo Error running migrate.
    exit /b %ERRORLEVEL%
)

echo Seeding admin...
"%VENV_DIR%\Scripts\python.exe" seed_admin.py
if %ERRORLEVEL% neq 0 (
    echo Error seeding admin.
    exit /b %ERRORLEVEL%
)

echo Setup successful!
