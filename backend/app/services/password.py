import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass


# PBKDF2-HMAC parameters
_PBKDF2_ITERATIONS = 310_000
_SALT_BYTES = 16
_HASH_BYTES = 32


@dataclass(frozen=True)
class PasswordHash:
    iterations: int
    salt_b64: str
    hash_b64: str

    def to_string(self) -> str:
        # Format: pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>
        return (
            f"pbkdf2_sha256${self.iterations}$"
            f"{self.salt_b64}${self.hash_b64}"
        )


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def _b64decode(raw: str) -> bytes:
    return base64.urlsafe_b64decode(raw.encode("utf-8"))


def hash_password(password: str) -> str:
    if password is None or password == "":
        raise ValueError("Password must not be empty")

    salt = secrets.token_bytes(_SALT_BYTES)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        _PBKDF2_ITERATIONS,
        dklen=_HASH_BYTES,
    )

    ph = PasswordHash(
        iterations=_PBKDF2_ITERATIONS,
        salt_b64=_b64encode(salt),
        hash_b64=_b64encode(dk),
    )
    return ph.to_string()


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash or not password:
        return False

    try:
        # pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>
        algo, iterations_s, salt_b64, hash_b64 = password_hash.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False

        iterations = int(iterations_s)
        salt = _b64decode(salt_b64)
        expected = _b64decode(hash_b64)

        computed = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
            dklen=len(expected),
        )

        return hmac.compare_digest(computed, expected)
    except Exception:
        return False

