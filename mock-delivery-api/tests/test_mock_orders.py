from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

db_path = Path("mock_delivery.db")
if db_path.exists():
    db_path.unlink()

from app.main import app  # noqa: E402


def test_console_page_renders() -> None:
    with TestClient(app) as client:
        response = client.get("/console")

        assert response.status_code == 200
        assert "Mock Delivery Console" in response.text
        assert "DeepOrder Webhook URL" in response.text
        assert "/static/console.js" in response.text


def test_create_sample_order() -> None:
    with TestClient(app) as client:
        response = client.post("/api/mock/orders/sample", json={"storeId": "STORE_001"})

        assert response.status_code == 200
        body = response.json()
        assert body["generatedOrderId"] is not None
        assert body["payload"]["eventType"] == "ORDER_CREATED"
        assert body["payload"]["platform"] == "MOCK_DELIVERY"
        assert body["payload"]["storeId"] == "STORE_001"
        assert body["payload"]["order"]["items"][0]["name"] == "제육덮밥"


def test_send_generated_order_and_record_success_log(monkeypatch) -> None:
    def fake_post(url: str, json: dict, timeout: float) -> SimpleNamespace:
        assert url == "http://deeporder.test/webhook"
        assert json["eventType"] == "ORDER_CREATED"
        assert timeout == 10.0
        return SimpleNamespace(
            status_code=200,
            text='{"result":"PROCESSED","eventId":"evt","orderId":1}',
        )

    import app.mock_orders as mock_orders

    monkeypatch.setattr(mock_orders.httpx, "post", fake_post)

    with TestClient(app) as client:
        sample_response = client.post("/api/mock/orders/sample", json={"storeId": "STORE_001"})
        generated_order_id = sample_response.json()["generatedOrderId"]

        send_response = client.post(
            "/api/mock/orders/send",
            json={
                "generatedOrderId": generated_order_id,
                "webhookUrl": "http://deeporder.test/webhook",
            },
        )

        assert send_response.status_code == 200
        assert send_response.json()["success"] is True
        assert send_response.json()["status"] == "SUCCESS"
        assert send_response.json()["httpStatusCode"] == 200

        logs_response = client.get("/api/mock/webhook-logs")

        assert logs_response.status_code == 200
        logs = logs_response.json()["logs"]
        assert len(logs) >= 1
        assert logs[0]["success"] is True
        assert logs[0]["webhook_url"] == "http://deeporder.test/webhook"
