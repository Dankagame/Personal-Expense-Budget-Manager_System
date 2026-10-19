from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth import get_current_user, require_admin
from models.category import Category
from models.expense import Expense
from models.user import User
from schemas.expenses import CategoryCreate, CategoryPublic, CategoryUpdate


router = APIRouter(tags=["categories"])


@router.get("/categories", response_model=list[CategoryPublic])
def list_categories(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)).all())


@router.post(
    "/admin/categories",
    response_model=CategoryPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    payload: CategoryCreate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> Category:
    name = payload.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Category name cannot be blank",
        )

    category = Category(name=name)
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with that name already exists",
        ) from None
    db.refresh(category)
    return category


@router.patch("/admin/categories/{category_id}", response_model=CategoryPublic)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    name = payload.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Category name cannot be blank",
        )
    category.name = name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with that name already exists",
        ) from None
    db.refresh(category)
    return category


@router.delete(
    "/admin/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_category(
    category_id: int,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    if category.name.casefold() == "uncategorized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The Uncategorized category cannot be deleted",
        )

    uncategorized = db.scalar(
        select(Category).where(func.lower(Category.name) == "uncategorized")
    )
    if uncategorized is None:
        uncategorized = Category(name="Uncategorized")
        db.add(uncategorized)
        db.flush()

    db.query(Expense).filter(Expense.category_id == category_id).update(
        {Expense.category_id: uncategorized.id},
        synchronize_session=False,
    )
    db.delete(category)
    db.commit()
