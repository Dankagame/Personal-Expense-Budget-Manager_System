from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from database import get_db
from dependencies.auth import get_current_user
from models.category import Category
from models.expense import Expense
from models.user import User
from schemas.expenses import ExpenseCreate, ExpensePublic, ExpenseUpdate


router = APIRouter(prefix="/expenses", tags=["expenses"])


def get_owned_expense(db: Session, user_id: int, expense_id: int) -> Expense:
    expense = db.scalar(
        select(Expense)
        .options(selectinload(Expense.category))
        .where(
            Expense.id == expense_id,
            Expense.owner_id == user_id,
        )
    )
    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    return expense


def to_expense_public(expense: Expense) -> ExpensePublic:
    return ExpensePublic(
        id=expense.id,
        title=expense.title,
        amount=expense.amount,
        category_id=expense.category_id,
        category_name=expense.category.name,
        expense_date=expense.expense_date,
        payment_method=expense.payment_method,
        notes=expense.notes,
        created_at=expense.created_at,
    )


def validate_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Category does not exist",
        )
    return category


@router.post(
    "",
    response_model=ExpensePublic,
    status_code=status.HTTP_201_CREATED,
)
def create_expense(
    payload: ExpenseCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ExpensePublic:
    category = validate_category(db, payload.category_id)
    expense = Expense(
        owner_id=user.id,
        title=payload.title,
        amount=payload.amount,
        category_id=category.id,
        expense_date=payload.expense_date,
        payment_method=payload.payment_method,
        notes=payload.notes,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return to_expense_public(get_owned_expense(db, user.id, expense.id))


@router.get("", response_model=list[ExpensePublic])
def list_expenses(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    category_id: Annotated[int | None, Query(gt=0)] = None,
    payment_method: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
    start_date: date | None = None,
    end_date: date | None = None,
    min_amount: Annotated[Decimal | None, Query(ge=0)] = None,
    max_amount: Annotated[Decimal | None, Query(ge=0)] = None,
    search: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
    sort_by: Literal["expense_date", "amount"] = "expense_date",
    sort_order: Literal["asc", "desc"] = "desc",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ExpensePublic]:
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be on or before end_date",
        )
    if min_amount is not None and max_amount is not None and min_amount > max_amount:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_amount must not exceed max_amount",
        )

    query = (
        select(Expense)
        .options(selectinload(Expense.category))
        .where(Expense.owner_id == user.id)
    )
    if category_id is not None:
        query = query.where(Expense.category_id == category_id)
    if payment_method is not None:
        query = query.where(Expense.payment_method == payment_method)
    if start_date is not None:
        query = query.where(Expense.expense_date >= start_date)
    if end_date is not None:
        query = query.where(Expense.expense_date <= end_date)
    if min_amount is not None:
        query = query.where(Expense.amount >= min_amount)
    if max_amount is not None:
        query = query.where(Expense.amount <= max_amount)
    if search is not None:
        pattern = f"%{search}%"
        query = query.where(
            or_(Expense.title.ilike(pattern), Expense.notes.ilike(pattern))
        )

    order_column = Expense.amount if sort_by == "amount" else Expense.expense_date
    if sort_order == "desc":
        order_column = order_column.desc()
    else:
        order_column = order_column.asc()
    expenses = db.scalars(
        query.order_by(order_column, Expense.id.desc()).limit(limit).offset(offset)
    ).all()
    return [to_expense_public(expense) for expense in expenses]


@router.get("/{expense_id}", response_model=ExpensePublic)
def read_expense(
    expense_id: Annotated[int, Path(gt=0)],
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ExpensePublic:
    return to_expense_public(get_owned_expense(db, user.id, expense_id))


@router.patch("/{expense_id}", response_model=ExpensePublic)
def update_expense(
    expense_id: Annotated[int, Path(gt=0)],
    payload: ExpenseUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ExpensePublic:
    expense = get_owned_expense(db, user.id, expense_id)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one expense field to update",
        )
    for required_field in (
        "title",
        "amount",
        "category_id",
        "expense_date",
        "payment_method",
    ):
        if required_field in updates and updates[required_field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{required_field} cannot be null",
            )
    if "category_id" in updates:
        validate_category(db, updates["category_id"])
    for field, value in updates.items():
        setattr(expense, field, value)
    db.add(expense)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Expense update violates a data constraint",
        ) from None
    return to_expense_public(get_owned_expense(db, user.id, expense.id))


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: Annotated[int, Path(gt=0)],
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    expense = get_owned_expense(db, user.id, expense_id)
    db.delete(expense)
    db.commit()
