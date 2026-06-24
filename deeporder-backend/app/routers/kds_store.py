from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_approved_kds_user, get_approved_store_owner
from app.database import get_db
from app.models import StoreSettings, StoreStatusSource, User
from app.schemas import (
    KdsStoreContextOut,
    StoreSettingsOut,
    UpdateStoreSettingsIn,
    UpdateStoreStatusIn,
)

router = APIRouter()


@router.get("/api/kds/store-context", response_model=KdsStoreContextOut)
def get_store_context(
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> KdsStoreContextOut:
    settings = _get_store_settings(db, current_user.store_id)
    return KdsStoreContextOut(
        storeId=current_user.store.store_id,
        storeName=current_user.store.store_name,
        operatingStatus=settings.operating_status,
        pausedUntil=settings.paused_until,
        statusSource=settings.status_source,
    )


@router.patch("/api/kds/store-context/status", response_model=KdsStoreContextOut)
def update_store_status(
    payload: UpdateStoreStatusIn,
    current_user: User = Depends(get_approved_store_owner),
    db: Session = Depends(get_db),
) -> KdsStoreContextOut:
    settings = _get_or_create_store_settings(db, current_user.store_id)
    settings.operating_status = payload.operatingStatus
    settings.status_source = StoreStatusSource.MANUAL
    if payload.operatingStatus == "PAUSED" and payload.pauseMinutes:
        settings.paused_until = datetime.now(UTC) + timedelta(minutes=payload.pauseMinutes)
    else:
        settings.paused_until = None
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return KdsStoreContextOut(
        storeId=current_user.store.store_id,
        storeName=current_user.store.store_name,
        operatingStatus=settings.operating_status,
        pausedUntil=settings.paused_until,
        statusSource=settings.status_source,
    )


@router.get("/api/kds/settings", response_model=StoreSettingsOut)
def get_settings(
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> StoreSettingsOut:
    settings = _get_store_settings(db, current_user.store_id)
    return _to_settings_out(settings)


@router.patch("/api/kds/settings", response_model=StoreSettingsOut)
def update_settings(
    payload: UpdateStoreSettingsIn,
    current_user: User = Depends(get_approved_store_owner),
    db: Session = Depends(get_db),
) -> StoreSettingsOut:
    settings = _get_or_create_store_settings(db, current_user.store_id)
    settings.notifications_enabled = payload.notificationsEnabled
    settings.notification_sound = payload.notificationSound
    settings.breaktime_enabled = payload.breaktimeEnabled
    settings.breaktime_start_hour = payload.breaktimeStartHour
    settings.breaktime_start_minute = payload.breaktimeStartMinute
    settings.breaktime_duration_minutes = payload.breaktimeDurationMinutes
    settings.auto_accept = payload.autoAccept
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return _to_settings_out(settings)


def _get_store_settings(db: Session, store_id: str) -> StoreSettings:
    settings = db.scalar(select(StoreSettings).where(StoreSettings.store_id == store_id))
    if settings is not None:
        return settings
    return _default_store_settings(store_id)


def _get_or_create_store_settings(db: Session, store_id: str) -> StoreSettings:
    settings = db.scalar(select(StoreSettings).where(StoreSettings.store_id == store_id))
    if settings is not None:
        return settings
    settings = StoreSettings(store_id=store_id)
    db.add(settings)
    db.flush()
    return settings


def _default_store_settings(store_id: str) -> StoreSettings:
    return StoreSettings(
        store_id=store_id,
        operating_status="OPEN",
        status_source="MANUAL",
        notifications_enabled=True,
        notification_sound="classic",
        breaktime_enabled=False,
        breaktime_start_hour=15,
        breaktime_start_minute=0,
        breaktime_duration_minutes=30,
        auto_accept=False,
    )


def _to_settings_out(settings: StoreSettings) -> StoreSettingsOut:
    return StoreSettingsOut(
        notificationsEnabled=settings.notifications_enabled,
        notificationSound=settings.notification_sound,
        breaktimeEnabled=settings.breaktime_enabled,
        breaktimeStartHour=settings.breaktime_start_hour,
        breaktimeStartMinute=settings.breaktime_start_minute,
        breaktimeDurationMinutes=settings.breaktime_duration_minutes,
        autoAccept=settings.auto_accept,
    )


__all__ = ["router"]
