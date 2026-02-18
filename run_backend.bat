@echo off
cd /d "%~dp0backend"
"%~dp0.venv\Scripts\python.exe" manage.py runserver
