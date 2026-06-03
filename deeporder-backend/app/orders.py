from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Order, OrderItem, OrderStatus, WebhookEvent, WebhookEventStatus
from app.schemas import (
    KdsOrdersResponse,
    OrderOut,
    OrderStatusResponse,
    OrderWebhookIn,
    UpdateOrderStatusIn,
    WebhookResponse,
)

router = APIRouter()


@router.post("/api/external/orders/webhook", response_model=WebhookResponse)
def receive_order_webhook(payload: OrderWebhookIn, db: Session = Depends(get_db)) -> WebhookResponse:
    existing_event = db.scalar(select(WebhookEvent).where(WebhookEvent.event_id == payload.eventId))
    if existing_event:
        return WebhookResponse(
            result="DUPLICATE_EVENT",
            eventId=payload.eventId,
            message="Event was already processed.",
        )

    event = WebhookEvent(
        event_id=payload.eventId,
        event_type=payload.eventType,
        platform=payload.platform,
        store_id=payload.storeId,
        status=WebhookEventStatus.PROCESSED,
        raw_payload=payload.model_dump(mode="json"),
    )
    db.add(event)

    order = db.scalar(
        select(Order).where(
            Order.platform == payload.platform,
            Order.external_order_id == payload.order.orderId,
        )
    )

    if payload.eventType == "ORDER_CANCELLED":
        if order:
            order.status = OrderStatus.CANCELLED
        db.commit()
        return WebhookResponse(
            result="PROCESSED",
            eventId=payload.eventId,
            orderId=order.id if order else None,
            message="Cancellation event processed.",
        )

    if order:
        db.commit()
        return WebhookResponse(
            result="PROCESSED",
            eventId=payload.eventId,
            orderId=order.id,
            message="Order already exists; event recorded.",
        )

    order = Order(
        platform=payload.platform,
        store_id=payload.storeId,
        external_order_id=payload.order.orderId,
        order_number=payload.order.orderNumber,
        status=OrderStatus.NEW,
        customer_request=payload.order.customerRequest,
        delivery_request=payload.order.deliveryRequest,
        ordered_at=payload.order.orderedAt,
        raw_payload=payload.model_dump(mode="json"),
        items=[
            OrderItem(
                name=item.name,
                quantity=item.quantity,
                options=item.options,
                unit_price=item.unitPrice,
                total_price=item.totalPrice,
            )
            for item in payload.order.items
        ],
    )
    db.add(order)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return WebhookResponse(
            result="DUPLICATE_EVENT",
            eventId=payload.eventId,
            message="Event or order was already processed.",
        )

    db.refresh(order)
    return WebhookResponse(
        result="PROCESSED",
        eventId=payload.eventId,
        orderId=order.id,
        message="Order webhook processed.",
    )


@router.get("/api/kds/orders", response_model=KdsOrdersResponse)
def list_kds_orders(
    store_id: str = Query(alias="storeId"),
    db: Session = Depends(get_db),
) -> KdsOrdersResponse:
    orders = db.scalars(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.store_id == store_id)
        .order_by(Order.created_at.desc(), Order.id.desc())
    ).all()
    return KdsOrdersResponse(orders=[OrderOut.model_validate(order) for order in orders])


@router.patch("/api/orders/{order_id}/status", response_model=OrderStatusResponse)
def update_order_status(
    order_id: int,
    payload: UpdateOrderStatusIn,
    db: Session = Depends(get_db),
) -> OrderStatusResponse:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    order.status = OrderStatus(payload.status)
    db.commit()
    db.refresh(order)
    return OrderStatusResponse(id=order.id, status=order.status)

