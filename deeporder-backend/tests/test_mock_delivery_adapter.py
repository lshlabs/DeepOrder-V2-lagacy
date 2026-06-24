from datetime import datetime, timezone

from app.models import Order
from app.normalization import NormalizedOrderEvent
from app.adapters.mock_delivery import MockDeliveryAdapter


def sample_payload() -> dict:
    return {
        "id": "external-top-level-id-should-be-ignored",
        "eventId": "evt_adapter_001",
        "eventType": "ORDER_CREATED",
        "platform": "MOCK_DELIVERY",
        "storeId": "STORE_FLAT",
        "order": {
            "id": "external-order-row-id-should-be-ignored",
            "orderId": "ORDER_001",
            "orderNumber": "A-001",
            "customerRequest": "양상추 빼주세요.",
            "deliveryRequest": "문 앞에 놓아주세요.",
            "orderedAt": "2026-06-12T12:34:56+00:00",
            "createdAt": "1999-01-01T00:00:00+00:00",
            "updatedAt": "1998-01-01T00:00:00+00:00",
            "items": [
                {
                    "id": "external-item-row-id-should-be-ignored",
                    "itemId": "ITEM_EXT_001",
                    "name": "제육덮밥",
                    "quantity": 2,
                    "options": ["맵기: 보통", "치즈 추가"],
                    "unitPrice": 9000,
                    "totalPrice": 18000,
                }
            ],
        },
    }


def test_mock_delivery_adapter_can_handle_mock_platform() -> None:
    adapter = MockDeliveryAdapter()

    assert adapter.can_handle({}, sample_payload()) is True
    assert adapter.can_handle({}, {"platform": "BAEMIN"}) is False


def test_mock_delivery_adapter_signature_validation_is_explicit_noop() -> None:
    adapter = MockDeliveryAdapter()

    assert adapter.validate_signature({}, b"{}", sample_payload()) is None


def test_mock_delivery_adapter_parses_normalized_event() -> None:
    adapter = MockDeliveryAdapter()
    headers = {
        "content-type": "application/json",
        "x-test-header": "adapter-check",
    }

    normalized = adapter.parse_event(headers, sample_payload())

    assert isinstance(normalized, NormalizedOrderEvent)
    assert not isinstance(normalized, Order)

    assert normalized.source_platform == "MOCK_DELIVERY"
    assert normalized.source_event_id == "evt_adapter_001"
    assert normalized.source_event_type == "ORDER_CREATED"
    assert normalized.source_store_id == "STORE_FLAT"
    assert normalized.source_order_id == "ORDER_001"
    assert normalized.source_order_number == "A-001"
    assert normalized.customer_request == "양상추 빼주세요."
    assert normalized.delivery_request == "문 앞에 놓아주세요."
    assert normalized.source_occurred_at == datetime(2026, 6, 12, 12, 34, 56, tzinfo=timezone.utc)
    assert normalized.raw_payload == sample_payload()
    assert normalized.raw_headers == headers

    assert len(normalized.items) == 1
    item = normalized.items[0]
    assert item.external_line_id == "ITEM_EXT_001"
    assert item.name == "제육덮밥"
    assert item.quantity == 2
    assert item.unit_price == 9000
    assert item.total_price == 18000

    assert len(item.options) == 2
    assert item.options[0].group_name == "맵기"
    assert item.options[0].option_name == "보통"
    assert item.options[0].raw_option == "맵기: 보통"
    assert item.options[1].group_name is None
    assert item.options[1].option_name == "치즈 추가"
    assert item.options[1].raw_option == "치즈 추가"
