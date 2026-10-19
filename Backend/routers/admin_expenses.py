from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from dependencies.auth import require_admin
from models.expense import Expense
from models.user import User
from routers.expenses import to_expense_public
from schemas.expenses import AdminExpensePublic


router = APIRouter(prefix="/admin/expenses", tags=["admin expenses"])


@router.get("", response_model=list[AdminExpensePublic])
def list_all_expenses(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
    owner_id: Annotated[int | None, Query(gt=0)] = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[AdminExpensePublic]:
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be on or before end_date",
        )

    query = (
        select(Expense, User)
        .join(User, User.id == Expense.owner_id)
        .options(selectinload(Expense.category))
    )
    if owner_id is not None:
        query = query.where(Expense.owner_id == owner_id)
    if start_date is not None:
        query = query.where(Expense.expense_date >= start_date)
    if end_date is not None:
        query = query.where(Expense.expense_date <= end_date)

    rows = db.execute(
        query.order_by(Expense.expense_date.desc(), Expense.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return [
        AdminExpensePublic(
            **to_expense_public(expense).model_dump(),
            owner_id=user.id,
            owner_full_name=user.full_name,
            owner_email=user.email,
        )
        for expense, user in rows
    ]
