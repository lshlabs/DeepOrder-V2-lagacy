import random

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_approved_store_owner, hash_password, revoke_user_refresh_tokens
from app.database import get_db
from app.models import AccountType, User, UserRole
from app.routers.auth import _normalize_login_id, _validate_identifier
from app.schemas import (
    CreateStaffIn,
    RegenerateStaffPinResponse,
    StaffListOut,
    StaffOut,
    StaffWithTemporaryPinOut,
    UpdateStaffActiveIn,
    UpdateStaffIn,
)

router = APIRouter()


@router.get("/api/kds/staff", response_model=StaffListOut)
def list_staff(
    current_user: User = Depends(get_approved_store_owner),
    db: Session = Depends(get_db),
) -> StaffListOut:
    staff = db.scalars(
        select(User)
        .where(
            User.account_type == AccountType.EMPLOYEE,
            User.store_id == current_user.store_id,
            User.owner_user_id == current_user.id,
            User.deleted_at.is_(None),
        )
        .order_by(User.created_at.asc(), User.id.asc())
    ).all()
    return StaffListOut(staff=[_to_staff_out(member) for member in staff])


@router.post("/api/kds/staff", response_model=StaffWithTemporaryPinOut, status_code=status.HTTP_201_CREATED)
def create_staff(
    payload: CreateStaffIn,
    current_user: User = Depends(get_approved_store_owner),
    db: Session = Depends(get_db),
) -> StaffWithTemporaryPinOut:
    login_id = _normalize_login_id(payload.loginId)
    _validate_identifier(login_id)
    if db.scalar(select(User.id).where(func.lower(User.login_id) == login_id, User.deleted_at.is_(None))):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 아이디입니다.")

    temporary_pin = _generate_temporary_pin()
    staff = User(
        login_id=login_id,
        password_hash=None,
        name=payload.name.strip(),
        role=UserRole.STORE_OWNER,
        account_type=AccountType.EMPLOYEE,
        approval_status=current_user.approval_status,
        store_id=current_user.store_id,
        owner_user_id=current_user.id,
        pin_hash=hash_password(temporary_pin),
        position_label=_normalize_position_label(payload.positionLabel),
        active=True,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return StaffWithTemporaryPinOut(**_to_staff_out(staff).model_dump(), temporaryPin=temporary_pin)


@router.patch("/api/kds/staff/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: int,
    payload: UpdateStaffIn,
    current_user: User = Depends(get_approved_store_owner),
    db: Session = Depends(get_db),
) -> StaffOut:
    staff = _get_owned_staff(db, current_user, staff_id)
    login_id = _normalize_login_id(payload.loginId)
    _validate_identifier(login_id)
    duplicate = db.scalar(
        select(User.id).where(
            func.lower(User.login_id) == login_id,
            User.deleted_at.is_(None),
            User.id != staff.id,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 아이디입니다.")

    staff.name = payload.name.strip()
    staff.login_id = login_id
    staff.position_label = _normalize_position_label(payload.positionLabel)
    db.commit()
    db.refresh(staff)
    return _to_staff_out(staff)


@router.patch("/api/kds/staff/{staff_id}/active", response_model=StaffOut)
def update_staff_active(
    staff_id: int,
    payload: UpdateStaffActiveIn,
    current_user: User = Depends(get_approved_store_owner),
    db: Session = Depends(get_db),
) -> StaffOut:
    staff = _get_owned_staff(db, current_user, staff_id)
    staff.active = payload.active
    if not payload.active:
        revoke_user_refresh_tokens(db, staff.id)
    db.commit()
    db.refresh(staff)
    return _to_staff_out(staff)


@router.post("/api/kds/staff/{staff_id}/regenerate-pin", response_model=RegenerateStaffPinResponse)
def regenerate_staff_pin(
    staff_id: int,
    current_user: User = Depends(get_approved_store_owner),
    db: Session = Depends(get_db),
) -> RegenerateStaffPinResponse:
    staff = _get_owned_staff(db, current_user, staff_id)
    temporary_pin = _generate_temporary_pin()
    staff.pin_hash = hash_password(temporary_pin)
    revoke_user_refresh_tokens(db, staff.id)
    db.commit()
    return RegenerateStaffPinResponse(id=staff.id, temporaryPin=temporary_pin)


def _get_owned_staff(db: Session, current_user: User, staff_id: int) -> User:
    staff = db.scalar(
        select(User).where(
            User.id == staff_id,
            User.account_type == AccountType.EMPLOYEE,
            User.store_id == current_user.store_id,
            User.owner_user_id == current_user.id,
            User.deleted_at.is_(None),
        )
    )
    if staff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found.")
    return staff


def _to_staff_out(user: User) -> StaffOut:
    return StaffOut(
        id=user.id,
        loginId=user.login_id,
        name=user.name,
        accountType=user.account_type,
        positionLabel=user.position_label,
        active=user.active,
    )


def _normalize_position_label(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _generate_temporary_pin() -> str:
    return f"{random.randint(1000, 9999)}"


__all__ = ["router"]
