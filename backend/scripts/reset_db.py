#!/usr/bin/env python3
"""
reset_db.py — DESTRUCTIVE development utility.

Drops all CarePatterns tables and recreates them from scratch, then re-seeds
the built-in themes. All items, schedules, log entries, and user-created
themes are permanently deleted.

NEVER run this against a production database.

Usage (from the repo root):
    # Against the running container:
    docker compose exec backend python scripts/reset_db.py

    # Locally (with DATABASE_PATH pointing to a dev db):
    DATABASE_PATH=/tmp/dev.db python backend/scripts/reset_db.py
"""

import sys
import os

# Ensure the backend src package is importable when called from any location.
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.insert(0, backend_dir)

from src.config import settings  # noqa: E402 — path manipulation must come first
from src.database import Base, engine, SessionLocal  # noqa: E402
import src.models  # noqa: F401, E402 — registers all ORM models with Base.metadata
from src.routers.themes import seed_builtin_themes  # noqa: E402


def confirm() -> bool:
    """Prompt the user to confirm the destructive operation."""
    print()
    print("=" * 60)
    print("  WARNING: DESTRUCTIVE OPERATION")
    print("=" * 60)
    print(f"  Database: {settings.database_path}")
    print()
    print("  This will DROP all tables and DELETE all data.")
    print("  This cannot be undone.")
    print()
    answer = input("  Type 'yes' to continue: ").strip().lower()
    return answer == "yes"


def main() -> None:
    if not confirm():
        print("\nAborted — database was not modified.")
        sys.exit(0)

    print("\nDropping all tables…")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped.")

    print("Recreating tables…")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    print("Seeding built-in themes…")
    db = SessionLocal()
    try:
        seed_builtin_themes(db)
    finally:
        db.close()
    print("Themes seeded.")

    print("\nDatabase reset complete.")


if __name__ == "__main__":
    main()
