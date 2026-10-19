from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth import get_authenticated_user, get_current_user
from models.user import User
from schemas.auth import AccessToken, UserPublic
from schemas.users import PasswordChange, UserProfileUpdate
from security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
def read_my_profile(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    return user


@router.patch("/me", response_model=UserPublic)
def update_my_profile(
    profile: UserProfileUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    updates = profile.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one profile field to update",
        )
    if (
        ("full_name" in updates and updates["full_name"] is None)
        or ("email" in updates and updates["email"] is None)
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name and email cannot be null",
        )

    if "email" in updates:
        updates["email"] = str(updates["email"])
    duplicate_conditions = []
    if "email" in updates:
        duplicate_conditions.append(User.email == updates["email"])
    if "phone_number" in updates and updates["phone_number"] is not None:
        duplicate_conditions.append(User.phone_number == updates["phone_number"])
    if duplicate_conditions:
        duplicate = db.scalar(
            select(User).where(
                User.id != user.id,
                or_(*duplicate_conditions),
            )
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email or phone number is already registered",
            )

    for field, value in updates.items():
        setattr(user, field, value)
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


@router.post("/me/password", response_model=AccessToken)
def change_my_password(
    payload: PasswordChange,
    user: Annotated[User, Depends(get_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AccessToken:
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )

    user.hashed_password = hash_password(payload.new_password)
    user.must_change_password = False
    user.token_version += 1
    db.add(user)
    db.commit()
    return AccessToken(
        access_token=create_access_token(user.id, user.token_version)
    )
