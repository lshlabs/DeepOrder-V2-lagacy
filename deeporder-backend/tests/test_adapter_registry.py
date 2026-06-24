import pytest

from app.adapters import MockDeliveryAdapter, UnsupportedPlatformError, get_adapter


def sample_payload(platform: str = "MOCK_DELIVERY") -> dict:
    return {
        "eventId": "evt_registry_001",
        "eventType": "ORDER_CREATED",
        "platform": platform,
        "storeId": "STORE_FLAT",
        "order": {
            "orderId": "ORDER_REGISTRY_001",
            "orderNumber": "REG-001",
            "customerRequest": "양상추 빼주세요.",
            "deliveryRequest": "문 앞에 놓아주세요.",
            "items": [
                {
                    "name": "제육덮밥",
                    "quantity": 1,
                    "options": ["덜 맵게"],
                    "unitPrice": 9000,
                    "totalPrice": 9000,
                }
            ],
        },
    }


def test_get_adapter_returns_mock_delivery_adapter_for_mock_payload() -> None:
    adapter = get_adapter({}, sample_payload())

    assert isinstance(adapter, MockDeliveryAdapter)
    assert adapter.platform_name == "MOCK_DELIVERY"


def test_get_adapter_rejects_unsupported_payload() -> None:
    with pytest.raises(UnsupportedPlatformError) as exc_info:
        get_adapter({}, sample_payload(platform="BAEMIN"))

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Unsupported external platform payload."
