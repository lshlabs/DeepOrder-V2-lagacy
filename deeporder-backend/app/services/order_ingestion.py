from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import AnalysisStatus, Order, OrderAIAnalysis, OrderItem, OrderStatus, WebhookEvent, WebhookEventStatus
from app.normalization import NormalizedOrderEvent, NormalizedOrderItem, NormalizedOrderOption
from app.schemas import WebhookResponse


@dataclass
class IngestionResult:
    response: WebhookResponse
    enqueue_ai: bool = False
    order_id_for_ai: int | None = None


def ingest_order_event(db: Session, event: NormalizedOrderEvent) -> IngestionResult:
    existing_event = _find_existing_event(db, event)

    if existing_event:
        return IngestionResult(
            response=WebhookResponse(
                result="DUPLICATE_EVENT",
                eventId=_event_id_or_fallback(event),
                message="Event was already processed.",
            )
        )

    persisted_event = _build_webhook_event(event)
    db.add(persisted_event)

    order = db.scalar(
        select(Order).where(
            Order.platform == event.source_platform,
            Order.external_order_id == event.source_order_id,
        )
    )

    if event.source_event_type == "ORDER_CANCELLED":
        if order:
            order.status = OrderStatus.CANCELLED
        db.commit()
        return IngestionResult(
            response=WebhookResponse(
                result="PROCESSED",
                eventId=_event_id_or_fallback(event),
                orderId=order.id if order else None,
                message="Cancellation event processed.",
            )
        )

    if order:
        db.commit()
        return IngestionResult(
            response=WebhookResponse(
                result="PROCESSED",
                eventId=_event_id_or_fallback(event),
                orderId=order.id,
                message="Order already exists; event recorded.",
            )
        )

    order = _build_order(event)
    db.add(order)
    db.flush()

    for item in event.items:
        db.add(_build_order_item(order, item))

    db.add(_build_order_ai_analysis(order.id))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return IngestionResult(
            response=WebhookResponse(
                result="DUPLICATE_EVENT",
                eventId=_event_id_or_fallback(event),
                message="Event or order was already processed.",
            )
        )

    db.refresh(order)
    return IngestionResult(
        response=WebhookResponse(
            result="PROCESSED",
            eventId=_event_id_or_fallback(event),
            orderId=order.id,
            message="Order webhook processed.",
        ),
        enqueue_ai=True,
        order_id_for_ai=order.id,
    )


def _format_option(option: NormalizedOrderOption) -> str:
    if option.group_name:
        return f"{option.group_name}: {option.option_name}"
    return option.option_name


def _find_existing_event(db: Session, event: NormalizedOrderEvent) -> WebhookEvent | None:
    event_id = _event_id_or_fallback(event)
    return db.scalar(
        select(WebhookEvent).where(
            WebhookEvent.platform == event.source_platform,
            WebhookEvent.event_id == event_id,
        )
    )


def _build_webhook_event(event: NormalizedOrderEvent) -> WebhookEvent:
    return WebhookEvent(
        event_id=_event_id_or_fallback(event),
        event_type=event.source_event_type,
        platform=event.source_platform,
        store_id=event.source_store_id,
        status=WebhookEventStatus.PROCESSED,
        raw_payload=event.raw_payload,
    )


def _build_order(event: NormalizedOrderEvent) -> Order:
    return Order(
        platform=event.source_platform,
        store_id=event.source_store_id,
        external_order_id=event.source_order_id,
        order_number=event.source_order_number or event.source_order_id,
        status=OrderStatus.NEW,
        customer_request=event.customer_request,
        delivery_request=event.delivery_request,
        ordered_at=event.source_occurred_at,
        raw_payload=event.raw_payload,
    )


def _build_order_item(order: Order, item: NormalizedOrderItem) -> OrderItem:
    return OrderItem(
        order=order,
        name=item.name,
        quantity=item.quantity,
        options=[_format_option(option) for option in item.options] + list(item.notes),
        unit_price=item.unit_price,
        total_price=item.total_price,
    )


def _build_order_ai_analysis(order_id: int) -> OrderAIAnalysis:
    return OrderAIAnalysis(
        order_id=order_id,
        summary="",
        tags=[],
        cooking_notes=[],
        packing_notes=[],
        delivery_notes=[],
        warnings=[],
        analysis_status=AnalysisStatus.PENDING,
    )


def _event_id_or_fallback(event: NormalizedOrderEvent) -> str:
    return event.source_event_id or f"{event.source_platform}:{event.source_event_type}:{event.source_order_id}"
