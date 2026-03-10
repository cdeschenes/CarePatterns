"""
SQLAlchemy engine, session factory, declarative Base, and FastAPI dependency.

SQLite is used with check_same_thread=False because FastAPI may call the
dependency from different threads (even in sync mode). Sessions are always
closed after each request via the generator dependency.
"""

import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.config import settings


def _build_database_url(path: str) -> str:
    """Convert a filesystem path to a SQLite connection URL."""
    # Ensure the parent directory exists before SQLAlchemy tries to open the file.
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    return f"sqlite:///{path}"


DATABASE_URL: str = _build_database_url(settings.database_path)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,  # Set to True for SQL query logging during development
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


def get_db():
    """FastAPI dependency that yields a database session and closes it after use."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations(engine_) -> None:
    """Add any missing columns to existing tables (idempotent).

    SQLite's ALTER TABLE only supports adding columns, so we check PRAGMA
    table_info before issuing the ALTER. Safe to call on every startup.
    """
    with engine_.connect() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(items)"))]
        if "max_daily_doses" not in cols:
            conn.execute(text("ALTER TABLE items ADD COLUMN max_daily_doses INTEGER"))
            conn.commit()
        if "color" not in cols:
            conn.execute(text("ALTER TABLE items ADD COLUMN color VARCHAR(7)"))
            conn.commit()
        if "sort_order" not in cols:
            conn.execute(text("ALTER TABLE items ADD COLUMN sort_order INTEGER"))
            conn.execute(text("""
                UPDATE items SET sort_order = (
                    SELECT COUNT(*) FROM items i2
                    WHERE i2.name < items.name AND i2.is_active = 1
                )
            """))
            conn.commit()
