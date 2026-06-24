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


def test_my_tasks_crud_and_duplicate_normalization() -> None:
    with TestClient(app) as client:
        login = register_approve_and_login(client, login_id="tasks", store_name="Tasks Store")
        headers = auth_header(login["accessToken"])

        empty = client.get("/api/kds/my-tasks/menus", headers=headers)
        assert empty.status_code == 200
        assert empty.json()["menus"] == []

        created = client.post("/api/kds/my-tasks/menus", json={"menuName": " 짜장면 "}, headers=headers)
        assert created.status_code == 201

        duplicate = client.post("/api/kds/my-tasks/menus", json={"menuName": "짜장면"}, headers=headers)
        assert duplicate.status_code == 200

        listed = client.get("/api/kds/my-tasks/menus", headers=headers)
        assert listed.status_code == 200
        menus = listed.json()["menus"]
        assert len(menus) == 1
        assert menus[0]["menuName"] == "짜장면"
        assert menus[0]["normalizedMenuName"] == "짜장면"

        menu_id = menus[0]["id"]
        updated = client.patch(
            f"/api/kds/my-tasks/menus/{menu_id}",
            json={"menuName": "짜장면 곱빼기", "sortOrder": 3},
            headers=headers,
        )
        assert updated.status_code == 204

        refreshed = client.get("/api/kds/my-tasks/menus", headers=headers)
        assert refreshed.status_code == 200
        assert refreshed.json()["menus"][0]["menuName"] == "짜장면 곱빼기"
        assert refreshed.json()["menus"][0]["sortOrder"] == 3

        deleted = client.delete(f"/api/kds/my-tasks/menus/{menu_id}", headers=headers)
        assert deleted.status_code == 204

        final_list = client.get("/api/kds/my-tasks/menus", headers=headers)
        assert final_list.status_code == 200
        assert final_list.json()["menus"] == []


def test_my_tasks_are_user_scoped() -> None:
    with TestClient(app) as client:
        owner_one = register_approve_and_login(client, login_id="owner1", store_name="Store One")
        owner_two = register_approve_and_login(client, login_id="owner2", store_name="Store Two")

        created = client.post(
            "/api/kds/my-tasks/menus",
            json={"menuName": "짬뽕"},
            headers=auth_header(owner_one["accessToken"]),
        )
        assert created.status_code == 201

        owner_one_list = client.get("/api/kds/my-tasks/menus", headers=auth_header(owner_one["accessToken"]))
        owner_two_list = client.get("/api/kds/my-tasks/menus", headers=auth_header(owner_two["accessToken"]))
        assert len(owner_one_list.json()["menus"]) == 1
        assert owner_two_list.json()["menus"] == []

        menu_id = owner_one_list.json()["menus"][0]["id"]
        forbidden_update = client.patch(
            f"/api/kds/my-tasks/menus/{menu_id}",
            json={"menuName": "우동"},
            headers=auth_header(owner_two["accessToken"]),
        )
        assert forbidden_update.status_code == 404

        forbidden_delete = client.delete(
            f"/api/kds/my-tasks/menus/{menu_id}",
            headers=auth_header(owner_two["accessToken"]),
        )
        assert forbidden_delete.status_code == 404
