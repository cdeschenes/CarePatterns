"""
Report service — log entry querying and CSV generation.

CSV format
----------
RFC 4180 compliant, UTF-8 with BOM (so Excel opens it correctly without
needing an import wizard). Columns:

    item_name, category, logged_at_local, notes

`logged_at_local` is the UTC-stored timestamp converted to the user's
configured timezone and formatted as ISO 8601
(e.g. "2025-03-09T09:00:00-08:00").

Filtering
---------
All filter parameters are optional:
- item_id:    restrict to a single item (by ORM id)
- start_date: include entries where logged_at (in user tz) >= start_date
- end_date:   include entries where logged_at (in user tz) <= end_date

Date boundary conversion
------------------------
start_date and end_date are calendar dates in the user's timezone. They are
converted to UTC-naive datetimes before querying the DB (which stores UTC).
"""

from __future__ import annotations

import csv
import io
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from src.models.log_entry import LogEntry


def _date_to_utc_start(local_date: date, tz: ZoneInfo) -> datetime:
    """Return the UTC-naive datetime for midnight at the start of a local date."""
    local_midnight = datetime(
        local_date.year, local_date.month, local_date.day, 0, 0, 0, tzinfo=tz
    )
    return local_midnight.astimezone(timezone.utc).replace(tzinfo=None)


def _date_to_utc_end(local_date: date, tz: ZoneInfo) -> datetime:
    """Return the UTC-naive datetime for 23:59:59 at the end of a local date."""
    local_end = datetime(
        local_date.year, local_date.month, local_date.day, 23, 59, 59, tzinfo=tz
    )
    return local_end.astimezone(timezone.utc).replace(tzinfo=None)


def query_logs(
    db: Session,
    tz: ZoneInfo,
    item_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[LogEntry]:
    """Query log entries with optional filters.

    Args:
        db:         An open SQLAlchemy session.
        tz:         The user's configured timezone, used for date boundary conversion.
        item_id:    If provided, restrict results to this item.
        start_date: If provided, include only entries logged on or after this local date.
        end_date:   If provided, include only entries logged on or before this local date.

    Returns:
        List of LogEntry ORM objects, ordered by logged_at descending.
        Each entry has its .item relationship loaded (required by LogEntryRead).
    """
    query = db.query(LogEntry)

    if item_id is not None:
        query = query.filter(LogEntry.item_id == item_id)

    if start_date is not None:
        utc_start = _date_to_utc_start(start_date, tz)
        query = query.filter(LogEntry.logged_at >= utc_start)

    if end_date is not None:
        utc_end = _date_to_utc_end(end_date, tz)
        query = query.filter(LogEntry.logged_at <= utc_end)

    return query.order_by(LogEntry.logged_at.desc()).all()


def generate_csv(entries: list[LogEntry], tz: ZoneInfo) -> bytes:
    """Generate an RFC 4180 compliant CSV from a list of log entries.

    Args:
        entries: List of LogEntry ORM objects. Each must have .item loaded.
        tz:      The user's timezone for converting logged_at to local time.

    Returns:
        UTF-8 with BOM encoded bytes of the CSV content.
    """
    output = io.StringIO()
    writer = csv.writer(output, dialect="excel")

    # Header row
    writer.writerow(["item_name", "category", "logged_at_local", "notes"])

    for entry in entries:
        # Convert UTC-naive logged_at to user-local ISO 8601 string
        utc_aware = entry.logged_at.replace(tzinfo=timezone.utc)
        local_dt = utc_aware.astimezone(tz)
        logged_at_local = local_dt.isoformat()

        writer.writerow([
            entry.item.name,
            entry.item.category,
            logged_at_local,
            entry.notes or "",
        ])

    # UTF-8 with BOM so Excel auto-detects encoding without an import wizard
    return output.getvalue().encode("utf-8-sig")
