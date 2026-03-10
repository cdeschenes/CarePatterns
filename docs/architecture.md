# CarePatterns — Architecture

## Overview

CarePatterns is a single-user, Dockerized web application. The frontend is a
mobile-first React PWA; the backend is a FastAPI REST API backed by SQLite.
The two services communicate over HTTP. Both run as Docker containers orchestrated
by Compose.

## Components

### Frontend

- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS with CSS custom properties for theme support
- **State**: TanStack Query (React Query v5) for server state; `useState`/`useContext` for UI state
- **PWA**: Vite PWA plugin for manifest and service worker

### Backend

- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy (synchronous) — no async; SQLite has no meaningful async advantage for single-user use
- **Database**: SQLite, stored at `DATABASE_PATH` on a Docker volume
- **Auth**: Static bearer token — `SECRET_KEY` env var; frontend sends `Authorization: Bearer <token>` header; token is baked into the frontend build at compile time (`VITE_API_TOKEN`)

## Data Model

```
Item
  id, name, category (enum + custom free-text), description,
  color (optional hex string), max_daily_doses (optional int),
  sort_order (optional int), is_active, created_at

Schedule
  id, item_id, frequency_type (once_daily|twice_daily|weekly|custom),
  interval_value, interval_unit, time_of_day (JSON string array),
  days_of_week (JSON string array), starts_at

LogEntry
  id, item_id, logged_at (UTC datetime), notes

Theme
  id, name, is_active, variables (JSON string — CSS custom property key/value map)
```

### API Response Fields

`ItemRead` includes two computed fields populated via correlated subqueries:

- `last_logged_at: datetime | null` — `MAX(logged_at)` from log entries for the item. Displayed as "Last logged X ago" or "Never logged" on dashboard cards.
- `doses_today: int` — count of log entries in the last 24 hours. Used to track progress against `max_daily_doses`.

### Item Categories

Fixed built-in values: `Medication`, `Procedure`, `Goal`, `Other`.
Users may also enter free-text custom categories. Both are stored as plain strings
in the `category` column. The frontend shows the fixed options first in a select
with an "Add custom..." option that reveals a text input.

## Communication

- Frontend fetches all data from the backend via REST (`/api/v1/...`)
- Reminders: frontend polls `GET /api/v1/reminders/outstanding` on a configurable
  interval (default 60 s, set via `VITE_REMINDER_POLL_INTERVAL`); displays an
  in-app modal for any outstanding items
- CSV export: backend generates the CSV and returns it as a file download response
  (`Content-Disposition: attachment`); frontend also constructs a `mailto:` link.
  Note: `mailto:` cannot attach files — UI copy explains the two-step flow
  (download first, then attach in mail app)

## Item Reordering

Items support a custom display order persisted to the database. Dragging the handle
on a dashboard card calls `POST /api/v1/items/reorder` with the updated ID order.
The `sort_order` field on the Item model stores the position.

## CORS

`ALLOWED_ORIGIN` env var controls the permitted frontend origin.
Development default: `http://localhost:3000`.
Must be updated to the production hostname when deployed.

## Timezone Handling

All datetimes are stored in the database as UTC (timezone-naive ISO strings).
The `TIMEZONE` env var (default `America/Los_Angeles`) is used by the reminder
service when evaluating schedule windows — e.g. "once daily at 9am" means 9am
in the configured timezone. Conversion uses the Python 3.9+ `zoneinfo` stdlib module.

## Theming

Themes are stored in the database as named sets of CSS custom property values
(JSON). On load, the active theme's variable map is injected into `:root`.
Switching themes sets the new theme active in the DB and re-injects variables —
no rebuild required.

Eight built-in themes are seeded on first startup:

| Name | Notes |
|------|-------|
| Light | |
| Dark | |
| Nord | |
| Dracula | |
| GitHub Dark | |
| Tokyo Night | |
| Catppuccin | |
| Vibrant Dark | Default active theme on fresh install |

### Required CSS Variables

Every theme must define exactly these 8 CSS custom property keys:

| Key | Purpose |
|-----|---------|
| `--color-bg` | Page background |
| `--color-surface` | Card / surface background |
| `--color-text` | Primary text |
| `--color-text-muted` | Secondary / muted text |
| `--color-primary` | Primary accent (buttons, highlights) |
| `--color-accent` | Secondary accent |
| `--color-border` | Border color |
| `--color-danger` | Destructive action color |

### CSS Variable Format

Theme variable values are stored as **bare RGB triplets** (`"R G B"`, e.g. `"79 70 229"`)
rather than hex strings. This enables Tailwind CSS's opacity modifier syntax:

```
bg-cp-primary/10  ->  background: rgb(var(--color-primary) / 0.1)
```

`tailwind.config.ts` declares each token as `rgb(var(--color-*) / <alpha-value>)`.
The fallback defaults in `index.css` also use RGB triplets so the app is styled
correctly before the theme fetch completes on first load.

## Healthcheck

The backend exposes `GET /health` (no auth required) returning `{"status": "ok"}`.
`docker-compose.yml` configures a Docker healthcheck on this endpoint so that the
frontend container waits for the backend to be healthy before starting
(`depends_on: condition: service_healthy`).

## Development Utilities

`backend/scripts/reset_db.py` — destructive dev tool that drops and recreates all
tables and re-seeds built-in themes. Requires interactive confirmation. Never run
against production data.

## Deployment

- Docker Compose runs `frontend` (port 3000) and `backend` (port 8000)
- SQLite database lives in a named Docker volume (`carepatterns-data`)
- No external services or network dependencies required
- `ALLOWED_ORIGIN` must match the URL used to access the frontend in production
- Backend healthcheck at `GET /health` is polled by Docker before the frontend starts
