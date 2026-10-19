"""seed default roles

Revision ID: 574d6f6589ab
Revises: e4723387bd9c
Create Date: 2026-10-19 16:20:42.184417

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '574d6f6589ab'
down_revision: Union[str, Sequence[str], None] = 'e4723387bd9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    roles_table = sa.table(
        "roles",
        sa.column("name", sa.String(length=50)),
    )

    op.bulk_insert(
        roles_table,
        [
            {"name": "user"},
            {"name": "admin"},
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        DELETE FROM roles
        WHERE name IN ('user', 'admin')
          AND NOT EXISTS (
              SELECT 1
              FROM user_roles
              WHERE user_roles.role_id = roles.id
          )
        """
    )
