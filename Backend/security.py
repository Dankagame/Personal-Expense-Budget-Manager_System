from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from config import settings

password_hash = PasswordHash.recommended()

ACCESS_TOKEN_EXPIRE_MINUTES = 30
ALGORITHM= "HS256"

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(plain_password: str , hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def create_access_token(user_id: int, token_version: int = 0) -> str:
    expire_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "ver": token_version,
        "exp": expire_at,
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=ALGORITHM,
    )