"""
Pydantic v2 schemas for Schedule request and response bodies.

Validation rules
----------------
- frequency_type must be one of: once_daily, twice_daily, weekly, custom
- interval_value and interval_unit are required when frequency_type == "custom"
- interval_unit must be one of: minutes, hours, days, weeks
- time_of_day items must be "HH:MM" strings in 24-hour format
- days_of_week items must be three-letter abbreviations: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- For weekly schedules, days_of_week must be non-empty
- JSON encoding of time_of_day and days_of_week is done here before writing to the DB

The ORM stores time_of_day and days_of_week as JSON-encoded strings.
ScheduleRead decodes them back to lists for the API response.
"""

from __future__ import annotations

import json
import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.models.schedule import VALID_FREQUENCY_TYPES, VALID_INTERVAL_UNITS

_TIME_RE = re.compile(r"^\d{2}:\d{2}$")
_VALID_DAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


def _validate_time_list(values: list[str]) -> list[str]:
    for v in values:
        if not _TIME_RE.match(v):
            raise ValueError(
                f"time_of_day entries must be 'HH:MM' (24-hour). Got: {v!r}"
            )
        h, m = v.split(":")
        if not (0 <= int(h) <= 23 and 0 <= int(m) <= 59):
            raise ValueError(f"time_of_day entry out of range: {v!r}")
    return values


def _validate_days_list(values: list[str]) -> list[str]:
    for v in values:
        if v not in _VALID_DAYS:
            raise ValueError(
                f"days_of_week entries must be one of {_VALID_DAYS}. Got: {v!r}"
            )
    return values


class ScheduleCreate(BaseModel):
    frequency_type: str
    interval_value: int | None = Field(default=None, gt=0)
    interval_unit: str | None = Field(default=None)
    time_of_day: list[str] = Field(default_factory=list)
    days_of_week: list[str] = Field(default_factory=list)
    starts_at: datetime | None = Field(default=None)

    @model_validator(mode="after")
    def validate_schedule(self) -> "ScheduleCreate":
        if self.frequency_type not in VALID_FREQUENCY_TYPES:
            raise ValueError(
                f"frequency_type must be one of {VALID_FREQUENCY_TYPES}. "
                f"Got: {self.frequency_type!r}"
            )

        if self.frequency_type == "custom":
            if self.interval_value is None:
                raise ValueError("interval_value is required for custom frequency.")
            if self.interval_unit is None:
                raise ValueError("interval_unit is required for custom frequency.")
            if self.interval_unit not in VALID_INTERVAL_UNITS:
                raise ValueError(
                    f"interval_unit must be one of {VALID_INTERVAL_UNITS}. "
                    f"Got: {self.interval_unit!r}"
                )

        if self.frequency_type == "weekly" and not self.days_of_week:
            raise ValueError(
                "days_of_week must be non-empty for weekly frequency."
            )

        if self.time_of_day:
            _validate_time_list(self.time_of_day)

        if self.days_of_week:
            _validate_days_list(self.days_of_week)

        return self

    def time_of_day_json(self) -> str:
        """Return time_of_day encoded as a JSON string for ORM storage."""
        return json.dumps(self.time_of_day)

    def days_of_week_json(self) -> str:
        """Return days_of_week encoded as a JSON string for ORM storage."""
        return json.dumps(self.days_of_week)


class ScheduleUpdate(BaseModel):
    """All fields optional — only supplied fields are updated (PATCH semantics)."""

    frequency_type: str | None = Field(default=None)
    interval_value: int | None = Field(default=None, gt=0)
    interval_unit: str | None = Field(default=None)
    time_of_day: list[str] | None = Field(default=None)
    days_of_week: list[str] | None = Field(default=None)
    starts_at: datetime | None = Field(default=None)

    @model_validator(mode="after")
    def validate_update(self) -> "ScheduleUpdate":
        if self.frequency_type is not None:
            if self.frequency_type not in VALID_FREQUENCY_TYPES:
                raise ValueError(
                    f"frequency_type must be one of {VALID_FREQUENCY_TYPES}."
                )

        if self.interval_unit is not None:
            if self.interval_unit not in VALID_INTERVAL_UNITS:
                raise ValueError(
                    f"interval_unit must be one of {VALID_INTERVAL_UNITS}."
                )

        if self.time_of_day is not None:
            _validate_time_list(self.time_of_day)

        if self.days_of_week is not None:
            _validate_days_list(self.days_of_week)

        return self

    def time_of_day_json(self) -> str | None:
        """Return JSON-encoded time_of_day, or None if not set."""
        if self.time_of_day is None:
            return None
        return json.dumps(self.time_of_day)

    def days_of_week_json(self) -> str | None:
        """Return JSON-encoded days_of_week, or None if not set."""
        if self.days_of_week is None:
            return None
        return json.dumps(self.days_of_week)


class ScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    frequency_type: str
    interval_value: int | None
    interval_unit: str | None
    time_of_day: list[str]
    days_of_week: list[str]
    starts_at: datetime

    @classmethod
    def from_orm(cls, schedule) -> "ScheduleRead":  # type: ignore[no-untyped-def]
        """Build from a Schedule ORM instance, decoding JSON list columns."""
        return cls(
            id=schedule.id,
            item_id=schedule.item_id,
            frequency_type=schedule.frequency_type,
            interval_value=schedule.interval_value,
            interval_unit=schedule.interval_unit,
            time_of_day=schedule.get_time_of_day(),
            days_of_week=schedule.get_days_of_week(),
            starts_at=schedule.starts_at,
        )
