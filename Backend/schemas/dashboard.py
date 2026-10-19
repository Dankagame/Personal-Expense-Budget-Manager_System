from decimal import Decimal

from pydantic import BaseModel

from schemas.expenses import ExpensePublic


class CategorySpending(BaseModel):
    category_id: int
    category_name: str
    amount: Decimal


class DashboardSummary(BaseModel):
    total_spending: Decimal
    budget_amount: Decimal | None
    remaining_budget: Decimal | None
    highest_expense: ExpensePublic | None
    spending_by_category: list[CategorySpending]
    recent_expenses: list[ExpensePublic]
