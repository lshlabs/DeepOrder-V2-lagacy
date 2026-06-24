from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select

db_path = Path("deeporder.db")
if db_path.exists():
    db_path.unlink()

from app.config import get_settings  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import RefreshToken, User  # noqa: E402


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
            "customerRequest": "덜 맵게",
            "deliveryRequest": "문 앞",
            "items": [
                {
                    "name": "제육덮밥",
                    "quantity": 1,
                    "options": ["기본"],
                    "unitPrice": 9000,
                    "totalPrice": 9000,
                }
            ],
        },
    }


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def register_approve_and_login(client: TestClient, *, login_id: str, store_name: str) -> dict:
    registered = client.post("/api/auth/register", json=register_payload(login_id, store_name))
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


def auth_header(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def create_staff(client: TestClient, owner_access_token: str, *, name: str = "직원A", login_id: str = "staff-a") -> dict:
    response = client.post(
        "/api/kds/staff",
        headers=auth_header(owner_access_token),
        json={"name": name, "loginId": login_id, "positionLabel": "매니저"},
    )
    assert response.status_code == 201
    return response.json()


def test_staff_crud_pin_and_employee_login_flow() -> None:
    with TestClient(app) as client:
        owner = register_approve_and_login(
            client,
            login_id="owner-staff",
            store_name="Staff Store",
        )

        created_staff = create_staff(client, owner["accessToken"])
        assert created_staff["accountType"] == "EMPLOYEE"
        assert created_staff["temporaryPin"]
        staff_id = created_staff["id"]
        first_pin = created_staff["temporaryPin"]

        list_response = client.get("/api/kds/staff", headers=auth_header(owner["accessToken"]))
        assert list_response.status_code == 200
        listed_staff = list_response.json()["staff"]
        assert len(listed_staff) == 1
        assert listed_staff[0]["id"] == staff_id
        assert "temporaryPin" not in listed_staff[0]

        updated = client.patch(
            f"/api/kds/staff/{staff_id}",
            headers=auth_header(owner["accessToken"]),
            json={"name": "직원B", "loginId": "staff-b", "positionLabel": "직원"},
        )
        assert updated.status_code == 200
        assert updated.json()["name"] == "직원B"
        assert updated.json()["positionLabel"] == "직원"

        employee_login = client.post(
            "/api/auth/employee/login",
            json={"loginId": "staff-b", "pin": first_pin, "autoLogin": False},
        )
        assert employee_login.status_code == 200
        employee_access_token = employee_login.json()["accessToken"]
        employee_refresh_token = employee_login.json()["refreshToken"]

        webhook = client.post(
            "/api/external/orders/webhook",
            json=sample_payload(
                event_id="evt-staff-1",
                order_id="order-staff-1",
                store_id=owner["store"]["storeId"],
                order_number="SF-001",
            ),
        )
        assert webhook.status_code == 200

        kds_orders = client.get("/api/kds/orders", headers=auth_header(employee_access_token))
        assert kds_orders.status_code == 200
        my_tasks = client.get("/api/kds/my-tasks/menus", headers=auth_header(employee_access_token))
        assert my_tasks.status_code == 200
        employee_settings = client.get("/api/kds/settings", headers=auth_header(employee_access_token))
        assert employee_settings.status_code == 200

        owner_only_staff = client.get("/api/kds/staff", headers=auth_header(employee_access_token))
        assert owner_only_staff.status_code == 403
        owner_only_patch = client.patch(
            "/api/kds/settings",
            headers=auth_header(employee_access_token),
            json={
                "notificationsEnabled": True,
                "notificationSound": "classic",
                "breaktimeEnabled": False,
                "breaktimeStartHour": 15,
                "breaktimeStartMinute": 0,
                "breaktimeDurationMinutes": 30,
                "autoAccept": False,
            },
        )
        assert owner_only_patch.status_code == 403

        pin_reset = client.post(
            f"/api/kds/staff/{staff_id}/regenerate-pin",
            headers=auth_header(owner["accessToken"]),
        )
        assert pin_reset.status_code == 200
        second_pin = pin_reset.json()["temporaryPin"]
        assert second_pin != first_pin

        revoked_refresh = client.post("/api/auth/refresh", json={"refreshToken": employee_refresh_token})
        assert revoked_refresh.status_code == 401

        old_pin_login = client.post(
            "/api/auth/employee/login",
            json={"loginId": "staff-b", "pin": first_pin, "autoLogin": False},
        )
        assert old_pin_login.status_code == 401

        new_pin_login = client.post(
            "/api/auth/employee/login",
            json={"loginId": "staff-b", "pin": second_pin, "autoLogin": True},
        )
        assert new_pin_login.status_code == 200

        deactivated = client.patch(
            f"/api/kds/staff/{staff_id}/active",
            headers=auth_header(owner["accessToken"]),
            json={"active": False},
        )
        assert deactivated.status_code == 200
        assert deactivated.json()["active"] is False

        blocked_employee_login = client.post(
            "/api/auth/employee/login",
            json={"loginId": "staff-b", "pin": second_pin, "autoLogin": False},
        )
        assert blocked_employee_login.status_code == 403

        reactivated = client.patch(
            f"/api/kds/staff/{staff_id}/active",
            headers=auth_header(owner["accessToken"]),
            json={"active": True},
        )
        assert reactivated.status_code == 200
        assert reactivated.json()["active"] is True

        login_after_reactivate = client.post(
            "/api/auth/employee/login",
            json={"loginId": "staff-b", "pin": second_pin, "autoLogin": False},
        )
        assert login_after_reactivate.status_code == 200

        with SessionLocal() as db:
            staff = db.get(User, staff_id)
            assert staff is not None
            assert staff.password_hash is None
            assert staff.pin_hash is not None
            tokens = db.scalars(select(RefreshToken).where(RefreshToken.user_id == staff_id)).all()
            assert len(tokens) >= 2


def test_staff_actions_are_scoped_to_owner_store() -> None:
    with TestClient(app) as client:
        owner_one = register_approve_and_login(
            client,
            login_id="owner-staff-one",
            store_name="Staff One",
        )
        owner_two = register_approve_and_login(
            client,
            login_id="owner-staff-two",
            store_name="Staff Two",
        )

        created_staff = create_staff(
            client,
            owner_two["accessToken"],
            name="타매장직원",
            login_id="other-staff",
        )
        staff_id = created_staff["id"]

        forbidden_update = client.patch(
            f"/api/kds/staff/{staff_id}",
            headers=auth_header(owner_one["accessToken"]),
            json={"name": "침범", "loginId": "intrude", "positionLabel": "직원"},
        )
        assert forbidden_update.status_code == 404

        forbidden_active = client.patch(
            f"/api/kds/staff/{staff_id}/active",
            headers=auth_header(owner_one["accessToken"]),
            json={"active": False},
        )
        assert forbidden_active.status_code == 404

        forbidden_pin = client.post(
            f"/api/kds/staff/{staff_id}/regenerate-pin",
            headers=auth_header(owner_one["accessToken"]),
        )
        assert forbidden_pin.status_code == 404
