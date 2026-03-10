"""
Items router — CRUD endpoints for trackable items.

Soft delete
-----------
DELETE sets is_active=False. The item remains in the database with all its
log history intact. Inactive items are excluded from GET /items (list) but
are still accessible by id via GET /items/{id} — useful for historical reports.

last_logged_at
--------------
The list and single-item endpoints attach a ``last_logged_at`` timestamp to
each ItemRead using a correlated subquery rather than loading all log_entries
as a relationship. This avoids an N+1 query while keeping the response lean.

All endpoints require bearer token authentication.
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from src.auth import require_auth
from src.database import get_db
from src.models.item import Item
from src.models.log_entry import LogEntry
from src.schemas.item import ItemCreate, ItemRead, ItemUpdate, ReorderRequest

router = APIRouter(
    prefix="/items",
    tags=["items"],
    dependencies=[Depends(require_auth)],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _last_logged_subquery():
    """Return a correlated scalar subquery: MAX(logged_at) for a given item."""
    return (
        select(func.max(LogEntry.logged_at))
        .where(LogEntry.item_id == Item.id)
        .correlate(Item)
        .scalar_subquery()
    )


def _doses_today_subquery():
    """Return a correlated scalar subquery: COUNT of log entries in the last 24h."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    return (
        select(func.count(LogEntry.id))
        .where(LogEntry.item_id == Item.id)
        .where(LogEntry.logged_at >= cutoff)
        .correlate(Item)
        .scalar_subquery()
    )


def _get_item_or_404(item_id: int, db: Session) -> Item:
    """Fetch an item by id or raise 404. Does not filter by is_active."""
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found.",
        )
    return item


def _last_logged_for_item(item_id: int, db: Session) -> datetime | None:
    """Return the most recent logged_at for a single item, or None."""
    result = db.execute(
        select(func.max(LogEntry.logged_at)).where(LogEntry.item_id == item_id)
    )
    return result.scalar_one_or_none()


def _doses_today_for_item(item_id: int, db: Session) -> int:
    """Return the count of log entries in the last 24h for a single item."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    result = db.execute(
        select(func.count(LogEntry.id))
        .where(LogEntry.item_id == item_id)
        .where(LogEntry.logged_at >= cutoff)
    )
    return result.scalar_one() or 0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ItemRead])
def list_items(db: Session = Depends(get_db)) -> list[ItemRead]:
    """Return all active items with last_logged_at and doses_today, ordered by name."""
    rows = (
        db.execute(
            select(
                Item,
                _last_logged_subquery().label("last_logged_at"),
                _doses_today_subquery().label("doses_today"),
            )
            .where(Item.is_active.is_(True))
            .order_by(Item.sort_order.nullslast(), Item.name)
        )
        .all()
    )
    return [
        ItemRead.from_orm_item(item, last_logged_at, doses_today or 0)
        for item, last_logged_at, doses_today in rows
    ]


@router.post("", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
def create_item(body: ItemCreate, db: Session = Depends(get_db)) -> ItemRead:
    """Create a new item."""
    item = Item(
        name=body.name,
        category=body.category,
        description=body.description,
        max_daily_doses=body.max_daily_doses,
        color=body.color,
    )
    db.add(item)
    db.flush()  # get item.id without committing
    max_order = db.execute(
        select(func.max(Item.sort_order)).where(Item.is_active.is_(True))
    ).scalar_one_or_none()
    item.sort_order = (max_order or 0) + 1
    db.commit()
    db.refresh(item)
    # Newly created item has no log entries yet
    return ItemRead.from_orm_item(item, last_logged_at=None, doses_today=0)


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_items(body: ReorderRequest, db: Session = Depends(get_db)) -> None:
    """Persist a new display order for items."""
    for position, item_id in enumerate(body.ordered_ids):
        item = db.get(Item, item_id)
        if item and item.is_active:
            item.sort_order = position
    db.commit()


@router.get("/{item_id}", response_model=ItemRead)
def get_item(item_id: int, db: Session = Depends(get_db)) -> ItemRead:
    """Return a single item by id (active or archived)."""
    item = _get_item_or_404(item_id, db)
    last_logged_at = _last_logged_for_item(item_id, db)
    doses_today = _doses_today_for_item(item_id, db)
    return ItemRead.from_orm_item(item, last_logged_at, doses_today)


@router.patch("/{item_id}", response_model=ItemRead)
def update_item(
    item_id: int, body: ItemUpdate, db: Session = Depends(get_db)
) -> ItemRead:
    """Update one or more fields on an item (PATCH semantics — only supplied fields change)."""
    item = _get_item_or_404(item_id, db)

    if body.name is not None:
        item.name = body.name
    if body.category is not None:
        item.category = body.category
    if body.description is not None:
        item.description = body.description
    if body.is_active is not None:
        item.is_active = body.is_active
    if "max_daily_doses" in body.model_fields_set:
        item.max_daily_doses = body.max_daily_doses
    if "color" in body.model_fields_set:
        item.color = body.color

    db.commit()
    db.refresh(item)
    last_logged_at = _last_logged_for_item(item_id, db)
    doses_today = _doses_today_for_item(item_id, db)
    return ItemRead.from_orm_item(item, last_logged_at, doses_today)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)) -> None:
    """Soft-delete an item by setting is_active=False.

    The item and all its log history remain in the database.
    This operation is reversible via PATCH /{item_id} with is_active=true.
    """
    item = _get_item_or_404(item_id, db)
    item.is_active = False
    db.commit()
