from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings

_TOKEN_SUBJECT_CLAIM = "sub"


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    payload = {
        _TOKEN_SUBJECT_CLAIM: str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return int(payload[_TOKEN_SUBJECT_CLAIM])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
