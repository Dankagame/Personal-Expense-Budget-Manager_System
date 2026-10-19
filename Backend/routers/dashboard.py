from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from dependencies.auth import get_current_user
from models.budget import Budget
from models.category import Category
from models.expense import Expense
from models.user import User
from routers.expenses import to_expense_public
from schemas.dashboard import CategorySpending, DashboardSummary


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardSummary)
def get_dashboard(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DashboardSummary:
    current_month = date.today().replace(day=1)
    if current_month.month == 12:
        next_month = date(current_month.year + 1, 1, 1)
    else:
        next_month = date(current_month.year, current_month.month + 1, 1)

    total_spending = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.owner_id == user.id,
            Expense.expense_date >= current_month,
            Expense.expense_date < next_month,
        )
    )
    budget = db.scalar(
        select(Budget).where(
            Budget.owner_id == user.id,
            Budget.budget_month == current_month,
        )
    )
    spent = Decimal(total_spending or 0)

    highest_expense = db.scalar(
        select(Expense)
        .options(selectinload(Expense.category))
        .where(
            Expense.owner_id == user.id,
            Expense.expense_date >= current_month,
            Expense.expense_date < next_month,
        )
        .order_by(Expense.amount.desc(), Expense.id.desc())
        .limit(1)
    )
    recent_expenses = db.scalars(
        select(Expense)
        .options(selectinload(Expense.category))
        .where(Expense.owner_id == user.id)
        .order_by(Expense.expense_date.desc(), Expense.id.desc())
        .limit(5)
    ).all()
    category_rows = db.execute(
        select(
            Category.id,
            Category.name,
            func.sum(Expense.amount),
        )
        .join(Expense, Expense.category_id == Category.id)
        .where(
            Expense.owner_id == user.id,
            Expense.expense_date >= current_month,
            Expense.expense_date < next_month,
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Expense.amount).desc(), Category.name)
    ).all()

    return DashboardSummary(
        total_spending=spent,
        budget_amount=budget.amount if budget is not None else None,
        remaining_budget=budget.amount - spent if budget is not None else None,
        highest_expense=(
            to_expense_public(highest_expense)
            if highest_expense is not None
            else None
        ),
        spending_by_category=[
            CategorySpending(
                category_id=category_id,
                category_name=category_name,
                amount=Decimal(amount),
            )
            for category_id, category_name, amount in category_rows
        ],
        recent_expenses=[
            to_expense_public(expense)
            for expense in recent_expenses
        ],
    )
