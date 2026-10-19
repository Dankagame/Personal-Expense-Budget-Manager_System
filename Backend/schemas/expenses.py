from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    amount: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=2)
    category_id: int = Field(gt=0)
    expense_date: date
    payment_method: str = Field(min_length=1, max_length=50)
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    amount: Decimal | None = Field(
        default=None,
        gt=Decimal("0"),
        max_digits=12,
        decimal_places=2,
    )
    category_id: int | None = Field(default=None, gt=0)
    expense_date: date | None = None
    payment_method: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )
    notes: str | None = None


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CategoryUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CategoryPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ExpensePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    amount: Decimal
    category_id: int
    category_name: str
    expense_date: date
    payment_method: str
    notes: str | None
    created_at: datetime


class AdminExpensePublic(ExpensePublic):
    owner_id: int
    owner_full_name: str
    owner_email: str
