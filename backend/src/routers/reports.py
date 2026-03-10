"""
Reports router — filterable log history and CSV export.

GET /reports
    Returns filtered log entries as JSON.
    Query params (all optional):
        item_id    — restrict to one item
        start_date — ISO date string (YYYY-MM-DD), inclusive
        end_date   — ISO date string (YYYY-MM-DD), inclusive

GET /reports/export
    Same filters, returns a CSV file download.
    Content-Disposition: attachment; filename="carepatterns-export.csv"
    Content-Type: text/csv; charset=utf-8-sig

Date filtering converts local dates to UTC boundaries using the configured
timezone before querying the database.

All endpoints require bearer token authentication.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from src.auth import require_auth
from src.config import settings
from src.database import get_db
from src.schemas.log_entry import LogEntryRead
from src.services import report_service

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(require_auth)],
)


@router.get("", response_model=list[LogEntryRead])
def get_report(
    item_id: int | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[LogEntryRead]:
    """Return filtered log entries as JSON, ordered newest first."""
    tz = settings.zoneinfo
    entries = report_service.query_logs(
        db, tz, item_id=item_id, start_date=start_date, end_date=end_date
    )
    return [LogEntryRead.from_orm(entry) for entry in entries]


@router.get("/export")
def export_report(
    item_id: int | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> Response:
    """Return filtered log entries as a CSV file download.

    The file is UTF-8 with BOM so Excel opens it correctly without an import
    wizard. The filename is always "carepatterns-export.csv".
    """
    tz = settings.zoneinfo
    entries = report_service.query_logs(
        db, tz, item_id=item_id, start_date=start_date, end_date=end_date
    )
    csv_bytes = report_service.generate_csv(entries, tz)

    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8-sig",
        headers={
            "Content-Disposition": 'attachment; filename="carepatterns-export.csv"'
        },
    )
