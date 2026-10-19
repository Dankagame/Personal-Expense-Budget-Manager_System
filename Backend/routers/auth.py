from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.role import Role
from models.user import User
from fastapi.security import OAuth2PasswordRequestForm
from schemas.auth import AccessToken, UserPublic, UserSignup
from security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
)
def signup(
    signup_data: UserSignup,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    duplicate_conditions = [User.email == str(signup_data.email)]
    if signup_data.phone_number is not None:
        duplicate_conditions.append(User.phone_number == signup_data.phone_number)

    existing_user = db.scalar(
        select(User).where(or_(*duplicate_conditions))
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or phone number is already registered",
        )

    user_role = db.scalar(select(Role).where(Role.name == "user"))
    if user_role is None:
       raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Default user role is not configured",
        )

    user = User(
        full_name=signup_data.full_name,
        email=str(signup_data.email),
        phone_number=signup_data.phone_number,
        hashed_password=hash_password(signup_data.password),
        roles=[user_role],
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or phone number is already registered",
        ) from None

    db.refresh(user)
    return user


@router.post("/login", response_model=AccessToken)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> AccessToken:
    user = db.scalar(
        select(User).where(User.email == form_data.username)
    )

    if user is None or not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AccessToken(
        access_token=create_access_token(user.id, user.token_version)
    )
