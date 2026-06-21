"""merge migration heads

Revision ID: 081dc6dd7927
Revises: 60a8aca1a036, b91f8c22
Create Date: 2026-06-21 04:27:29.915644

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '081dc6dd7927'

down_revision: Union[str, None] = (
    '60a8aca1a036',
    'b91f8c22'
)

branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass