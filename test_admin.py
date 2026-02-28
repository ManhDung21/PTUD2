import requests

res = requests.post('http://localhost:8000/auth/login', json={'identifier': 'admin@gmail.com', 'password': '111111'})
token = res.json().get('access_token')

res = requests.put('http://localhost:8000/auth/profile', json={'plan_type': 'plus'}, headers={'Authorization': f'Bearer {token}'})
print('Status:', res.status_code)
print('Response:', res.text)
