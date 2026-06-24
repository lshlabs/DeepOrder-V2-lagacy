from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.auth import require_admin_token
from app.database import get_db
from app.models import ApprovalStatus, Order, OrderAIAnalysis, OrderItem, Store, User, WebhookEvent
from app.schemas import (
    AdminStoreOptionOut,
    AdminUserOut,
    AuthStoreOut,
    DeleteUserResponse,
    UpdateApprovalStatusIn,
    UpdateUserStoreIn,
)

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get("/api/admin/users", response_model=list[AdminUserOut])
def list_admin_users(
    approval_status: Literal["PENDING_APPROVAL", "APPROVED", "REJECTED"] | None = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
) -> list[AdminUserOut]:
    query = select(User).order_by(User.created_at.desc())
    if approval_status is not None:
        query = query.where(User.approval_status == ApprovalStatus(approval_status))
    users = db.scalars(query).all()
    return [_admin_user_out(user) for user in users]


@router.patch("/api/admin/users/{user_id}/approval", response_model=AdminUserOut)
def update_user_approval(
    user_id: int,
    payload: UpdateApprovalStatusIn,
    db: Session = Depends(get_db),
) -> AdminUserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    next_status = ApprovalStatus(payload.approvalStatus)
    user.approval_status = next_status

    store = db.scalar(select(Store).where(Store.store_id == user.store_id))
    if store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found.")
    store.approval_status = next_status

    db.commit()
    db.refresh(user)
    db.refresh(store)
    return _admin_user_out(user)


@router.get("/api/admin/stores", response_model=list[AdminStoreOptionOut])
def list_admin_stores(db: Session = Depends(get_db)) -> list[AdminStoreOptionOut]:
    stores = db.scalars(select(Store).order_by(Store.created_at.desc(), Store.id.desc())).all()
    return [_admin_store_option_out(store) for store in stores]


@router.patch("/api/admin/users/{user_id}/store", response_model=AdminUserOut)
def update_user_store(
    user_id: int,
    payload: UpdateUserStoreIn,
    db: Session = Depends(get_db),
) -> AdminUserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    current_store = user.store
    if current_store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found.")

    target_store_id = payload.storeId.strip()
    target_store_name = payload.storeName.strip()
    existing_target_store = db.scalar(select(Store).where(Store.store_id == target_store_id))

    if existing_target_store is not None and existing_target_store.id != current_store.id:
        attached_user_count = db.scalar(
            select(func.count(User.id)).where(User.store_id == target_store_id)
        ) or 0
        if attached_user_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Selected store is already assigned to another user.",
            )

    if target_store_id == user.store_id:
        current_store.store_name = target_store_name
        db.commit()
        db.refresh(user)
        db.refresh(current_store)
        return _admin_user_out(user)

    if existing_target_store is None:
        target_store = Store(
            store_id=target_store_id,
            store_name=target_store_name,
            phone=current_store.phone,
            zip_no=current_store.zip_no,
            road_address=current_store.road_address,
            jibun_address=current_store.jibun_address,
            address_detail=current_store.address_detail,
            approval_status=user.approval_status,
        )
        db.add(target_store)
        db.flush()
    else:
        target_store = existing_target_store
        target_store.store_name = target_store_name
        target_store.approval_status = user.approval_status

    previous_store_id = user.store_id

    db.execute(
        update(Order)
        .where(Order.store_id == previous_store_id)
        .values(store_id=target_store_id)
    )
    db.execute(
        update(WebhookEvent)
        .where(WebhookEvent.store_id == previous_store_id)
        .values(store_id=target_store_id)
    )

    user.store_id = target_store_id
    db.flush()

    remaining_user_count = db.scalar(
        select(func.count(User.id)).where(User.store_id == previous_store_id)
    ) or 0
    if remaining_user_count == 0:
        db.delete(current_store)

    db.commit()
    db.refresh(user)
    db.refresh(user.store)
    return _admin_user_out(user)


@router.delete("/api/admin/users/{user_id}", response_model=DeleteUserResponse)
def delete_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> DeleteUserResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    store = user.store
    if store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found.")

    shared_user_count = db.scalar(select(func.count(User.id)).where(User.store_id == user.store_id)) or 0
    if shared_user_count > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Store is linked to multiple users.",
        )

    deleted_store_id = user.store_id
    order_ids = db.scalars(select(Order.id).where(Order.store_id == deleted_store_id)).all()

    if order_ids:
        db.execute(delete(OrderAIAnalysis).where(OrderAIAnalysis.order_id.in_(order_ids)))
        db.execute(delete(OrderItem).where(OrderItem.order_id.in_(order_ids)))
    db.execute(delete(Order).where(Order.store_id == deleted_store_id))
    db.execute(delete(WebhookEvent).where(WebhookEvent.store_id == deleted_store_id))
    db.delete(user)
    db.flush()
    db.delete(store)
    db.commit()

    return DeleteUserResponse(id=user_id, deletedStoreId=deleted_store_id)


def _admin_user_out(user: User) -> AdminUserOut:
    return AdminUserOut(
        id=user.id,
        loginId=user.login_id,
        name=user.name,
        role=user.role,
        approvalStatus=user.approval_status,
        createdAt=user.created_at,
        store=_auth_store_out(user.store),
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


def _admin_store_option_out(store: Store) -> AdminStoreOptionOut:
    return AdminStoreOptionOut(
        id=store.id,
        storeId=store.store_id,
        storeName=store.store_name,
        approvalStatus=store.approval_status,
    )
