"""
Themes router — list, create, and activate color themes.

GET /themes
    Returns all themes (built-in and user-created), ordered by name.

POST /themes
    Creates a new user theme. Name must be unique.
    Body: ThemeCreate (name + variables dict with all 8 required CSS var keys).

PATCH /themes/{id}/activate
    Sets the given theme as active, clearing is_active on all others.
    Runs in a single transaction to prevent a window where no theme is active.

Seed function
-------------
seed_builtin_themes(db) is called from main.py lifespan after create_all().
It is idempotent — inserts light and dark themes only if the table is empty.
Light theme starts as active.

All endpoints require bearer token authentication.
"""

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth import require_auth
from src.database import get_db
from src.models.theme import Theme
from src.schemas.theme import ThemeCreate, ThemeRead

router = APIRouter(
    prefix="/themes",
    tags=["themes"],
    dependencies=[Depends(require_auth)],
)

# Built-in theme definitions.
# Keys use the '--color-*' CSS custom property naming convention.
#
# Values are stored as RGB triplets ("R G B") — NOT hex strings.
# Tailwind's opacity modifier syntax (e.g. bg-cp-primary/10) requires that
# the CSS custom property value be a bare RGB triplet so Tailwind can inject
# it into rgb(var(--color-primary) / 0.1). Hex values break this pattern.
_LIGHT_THEME_VARS: dict[str, str] = {
    "--color-bg":         "249 250 251",   # #f9fafb
    "--color-surface":    "255 255 255",   # #ffffff
    "--color-text":       "17 24 39",      # #111827
    "--color-text-muted": "107 114 128",   # #6b7280
    "--color-primary":    "79 70 229",     # #4f46e5
    "--color-accent":     "124 58 237",    # #7c3aed
    "--color-border":     "229 231 235",   # #e5e7eb
    "--color-danger":     "220 38 38",     # #dc2626
}

_DARK_THEME_VARS: dict[str, str] = {
    "--color-bg":         "15 23 42",      # #0f172a
    "--color-surface":    "30 41 59",      # #1e293b
    "--color-text":       "241 245 249",   # #f1f5f9
    "--color-text-muted": "148 163 184",   # #94a3b8
    "--color-primary":    "129 140 248",   # #818cf8
    "--color-accent":     "167 139 250",   # #a78bfa
    "--color-border":     "51 65 85",      # #334155
    "--color-danger":     "248 113 113",   # #f87171
}

_NORD_THEME_VARS: dict[str, str] = {
    "--color-bg":         "46 52 64",      # #2E3440
    "--color-surface":    "59 66 82",      # #3B4252
    "--color-text":       "236 239 244",   # #ECEFF4
    "--color-text-muted": "216 222 233",   # #D8DEE9
    "--color-primary":    "136 192 208",   # #88C0D0
    "--color-accent":     "129 161 193",   # #81A1C1
    "--color-border":     "76 86 106",     # #4C566A
    "--color-danger":     "191 97 106",    # #BF616A
}

_DRACULA_THEME_VARS: dict[str, str] = {
    "--color-bg":         "40 42 54",      # #282A36
    "--color-surface":    "68 71 90",      # #44475A
    "--color-text":       "248 248 242",   # #F8F8F2
    "--color-text-muted": "98 114 164",    # #6272A4
    "--color-primary":    "189 147 249",   # #BD93F9
    "--color-accent":     "255 121 198",   # #FF79C6
    "--color-border":     "98 114 164",    # #6272A4
    "--color-danger":     "255 85 85",     # #FF5555
}

_GITHUB_DARK_THEME_VARS: dict[str, str] = {
    "--color-bg":         "13 17 23",      # #0D1117
    "--color-surface":    "22 27 34",      # #161B22
    "--color-text":       "201 209 217",   # #C9D1D9
    "--color-text-muted": "139 148 158",   # #8B949E
    "--color-primary":    "88 166 255",    # #58A6FF
    "--color-accent":     "121 192 255",   # #79C0FF
    "--color-border":     "48 54 61",      # #30363D
    "--color-danger":     "248 81 73",     # #F85149
}

_TOKYO_NIGHT_THEME_VARS: dict[str, str] = {
    "--color-bg":         "26 27 46",      # #1A1B2E
    "--color-surface":    "36 40 59",      # #24283B
    "--color-text":       "169 177 214",   # #A9B1D6
    "--color-text-muted": "86 95 137",     # #565F89
    "--color-primary":    "122 162 247",   # #7AA2F7
    "--color-accent":     "187 154 247",   # #BB9AF7
    "--color-border":     "59 66 97",      # #3B4261
    "--color-danger":     "247 118 142",   # #F7768E
}

_CATPPUCCIN_THEME_VARS: dict[str, str] = {
    "--color-bg":         "30 30 46",      # #1E1E2E  (Mocha base)
    "--color-surface":    "49 50 68",      # #313244  (Mocha surface0)
    "--color-text":       "205 214 244",   # #CDD6F4  (Mocha text)
    "--color-text-muted": "166 173 200",   # #A6ADC8  (Mocha subtext1)
    "--color-primary":    "203 166 247",   # #CBA6F7  (Mocha mauve)
    "--color-accent":     "137 180 250",   # #89B4FA  (Mocha blue)
    "--color-border":     "69 71 90",      # #45475A  (Mocha surface1)
    "--color-danger":     "243 139 168",   # #F38BA8  (Mocha red)
}

_VIBRANT_DARK_THEME_VARS: dict[str, str] = {
    "--color-bg":         "15 15 25",      # #0F0F19 — near-black navy
    "--color-surface":    "26 27 46",      # #1A1B2E — dark slate
    "--color-text":       "240 241 255",   # #F0F1FF — off-white
    "--color-text-muted": "130 134 168",   # #8286A8 — muted purple-gray
    "--color-primary":    "255 107 107",   # #FF6B6B — coral
    "--color-accent":     "78 205 196",    # #4ECDC4 — teal
    "--color-border":     "45 46 75",      # #2D2E4B — dark border
    "--color-danger":     "255 82 82",     # #FF5252 — red
}

_BUILTIN_THEMES: list[dict] = [
    {"name": "Light",        "is_active": False, "variables": _LIGHT_THEME_VARS},
    {"name": "Dark",         "is_active": False, "variables": _DARK_THEME_VARS},
    {"name": "Nord",         "is_active": False, "variables": _NORD_THEME_VARS},
    {"name": "Dracula",      "is_active": False, "variables": _DRACULA_THEME_VARS},
    {"name": "GitHub Dark",  "is_active": False, "variables": _GITHUB_DARK_THEME_VARS},
    {"name": "Tokyo Night",  "is_active": False, "variables": _TOKYO_NIGHT_THEME_VARS},
    {"name": "Catppuccin",   "is_active": False, "variables": _CATPPUCCIN_THEME_VARS},
    {"name": "Vibrant Dark", "is_active": True,  "variables": _VIBRANT_DARK_THEME_VARS},
]


def seed_builtin_themes(db: Session) -> None:
    """Insert or update built-in themes on every startup.

    Checks each theme by name — adds missing ones, skips existing ones.
    This allows new themes to be added in code without wiping the database.
    User-activated themes are not affected (is_active is not overwritten).
    """
    existing_names = {name for (name,) in db.query(Theme.name).all()}

    for theme_data in _BUILTIN_THEMES:
        if theme_data["name"] in existing_names:
            continue
        theme = Theme(
            name=theme_data["name"],
            is_active=theme_data["is_active"],
            is_builtin=True,
            variables=json.dumps(theme_data["variables"]),
        )
        db.add(theme)

    db.commit()


@router.get("", response_model=list[ThemeRead])
def list_themes(db: Session = Depends(get_db)) -> list[ThemeRead]:
    """Return all themes ordered by name."""
    themes = db.query(Theme).order_by(Theme.name).all()
    return [ThemeRead.from_orm(theme) for theme in themes]


@router.post("", response_model=ThemeRead, status_code=status.HTTP_201_CREATED)
def create_theme(body: ThemeCreate, db: Session = Depends(get_db)) -> ThemeRead:
    """Create a new user-defined theme.

    Returns 409 if a theme with the same name already exists.
    """
    existing = db.query(Theme).filter(Theme.name == body.name).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A theme named {body.name!r} already exists.",
        )

    theme = Theme(
        name=body.name,
        is_active=False,
        is_builtin=False,
        variables=body.variables_json(),
    )
    db.add(theme)
    db.commit()
    db.refresh(theme)
    return ThemeRead.from_orm(theme)


@router.patch("/{theme_id}/activate", response_model=ThemeRead)
def activate_theme(theme_id: int, db: Session = Depends(get_db)) -> ThemeRead:
    """Set a theme as active, clearing is_active on all other themes.

    Both the deactivation of existing themes and the activation of the new
    theme happen in a single transaction — there is no window where no theme
    is active.
    """
    theme = db.get(Theme, theme_id)
    if theme is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Theme {theme_id} not found.",
        )

    # Deactivate all themes first, then activate the requested one
    db.query(Theme).update({"is_active": False})
    theme.is_active = True
    db.commit()
    db.refresh(theme)
    return ThemeRead.from_orm(theme)
