from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from database import get_db
from dependencies.auth import require_admin
from models.budget import Budget
from models.expense import Expense
from models.role import Role
from models.user import User
from models.user_role import user_roles
from schemas.users import AdminCreate, AdminUserPublic, TemporaryPasswordReset, UserProfileUpdate
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


@router.post("", response_model=AdminUserPublic, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    payload: AdminCreate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminUserPublic:
    full_name = payload.full_name.strip()
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Admin name cannot be blank",
        )

    email = str(payload.email).lower()
    phone_number = payload.phone_number.strip() if payload.phone_number else None
    duplicate_conditions = [func.lower(User.email) == email]
    if phone_number:
        duplicate_conditions.append(User.phone_number == phone_number)
    if db.scalar(select(User.id).where(or_(*duplicate_conditions))) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or phone number is already registered",
        )

    admin_role = db.scalar(select(Role).where(Role.name == "admin"))
    if admin_role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin role is not configured",
        )

    user = User(
        full_name=full_name,
        email=email,
        phone_number=phone_number,
        hashed_password=hash_password(payload.password),
        roles=[admin_role],
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
    return to_admin_user_public(user)


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


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_user(
    user_id: int,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    admin_role = db.scalar(
        select(Role).where(Role.name == "admin").with_for_update()
    )
    if admin_role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin role is not configured",
        )

    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if user is None or not any(role.id == admin_role.id for role in user.roles):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found",
        )
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot delete your own admin account",
        )

    admin_count = db.scalar(
        select(func.count()).select_from(user_roles).where(
            user_roles.c.role_id == admin_role.id
        )
    )
    if admin_count is None or admin_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The last admin account cannot be deleted",
        )
    has_expenses = db.scalar(
        select(Expense.id).where(Expense.owner_id == user.id).limit(1)
    ) is not None
    has_budgets = db.scalar(
        select(Budget.id).where(Budget.owner_id == user.id).limit(1)
    ) is not None
    if has_expenses or has_budgets:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This admin has expenses or budgets and cannot be deleted",
        )

    db.delete(user)
    db.commit()


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
