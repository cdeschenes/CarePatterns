"""
LogEntry ORM model.

A LogEntry records one completion event for an Item. Created when the user
taps the log button on any item. The `logged_at` timestamp is always stored
as UTC (timezone-naive in the database).

`notes` is optional free text. The field exists in the schema for future use;
the v1 UI does not expose a notes input, but log entries created via the API
may include notes.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class LogEntry(Base):
    __tablename__ = "log_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # UTC datetime, timezone-naive. Use reminder_service to convert to local time.
    logged_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship
    item: Mapped["Item"] = relationship("Item", back_populates="log_entries")  # type: ignore[name-defined]  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<LogEntry id={self.id} item_id={self.item_id} "
            f"logged_at={self.logged_at.isoformat()!r}>"
        )
