"""
Log entries router — record and retrieve item completions.

POST /items/{id}/log
    Creates a new log entry with the current UTC timestamp.
    Returns the new entry including item_name.

GET /items/{id}/log
    Returns paginated log history for one item, ordered newest first.
    Query params: page (1-based, default 1), per_page (default 20, max 100).

Logging against an archived (is_active=False) item is permitted —
the user may need to back-fill entries. The frontend can filter if needed.

All endpoints require bearer token authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.auth import require_auth
from src.database import get_db
from src.models.item import Item
from src.models.log_entry import LogEntry
from src.schemas.log_entry import LogEntryCreate, LogEntryRead

router = APIRouter(
    prefix="/items",
    tags=["log_entries"],
    dependencies=[Depends(require_auth)],
)


def _get_item_or_404(item_id: int, db: Session) -> Item:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found.",
        )
    return item


@router.post(
    "/{item_id}/log",
    response_model=LogEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def log_item(
    item_id: int, body: LogEntryCreate, db: Session = Depends(get_db)
) -> LogEntryRead:
    """Record a completion event for an item.

    logged_at is set automatically to the current UTC time.
    The optional `notes` field in the request body is stored as-is.
    """
    item = _get_item_or_404(item_id, db)

    entry = LogEntry(
        item_id=item_id,
        notes=body.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Attach the item for LogEntryRead.from_orm (needs entry.item.name)
    entry.item = item
    return LogEntryRead.from_orm(entry)


@router.get("/{item_id}/log", response_model=list[LogEntryRead])
def get_log(
    item_id: int,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[LogEntryRead]:
    """Return paginated log history for an item, ordered newest first.

    Args:
        page:     1-based page number.
        per_page: Entries per page (1–100, default 20).
    """
    item = _get_item_or_404(item_id, db)
    offset = (page - 1) * per_page

    entries = (
        db.query(LogEntry)
        .filter(LogEntry.item_id == item_id)
        .order_by(LogEntry.logged_at.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )

    # Attach the item to each entry so LogEntryRead.from_orm can access item.name
    for entry in entries:
        entry.item = item

    return [LogEntryRead.from_orm(entry) for entry in entries]
