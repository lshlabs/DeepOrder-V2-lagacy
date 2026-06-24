from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select

db_path = Path("deeporder.db")
if db_path.exists():
    db_path.unlink()

from app.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import ApprovalStatus, Order, RefreshToken, Store, User, WebhookEvent  # noqa: E402


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


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_admin_users_requires_admin_token() -> None:
    with TestClient(app) as client:
        response = client.get("/api/admin/users")
        assert response.status_code == 401


def test_admin_users_can_list_and_filter_pending_users() -> None:
    with TestClient(app) as client:
        client.post("/api/auth/register", json=register_payload("owner1", "Store One"))
        client.post("/api/auth/register", json=register_payload("owner2", "Store Two"))

        settings = get_settings()
        approve_response = client.patch(
            "/api/admin/users/1/approval",
            json={"approvalStatus": "APPROVED"},
            headers={"X-Admin-Token": settings.admin_token},
        )
        assert approve_response.status_code == 200

        listed = client.get(
            "/api/admin/users",
            headers={"X-Admin-Token": settings.admin_token},
        )
        assert listed.status_code == 200
        assert len(listed.json()) == 2

        filtered = client.get(
            "/api/admin/users",
            params={"status": "PENDING_APPROVAL"},
            headers={"X-Admin-Token": settings.admin_token},
        )
        assert filtered.status_code == 200
        filtered_body = filtered.json()
        assert len(filtered_body) == 1
        assert filtered_body[0]["loginId"] == "owner2"
        assert filtered_body[0]["approvalStatus"] == "PENDING_APPROVAL"


def test_admin_users_approval_updates_user_and_store_together() -> None:
    with TestClient(app) as client:
        registered = client.post("/api/auth/register", json=register_payload("owner3", "Store Three"))
        user_id = registered.json()["user"]["id"]

        settings = get_settings()
        response = client.patch(
            f"/api/admin/users/{user_id}/approval",
            json={"approvalStatus": "REJECTED"},
            headers={"X-Admin-Token": settings.admin_token},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["approvalStatus"] == "REJECTED"
        assert body["store"]["approvalStatus"] == "REJECTED"

        with SessionLocal() as db:
            user = db.get(User, user_id)
            store = db.scalar(select(Store).where(Store.store_id == user.store_id))
            assert user is not None
            assert store is not None
            assert user.approval_status == ApprovalStatus.REJECTED
            assert store.approval_status == ApprovalStatus.REJECTED


def test_admin_stores_requires_admin_token() -> None:
    with TestClient(app) as client:
        response = client.get("/api/admin/stores")
        assert response.status_code == 401


def test_admin_stores_lists_backend_stores() -> None:
    with TestClient(app) as client:
        client.post("/api/auth/register", json=register_payload("owner4", "Store Four"))

        response = client.get(
            "/api/admin/stores",
            headers={"X-Admin-Token": get_settings().admin_token},
        )

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["storeName"] == "Store Four"


def test_admin_user_store_rebinding_moves_store_context_and_orders() -> None:
    with TestClient(app) as client:
        registered = client.post("/api/auth/register", json=register_payload("owner5", "Store Five"))
        user_id = registered.json()["user"]["id"]
        original_store_id = registered.json()["store"]["storeId"]

        settings = get_settings()
        approved = client.patch(
            f"/api/admin/users/{user_id}/approval",
            json={"approvalStatus": "APPROVED"},
            headers={"X-Admin-Token": settings.admin_token},
        )
        assert approved.status_code == 200

        webhook = client.post(
            "/api/external/orders/webhook",
            json=sample_payload(
                event_id="evt_rebind_1",
                order_id="order_rebind_1",
                store_id=original_store_id,
                order_number="RB-001",
            ),
        )
        assert webhook.status_code == 200

        relinked = client.patch(
            f"/api/admin/users/{user_id}/store",
            json={"storeId": "STORE_MENU_001", "storeName": "메뉴관리 매장"},
            headers={"X-Admin-Token": settings.admin_token},
        )
        assert relinked.status_code == 200
        body = relinked.json()
        assert body["store"]["storeId"] == "STORE_MENU_001"
        assert body["store"]["storeName"] == "메뉴관리 매장"

        login = client.post(
            "/api/auth/login",
            json={"loginId": "owner5", "password": "password1234"},
        )
        assert login.status_code == 200

        kds_orders = client.get(
            "/api/kds/orders",
            headers={"Authorization": f"Bearer {login.json()['accessToken']}"},
        )
        assert kds_orders.status_code == 200
        orders = kds_orders.json()["orders"]
        assert len(orders) == 1
        assert orders[0]["store_id"] == "STORE_MENU_001"

        with SessionLocal() as db:
            user = db.get(User, user_id)
            assert user is not None
            assert user.store_id == "STORE_MENU_001"
            order = db.scalar(select(Order).where(Order.external_order_id == "order_rebind_1"))
            event = db.scalar(select(WebhookEvent).where(WebhookEvent.event_id == "evt_rebind_1"))
            assert order is not None
            assert event is not None
            assert order.store_id == "STORE_MENU_001"
            assert event.store_id == "STORE_MENU_001"
            assert db.scalar(select(Store).where(Store.store_id == original_store_id)) is None


def test_admin_user_store_rebinding_rejects_store_already_bound_to_other_user() -> None:
    with TestClient(app) as client:
        first = client.post("/api/auth/register", json=register_payload("owner6", "Store Six"))
        second = client.post("/api/auth/register", json=register_payload("owner7", "Store Seven"))
        first_store_id = first.json()["store"]["storeId"]
        second_user_id = second.json()["user"]["id"]

        response = client.patch(
            f"/api/admin/users/{second_user_id}/store",
            json={"storeId": first_store_id, "storeName": "Store Six"},
            headers={"X-Admin-Token": get_settings().admin_token},
        )

        assert response.status_code == 409


def test_admin_user_store_rebinding_returns_404_for_missing_user() -> None:
    with TestClient(app) as client:
        response = client.patch(
            "/api/admin/users/999/store",
            json={"storeId": "STORE_MENU_404", "storeName": "없는 매장"},
            headers={"X-Admin-Token": get_settings().admin_token},
        )
        assert response.status_code == 404


def test_admin_delete_user_requires_admin_token() -> None:
    with TestClient(app) as client:
        registered = client.post("/api/auth/register", json=register_payload("owner8", "Store Eight"))
        user_id = registered.json()["user"]["id"]

        response = client.delete(f"/api/admin/users/{user_id}")
        assert response.status_code == 401


def test_admin_delete_user_removes_user_store_tokens_and_auth_access() -> None:
    with TestClient(app) as client:
        registered = client.post("/api/auth/register", json=register_payload("owner9", "Store Nine"))
        user_id = registered.json()["user"]["id"]
        store_id = registered.json()["store"]["storeId"]

        settings = get_settings()
        client.patch(
            f"/api/admin/users/{user_id}/approval",
            json={"approvalStatus": "APPROVED"},
            headers={"X-Admin-Token": settings.admin_token},
        )

        login = client.post(
            "/api/auth/login",
            json={"loginId": "owner9", "password": "password1234"},
        )
        assert login.status_code == 200
        access_token = login.json()["accessToken"]
        refresh_token = login.json()["refreshToken"]

        client.post(
            "/api/external/orders/webhook",
            json=sample_payload(
                event_id="evt_delete_1",
                order_id="order_delete_1",
                store_id=store_id,
                order_number="DEL-001",
            ),
        )

        deleted = client.delete(
            f"/api/admin/users/{user_id}",
            headers={"X-Admin-Token": settings.admin_token},
        )
        assert deleted.status_code == 200
        assert deleted.json()["deletedStoreId"] == store_id

        with SessionLocal() as db:
            assert db.get(User, user_id) is None
            assert db.scalar(select(Store).where(Store.store_id == store_id)) is None
            assert db.scalar(select(RefreshToken).where(RefreshToken.user_id == user_id)) is None
            assert db.scalar(select(Order).where(Order.store_id == store_id)) is None
            assert db.scalar(select(WebhookEvent).where(WebhookEvent.store_id == store_id)) is None

        failed_login = client.post(
            "/api/auth/login",
            json={"loginId": "owner9", "password": "password1234"},
        )
        assert failed_login.status_code == 401

        failed_refresh = client.post(
            "/api/auth/refresh",
            json={"refreshToken": refresh_token},
        )
        assert failed_refresh.status_code == 401

        failed_me = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert failed_me.status_code == 401


def test_admin_delete_user_returns_404_for_missing_user() -> None:
    with TestClient(app) as client:
        response = client.delete(
            "/api/admin/users/999",
            headers={"X-Admin-Token": get_settings().admin_token},
        )
        assert response.status_code == 404
