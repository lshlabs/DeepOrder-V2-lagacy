from datetime import UTC, datetime

import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    create_refresh_token,
    get_approved_kds_user,
    get_current_user,
    get_valid_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_token_expires_at,
    revoke_user_refresh_tokens,
    verify_password,
)
from app.database import get_db
from app.models import AccountType, ApprovalStatus, RefreshToken, Store, User, UserRole
from app.schemas import (
    AuthResponse,
    AuthStoreOut,
    AuthUserOut,
    ChangePasswordIn,
    ChangePasswordResponse,
    CurrentUserResponse,
    EmployeeLoginRequest,
    IdentifierAvailabilityResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
)

router = APIRouter()
IDENTIFIER_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{3,31}$")


@router.get("/api/auth/check-identifier", response_model=IdentifierAvailabilityResponse)
def check_identifier(
    loginId: str = Query(min_length=4, max_length=32),
    db: Session = Depends(get_db),
) -> IdentifierAvailabilityResponse:
    normalized = _normalize_login_id(loginId)
    _validate_identifier(normalized)
    existing = db.scalar(select(User.id).where(func.lower(User.login_id) == normalized, User.deleted_at.is_(None)))
    if existing is not None:
        return IdentifierAvailabilityResponse(available=False, message="이미 사용 중인 아이디입니다.")
    return IdentifierAvailabilityResponse(available=True, message="사용 가능한 아이디입니다.")


@router.post("/api/auth/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    login_id = _normalize_login_id(payload.loginId)
    _validate_identifier(login_id)

    existing = db.scalar(select(User).where(func.lower(User.login_id) == login_id))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 아이디입니다.")

    store = Store(
        store_id=_next_store_id(db),
        store_name=payload.storeName.strip(),
        phone=payload.storePhone,
        zip_no=payload.zipNo,
        road_address=payload.roadAddress,
        jibun_address=payload.jibunAddress,
        address_detail=payload.addressDetail,
        approval_status=ApprovalStatus.PENDING_APPROVAL,
    )
    db.add(store)
    db.flush()

    user = User(
        login_id=login_id,
        password_hash=hash_password(payload.password),
        name=payload.name.strip(),
        role=UserRole.STORE_OWNER,
        approval_status=ApprovalStatus.PENDING_APPROVAL,
        store_id=store.store_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(store)
    return RegisterResponse(user=_auth_user_out(user), store=_auth_store_out(store))


@router.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    login_id = _normalize_login_id(payload.loginId)
    user = db.scalar(select(User).where(func.lower(User.login_id) == login_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid loginId or password.")
    if user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid loginId or password.")

    if user.account_type == AccountType.EMPLOYEE:
        if not user.active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="비활성화된 직원 계정입니다.")
        if user.approval_status != ApprovalStatus.APPROVED:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Approval required.")
        if not user.pin_hash or not verify_password(payload.password, user.pin_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid loginId or password.")
        return _create_auth_response(db, user, auto_login=payload.autoLogin)

    if not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid loginId or password.")

    return _create_auth_response(db, user, auto_login=payload.autoLogin)


@router.post("/api/auth/employee/login", response_model=AuthResponse)
def employee_login(payload: EmployeeLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    login_id = _normalize_login_id(payload.loginId)
    user = db.scalar(select(User).where(func.lower(User.login_id) == login_id))
    if user is None or user.account_type != AccountType.EMPLOYEE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid loginId or PIN.")
    if user.deleted_at is not None or not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="비활성화된 직원 계정입니다.")
    if user.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Approval required.")
    if not user.pin_hash or not verify_password(payload.pin, user.pin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid loginId or PIN.")

    return _create_auth_response(db, user, auto_login=payload.autoLogin)


@router.post("/api/auth/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> RefreshResponse:
    refresh_row = get_valid_refresh_token(db, payload.refreshToken)
    return RefreshResponse(accessToken=create_access_token(refresh_row.user_id))


@router.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> None:
    refresh_row = get_valid_refresh_token(db, payload.refreshToken)
    refresh_row.revoked_at = datetime.now(UTC)
    db.commit()


@router.get("/api/auth/me", response_model=CurrentUserResponse)
def me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(user=_auth_user_out(current_user), store=_auth_store_out(current_user.store))


@router.post("/api/auth/change-password", response_model=ChangePasswordResponse)
def change_password(
    payload: ChangePasswordIn,
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> ChangePasswordResponse:
    if current_user.account_type != AccountType.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only store owners can change password.")
    if not current_user.password_hash or not verify_password(payload.currentPassword, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="현재 비밀번호가 올바르지 않습니다.")

    current_user.password_hash = hash_password(payload.newPassword)
    revoke_user_refresh_tokens(db, current_user.id)
    db.commit()
    return ChangePasswordResponse(message="비밀번호가 변경되었습니다. 다시 로그인해주세요.")


def _auth_user_out(user: User) -> AuthUserOut:
    return AuthUserOut(
        id=user.id,
        loginId=user.login_id,
        name=user.name,
        role=user.role,
        accountType=user.account_type,
        approvalStatus=user.approval_status,
    )


def _auth_store_out(store: Store) -> AuthStoreOut:
    return AuthStoreOut(
        id=store.id,
        storeId=store.store_id,
        storeName=store.store_name,
        phone=store.phone,
        zipNo=store.zip_no,
        roadAddress=store.road_address,
        jibunAddress=store.jibun_address,
        addressDetail=store.address_detail,
        approvalStatus=store.approval_status,
    )


def _next_store_id(db: Session) -> str:
    next_number = 1
    while True:
        candidate = f"STORE_{next_number:03d}"
        if not db.scalar(select(Store.store_id).where(Store.store_id == candidate)):
            return candidate
        next_number += 1


def _create_auth_response(db: Session, user: User, *, auto_login: bool) -> AuthResponse:
    refresh_token = create_refresh_token()
    refresh_row = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=refresh_token_expires_at(auto_login=auto_login),
    )
    db.add(refresh_row)
    db.commit()
    db.refresh(user)

    return AuthResponse(
        accessToken=create_access_token(user.id),
        refreshToken=refresh_token,
        autoLogin=auto_login,
        user=_auth_user_out(user),
        store=_auth_store_out(user.store),
    )


def _normalize_login_id(value: str) -> str:
    return value.strip().lower()


def _validate_identifier(identifier: str) -> None:
    if not IDENTIFIER_PATTERN.fullmatch(identifier):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="아이디는 영문 소문자, 숫자, ., _, - 만 사용해 4~32자로 입력해주세요.",
        )
