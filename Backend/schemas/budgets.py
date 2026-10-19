from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class BudgetAmount(BaseModel):
    amount: Decimal = Field(ge=Decimal("0"), max_digits=12, decimal_places=2)


class BudgetSummary(BaseModel):
    budget_month: date
    budget_amount: Decimal | None
    total_spent: Decimal
    remaining: Decimal | None
    status: Literal["not_set", "within", "approaching", "over"]


class AdminBudgetSummary(BudgetSummary):
    user_id: int
    user_full_name: str
    user_email: str
