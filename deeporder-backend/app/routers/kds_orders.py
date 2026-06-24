from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_approved_kds_user
from app.database import get_db
from app.models import KdsOrderItemProgress, KdsOrderState, Order, OrderItem, OrderStatus, User
from app.schemas import (
    ArchiveCompletedOrdersResponse,
    HideOrderResponse,
    KdsOrdersResponse,
    OrderAIAnalysisOut,
    OrderItemOut,
    OrderItemProgressOut,
    OrderOut,
    UpdateOrderItemProgressIn,
)

router = APIRouter()


@router.get("/api/kds/orders", response_model=KdsOrdersResponse)
def list_kds_orders(
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> KdsOrdersResponse:
    orders = db.scalars(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.ai_analysis),
        )
        .where(Order.store_id == current_user.store_id)
        .order_by(Order.created_at.desc(), Order.id.desc())
    ).all()
    order_ids = [order.id for order in orders]
    item_ids = [item.id for order in orders for item in order.items]

    order_states = (
        db.scalars(
            select(KdsOrderState).where(
                KdsOrderState.store_id == current_user.store_id,
                KdsOrderState.order_id.in_(order_ids),
            )
        ).all()
        if order_ids
        else []
    )
    item_progresses = (
        db.scalars(
            select(KdsOrderItemProgress).where(
                KdsOrderItemProgress.store_id == current_user.store_id,
                KdsOrderItemProgress.order_item_id.in_(item_ids),
            )
        ).all()
        if item_ids
        else []
    )
    order_state_by_order_id = {state.order_id: state for state in order_states}
    item_progress_by_item_id = {progress.order_item_id: progress for progress in item_progresses}

    return KdsOrdersResponse(
        orders=[
            _build_order_out(order, order_state_by_order_id.get(order.id), item_progress_by_item_id)
            for order in orders
        ]
    )


@router.patch("/api/kds/orders/{order_id}/hide", response_model=HideOrderResponse)
def hide_order(
    order_id: int,
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> HideOrderResponse:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if order.store_id != current_user.store_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden store access.")

    state = _get_or_create_order_state(db, order_id=order.id, store_id=current_user.store_id)
    if state.hidden_at is None:
        state.hidden_at = datetime.now(UTC)
        state.hidden_by_user_id = current_user.id
    db.commit()
    return HideOrderResponse(orderId=order.id, hidden=True)


@router.post("/api/kds/orders/archive-completed", response_model=ArchiveCompletedOrdersResponse)
def archive_completed_orders(
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> ArchiveCompletedOrdersResponse:
    done_orders = db.scalars(
        select(Order)
        .where(
            Order.store_id == current_user.store_id,
            Order.status == OrderStatus.DONE,
        )
        .order_by(Order.id.asc())
    ).all()

    archived_count = 0
    archived_at = datetime.now(UTC)
    for order in done_orders:
        state = _get_or_create_order_state(db, order_id=order.id, store_id=current_user.store_id)
        if state.archived_at is not None:
            continue
        state.archived_at = archived_at
        state.archived_by_user_id = current_user.id
        archived_count += 1

    db.commit()
    return ArchiveCompletedOrdersResponse(archivedCount=archived_count)


@router.patch("/api/kds/order-items/{order_item_id}/progress", response_model=OrderItemProgressOut)
def update_order_item_progress(
    order_item_id: int,
    payload: UpdateOrderItemProgressIn,
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> OrderItemProgressOut:
    order_item = db.get(OrderItem, order_item_id)
    if not order_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found.")

    order = db.get(Order, order_item.order_id)
    if not order or order.store_id != current_user.store_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden store access.")

    progress = _get_or_create_item_progress(db, order_item_id=order_item.id, store_id=current_user.store_id)
    progress.done = payload.done
    if payload.done:
        progress.done_at = datetime.now(UTC)
        progress.done_by_user_id = current_user.id
    else:
        progress.done_at = None
        progress.done_by_user_id = None

    db.commit()
    db.refresh(progress)
    return OrderItemProgressOut(
        orderItemId=progress.order_item_id,
        done=progress.done,
        doneAt=progress.done_at,
        doneByUserId=progress.done_by_user_id,
    )


def _build_order_out(
    order: Order,
    order_state: KdsOrderState | None,
    item_progress_by_item_id: dict[int, KdsOrderItemProgress],
) -> OrderOut:
    return OrderOut(
        id=order.id,
        platform=order.platform,
        store_id=order.store_id,
        external_order_id=order.external_order_id,
        order_number=order.order_number,
        status=order.status,
        customer_request=order.customer_request,
        delivery_request=order.delivery_request,
        ordered_at=order.ordered_at,
        created_at=order.created_at,
        updated_at=order.updated_at,
        hidden=order_state.hidden_at is not None if order_state else False,
        hiddenAt=order_state.hidden_at if order_state else None,
        archived=order_state.archived_at is not None if order_state else False,
        archivedAt=order_state.archived_at if order_state else None,
        items=[
            _build_order_item_out(item, item_progress_by_item_id.get(item.id))
            for item in order.items
        ],
        aiAnalysis=OrderAIAnalysisOut.model_validate(order.ai_analysis) if order.ai_analysis else None,
    )


def _build_order_item_out(item: OrderItem, progress: KdsOrderItemProgress | None) -> OrderItemOut:
    return OrderItemOut(
        id=item.id,
        name=item.name,
        quantity=item.quantity,
        options=item.options,
        unit_price=item.unit_price,
        total_price=item.total_price,
        done=progress.done if progress else False,
        doneAt=progress.done_at if progress else None,
        doneByUserId=progress.done_by_user_id if progress else None,
    )


def _get_or_create_order_state(db: Session, *, order_id: int, store_id: str) -> KdsOrderState:
    state = db.scalar(
        select(KdsOrderState).where(
            KdsOrderState.order_id == order_id,
            KdsOrderState.store_id == store_id,
        )
    )
    if state is not None:
        return state

    state = KdsOrderState(order_id=order_id, store_id=store_id)
    db.add(state)
    db.flush()
    return state


def _get_or_create_item_progress(db: Session, *, order_item_id: int, store_id: str) -> KdsOrderItemProgress:
    progress = db.scalar(
        select(KdsOrderItemProgress).where(
            KdsOrderItemProgress.order_item_id == order_item_id,
            KdsOrderItemProgress.store_id == store_id,
        )
    )
    if progress is not None:
        return progress

    progress = KdsOrderItemProgress(order_item_id=order_item_id, store_id=store_id)
    db.add(progress)
    db.flush()
    return progress
