from pathlib import Path

from fastapi.testclient import TestClient

db_path = Path("deeporder.db")
if db_path.exists():
    db_path.unlink()

from app.main import app  # noqa: E402


def sample_payload(event_id: str = "evt_001", order_id: str = "order_001") -> dict:
    return {
        "eventId": event_id,
        "eventType": "ORDER_CREATED",
        "platform": "MOCK_DELIVERY",
        "storeId": "STORE_001",
        "order": {
            "orderId": order_id,
            "orderNumber": "A-001",
            "customerRequest": "양상추는 빼주세요.",
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


def test_receive_order_webhook_and_kds_flow() -> None:
    with TestClient(app) as client:
        response = client.post("/api/external/orders/webhook", json=sample_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["result"] == "PROCESSED"
        assert body["orderId"] is not None

        orders_response = client.get("/api/kds/orders", params={"storeId": "STORE_001"})

        assert orders_response.status_code == 200
        orders = orders_response.json()["orders"]
        assert len(orders) == 1
        assert orders[0]["status"] == "NEW"
        assert orders[0]["items"][0]["name"] == "제육덮밥"

        status_response = client.patch(
            f"/api/orders/{orders[0]['id']}/status",
            json={"status": "COOKING"},
        )

        assert status_response.status_code == 200
        assert status_response.json()["status"] == "COOKING"


def test_duplicate_event_id_is_ignored() -> None:
    with TestClient(app) as client:
        first = client.post(
            "/api/external/orders/webhook",
            json=sample_payload(event_id="evt_duplicate", order_id="order_duplicate"),
        )
        second = client.post(
            "/api/external/orders/webhook",
            json=sample_payload(event_id="evt_duplicate", order_id="order_duplicate"),
        )

        assert first.status_code == 200
        assert second.status_code == 200
        assert second.json()["result"] == "DUPLICATE_EVENT"

