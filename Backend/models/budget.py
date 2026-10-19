from datetime import date
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Numeric,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint(
            "owner_id",
            "budget_month",
            name="uq_budgets_owner_month",
        ),
        CheckConstraint(
            "EXTRACT(DAY FROM budget_month) = 1",
            name="ck_budgets_month_starts_on_first",
        ),
        CheckConstraint(
            "amount >= 0",
            name="ck_budgets_amount_nonnegative",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    budget_month: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    owner: Mapped["User"] = relationship(back_populates="budgets")