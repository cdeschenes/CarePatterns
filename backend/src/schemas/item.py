"""
Pydantic v2 schemas for Item request and response bodies.

Category validation
-------------------
The `category` field accepts any of the four built-in values OR any non-empty
string (custom category). Validation rejects empty strings and strings that are
whitespace-only. The fixed list is documented in the model; enforcement here
is intentionally permissive — the frontend enforces the fixed-list UI.

ItemRead includes a nested ScheduleRead if the item has a schedule, so the
dashboard can display scheduling status without a second request.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.models.item import BUILTIN_CATEGORIES


def _validate_category(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError("category must not be empty or whitespace-only.")
    return stripped


class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(default="Other", max_length=255)
    description: str | None = Field(default=None)
    max_daily_doses: int | None = Field(default=None, ge=1)
    color: str | None = Field(default=None, max_length=7)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        return _validate_category(v)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("name must not be empty or whitespace-only.")
        return stripped


class ItemUpdate(BaseModel):
    """All fields optional — only supplied fields are updated (PATCH semantics)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)
    max_daily_doses: int | None = Field(default=None, ge=1)
    color: str | None = Field(default=None, max_length=7)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _validate_category(v)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            raise ValueError("name must not be empty or whitespace-only.")
        return stripped


class ScheduleRead(BaseModel):
    """Nested schedule summary included in ItemRead. Imported here to avoid circular imports."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    frequency_type: str
    interval_value: int | None
    interval_unit: str | None
    time_of_day: list[str]
    days_of_week: list[str]
    starts_at: datetime

    @classmethod
    def from_orm_schedule(cls, schedule) -> "ScheduleRead":  # type: ignore[no-untyped-def]
        """Build from a Schedule ORM instance, decoding JSON list columns."""
        return cls(
            id=schedule.id,
            frequency_type=schedule.frequency_type,
            interval_value=schedule.interval_value,
            interval_unit=schedule.interval_unit,
            time_of_day=schedule.get_time_of_day(),
            days_of_week=schedule.get_days_of_week(),
            starts_at=schedule.starts_at,
        )


class ItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    description: str | None
    is_active: bool
    created_at: datetime
    last_logged_at: datetime | None = None
    schedule: ScheduleRead | None = None
    max_daily_doses: int | None = None
    doses_today: int = 0
    color: str | None = None
    sort_order: int | None = None

    @classmethod
    def from_orm_item(
        cls,
        item,
        last_logged_at: "datetime | None" = None,
        doses_today: int = 0,
    ) -> "ItemRead":  # type: ignore[no-untyped-def]
        """Build from an Item ORM instance, resolving the nested schedule.

        ``last_logged_at`` and ``doses_today`` must be provided separately
        because they are computed by correlated subqueries in the router —
        not loaded as ORM relationships to avoid N+1 queries.
        """
        schedule = None
        if item.schedule is not None:
            schedule = ScheduleRead.from_orm_schedule(item.schedule)
        return cls(
            id=item.id,
            name=item.name,
            category=item.category,
            description=item.description,
            is_active=item.is_active,
            created_at=item.created_at,
            last_logged_at=last_logged_at,
            schedule=schedule,
            max_daily_doses=item.max_daily_doses,
            doses_today=doses_today,
            color=item.color,
            sort_order=item.sort_order,
        )


class ReorderRequest(BaseModel):
    ordered_ids: list[int]


# Expose built-in categories for the OpenAPI docs / frontend reference.
BUILTIN_CATEGORY_LIST: list[str] = list(BUILTIN_CATEGORIES)
