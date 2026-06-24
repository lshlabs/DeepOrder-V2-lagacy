import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import AccountType, ApprovalStatus, RefreshToken, User

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return f"{base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(derived).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_b64, derived_b64 = password_hash.split("$", 1)
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(derived_b64.encode())
    except (ValueError, TypeError):
        return False

    actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return hmac.compare_digest(actual, expected)


def create_access_token(user_id: int) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": int(expires_at.timestamp())}
    return _encode_token(payload, settings.jwt_secret_key)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(refresh_token: str) -> str:
    return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()


def refresh_token_expires_at(*, auto_login: bool = False) -> datetime:
    settings = get_settings()
    if auto_login:
        return datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    return datetime.now(UTC) + timedelta(hours=settings.session_refresh_token_expire_hours)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    payload = decode_access_token(credentials.credentials)
    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.")

    user = db.get(User, int(subject))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    if user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    if user.account_type == AccountType.EMPLOYEE and not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive employee account.")
    return user


def get_approved_kds_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Approval required.")
    return current_user


def get_approved_store_owner(current_user: User = Depends(get_approved_kds_user)) -> User:
    if current_user.account_type != AccountType.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner account required.")
    return current_user


def require_admin_token(x_admin_token: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not x_admin_token or not hmac.compare_digest(x_admin_token, settings.admin_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token.")


def get_valid_refresh_token(db: Session, refresh_token: str) -> RefreshToken:
    token_hash = hash_refresh_token(refresh_token)
    refresh = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if refresh is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")
    if refresh.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked.")
    if _as_utc(refresh.expires_at) <= datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired.")
    return refresh


def revoke_user_refresh_tokens(db: Session, user_id: int) -> None:
    revoked_at = datetime.now(UTC)
    active_tokens = db.scalars(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
    ).all()
    for token in active_tokens:
        token.revoked_at = revoked_at


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    try:
        return _decode_token(token, settings.jwt_secret_key)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def _encode_token(payload: dict, secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_segment = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_segment = _b64url_encode(signature)
    return f"{header_segment}.{payload_segment}.{signature_segment}"


def _decode_token(token: str, secret: str) -> dict:
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError as exc:
        raise ValueError("Invalid access token.") from exc

    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    expected_signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_signature = _b64url_decode(signature_segment)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise ValueError("Invalid access token.")

    payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
    exp = payload.get("exp")
    if not isinstance(exp, int) or exp <= int(datetime.now(UTC).timestamp()):
        raise ValueError("Access token expired.")
    return payload


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("utf-8"))


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
