"""
Schedules router — one schedule per item.

Each item may have at most one Schedule. Attempting to POST a schedule to an
item that already has one returns 409 Conflict. Use PATCH to modify the
existing schedule, or DELETE and re-POST to replace it.

Item existence is always verified before schedule operations. Schedules are
cascaded from their parent item, so deleting an item also removes its schedule.

All endpoints require bearer token authentication.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth import require_auth
from src.database import get_db
from src.models.item import Item
from src.models.schedule import Schedule
from src.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate

router = APIRouter(
    prefix="/items",
    tags=["schedules"],
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


def _get_schedule_or_404(item_id: int, db: Session) -> Schedule:
    schedule = db.query(Schedule).filter(Schedule.item_id == item_id).first()
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} has no schedule.",
        )
    return schedule


@router.post(
    "/{item_id}/schedule",
    response_model=ScheduleRead,
    status_code=status.HTTP_201_CREATED,
)
def create_schedule(
    item_id: int, body: ScheduleCreate, db: Session = Depends(get_db)
) -> ScheduleRead:
    """Create a schedule for an item. Returns 409 if a schedule already exists."""
    _get_item_or_404(item_id, db)

    existing = db.query(Schedule).filter(Schedule.item_id == item_id).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Item {item_id} already has a schedule. "
                "Use PATCH to update it, or DELETE then POST to replace it."
            ),
        )

    starts_at = body.starts_at or datetime.now(timezone.utc).replace(tzinfo=None)

    schedule = Schedule(
        item_id=item_id,
        frequency_type=body.frequency_type,
        interval_value=body.interval_value,
        interval_unit=body.interval_unit,
        time_of_day=body.time_of_day_json(),
        days_of_week=body.days_of_week_json(),
        starts_at=starts_at,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return ScheduleRead.from_orm(schedule)


@router.get("/{item_id}/schedule", response_model=ScheduleRead)
def get_schedule(item_id: int, db: Session = Depends(get_db)) -> ScheduleRead:
    """Return the schedule for an item. Returns 404 if none exists."""
    _get_item_or_404(item_id, db)
    schedule = _get_schedule_or_404(item_id, db)
    return ScheduleRead.from_orm(schedule)


@router.patch("/{item_id}/schedule", response_model=ScheduleRead)
def update_schedule(
    item_id: int, body: ScheduleUpdate, db: Session = Depends(get_db)
) -> ScheduleRead:
    """Update one or more fields on an item's schedule (PATCH semantics)."""
    _get_item_or_404(item_id, db)
    schedule = _get_schedule_or_404(item_id, db)

    if body.frequency_type is not None:
        schedule.frequency_type = body.frequency_type
    if body.interval_value is not None:
        schedule.interval_value = body.interval_value
    if body.interval_unit is not None:
        schedule.interval_unit = body.interval_unit
    if body.starts_at is not None:
        schedule.starts_at = body.starts_at

    tod_json = body.time_of_day_json()
    if tod_json is not None:
        schedule.time_of_day = tod_json

    dow_json = body.days_of_week_json()
    if dow_json is not None:
        schedule.days_of_week = dow_json

    db.commit()
    db.refresh(schedule)
    return ScheduleRead.from_orm(schedule)


@router.delete("/{item_id}/schedule", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(item_id: int, db: Session = Depends(get_db)) -> None:
    """Delete an item's schedule. The item and its log history are unaffected."""
    _get_item_or_404(item_id, db)
    schedule = _get_schedule_or_404(item_id, db)
    db.delete(schedule)
    db.commit()
