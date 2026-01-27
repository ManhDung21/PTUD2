"""Authentication helpers including password hashing and JWT handling."""

import hashlib
import secrets
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pymongo.collection import Collection
from pymongo.database import Database

from ..config import get_settings
from ..db.session import get_database
from ..db.models import UserDocument

settings = get_settings()

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
    pbkdf2_sha256__rounds=36000,
)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def generate_reset_token(length: int = 6) -> tuple[str, str]:
    digits = "0123456789"
    token = "".join(secrets.choice(digits) for _ in range(length))
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash



# --- Helpers moved from main.py ---

def is_email(identifier: str) -> bool:
    """Kiểm tra xem identifier có phải là email không."""
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(email_pattern, identifier))


def is_phone_number(identifier: str) -> bool:
    """Kiểm tra xem identifier có phải là số điện thoại không."""
    phone_pattern = r"^[0-9]{10,11}$"
    return bool(re.match(phone_pattern, identifier))


def _users_collection(db: Database) -> Collection:
    return db.get_collection("users")


def _find_user_by_identifier(db: Database, identifier: str) -> Optional[UserDocument]:
    users = _users_collection(db)
    if is_email(identifier):
        return users.find_one({"email": identifier.lower()})
    if is_phone_number(identifier):
        return users.find_one({"phone_number": identifier})
    return None


def get_current_user(
    token: Optional[str] = Depends(optional_oauth2_scheme),
    db: Database = Depends(get_database),
) -> UserDocument:
    if not token:
        raise HTTPException(status_code=401, detail="Yêu cầu đăng nhập")
    identifier = decode_access_token(token)
    if not identifier:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    user = _find_user_by_identifier(db, identifier)
    if not user:
        raise HTTPException(status_code=401, detail="Không tìm thấy người dùng")
    return user


def get_current_user_optional(
    token: Optional[str] = Depends(optional_oauth2_scheme),
    db: Database = Depends(get_database),
) -> Optional[UserDocument]:
    if not token:
        return None
    identifier = decode_access_token(token)
    if not identifier:
        return None
    return _find_user_by_identifier(db, identifier)
