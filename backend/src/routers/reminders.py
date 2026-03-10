"""
Reminders router — outstanding scheduled items.

GET /reminders/outstanding
    Returns a list of items that are currently overdue based on their schedule.
    The frontend polls this endpoint on a configurable interval and displays
    a modal when the list is non-empty.

Response shape is intentionally minimal: just id and name. The frontend
already has full item data from its items query cache.

All endpoints require bearer token authentication.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth import require_auth
from src.config import settings
from src.database import get_db
from src.services import reminder_service

router = APIRouter(
    prefix="/reminders",
    tags=["reminders"],
    dependencies=[Depends(require_auth)],
)


@router.get("/outstanding")
def get_outstanding_reminders(
    db: Session = Depends(get_db),
) -> list[dict[str, int | str]]:
    """Return items with overdue schedules.

    Returns:
        List of {"id": int, "name": str} dicts, one per overdue item.
        Empty list if nothing is outstanding.
    """
    tz = settings.zoneinfo
    overdue_items = reminder_service.get_outstanding(db, tz)
    return [{"id": item.id, "name": item.name} for item in overdue_items]
