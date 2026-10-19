"""Seed useful expense categories for a new installation.

Revision ID: c7d3e9a1b2f4
Revises: 91c4e8a2f6d0
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d3e9a1b2f4"
down_revision: Union[str, Sequence[str], None] = "91c4e8a2f6d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO categories (name)
            SELECT seed.name
            FROM (VALUES
                ('Uncategorized'),
                ('Food'),
                ('Housing'),
                ('Transport'),
                ('Utilities'),
                ('Health'),
                ('Shopping'),
                ('Entertainment')
            ) AS seed(name)
            WHERE NOT EXISTS (
                SELECT 1 FROM categories
                WHERE lower(categories.name) = lower(seed.name)
            )
            """
        )
    )


def downgrade() -> None:
    # Expense records may now refer to these shared categories. Keep them intact.
    pass
