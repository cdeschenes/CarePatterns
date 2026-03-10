"""
Reminder service — determines which scheduled items are currently overdue.

Timezone handling
-----------------
All datetimes in the database are UTC-naive. This module converts to the
user's configured timezone (ZoneInfo) only for calendar-boundary comparisons
("is it today?", "is it this week on a scheduled day?"). All interval
arithmetic stays in UTC.

Overdue logic per frequency type
---------------------------------
once_daily
    Overdue if no log entry exists for the current calendar day (in user tz)
    AND the first time_of_day has passed (or no time is set, meaning midnight).

twice_daily
    Overdue if fewer than the number of scheduled times have been logged
    today (in user tz). E.g. two times set → need 2 entries today.
    Falls back to "fewer than 2" if time_of_day is not set.

weekly
    Overdue if today (in user tz) is a scheduled day AND no log entry exists
    for today after the scheduled time_of_day (or midnight if none set).

custom
    Overdue if no log entry exists within the last interval_value interval_units.
    E.g. "every 8 hours" → overdue if last log is >8 hours ago.
    Items that have never been logged and have a custom schedule are immediately
    overdue regardless of interval.

Never-logged items
    Any scheduled item with zero log entries is immediately outstanding.

Items with is_active=False are never returned.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from src.models.item import Item
from src.models.log_entry import LogEntry
from src.models.schedule import Schedule


def _utc_now() -> datetime:
    """Return the current UTC time as a timezone-naive datetime (matches DB storage)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _to_local_date(utc_naive: datetime, tz: ZoneInfo) -> date:
    """Convert a UTC-naive datetime to a calendar date in the given timezone."""
    aware = utc_naive.replace(tzinfo=timezone.utc)
    return aware.astimezone(tz).date()


def _today_local(tz: ZoneInfo) -> date:
    """Return today's date in the given timezone."""
    return datetime.now(timezone.utc).astimezone(tz).date()


def _local_midnight_as_utc(local_date: date, tz: ZoneInfo) -> datetime:
    """Return the UTC-naive datetime corresponding to midnight of a local date."""
    local_midnight = datetime(
        local_date.year, local_date.month, local_date.day, 0, 0, 0, tzinfo=tz
    )
    return local_midnight.astimezone(timezone.utc).replace(tzinfo=None)


def _parse_time_of_day(hhmm: str) -> tuple[int, int]:
    """Parse an 'HH:MM' string into (hour, minute) integers."""
    h, m = hhmm.split(":")
    return int(h), int(m)


def _scheduled_datetime_today(
    local_date: date, time_str: str | None, tz: ZoneInfo
) -> datetime:
    """
    Return the UTC-naive datetime for a given time_of_day string on a local date.
    If time_str is None, returns midnight of that date in UTC.
    """
    if time_str is None:
        return _local_midnight_as_utc(local_date, tz)
    h, m = _parse_time_of_day(time_str)
    local_dt = datetime(local_date.year, local_date.month, local_date.day, h, m, tzinfo=tz)
    return local_dt.astimezone(timezone.utc).replace(tzinfo=None)


def _day_abbrev(local_date: date) -> str:
    """Return the three-letter day abbreviation for a date (Mon, Tue, …, Sun)."""
    return local_date.strftime("%a")


def _is_overdue_once_daily(
    schedule: Schedule,
    last_entry: LogEntry | None,
    today: date,
    now_utc: datetime,
    tz: ZoneInfo,
) -> bool:
    if last_entry is None:
        return True  # Never logged — immediately outstanding

    last_log_date = _to_local_date(last_entry.logged_at, tz)
    if last_log_date >= today:
        return False  # Already logged today

    # Check whether the scheduled time has passed today
    times = schedule.get_time_of_day()
    first_time = times[0] if times else None
    scheduled_at = _scheduled_datetime_today(today, first_time, tz)
    return now_utc >= scheduled_at


def _is_overdue_twice_daily(
    schedule: Schedule,
    entries_today: list[LogEntry],
    today: date,
    now_utc: datetime,
    tz: ZoneInfo,
) -> bool:
    times = schedule.get_time_of_day()
    required_count = len(times) if times else 2
    completed_count = len(entries_today)

    if completed_count >= required_count:
        return False  # All doses logged today

    # Determine which scheduled times have passed and haven't been logged
    if not times:
        # No specific times — just need required_count entries today
        return completed_count < required_count

    # Count how many scheduled times have passed but have no corresponding entry
    passed_times = [
        t for t in times
        if now_utc >= _scheduled_datetime_today(today, t, tz)
    ]
    return completed_count < len(passed_times)


def _is_overdue_weekly(
    schedule: Schedule,
    last_entry: LogEntry | None,
    today: date,
    now_utc: datetime,
    tz: ZoneInfo,
) -> bool:
    scheduled_days = schedule.get_days_of_week()
    today_abbrev = _day_abbrev(today)

    if today_abbrev not in scheduled_days:
        return False  # Today is not a scheduled day

    # Today is a scheduled day — check if it's been logged today
    if last_entry is None:
        # Never logged — check if the scheduled time has passed
        times = schedule.get_time_of_day()
        first_time = times[0] if times else None
        return now_utc >= _scheduled_datetime_today(today, first_time, tz)

    last_log_date = _to_local_date(last_entry.logged_at, tz)
    if last_log_date >= today:
        return False  # Already logged today

    # Not yet logged today — check if the time has passed
    times = schedule.get_time_of_day()
    first_time = times[0] if times else None
    return now_utc >= _scheduled_datetime_today(today, first_time, tz)


def _is_overdue_custom(
    schedule: Schedule,
    last_entry: LogEntry | None,
    now_utc: datetime,
) -> bool:
    if last_entry is None:
        return True  # Never logged — immediately outstanding

    interval_value = schedule.interval_value
    interval_unit = schedule.interval_unit

    if interval_value is None or interval_unit is None:
        # Malformed schedule — treat as not overdue to avoid false alerts
        return False

    unit_to_seconds = {
        "minutes": 60,
        "hours": 3600,
        "days": 86400,
        "weeks": 604800,
    }
    seconds = unit_to_seconds.get(interval_unit)
    if seconds is None:
        return False

    interval_delta = timedelta(seconds=interval_value * seconds)
    return (now_utc - last_entry.logged_at) >= interval_delta


def get_outstanding(db: Session, tz: ZoneInfo) -> list[Item]:
    """Return all active scheduled items that are currently overdue.

    Args:
        db:  An open SQLAlchemy session.
        tz:  The user's configured timezone (from settings.zoneinfo).

    Returns:
        List of Item ORM objects that have an overdue schedule.
        Empty list if nothing is outstanding.
    """
    now_utc = _utc_now()
    today = _today_local(tz)

    # Load all active items that have a schedule in one query
    scheduled_items: list[Item] = (
        db.query(Item)
        .join(Schedule, Item.id == Schedule.item_id)
        .filter(Item.is_active.is_(True))
        .all()
    )

    outstanding: list[Item] = []

    for item in scheduled_items:
        schedule = item.schedule
        if schedule is None:
            continue

        # Get today's log entries for this item (for twice_daily check)
        day_start_utc = _local_midnight_as_utc(today, tz)
        entries_today: list[LogEntry] = (
            db.query(LogEntry)
            .filter(
                LogEntry.item_id == item.id,
                LogEntry.logged_at >= day_start_utc,
            )
            .all()
        )

        # Most recent log entry ever (for once_daily, weekly, custom)
        last_entry: LogEntry | None = (
            db.query(LogEntry)
            .filter(LogEntry.item_id == item.id)
            .order_by(LogEntry.logged_at.desc())
            .first()
        )

        freq = schedule.frequency_type

        if freq == "once_daily":
            overdue = _is_overdue_once_daily(schedule, last_entry, today, now_utc, tz)
        elif freq == "twice_daily":
            overdue = _is_overdue_twice_daily(schedule, entries_today, today, now_utc, tz)
        elif freq == "weekly":
            overdue = _is_overdue_weekly(schedule, last_entry, today, now_utc, tz)
        elif freq == "custom":
            overdue = _is_overdue_custom(schedule, last_entry, now_utc)
        else:
            # Unknown frequency type — skip rather than raise
            overdue = False

        if overdue:
            outstanding.append(item)

    return outstanding
