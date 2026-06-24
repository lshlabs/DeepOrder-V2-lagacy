from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select

db_path = Path("deeporder.db")
if db_path.exists():
    db_path.unlink()

from app.main import app  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.auth import hash_password  # noqa: E402
from app.models import AccountType, ApprovalStatus, RefreshToken, User  # noqa: E402


def register_payload(login_id: str = "owner") -> dict:
    return {
        "name": "Owner",
        "loginId": login_id,
        "password": "password1234",
        "storeName": "Auth Test Store",
        "storePhone": "010-0000-0000",
        "zipNo": "12345",
        "roadAddress": "서울시 테스트로 1",
        "jibunAddress": "서울시 테스트동 1-1",
        "addressDetail": "101호",
    }


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_register_login_me_refresh_and_logout_flow() -> None:
    with TestClient(app) as client:
        registered = client.post("/api/auth/register", json=register_payload())
        assert registered.status_code == 201
        registered_body = registered.json()
        assert registered_body["user"]["approvalStatus"] == "PENDING_APPROVAL"
        assert registered_body["store"]["storeId"] == "STORE_001"

        logged_in = client.post(
            "/api/auth/login",
            json={"loginId": "owner", "password": "password1234"},
        )
        assert logged_in.status_code == 200
        login_body = logged_in.json()
        assert login_body["accessToken"]
        assert login_body["refreshToken"]
        assert login_body["autoLogin"] is False
        assert login_body["user"]["loginId"] == "owner"

        me_response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {login_body['accessToken']}"},
        )
        assert me_response.status_code == 200
        assert me_response.json()["store"]["storeId"] == "STORE_001"

        refreshed = client.post(
            "/api/auth/refresh",
            json={"refreshToken": login_body["refreshToken"]},
        )
        assert refreshed.status_code == 200
        assert refreshed.json()["accessToken"]

        logout = client.post(
            "/api/auth/logout",
            json={"refreshToken": login_body["refreshToken"]},
        )
        assert logout.status_code == 204

        refresh_after_logout = client.post(
            "/api/auth/refresh",
            json={"refreshToken": login_body["refreshToken"]},
        )
        assert refresh_after_logout.status_code == 401

        with SessionLocal() as db:
            tokens = db.scalars(select(RefreshToken)).all()
            assert len(tokens) == 1
            assert tokens[0].revoked_at is not None


def test_login_supports_auto_login_and_persistent_refresh_expiry() -> None:
    with TestClient(app) as client:
        client.post("/api/auth/register", json=register_payload("autologin"))

        logged_in = client.post(
            "/api/auth/login",
            json={"loginId": "autologin", "password": "password1234", "autoLogin": True},
        )
        assert logged_in.status_code == 200
        login_body = logged_in.json()
        assert login_body["autoLogin"] is True

        with SessionLocal() as db:
            token = db.scalars(select(RefreshToken).order_by(RefreshToken.id.desc())).first()
            assert token is not None
            expires_at = token.expires_at.replace(tzinfo=UTC) if token.expires_at.tzinfo is None else token.expires_at
            remaining = expires_at - datetime.now(UTC)
            assert remaining > timedelta(days=13)


def test_register_rejects_duplicate_login_id() -> None:
    with TestClient(app) as client:
        first = client.post("/api/auth/register", json=register_payload("duplicate"))
        second = client.post("/api/auth/register", json=register_payload("duplicate"))

        assert first.status_code == 201
        assert second.status_code == 409


def test_check_identifier_reports_availability() -> None:
    with TestClient(app) as client:
        available = client.get("/api/auth/check-identifier", params={"loginId": "owner_test01"})
        assert available.status_code == 200
        assert available.json()["available"] is True

        client.post("/api/auth/register", json=register_payload("owner_test01"))

        duplicate = client.get("/api/auth/check-identifier", params={"loginId": "owner_test01"})
        assert duplicate.status_code == 200
        assert duplicate.json()["available"] is False


def test_login_rejects_invalid_password() -> None:
    with TestClient(app) as client:
        client.post("/api/auth/register", json=register_payload("wrongpass"))
        response = client.post(
            "/api/auth/login",
            json={"loginId": "wrongpass", "password": "wrong-password"},
        )

        assert response.status_code == 401


def test_me_requires_bearer_token() -> None:
    with TestClient(app) as client:
        response = client.get("/api/auth/me")
        assert response.status_code == 401


def test_change_password_updates_hash_revokes_tokens_and_requires_relogin() -> None:
    with TestClient(app) as client:
        client.post("/api/auth/register", json=register_payload("changepw"))

        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.login_id == "changepw"))
            assert user is not None
            user.approval_status = ApprovalStatus.APPROVED
            user.store.approval_status = ApprovalStatus.APPROVED
            db.commit()

        first_login = client.post(
            "/api/auth/login",
            json={"loginId": "changepw", "password": "password1234", "autoLogin": True},
        )
        second_login = client.post(
            "/api/auth/login",
            json={"loginId": "changepw", "password": "password1234"},
        )
        assert first_login.status_code == 200
        assert second_login.status_code == 200

        change_response = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {first_login.json()['accessToken']}"},
            json={"currentPassword": "password1234", "newPassword": "newpassword1234"},
        )
        assert change_response.status_code == 200
        assert "다시 로그인" in change_response.json()["message"]

        old_login = client.post(
            "/api/auth/login",
            json={"loginId": "changepw", "password": "password1234"},
        )
        assert old_login.status_code == 401

        new_login = client.post(
            "/api/auth/login",
            json={"loginId": "changepw", "password": "newpassword1234"},
        )
        assert new_login.status_code == 200

        for refresh_token in (first_login.json()["refreshToken"], second_login.json()["refreshToken"]):
            refresh_response = client.post("/api/auth/refresh", json={"refreshToken": refresh_token})
            assert refresh_response.status_code == 401

        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.login_id == "changepw"))
            assert user is not None
            assert user.password_hash is not None
            assert user.password_hash != "newpassword1234"
            tokens = db.scalars(
                select(RefreshToken).where(RefreshToken.user_id == user.id).order_by(RefreshToken.id.asc())
            ).all()
            assert len(tokens) == 3
            assert tokens[0].revoked_at is not None
            assert tokens[1].revoked_at is not None
            assert tokens[2].revoked_at is None


def test_change_password_rejects_wrong_current_password() -> None:
    with TestClient(app) as client:
        client.post("/api/auth/register", json=register_payload("wrong-current"))

        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.login_id == "wrong-current"))
            assert user is not None
            user.approval_status = ApprovalStatus.APPROVED
            user.store.approval_status = ApprovalStatus.APPROVED
            db.commit()

        login_response = client.post(
            "/api/auth/login",
            json={"loginId": "wrong-current", "password": "password1234"},
        )
        assert login_response.status_code == 200

        change_response = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {login_response.json()['accessToken']}"},
            json={"currentPassword": "wrong-password", "newPassword": "newpassword1234"},
        )
        assert change_response.status_code == 401


def test_change_password_blocks_employee_account() -> None:
    with TestClient(app) as client:
        client.post("/api/auth/register", json=register_payload("employee-block"))

        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.login_id == "employee-block"))
            assert user is not None
            user.approval_status = ApprovalStatus.APPROVED
            user.store.approval_status = ApprovalStatus.APPROVED
            user.account_type = AccountType.EMPLOYEE
            user.password_hash = hash_password("password1234")
            user.pin_hash = hash_password("1234")
            db.commit()

        login_response = client.post(
            "/api/auth/login",
            json={"loginId": "employee-block", "password": "password1234"},
        )
        assert login_response.status_code == 401

        employee_login_response = client.post(
            "/api/auth/login",
            json={"loginId": "employee-block", "password": "1234"},
        )
        assert employee_login_response.status_code == 200

        legacy_employee_login_response = client.post(
            "/api/auth/employee/login",
            json={"loginId": "employee-block", "pin": "1234"},
        )
        assert legacy_employee_login_response.status_code == 200

        change_response = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {employee_login_response.json()['accessToken']}"},
            json={"currentPassword": "password1234", "newPassword": "newpassword1234"},
        )
        assert change_response.status_code == 403
