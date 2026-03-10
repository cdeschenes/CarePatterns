"""
Bearer token authentication dependency for FastAPI routes.

Single-user application: all protected endpoints require an
Authorization: Bearer <token> header matching SECRET_KEY in the environment.
No user accounts, no sessions, no token expiry.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import settings

_bearer_scheme = HTTPBearer(auto_error=False)


def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> None:
    """Verify the bearer token. Raises 401 if missing or incorrect.

    Use as a FastAPI dependency on any protected router or endpoint:

        @router.get("/items", dependencies=[Depends(require_auth)])
    """
    if credentials is None or credentials.credentials != settings.secret_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
