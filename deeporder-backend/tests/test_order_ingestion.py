from datetime import datetime, timezone

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import AnalysisStatus, Order, OrderAIAnalysis, OrderItem, OrderStatus, WebhookEvent
from app.normalization import NormalizedOrderEvent, NormalizedOrderItem, NormalizedOrderOption
from app.services.order_ingestion import ingest_order_event


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def sample_event(
    *,
    event_id: str = "evt_ingestion_001",
    event_type: str = "ORDER_CREATED",
    order_id: str = "order_ingestion_001",
) -> NormalizedOrderEvent:
    return NormalizedOrderEvent(
        source_platform="MOCK_DELIVERY",
        source_event_id=event_id,
        source_event_type=event_type,
        source_occurred_at=datetime(2026, 6, 13, 12, 0, 0, tzinfo=timezone.utc),
        source_store_id="STORE_FLAT",
        source_order_id=order_id,
        source_order_number="A-001",
        customer_request="양상추 빼주세요.",
        delivery_request="문 앞에 놓아주세요.",
        items=[
            NormalizedOrderItem(
                external_line_id="external-line-001",
                name="제육덮밥",
                quantity=1,
                unit_price=9000,
                total_price=9000,
                options=[
                    NormalizedOrderOption(group_name="맵기", option_name="보통"),
                    NormalizedOrderOption(option_name="치즈 추가"),
                ],
                notes=["메모 추가"],
            )
        ],
        raw_payload={
            "id": "external-webhook-row-id-should-be-ignored",
            "eventId": event_id,
            "eventType": event_type,
            "createdAt": "1999-01-01T00:00:00+00:00",
            "updatedAt": "1998-01-01T00:00:00+00:00",
            "order": {
                "id": "external-order-row-id-should-be-ignored",
                "orderId": order_id,
                "createdAt": "1997-01-01T00:00:00+00:00",
                "updatedAt": "1996-01-01T00:00:00+00:00",
                "items": [
                    {
                        "id": "external-item-row-id-should-be-ignored",
                        "itemId": "external-line-001",
                    }
                ],
            },
        },
        raw_headers={"x-test-header": "ingestion"},
    )


def test_ingest_order_event_creates_order_items_and_ai_analysis() -> None:
    with SessionLocal() as db:
        result = ingest_order_event(db, sample_event())

        assert result.response.result == "PROCESSED"
        assert result.enqueue_ai is True
        assert result.order_id_for_ai is not None

        order = db.scalar(select(Order).where(Order.id == result.order_id_for_ai))
        assert order is not None
        assert isinstance(order.id, int)
        assert order.id != order.external_order_id
        assert order.status == OrderStatus.NEW
        assert order.external_order_id == "order_ingestion_001"
        assert order.ordered_at is not None and order.ordered_at.year == 2026
        assert order.created_at.year != 1997
        assert order.updated_at.year != 1996
        assert len(order.items) == 1
        assert isinstance(order.items[0].id, int)
        assert order.items[0].id != "external-line-001"
        assert order.items[0].options == ["맵기: 보통", "치즈 추가", "메모 추가"]

        ai_analysis = db.scalar(select(OrderAIAnalysis).where(OrderAIAnalysis.order_id == order.id))
        assert ai_analysis is not None
        assert ai_analysis.analysis_status == AnalysisStatus.PENDING


def test_ingest_order_event_returns_duplicate_for_existing_event_id() -> None:
    with SessionLocal() as db:
        first = ingest_order_event(db, sample_event(event_id="evt_duplicate_service", order_id="order_duplicate_service"))
        second = ingest_order_event(
            db,
            sample_event(event_id="evt_duplicate_service", order_id="order_duplicate_service"),
        )

        assert first.response.result == "PROCESSED"
        assert second.response.result == "DUPLICATE_EVENT"

        orders = db.scalars(select(Order)).all()
        webhook_events = db.scalars(select(WebhookEvent)).all()
        assert len(orders) == 1
        assert len(webhook_events) == 1


def test_ingest_order_event_records_duplicate_order_without_creating_second_order() -> None:
    with SessionLocal() as db:
        first = ingest_order_event(db, sample_event(event_id="evt_order_exists_001", order_id="order_exists_001"))
        second = ingest_order_event(db, sample_event(event_id="evt_order_exists_002", order_id="order_exists_001"))

        assert first.response.result == "PROCESSED"
        assert second.response.result == "PROCESSED"
        assert second.response.message == "Order already exists; event recorded."
        assert second.enqueue_ai is False

        orders = db.scalars(select(Order)).all()
        webhook_events = db.scalars(select(WebhookEvent).order_by(WebhookEvent.id.asc())).all()
        assert len(orders) == 1
        assert len(webhook_events) == 2
        assert webhook_events[0].event_id == "evt_order_exists_001"
        assert webhook_events[1].event_id == "evt_order_exists_002"


def test_ingest_order_event_marks_existing_order_cancelled() -> None:
    with SessionLocal() as db:
        created = ingest_order_event(db, sample_event(event_id="evt_cancel_create_service", order_id="order_cancel_service"))
        cancelled = ingest_order_event(
            db,
            sample_event(
                event_id="evt_cancel_update_service",
                event_type="ORDER_CANCELLED",
                order_id="order_cancel_service",
            ),
        )

        assert created.response.result == "PROCESSED"
        assert cancelled.response.result == "PROCESSED"
        assert cancelled.response.message == "Cancellation event processed."

        order = db.scalar(select(Order).where(Order.id == created.order_id_for_ai))
        assert order is not None
        assert order.status == OrderStatus.CANCELLED


def test_ingest_order_event_keeps_external_ids_out_of_internal_primary_keys_and_relationships() -> None:
    with SessionLocal() as db:
        result = ingest_order_event(db, sample_event(event_id="evt_boundary_001", order_id="order_boundary_001"))

        assert result.order_id_for_ai is not None

        webhook_event = db.scalar(select(WebhookEvent).where(WebhookEvent.event_id == "evt_boundary_001"))
        order = db.scalar(select(Order).where(Order.id == result.order_id_for_ai))
        order_item = db.scalar(select(OrderItem).where(OrderItem.order_id == result.order_id_for_ai))

        assert webhook_event is not None
        assert order is not None
        assert order_item is not None

        assert isinstance(webhook_event.id, int)
        assert webhook_event.event_id == "evt_boundary_001"
        assert webhook_event.id != webhook_event.event_id
        assert webhook_event.created_at.year != 1999

        assert isinstance(order.id, int)
        assert order.external_order_id == "order_boundary_001"
        assert order.id != order.external_order_id
        assert order.created_at.year != 1997
        assert order.updated_at.year != 1996

        assert isinstance(order_item.id, int)
        assert order_item.order_id == order.id
        assert order_item.order is order
