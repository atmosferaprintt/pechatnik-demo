#!/usr/bin/env python3
"""Генерирует .env для Supabase ПЕЧАТНИКА: новые пароль базы, JWT-секрет и ключи anon / service_role.

Запуск на сервере (только стандартная библиотека):
    python3 gen-env.py > .env && chmod 600 .env
Уже существующий .env не перезаписывать: ключ anon зашит в собранный сайт, а пароль — в базу.
"""
import base64, hashlib, hmac, json, secrets, string, time

def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def jwt(secret: str, role: str) -> str:
    now = int(time.time())
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = b64(json.dumps({"role": role, "iss": "supabase", "iat": now, "exp": now + 10 * 365 * 24 * 3600},
                             separators=(",", ":")).encode())
    sig = b64(hmac.new(secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"

def token(n: int) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))

jwt_secret = token(48)
print(f"POSTGRES_PASSWORD={token(32)}")
print(f"JWT_SECRET={jwt_secret}")
print("JWT_EXPIRY=3600")
print(f"ANON_KEY={jwt(jwt_secret, 'anon')}")
print(f"SERVICE_ROLE_KEY={jwt(jwt_secret, 'service_role')}")
print(f"SECRET_KEY_BASE={token(64)}")
print(f"REALTIME_DB_ENC_KEY={token(16)}")  # realtime требует ровно 16 символов
print("API_EXTERNAL_URL=https://crm.pechatnik-cherkessk.ru")
print("SITE_URL=https://crm.pechatnik-cherkessk.ru")
