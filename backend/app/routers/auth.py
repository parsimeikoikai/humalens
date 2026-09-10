from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.auth_tokens import create_access_token
from app.services.password import hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])

_DUMMY_PASSWORD_HASH = hash_password("password-that-is-never-valid")


MIN_PASSWORD_LENGTH = 8


class RegisterRequest(BaseModel):
    email: EmailStr
    # Enforced here as well as in the UI — the API is public, so a
    # client-side check alone lets anyone register a one-character password.
    password: str = Field(..., min_length=MIN_PASSWORD_LENGTH, max_length=128)
    full_name: str | None = Field(None, max_length=120)



class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    message: str
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None


class MessageResponse(BaseModel):
    message: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = payload.email.lower().strip()

    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        message="User registered successfully",
        access_token=create_access_token(user.id),
    )


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = payload.email.lower().strip()

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()

    # Verify against a dummy hash when the email is unknown, so a failed
    # login costs the same either way and the response time doesn't reveal
    # which addresses are registered.
    password_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    is_valid = verify_password(payload.password, password_hash)

    if user is None or not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return AuthResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        message="Login successful",
        access_token=create_access_token(user.id),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Rehydrate a session from a stored token, without re-entering credentials."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
    )


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
) -> MessageResponse:
    return MessageResponse(
        message="If an account exists for that email, password reset instructions will be sent."
    )
