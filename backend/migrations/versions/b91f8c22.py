"""add full_name to users

Revision ID: blackboxai_add_full_name_to_users
Revises: e9a90945a9c8
Create Date: 2026-06-21

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b91f8c22"
down_revision: Union[str, None] = "e9a90945a9c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("full_name", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "full_name")

