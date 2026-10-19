from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import cast, extract, func, Integer, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth import get_current_user
from models.budget import Budget
from models.expense import Expense
from models.user import User
from schemas.budgets import BudgetAmount, BudgetSummary


router = APIRouter(prefix="/budgets", tags=["budgets"])


def month_start_and_next(year: int, month: int) -> tuple[date, date]:
    month_start = date(year, month, 1)
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    return month_start, next_month


def build_budget_summary(
    db: Session,
    user_id: int,
    budget_month: date,
    next_month: date,
    budget: Budget | None,
) -> BudgetSummary:
    total_spent = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.owner_id == user_id,
            Expense.expense_date >= budget_month,
            Expense.expense_date < next_month,
        )
    )
    spent = Decimal(total_spent or 0)

    return format_budget_summary(budget_month, budget, spent)


def format_budget_summary(
    budget_month: date,
    budget: Budget | None,
    spent: Decimal,
) -> BudgetSummary:
    if budget is None:
        amount = None
        remaining = None
        budget_status = "not_set"
    else:
        amount = budget.amount
        remaining = amount - spent
        if spent > amount:
            budget_status = "over"
        elif amount > 0 and spent >= amount * Decimal("0.80"):
            budget_status = "approaching"
        else:
            budget_status = "within"

    return BudgetSummary(
        budget_month=budget_month,
        budget_amount=amount,
        total_spent=spent,
        remaining=remaining,
        status=budget_status,
    )


@router.get("/current", response_model=BudgetSummary)
def get_current_month_budget(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BudgetSummary:
    current_month = date.today().replace(day=1)
    next_month = month_start_and_next(
        current_month.year,
        current_month.month,
    )[1]
    budget = db.scalar(
        select(Budget).where(
            Budget.owner_id == user.id,
            Budget.budget_month == current_month,
        )
    )
    return build_budget_summary(
        db,
        user.id,
        current_month,
        next_month,
        budget,
    )


@router.get("", response_model=list[BudgetSummary])
def list_my_budgets(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[BudgetSummary]:
    budgets = db.scalars(
        select(Budget)
        .where(Budget.owner_id == user.id)
        .order_by(Budget.budget_month.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    if not budgets:
        return []

    month_spending_rows = db.execute(
        select(
            cast(extract("year", Expense.expense_date), Integer),
            cast(extract("month", Expense.expense_date), Integer),
            func.sum(Expense.amount),
        )
        .where(
            Expense.owner_id == user.id,
            Expense.expense_date >= budgets[-1].budget_month,
            Expense.expense_date < month_start_and_next(
                budgets[0].budget_month.year,
                budgets[0].budget_month.month,
            )[1],
        )
        .group_by(
            extract("year", Expense.expense_date),
            extract("month", Expense.expense_date),
        )
    ).all()
    spending_by_month = {
        (year, month): Decimal(total)
        for year, month, total in month_spending_rows
    }

    return [
        format_budget_summary(
            budget.budget_month,
            budget,
            spending_by_month.get(
                (budget.budget_month.year, budget.budget_month.month),
                Decimal("0"),
            ),
        )
        for budget in budgets
    ]


@router.get("/{year}/{month}", response_model=BudgetSummary)
def get_monthly_budget(
    year: Annotated[int, Path(ge=1, le=9998)],
    month: Annotated[int, Path(ge=1, le=12)],
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BudgetSummary:
    budget_month, next_month = month_start_and_next(year, month)
    budget = db.scalar(
        select(Budget).where(
            Budget.owner_id == user.id,
            Budget.budget_month == budget_month,
        )
    )
    return build_budget_summary(
        db,
        user.id,
        budget_month,
        next_month,
        budget,
    )


@router.put("/{year}/{month}", response_model=BudgetSummary)
def set_monthly_budget(
    payload: BudgetAmount,
    year: Annotated[int, Path(ge=1, le=9998)],
    month: Annotated[int, Path(ge=1, le=12)],
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BudgetSummary:
    budget_month, next_month = month_start_and_next(year, month)
    budget = db.scalar(
        select(Budget).where(
            Budget.owner_id == user.id,
            Budget.budget_month == budget_month,
        )
    )

    if budget is None:
        budget = Budget(
            owner_id=user.id,
            budget_month=budget_month,
            amount=payload.amount,
        )
        db.add(budget)
    else:
        budget.amount = payload.amount

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Budget changed concurrently; retry the request",
        ) from None

    return build_budget_summary(
        db,
        user.id,
        budget_month,
        next_month,
        budget,
    )
