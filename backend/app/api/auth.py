"""Demo login, logout, and authenticated user profile endpoints."""

from datetime import datetime, timedelta, timezone
import secrets
from typing import List
from pydantic import BaseModel, ConfigDict, Field
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import AuthCredential, AuthSession, User
from app.services.auth_service import hash_session_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
SESSION_COOKIE = "q_resq_session"


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    email: str
    role: str
    is_active: bool


class LoginResponse(BaseModel):
    user: UserOut
    message: str


def get_authenticated_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    auth_session = db.query(AuthSession).filter(
        AuthSession.token_hash == hash_session_token(token),
    ).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not auth_session or auth_session.expires_at <= now:
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    user = db.query(User).filter(
        User.id == auth_session.user_id,
        User.is_active.is_(True),
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user


def require_authenticated(user: User = Depends(get_authenticated_user)) -> User:
    return user


def require_dispatcher(user: User = Depends(get_authenticated_user)) -> User:
    if user.role not in {"Dispatcher", "Administrator"}:
        raise HTTPException(status_code=403, detail="Dispatcher authorization required")
    return user


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticates a seeded local account and issues an HttpOnly session cookie."""
    user = db.query(User).filter(
        User.username == payload.username,
        User.is_active.is_(True),
    ).first()
    credential = (
        db.query(AuthCredential).filter(AuthCredential.user_id == user.id).first()
        if user else None
    )
    if not credential or not verify_password(payload.password, credential.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
        seconds=settings.SESSION_TTL_SECONDS
    )
    db.add(AuthSession(
        token_hash=hash_session_token(token),
        user_id=user.id,
        expires_at=expires_at,
    ))
    db.commit()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=settings.SESSION_TTL_SECONDS,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return LoginResponse(
        user=UserOut.model_validate(user),
        message=f"Logged in as {user.full_name} ({user.role})"
    )


@router.get(
    "/users",
    response_model=List[UserOut],
    dependencies=[Depends(require_authenticated)],
)
def list_available_demo_users(
    db: Session = Depends(get_db),
):
    users = db.query(User).filter(User.is_active.is_(True)).all()
    return [UserOut.model_validate(u) for u in users]


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        db.query(AuthSession).filter(
            AuthSession.token_hash == hash_session_token(token),
        ).delete(synchronize_session=False)
        db.commit()
    response.delete_cookie(
        key=SESSION_COOKIE,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"message": "Logged out"}
