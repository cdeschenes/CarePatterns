"""
Schedule ORM model.

Each active Item may have at most one Schedule. A Schedule defines how often
the item is expected to be logged and, optionally, at what time of day.

Frequency types
---------------
- once_daily   : expected once per calendar day (in the configured timezone)
- twice_daily  : expected twice per calendar day
- weekly       : expected once per week on specified days_of_week
- custom       : every `interval_value` `interval_unit`s (e.g. every 8 hours)

SQLite storage for list-valued columns
---------------------------------------
SQLite has no native array type. `time_of_day` and `days_of_week` are stored
as JSON-encoded strings (e.g. '["09:00", "21:00"]' and '["Mon", "Thu"]').
Encoding/decoding is handled in the schema layer (Pydantic validators), not here.

Timezone
--------
The `TIMEZONE` env var governs how `time_of_day` values are interpreted.
All comparison logic lives in `reminder_service.py`.
"""

import json
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

VALID_FREQUENCY_TYPES: tuple[str, ...] = (
    "once_daily",
    "twice_daily",
    "weekly",
    "custom",
)

VALID_INTERVAL_UNITS: tuple[str, ...] = ("minutes", "hours", "days", "weeks")


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One schedule per item
        index=True,
    )

    # One of: once_daily, twice_daily, weekly, custom
    frequency_type: Mapped[str] = mapped_column(String(32), nullable=False)

    # Used only when frequency_type == "custom"
    interval_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interval_unit: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # JSON-encoded list of "HH:MM" strings (24-hour, in configured timezone).
    # Example: '["09:00"]' for once_daily, '["09:00", "21:00"]' for twice_daily.
    # May be null for weekly or custom schedules with no specific time.
    time_of_day: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON-encoded list of day abbreviations for weekly schedules.
    # Example: '["Mon", "Wed", "Fri"]'
    # Null for non-weekly schedules.
    days_of_week: Mapped[str | None] = mapped_column(Text, nullable=True)

    starts_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # Relationship
    item: Mapped["Item"] = relationship("Item", back_populates="schedule")  # type: ignore[name-defined]  # noqa: F821

    def get_time_of_day(self) -> list[str]:
        """Return the decoded time_of_day list, or empty list if null."""
        if self.time_of_day is None:
            return []
        return json.loads(self.time_of_day)

    def get_days_of_week(self) -> list[str]:
        """Return the decoded days_of_week list, or empty list if null."""
        if self.days_of_week is None:
            return []
        return json.loads(self.days_of_week)

    def __repr__(self) -> str:
        return (
            f"<Schedule id={self.id} item_id={self.item_id} "
            f"frequency={self.frequency_type!r}>"
        )
