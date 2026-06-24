from pathlib import Path

from fastapi.testclient import TestClient

db_path = Path("deeporder.db")
if db_path.exists():
    db_path.unlink()

from app.config import get_settings  # noqa: E402
from app.database import Base, engine  # noqa: E402
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
            "customerRequest": "양상추는 빼주시고 견과류 알레르기 있어요.",
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


def register_payload(login_id: str = "owner") -> dict:
    return {
        "name": "Owner",
        "loginId": login_id,
        "password": "password1234",
        "storeName": "Webhook Test Store",
        "storePhone": "010-0000-0000",
        "zipNo": "12345",
        "roadAddress": "서울시 테스트로 1",
        "jibunAddress": "서울시 테스트동 1-1",
        "addressDetail": "101호",
    }


def approved_login(client: TestClient, login_id: str = "owner") -> dict:
    registered = client.post("/api/auth/register", json=register_payload(login_id))
    assert registered.status_code == 201
    user_id = registered.json()["user"]["id"]

    approved = client.patch(
        f"/api/admin/users/{user_id}/approval",
        json={"approvalStatus": "APPROVED"},
        headers={"X-Admin-Token": get_settings().admin_token},
    )
    assert approved.status_code == 200

    logged_in = client.post(
        "/api/auth/login",
        json={"loginId": login_id, "password": "password1234"},
    )
    assert logged_in.status_code == 200
    return logged_in.json()


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_receive_order_webhook_and_kds_flow() -> None:
    with TestClient(app) as client:
        login = approved_login(client)
        response = client.post("/api/external/orders/webhook", json=sample_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["result"] == "PROCESSED"
        assert body["orderId"] is not None

        orders_response = client.get(
            "/api/kds/orders",
            headers={"Authorization": f"Bearer {login['accessToken']}"},
        )

        assert orders_response.status_code == 200
        orders = orders_response.json()["orders"]
        assert len(orders) == 1
        assert orders[0]["status"] == "NEW"
        assert orders[0]["items"][0]["name"] == "제육덮밥"
        assert orders[0]["aiAnalysis"]["analysisStatus"] == "FALLBACK"
        assert orders[0]["aiAnalysis"]["riskLevel"] == "HIGH"
        assert "알레르기위험" in orders[0]["aiAnalysis"]["tags"]
        assert orders[0]["aiAnalysis"]["needsHumanCheck"] is True
        assert orders[0]["aiAnalysis"]["warnings"] == []
        assert orders[0]["aiAnalysis"]["ignoredRequests"] == [
            {"type": "DELIVERY", "text": "문 앞에 놓아주세요."}
        ]
        assert orders[0]["aiAnalysis"]["kitchenActions"] == [
            {
                "type": "ALLERGY",
                "label": "알레르기",
                "target": "견과류",
                "displayText": "알레르기: 견과류",
                "severity": "HIGH",
                "requiresHumanCheck": True,
                "source": "CUSTOMER_REQUEST",
                "sourceText": "양상추는 빼주시고 견과류 알레르기 있어요",
                "matchedMenuItemIds": [],
            },
            {
                "type": "EXCLUDE_INGREDIENT",
                "label": "제외",
                "target": "양상추",
                "displayText": "제외: 양상추",
                "severity": "MEDIUM",
                "requiresHumanCheck": True,
                "source": "CUSTOMER_REQUEST",
                "sourceText": "양상추는 빼주시고 견과류 알레르기 있어요",
                "matchedMenuItemIds": [],
            },
        ]

        status_response = client.patch(
            f"/api/orders/{orders[0]['id']}/status",
            json={"status": "COOKING"},
            headers={"Authorization": f"Bearer {login['accessToken']}"},
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


def test_cancel_event_marks_existing_order_cancelled() -> None:
    with TestClient(app) as client:
        login = approved_login(client, login_id="cancel")
        created = client.post(
            "/api/external/orders/webhook",
            json=sample_payload(event_id="evt_cancel_create", order_id="order_cancel"),
        )
        assert created.status_code == 200
        created_order_id = created.json()["orderId"]

        cancelled_payload = sample_payload(event_id="evt_cancel_update", order_id="order_cancel")
        cancelled_payload["eventType"] = "ORDER_CANCELLED"

        cancelled = client.post("/api/external/orders/webhook", json=cancelled_payload)

        assert cancelled.status_code == 200
        cancelled_body = cancelled.json()
        assert cancelled_body["result"] == "PROCESSED"
        assert cancelled_body["orderId"] == created_order_id

        orders_response = client.get(
            "/api/kds/orders",
            headers={"Authorization": f"Bearer {login['accessToken']}"},
        )
        assert orders_response.status_code == 200
        orders = orders_response.json()["orders"]
        cancelled_order = next(order for order in orders if order["id"] == created_order_id)
        assert cancelled_order["status"] == "CANCELLED"
