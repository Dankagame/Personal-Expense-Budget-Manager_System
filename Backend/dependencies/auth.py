from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from config import settings
from database import get_db
from models.user import User
from security import ALGORITHM


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_authenticated_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[ALGORITHM],
        )
        subject = payload.get("sub")
        token_version = payload.get("ver")
        user_id = int(subject)
        if not isinstance(token_version, int) or token_version < 0:
            raise unauthorized
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise unauthorized from None

    user = db.scalar(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    if user is None or user.token_version != token_version:
        raise unauthorized

    return user


def get_current_user(
    user: Annotated[User, Depends(get_authenticated_user)],
) -> User:
    if user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must change your temporary password before continuing",
        )
    return user


def require_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not any(role.name == "admin" for role in user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required",
        )
    return user
