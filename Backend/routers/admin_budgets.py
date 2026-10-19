from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Integer, cast, extract, func, select
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth import require_admin
from models.budget import Budget
from models.expense import Expense
from models.user import User
from routers.budgets import format_budget_summary, month_start_and_next
from schemas.budgets import AdminBudgetSummary


router = APIRouter(prefix="/admin/budgets", tags=["admin budgets"])


@router.get("", response_model=list[AdminBudgetSummary])
def list_all_budgets(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[AdminBudgetSummary]:
    budget_rows = db.execute(
        select(Budget, User)
        .join(User, User.id == Budget.owner_id)
        .order_by(Budget.budget_month.desc(), Budget.id)
        .limit(limit)
        .offset(offset)
    ).all()
    if not budget_rows:
        return []

    budgets = [budget for budget, _user in budget_rows]
    first_month = min(budget.budget_month for budget in budgets)
    last_month = max(budget.budget_month for budget in budgets)
    next_month = month_start_and_next(
        last_month.year,
        last_month.month,
    )[1]
    user_ids = {budget.owner_id for budget in budgets}

    spending_rows = db.execute(
        select(
            Expense.owner_id,
            cast(extract("year", Expense.expense_date), Integer),
            cast(extract("month", Expense.expense_date), Integer),
            func.sum(Expense.amount),
        )
        .where(
            Expense.owner_id.in_(user_ids),
            Expense.expense_date >= first_month,
            Expense.expense_date < next_month,
        )
        .group_by(
            Expense.owner_id,
            extract("year", Expense.expense_date),
            extract("month", Expense.expense_date),
        )
    ).all()
    spending_by_user_month = {
        (user_id, year, month): Decimal(total)
        for user_id, year, month, total in spending_rows
    }

    result = []
    for budget, user in budget_rows:
        summary = format_budget_summary(
            budget.budget_month,
            budget,
            spending_by_user_month.get(
                (
                    budget.owner_id,
                    budget.budget_month.year,
                    budget.budget_month.month,
                ),
                Decimal("0"),
            ),
        )
        result.append(
            AdminBudgetSummary(
                **summary.model_dump(),
                user_id=user.id,
                user_full_name=user.full_name,
                user_email=user.email,
            )
        )
    return result
