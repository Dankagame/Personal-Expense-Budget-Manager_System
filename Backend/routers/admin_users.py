from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from database import get_db
from dependencies.auth import require_admin
from models.user import User
from schemas.users import AdminUserPublic, TemporaryPasswordReset, UserProfileUpdate
from security import hash_password


router = APIRouter(prefix="/admin/users", tags=["admin users"])


def to_admin_user_public(user: User) -> AdminUserPublic:
    return AdminUserPublic(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone_number=user.phone_number,
        created_at=user.created_at,
        roles=[role.name for role in user.roles],
        must_change_password=user.must_change_password,
    )


@router.get("", response_model=list[AdminUserPublic])
def list_users(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[AdminUserPublic]:
    users = db.scalars(
        select(User)
        .options(selectinload(User.roles))
        .order_by(User.id)
        .limit(limit)
        .offset(offset)
    ).all()
    return [to_admin_user_public(user) for user in users]


@router.get("/{user_id}", response_model=AdminUserPublic)
def read_user(
    user_id: int,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminUserPublic:
    user = db.scalar(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return to_admin_user_public(user)


@router.patch("/{user_id}", response_model=AdminUserPublic)
def update_user(
    user_id: int,
    profile: UserProfileUpdate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminUserPublic:
    user = db.scalar(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

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
    return to_admin_user_public(user)


@router.post("/{user_id}/password-reset", status_code=status.HTTP_204_NO_CONTENT)
def reset_user_password(
    user_id: int,
    payload: TemporaryPasswordReset,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.hashed_password = hash_password(payload.temporary_password)
    user.must_change_password = True
    user.token_version += 1
    db.add(user)
    db.commit()
