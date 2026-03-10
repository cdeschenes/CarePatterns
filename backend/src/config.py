"""
Application configuration loaded from environment variables.

All required variables are validated at startup. If any required variable is
missing, the application will refuse to start with a clear error message.
"""

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Auth
    secret_key: str

    # Database
    database_path: str

    # CORS
    allowed_origin: str = "http://localhost:3000"

    # Timezone used by the reminder service when evaluating schedule windows.
    # All datetimes are stored in the database as UTC.
    # Value must be a valid IANA timezone name (e.g. "America/Los_Angeles").
    timezone: str = "America/Los_Angeles"

    # How often (in seconds) the frontend polls for outstanding reminders.
    reminder_poll_interval_seconds: int = 60

    @property
    def zoneinfo(self) -> ZoneInfo:
        """Return a ZoneInfo object for the configured timezone.

        Raises ValueError on startup if the timezone name is invalid,
        so misconfiguration is caught before any requests are served.
        """
        try:
            return ZoneInfo(self.timezone)
        except ZoneInfoNotFoundError as exc:
            raise ValueError(
                f"Invalid TIMEZONE value '{self.timezone}'. "
                "Must be a valid IANA timezone name (e.g. 'America/Los_Angeles')."
            ) from exc


def _load_settings() -> Settings:
    """Load and validate settings. Called once at import time."""
    settings = Settings()  # type: ignore[call-arg]
    # Eagerly validate the timezone so a bad value fails at startup.
    _ = settings.zoneinfo
    return settings


settings: Settings = _load_settings()
