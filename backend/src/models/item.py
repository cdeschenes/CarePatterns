"""
Item ORM model.

An Item is anything the user wants to track — a medication, a procedure,
a goal, or any custom care activity.

Categories
----------
The built-in categories are: Medication, Procedure, Goal, Other.
Users may also enter free-text custom categories. Both are stored as plain
strings in the `category` column — no DB-level enum constraint, because
SQLite has limited ALTER TABLE support and adding new built-ins later would
require a migration. The fixed-list constraint is enforced in the schema
layer and the frontend UI.

Soft delete
-----------
Items are never hard-deleted. Setting `is_active = False` archives the item
and hides it from the dashboard, while preserving all associated log history.
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

# Fixed built-in category values. Custom categories are any other string.
BUILTIN_CATEGORIES: tuple[str, ...] = ("Medication", "Procedure", "Goal", "Other")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Plain string — built-in value or user-supplied custom category.
    category: Mapped[str] = mapped_column(String(255), nullable=False, default="Other")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    max_daily_doses: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True, default=None)
    sort_order: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # Relationships
    schedule: Mapped["Schedule"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Schedule",
        back_populates="item",
        uselist=False,
        cascade="all, delete-orphan",
    )
    log_entries: Mapped[list["LogEntry"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "LogEntry",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="LogEntry.logged_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<Item id={self.id} name={self.name!r} active={self.is_active}>"
