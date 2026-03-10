"""
Theme ORM model.

A Theme is a named set of CSS custom property values stored as a JSON object.
Exactly one theme is active at any time. The active theme's variables are
fetched on frontend load and injected into :root.

The `variables` column holds a JSON-encoded dict mapping CSS variable names
(without the '--' prefix) to color values. Example:

    {
        "color-bg": "#ffffff",
        "color-surface": "#f5f5f5",
        "color-text": "#1a1a1a",
        "color-primary": "#4f46e5",
        "color-accent": "#7c3aed",
        "color-border": "#e5e7eb",
        "color-text-muted": "#6b7280",
        "color-danger": "#dc2626"
    }

Built-in themes (light and dark) are seeded at startup if the table is empty.
They can be selected but not deleted. The `is_builtin` flag marks them.
"""

import json

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Theme(Base):
    __tablename__ = "themes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_builtin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # JSON-encoded dict: { "css-variable-name": "value", ... }
    variables: Mapped[str] = mapped_column(Text, nullable=False, default="{}")

    def get_variables(self) -> dict[str, str]:
        """Return the decoded CSS variable map."""
        return json.loads(self.variables)

    def __repr__(self) -> str:
        return (
            f"<Theme id={self.id} name={self.name!r} "
            f"active={self.is_active} builtin={self.is_builtin}>"
        )
