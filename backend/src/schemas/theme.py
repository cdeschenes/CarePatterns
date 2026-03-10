"""
Pydantic v2 schemas for Theme request and response bodies.

The eight required CSS variable keys are defined in REQUIRED_CSS_VARS.
All keys use the '--color-*' naming convention established in the Theme model
docstring. ThemeCreate validates that all eight keys are present; extra keys
are permitted (forward compatibility).

Variable values are not validated beyond being non-empty strings — color format
(hex, rgb, hsl) is left to the user.
"""

from __future__ import annotations

import json

from pydantic import BaseModel, ConfigDict, Field, model_validator

# These eight variables must be present in every theme's variable map.
# The frontend injects them into :root as CSS custom properties with '--' prefix.
REQUIRED_CSS_VARS: tuple[str, ...] = (
    "--color-bg",
    "--color-surface",
    "--color-text",
    "--color-text-muted",
    "--color-primary",
    "--color-accent",
    "--color-border",
    "--color-danger",
)


class ThemeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    variables: dict[str, str] = Field(...)

    @model_validator(mode="after")
    def validate_variables(self) -> "ThemeCreate":
        missing = [k for k in REQUIRED_CSS_VARS if k not in self.variables]
        if missing:
            raise ValueError(
                f"Theme variables must include all required keys. Missing: {missing}"
            )
        empty = [k for k, v in self.variables.items() if not v.strip()]
        if empty:
            raise ValueError(
                f"Theme variable values must not be empty. Empty keys: {empty}"
            )
        return self

    def variables_json(self) -> str:
        """Return variables encoded as a JSON string for ORM storage."""
        return json.dumps(self.variables)


class ThemeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool
    is_builtin: bool
    variables: dict[str, str]

    @classmethod
    def from_orm(cls, theme) -> "ThemeRead":  # type: ignore[no-untyped-def]
        """Build from a Theme ORM instance, decoding the JSON variables column."""
        return cls(
            id=theme.id,
            name=theme.name,
            is_active=theme.is_active,
            is_builtin=theme.is_builtin,
            variables=theme.get_variables(),
        )
