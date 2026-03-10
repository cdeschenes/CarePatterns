"""
Pydantic v2 schemas for LogEntry request and response bodies.

LogEntryCreate is minimal — item_id comes from the URL path parameter in the
router, so only `notes` is accepted in the request body (optional).

LogEntryRead includes `item_name` so the frontend can display the item name
in the log history without a second request.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LogEntryCreate(BaseModel):
    """Request body for POST /items/{id}/log. item_id is taken from the path."""

    notes: str | None = Field(default=None)


class LogEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    item_name: str
    category: str
    logged_at: datetime
    notes: str | None

    @classmethod
    def from_orm(cls, entry) -> "LogEntryRead":  # type: ignore[no-untyped-def]
        """Build from a LogEntry ORM instance. Requires entry.item to be loaded."""
        return cls(
            id=entry.id,
            item_id=entry.item_id,
            item_name=entry.item.name,
            category=entry.item.category,
            logged_at=entry.logged_at,
            notes=entry.notes,
        )
