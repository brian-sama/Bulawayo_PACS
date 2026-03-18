import requests

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcyMjA3MTUyLCJpYXQiOjE3NzIxNzgzNTIsImp0aSI6IjFlMTFlMzdjYmEzZjQzZDc5ZGM4OWNmYzg4MDUwZDM5IiwidXNlcl9pZCI6IjEwIn0.zoo0-K8__rDm-mPQfcGu2RZoDe5swD8coYJCBYjAt_I"
URL = "http://127.0.0.1:8000/api/plans/"

headers = {
    'Authorization': f'Bearer {TOKEN}'
}

data = {
    'stand_number': 'TEST-123',
    'suburb': 'Khumalo',
    'category': 'RESIDENTIAL',
    'stand_type': 'RESIDENTIAL_HIGH_DENSITY',
    'is_owner': 'true',
    'declared_area': '100',
    'shapes': '[{"type":"rectangle","dimensions":{"length":10,"width":10}}]'
}

files = {}
file_path = 'backend/media/plan_files/2026/02/nelson_daybed_-_side_bolster1_h5EeSGF.dwg'
try:
    files['plan_file_0'] = open(file_path, 'rb')
except FileNotFoundError:
    print('plan file not found:', file_path)
    files = None

resp = requests.post(URL, headers=headers, data=data, files=files)
print('STATUS', resp.status_code)
try:
    print(resp.text)
except Exception:
    pass

if files and 'plan_file_0' in files:
    files['plan_file_0'].close()
