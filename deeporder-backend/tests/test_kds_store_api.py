from pathlib import Path

from fastapi.testclient import TestClient

db_path = Path("deeporder.db")
if db_path.exists():
    db_path.unlink()

from app.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.database import Base, engine  # noqa: E402


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


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def auth_header(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


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


def test_store_context_returns_defaults_and_persists_status() -> None:
    with TestClient(app) as client:
        login = register_approve_and_login(client, login_id="storectx", store_name="Store Ctx")
        headers = auth_header(login["accessToken"])

        context = client.get("/api/kds/store-context", headers=headers)
        assert context.status_code == 200
        assert context.json()["operatingStatus"] == "OPEN"
        assert context.json()["statusSource"] == "MANUAL"
        assert context.json()["pausedUntil"] is None

        updated = client.patch(
            "/api/kds/store-context/status",
            json={"operatingStatus": "PAUSED", "pauseMinutes": 30},
            headers=headers,
        )
        assert updated.status_code == 200
        body = updated.json()
        assert body["operatingStatus"] == "PAUSED"
        assert body["statusSource"] == "MANUAL"
        assert body["pausedUntil"] is not None

        refreshed = client.get("/api/kds/store-context", headers=headers)
        assert refreshed.status_code == 200
        assert refreshed.json()["operatingStatus"] == "PAUSED"


def test_kds_settings_returns_defaults_and_creates_row_on_patch() -> None:
    with TestClient(app) as client:
        login = register_approve_and_login(client, login_id="settings", store_name="Store Settings")
        headers = auth_header(login["accessToken"])

        defaults = client.get("/api/kds/settings", headers=headers)
        assert defaults.status_code == 200
        assert defaults.json() == {
            "notificationsEnabled": True,
            "notificationSound": "classic",
            "breaktimeEnabled": False,
            "breaktimeStartHour": 15,
            "breaktimeStartMinute": 0,
            "breaktimeDurationMinutes": 30,
            "autoAccept": False,
        }

        updated = client.patch(
            "/api/kds/settings",
            json={
                "notificationsEnabled": False,
                "notificationSound": "bell",
                "breaktimeEnabled": True,
                "breaktimeStartHour": 16,
                "breaktimeStartMinute": 30,
                "breaktimeDurationMinutes": 45,
                "autoAccept": True,
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["notificationsEnabled"] is False
        assert updated.json()["breaktimeEnabled"] is True
        assert updated.json()["autoAccept"] is True

        refreshed = client.get("/api/kds/settings", headers=headers)
        assert refreshed.status_code == 200
        assert refreshed.json()["breaktimeStartHour"] == 16
        assert refreshed.json()["breaktimeDurationMinutes"] == 45


def test_store_context_and_settings_require_approved_user() -> None:
    with TestClient(app) as client:
        registered = client.post("/api/auth/register", json=register_payload("pendingkds", "Pending KDS"))
        assert registered.status_code == 201
        logged_in = client.post(
            "/api/auth/login",
            json={"loginId": "pendingkds", "password": "password1234"},
        )
        assert logged_in.status_code == 200
        headers = auth_header(logged_in.json()["accessToken"])

        context = client.get("/api/kds/store-context", headers=headers)
        assert context.status_code == 403
        settings = client.get("/api/kds/settings", headers=headers)
        assert settings.status_code == 403
