from pathlib import Path

from fastapi.testclient import TestClient

db_path = Path("deeporder.db")
if db_path.exists():
    db_path.unlink()

from app.config import get_settings  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


def register_payload(login_id: str, store_name: str) -> dict:
    return {
        "name": store_name,
        "loginId": login_id,
        "password": "password1234",
        "storeName": store_name,
        "storePhone": "010-0000-0000",
        "zipNo": "12345",
        "roadAddress": "서울시 테스트로 1",
        "jibunAddress": "서울시 테스트동 1-1",
        "addressDetail": "101호",
    }


def sample_payload(*, event_id: str, order_id: str, store_id: str, order_number: str) -> dict:
    return {
        "eventId": event_id,
        "eventType": "ORDER_CREATED",
        "platform": "MOCK_DELIVERY",
        "storeId": store_id,
        "order": {
            "orderId": order_id,
            "orderNumber": order_number,
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


def register_approve_and_login(client: TestClient, *, login_id: str, store_name: str) -> dict:
    registered = client.post("/api/auth/register", json=register_payload(login_id, store_name))
    assert registered.status_code == 201

    user_id = registered.json()["user"]["id"]
    settings = get_settings()
    approved = client.patch(
        f"/api/admin/users/{user_id}/approval",
        json={"approvalStatus": "APPROVED"},
        headers={"X-Admin-Token": settings.admin_token},
    )
    assert approved.status_code == 200

    logged_in = client.post(
        "/api/auth/login",
        json={"loginId": login_id, "password": "password1234"},
    )
    assert logged_in.status_code == 200
    return logged_in.json()


def auth_header(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_kds_orders_requires_authenticated_approved_user() -> None:
    with TestClient(app) as client:
        unauthorized = client.get("/api/kds/orders")
        assert unauthorized.status_code == 401

        client.post("/api/auth/register", json=register_payload("pending", "Pending Store"))
        logged_in = client.post(
            "/api/auth/login",
            json={"loginId": "pending", "password": "password1234"},
        )
        assert logged_in.status_code == 200

        forbidden = client.get(
            "/api/kds/orders",
            headers=auth_header(logged_in.json()["accessToken"]),
        )
        assert forbidden.status_code == 403
        assert forbidden.json()["detail"] == "Approval required."


def test_kds_orders_and_status_use_current_user_store_context() -> None:
    with TestClient(app) as client:
        owner_one = register_approve_and_login(
            client,
            login_id="owner1",
            store_name="Store One",
        )
        owner_two = register_approve_and_login(
            client,
            login_id="owner2",
            store_name="Store Two",
        )

        client.post(
            "/api/external/orders/webhook",
            json=sample_payload(
                event_id="evt_store_1",
                order_id="order_store_1",
                store_id=owner_one["store"]["storeId"],
                order_number="A-001",
            ),
        )
        client.post(
            "/api/external/orders/webhook",
            json=sample_payload(
                event_id="evt_store_2",
                order_id="order_store_2",
                store_id=owner_two["store"]["storeId"],
                order_number="B-001",
            ),
        )

        owner_one_orders = client.get(
            "/api/kds/orders",
            headers=auth_header(owner_one["accessToken"]),
        )
        assert owner_one_orders.status_code == 200
        owner_one_body = owner_one_orders.json()["orders"]
        assert len(owner_one_body) == 1
        assert owner_one_body[0]["store_id"] == owner_one["store"]["storeId"]

        update_own_order = client.patch(
            f"/api/orders/{owner_one_body[0]['id']}/status",
            json={"status": "COOKING"},
            headers=auth_header(owner_one["accessToken"]),
        )
        assert update_own_order.status_code == 200
        assert update_own_order.json()["status"] == "COOKING"

        owner_two_orders = client.get(
            "/api/kds/orders",
            headers=auth_header(owner_two["accessToken"]),
        )
        assert owner_two_orders.status_code == 200
        owner_two_body = owner_two_orders.json()["orders"]
        assert len(owner_two_body) == 1
        assert owner_two_body[0]["store_id"] == owner_two["store"]["storeId"]

        forbidden_update = client.patch(
            f"/api/orders/{owner_two_body[0]['id']}/status",
            json={"status": "DONE"},
            headers=auth_header(owner_one["accessToken"]),
        )
        assert forbidden_update.status_code == 403
        assert forbidden_update.json()["detail"] == "Forbidden store access."
