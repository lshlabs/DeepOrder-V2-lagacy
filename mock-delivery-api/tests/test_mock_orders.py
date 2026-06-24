from pathlib import Path
import re
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine

db_path = Path("mock_delivery.db")
if db_path.exists():
    db_path.unlink()

from app.database import _ensure_sqlite_dev_schema  # noqa: E402
from app.main import app  # noqa: E402


def test_legacy_jinja_console_is_removed() -> None:
    with TestClient(app) as client:
        response = client.get("/console")

        assert response.status_code == 404


def test_catalog_store_menu_option_group_and_option_flow() -> None:
    with TestClient(app) as client:
        store_response = client.post("/api/mock/stores", json={"storeName": "테스트 치킨집"})

        assert store_response.status_code == 201
        store = store_response.json()
        assert store["storeId"] == "STORE_001"
        assert store["storeName"] == "테스트 치킨집"

        main_menu_response = client.post(
            f"/api/mock/stores/{store['storeId']}/menus",
            json={
                "name": "양념치킨",
                "type": "MAIN",
                "basePrice": 23000,
                "allergens": {
                    "rawText": "닭고기, 대두",
                    "normalizedAllergens": ["닭고기", "대두"],
                    "parseStatus": "MANUAL",
                },
            },
        )

        assert main_menu_response.status_code == 201
        main_menu = main_menu_response.json()
        assert main_menu["menuId"] == "MENU_001"
        assert main_menu["quantityRule"] == {"min": 1, "max": 10, "default": 1}

        side_menu_response = client.post(
            f"/api/mock/stores/{store['storeId']}/menus",
            json={"name": "치킨무", "type": "SIDE", "basePrice": 1000},
        )

        assert side_menu_response.status_code == 201
        side_menu = side_menu_response.json()

        group_response = client.post(
            f"/api/mock/stores/{store['storeId']}/menus/{main_menu['menuId']}/option-groups",
            json={
                "groupName": "요청사항",
                "selectionType": "CHECKBOX",
                "required": False,
                "minSelect": 0,
                "maxSelect": 2,
            },
        )

        assert group_response.status_code == 201
        group = group_response.json()
        assert group["groupId"] == "GROUP_001"

        option_response = client.post(
            (
                f"/api/mock/stores/{store['storeId']}/menus/{main_menu['menuId']}"
                f"/option-groups/{group['groupId']}/options"
            ),
            json={
                "name": "치킨무 X",
                "additionalPrice": 0,
                "effect": "EXCLUDE",
                "linkedMenuId": side_menu["menuId"],
            },
        )

        assert option_response.status_code == 201
        option = option_response.json()
        assert option["optionId"] == "OPTION_001"
        assert option["linkedMenuName"] == "치킨무"

        menu_detail_response = client.get(
            f"/api/mock/stores/{store['storeId']}/menus/{main_menu['menuId']}"
        )

        assert menu_detail_response.status_code == 200
        menu_detail = menu_detail_response.json()
        assert menu_detail["optionGroups"][0]["options"][0]["name"] == "치킨무 X"


def test_catalog_store_update_delete_and_option_group_duplication() -> None:
    with TestClient(app) as client:
        store = client.post("/api/mock/stores", json={"storeName": "복제 테스트 매장"}).json()
        store_id = store["storeId"]

        update_store_response = client.put(
            f"/api/mock/stores/{store_id}",
            json={"storeName": "복제 테스트 매장 수정"},
        )

        assert update_store_response.status_code == 200
        assert update_store_response.json()["storeName"] == "복제 테스트 매장 수정"

        fried = client.post(
            f"/api/mock/stores/{store_id}/menus",
            json={"name": "후라이드치킨", "type": "MAIN", "basePrice": 23000},
        ).json()
        seasoned = client.post(
            f"/api/mock/stores/{store_id}/menus",
            json={"name": "양념치킨", "type": "MAIN", "basePrice": 24000},
        ).json()

        group = client.post(
            f"/api/mock/stores/{store_id}/menus/{fried['menuId']}/option-groups",
            json={
                "groupName": "음료",
                "selectionType": "RADIO",
                "required": True,
                "minSelect": 1,
                "maxSelect": 1,
            },
        ).json()
        client.post(
            f"/api/mock/stores/{store_id}/menus/{fried['menuId']}/option-groups/{group['groupId']}/options",
            json={"name": "콜라 355ml", "additionalPrice": 1000, "effect": "ADD_ITEM"},
        )

        duplicate_response = client.post(
            f"/api/mock/stores/{store_id}/menus/{fried['menuId']}"
            f"/option-groups/{group['groupId']}/duplicate",
            json={"targetMenuId": seasoned["menuId"]},
        )

        assert duplicate_response.status_code == 201
        duplicated_group = duplicate_response.json()
        assert duplicated_group["groupName"] == "음료"
        assert duplicated_group["groupId"] != group["groupId"]
        assert duplicated_group["options"][0]["name"] == "콜라 355ml"

        seasoned_detail = client.get(
            f"/api/mock/stores/{store_id}/menus/{seasoned['menuId']}"
        ).json()
        assert seasoned_detail["optionGroups"][0]["groupName"] == "음료"

        delete_store_response = client.delete(f"/api/mock/stores/{store_id}")

        assert delete_store_response.status_code == 200
        assert not any(item["storeId"] == store_id for item in client.get("/api/mock/stores").json())


def test_catalog_duplicate_all_option_groups_and_export_import() -> None:
    with TestClient(app) as client:
        store = client.post("/api/mock/stores", json={"storeName": "JSON 테스트 매장"}).json()
        store_id = store["storeId"]
        source = client.post(
            f"/api/mock/stores/{store_id}/menus",
            json={"name": "후라이드치킨", "type": "MAIN", "basePrice": 23000},
        ).json()
        target = client.post(
            f"/api/mock/stores/{store_id}/menus",
            json={"name": "양념치킨", "type": "MAIN", "basePrice": 24000},
        ).json()
        group = client.post(
            f"/api/mock/stores/{store_id}/menus/{source['menuId']}/option-groups",
            json={
                "groupName": "사이드",
                "selectionType": "CHECKBOX",
                "required": False,
                "minSelect": 0,
                "maxSelect": 2,
            },
        ).json()
        client.post(
            f"/api/mock/stores/{store_id}/menus/{source['menuId']}/option-groups/{group['groupId']}/options",
            json={"name": "감자튀김", "additionalPrice": 3000, "effect": "LINK_MENU"},
        )

        duplicate_all_response = client.post(
            f"/api/mock/stores/{store_id}/menus/{source['menuId']}"
            f"/option-groups/duplicate-to/{target['menuId']}"
        )

        assert duplicate_all_response.status_code == 201
        target_detail = duplicate_all_response.json()
        assert target_detail["optionGroups"][0]["groupName"] == "사이드"
        assert target_detail["optionGroups"][0]["options"][0]["effect"] == "LINK_MENU"

        export_response = client.get("/api/mock/catalog/export")

        assert export_response.status_code == 200
        exported = export_response.json()
        assert any(item["storeId"] == store_id for item in exported["stores"])

        replace_response = client.post(
            "/api/mock/catalog/import?mode=replace",
            json={
                "stores": [
                    {
                        "storeId": "STORE_IMPORTED",
                        "storeName": "가져온 매장",
                        "menus": [
                            {
                                "menuId": "MENU_IMPORTED",
                                "name": "가져온 치킨",
                                "type": "MAIN",
                                "basePrice": 25000,
                                "optionGroups": [
                                    {
                                        "groupId": "GROUP_IMPORTED",
                                        "groupName": "맵기",
                                        "selectionType": "RADIO",
                                        "required": True,
                                        "minSelect": 1,
                                        "maxSelect": 1,
                                        "options": [
                                            {
                                                "optionId": "OPTION_IMPORTED",
                                                "name": "덜 맵게",
                                                "effect": "CHANGE_TASTE",
                                            }
                                        ],
                                    }
                                ],
                            }
                        ],
                    }
                ]
            },
        )

        assert replace_response.status_code == 200
        imported = replace_response.json()
        assert imported["stores"][0]["storeId"] == "STORE_IMPORTED"
        assert imported["stores"][0]["menus"][0]["optionGroups"][0]["options"][0]["name"] == "덜 맵게"

        merge_response = client.post(
            "/api/mock/catalog/import?mode=merge",
            json={
                "stores": [
                    {
                        "storeId": "STORE_MERGED",
                        "storeName": "병합 매장",
                        "menus": [
                            {
                                "menuId": "MENU_MERGED",
                                "name": "병합 사이드",
                                "type": "SIDE",
                                "basePrice": 3000,
                            }
                        ],
                    }
                ]
            },
        )

        assert merge_response.status_code == 200
        merged_store_ids = {item["storeId"] for item in merge_response.json()["stores"]}
        assert {"STORE_IMPORTED", "STORE_MERGED"}.issubset(merged_store_ids)


def test_side_menu_cannot_have_option_group() -> None:
    with TestClient(app) as client:
        store = client.post("/api/mock/stores", json={"storeName": "사이드 제한 매장"}).json()
        side_menu = client.post(
            f"/api/mock/stores/{store['storeId']}/menus",
            json={"name": "콜라", "type": "DRINK", "basePrice": 2000},
        ).json()

        group_response = client.post(
            f"/api/mock/stores/{store['storeId']}/menus/{side_menu['menuId']}/option-groups",
            json={
                "groupName": "불가능 옵션",
                "selectionType": "RADIO",
                "required": True,
                "minSelect": 1,
                "maxSelect": 1,
            },
        )

        assert group_response.status_code == 400
        assert group_response.json()["detail"] == "Only MAIN or SET menus can have option groups."


def test_sqlite_dev_schema_adds_missing_catalog_columns(tmp_path: Path) -> None:
    legacy_db = tmp_path / "legacy_mock_delivery.db"
    engine = create_engine(f"sqlite:///{legacy_db}")

    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE stores (id INTEGER PRIMARY KEY, store_id VARCHAR(64), store_name VARCHAR(120))"
        )
        connection.exec_driver_sql(
            "INSERT INTO stores (store_id, store_name) VALUES ('STORE_000', '이미 있던 매장')"
        )

    _ensure_sqlite_dev_schema(engine)

    with engine.begin() as connection:
        columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(stores)")}
        assert {"platform", "available", "created_at", "updated_at"}.issubset(columns)
        connection.exec_driver_sql(
            "INSERT INTO stores (store_id, store_name) VALUES ('STORE_001', '레거시 매장')"
        )
        row = connection.exec_driver_sql(
            "SELECT platform, available FROM stores WHERE store_id = 'STORE_001'"
        ).one()
        legacy_row = connection.exec_driver_sql(
            "SELECT platform, available, created_at FROM stores WHERE store_id = 'STORE_000'"
        ).one()

    assert row[0] == "MOCK_DELIVERY"
    assert row[1] == 1
    assert legacy_row[0] == "MOCK_DELIVERY"
    assert legacy_row[1] == 1
    assert legacy_row[2] == "1970-01-01 00:00:00"


def test_console_standard_catalog_endpoints() -> None:
    with TestClient(app) as client:
        store_response = client.post("/api/mock/stores", json={"name": "Next 콘솔 매장"})

        assert store_response.status_code == 201
        store = store_response.json()
        assert store["id"] == store["storeId"]
        assert store["name"] == "Next 콘솔 매장"
        assert store["isActive"] is True

        patched_store = client.patch(
            f"/api/mock/stores/{store['id']}",
            json={"name": "Next 콘솔 매장 수정", "isActive": False},
        )
        assert patched_store.status_code == 200
        assert patched_store.json()["name"] == "Next 콘솔 매장 수정"
        assert patched_store.json()["isActive"] is False

        menu = client.post(
            "/api/mock/menus",
            json={
                "storeId": store["id"],
                "name": "콘솔 치킨",
                "type": "MAIN",
                "basePrice": 21000,
                "allergens": ["닭고기", "대두"],
                "isAvailable": True,
                "sortOrder": 0,
            },
        ).json()
        assert menu["id"].startswith("MENU_")
        assert menu["storeId"] == store["id"]
        assert menu["allergens"] == ["닭고기", "대두"]

        linkable = client.post(
            "/api/mock/menus",
            json={
                "storeId": store["id"],
                "name": "콜라",
                "type": "DRINK",
                "basePrice": 2000,
                "allergens": [],
                "isAvailable": True,
                "sortOrder": 1,
            },
        ).json()

        group = client.post(
            "/api/mock/option-groups",
            json={
                "menuId": menu["id"],
                "name": "음료 선택",
                "selectionType": "RADIO",
                "isRequired": True,
                "minSelect": 1,
                "maxSelect": 1,
                "sortOrder": 0,
                "isAvailable": True,
            },
        ).json()
        assert group["menuId"] == menu["id"]
        assert group["isRequired"] is True

        option = client.post(
            "/api/mock/options",
            json={
                "optionGroupId": group["id"],
                "name": "콜라 추가",
                "effect": "ADD",
                "additionalPrice": 2000,
                "linkedMenuId": linkable["id"],
                "isDefaultSelected": True,
                "sortOrder": 0,
                "isAvailable": True,
            },
        ).json()
        assert option["optionGroupId"] == group["id"]
        assert option["isDefaultSelected"] is True

        assert client.get(f"/api/mock/menus/{menu['id']}/option-groups").json()[0]["id"] == group["id"]
        assert client.get(f"/api/mock/option-groups/{group['id']}/options").json()[0]["id"] == option["id"]
        assert client.get(f"/api/mock/stores/{store['id']}/linkable-menus").json()[0]["id"] == linkable["id"]

        cloned_menu = client.post(f"/api/mock/menus/{menu['id']}/clone").json()
        assert cloned_menu["name"] == "콘솔 치킨 (복사본)"

        cloned_group = client.post(f"/api/mock/option-groups/{group['id']}/clone").json()
        assert cloned_group["name"] == "음료 선택 (복사본)"

        cloned_option = client.post(f"/api/mock/options/{option['id']}/clone").json()
        assert cloned_option["name"] == "콜라 추가 (복사본)"


def test_console_api_configs_and_order_records(monkeypatch) -> None:
    sent_payloads: list[dict] = []

    def fake_post(url: str, json: dict, headers: dict | None = None, timeout: float = 10.0) -> SimpleNamespace:
        sent_payloads.append({"url": url, "json": json, "headers": headers, "timeout": timeout})
        if url == "https://kds.test/orders":
            raise RuntimeError("force AI fallback")
        assert url == "http://127.0.0.1:8000/api/external/orders/webhook"
        assert headers is not None
        assert headers["Content-Type"] == "application/json"
        assert timeout == 10.0
        return SimpleNamespace(status_code=202, text="accepted")

    import app.console_api as console_api

    monkeypatch.setattr(console_api.httpx, "post", fake_post)
    monkeypatch.setattr(
        console_api,
        "get_settings",
        lambda: SimpleNamespace(deeporder_webhook_url="http://127.0.0.1:8000/api/external/orders/webhook"),
    )

    with TestClient(app) as client:
        config = client.post(
            "/api/mock/api-configs",
            json={
                "name": "OpenAI 테스트",
                "provider": "OpenAI",
                "endpoint": "https://kds.test/orders",
                "model": "gpt-test",
                "apiKey": "sk-secret-value",
                "temperature": 0.2,
                "isActive": True,
            },
        ).json()

        assert config["isActive"] is True
        assert config["apiKey"] != "sk-secret-value"
        assert "secret" not in config["apiKey"]

        active = client.get("/api/mock/api-configs/active")
        assert active.status_code == 200
        assert active.json()["id"] == config["id"]

        store = client.post("/api/mock/stores", json={"name": "주문 테스트 매장"}).json()
        menu = client.post(
            "/api/mock/menus",
            json={
                "storeId": store["id"],
                "name": "주문 치킨",
                "type": "MAIN",
                "basePrice": 19000,
                "allergens": [],
                "isAvailable": True,
                "sortOrder": 0,
            },
        ).json()

        generated = client.post(
            f"/api/mock/stores/{store['id']}/orders/generate",
            json={"generatedBy": "test"},
        )
        assert generated.status_code == 200
        order = generated.json()
        assert order["storeId"] == store["id"]
        assert order["items"][0]["menuId"] == menu["id"]

        sent = client.post("/api/mock/orders/send", json=order)
        assert sent.status_code == 200
        assert sent.json()["status"] == "success"
        assert sent.json()["httpStatus"] == 202
        assert sent.json()["message"] == "accepted"
        assert sent_payloads[-1]["json"]["order"]["orderId"] == order["orderId"]
        assert sent_payloads[-1]["json"]["order"]["orderNumber"] == order["orderNumber"]

        records = client.get("/api/mock/order-records")
        assert records.status_code == 200
        assert records.json()[0]["storeName"] == store["name"]

        clear = client.delete("/api/mock/order-records")
        assert clear.status_code == 204
        assert client.get("/api/mock/order-records").json() == []


def test_console_order_send_transforms_to_deeporder_webhook(monkeypatch) -> None:
    sent_payloads: list[dict] = []

    def fake_post(url: str, json: dict, headers: dict, timeout: float) -> SimpleNamespace:
        assert url == "http://127.0.0.1:8000/api/external/orders/webhook"
        assert headers["Content-Type"] == "application/json"
        assert timeout == 10.0
        sent_payloads.append(json)
        return SimpleNamespace(status_code=202, text='{"ok":true}')

    import app.console_api as console_api

    monkeypatch.setattr(console_api.httpx, "post", fake_post)
    monkeypatch.setattr(
        console_api,
        "get_settings",
        lambda: SimpleNamespace(deeporder_webhook_url="http://127.0.0.1:8000/api/external/orders/webhook"),
    )

    with TestClient(app) as client:
        client.post(
            "/api/mock/api-configs",
            json={
                "name": "OpenAI Generator",
                "provider": "OpenAI",
                "endpoint": "https://api.openai.com/v1/chat/completions",
                "model": "gpt-4o-mini",
                "apiKey": "",
                "temperature": 0,
                "isActive": True,
            },
        )

        store = client.post("/api/mock/stores", json={"name": "Webhook 테스트 매장"}).json()
        client.post(
            "/api/mock/menus",
            json={
                "storeId": store["id"],
                "name": "Webhook 메뉴",
                "type": "MAIN",
                "basePrice": 15000,
                "allergens": [],
                "isAvailable": True,
                "sortOrder": 0,
            },
        )

        generated = client.post(
            f"/api/mock/stores/{store['id']}/orders/generate",
            json={"generatedBy": "test"},
        )
        assert generated.status_code == 200

        sent = client.post("/api/mock/orders/send", json=generated.json())
        assert sent.status_code == 200
        assert sent.json()["status"] == "success"
        assert sent_payloads[0]["eventType"] == "ORDER_CREATED"
        assert sent_payloads[0]["storeId"] == store["id"]
        assert sent_payloads[0]["order"]["orderId"] == generated.json()["orderId"]
        assert sent_payloads[0]["order"]["orderNumber"] == generated.json()["orderNumber"]
        assert sent_payloads[0]["order"]["items"][0]["name"] == "Webhook 메뉴"


def test_generate_order_uses_ai_api_when_active_config_is_available(monkeypatch) -> None:
    expected_menu_id = {"value": "MENU_001"}

    def fake_post(url: str, json: dict, headers: dict | None = None, timeout: float = 20.0) -> SimpleNamespace:
        assert url == "https://api.openai.com/v1/chat/completions"
        assert headers is not None
        assert headers["Authorization"] == "Bearer sk-real-key"
        assert json["model"] == "gpt-4o-mini"
        return SimpleNamespace(
            status_code=200,
            text="ok",
            raise_for_status=lambda: None,
            json=lambda: {
                "choices": [
                    {
                        "message": {
                            "content": (
                                f'{{"items":[{{"menuId":"{expected_menu_id["value"]}","quantity":2,'
                                '"selectedOptions":[{"groupName":"맵기","optionName":"보통"}]}]}'
                            )
                        }
                    }
                ]
            },
        )

    import app.console_api as console_api

    monkeypatch.setattr(console_api.httpx, "post", fake_post)

    with TestClient(app) as client:
        client.post(
            "/api/mock/api-configs",
            json={
                "name": "OpenAI Generator",
                "provider": "OpenAI",
                "endpoint": "https://api.openai.com/v1/chat/completions",
                "model": "gpt-4o-mini",
                "apiKey": "sk-real-key",
                "temperature": 0.2,
                "isActive": True,
            },
        )

        store = client.post("/api/mock/stores", json={"name": "AI 생성 매장"}).json()
        menu = client.post(
            "/api/mock/menus",
            json={
                "storeId": store["id"],
                "name": "AI 치킨",
                "type": "MAIN",
                "basePrice": 20000,
                "allergens": [],
                "isAvailable": True,
                "sortOrder": 0,
            },
        ).json()
        expected_menu_id["value"] = menu["id"]
        client.post(
            f"/api/mock/stores/{store['id']}/menus/{menu['id']}/option-groups",
            json={
                "groupName": "맵기",
                "selectionType": "RADIO",
                "required": True,
                "minSelect": 1,
                "maxSelect": 1,
            },
        )
        client.post(
            f"/api/mock/stores/{store['id']}/menus/{menu['id']}/option-groups/GROUP_001/options",
            json={"name": "보통", "additionalPrice": 0, "effect": "NOTE"},
        )

        generated = client.post(
            f"/api/mock/stores/{store['id']}/orders/generate",
            json={"generatedBy": "test"},
        )

        assert generated.status_code == 200
        body = generated.json()
        assert body["generatedBy"] == "OpenAI:gpt-4o-mini"
        assert body["items"][0]["menuId"] == menu["id"]
        assert body["items"][0]["quantity"] == 2
        assert body["items"][0]["selectedOptions"][0]["groupName"] == "맵기"
        assert body["items"][0]["selectedOptions"][0]["optionName"] == "보통"


def test_generate_order_falls_back_when_ai_request_fails(monkeypatch) -> None:
    def fake_post(url: str, json: dict, headers: dict | None = None, timeout: float = 20.0) -> SimpleNamespace:
        raise RuntimeError("AI unavailable")

    import app.console_api as console_api

    monkeypatch.setattr(console_api.httpx, "post", fake_post)

    with TestClient(app) as client:
        client.post(
            "/api/mock/api-configs",
            json={
                "name": "Broken OpenAI",
                "provider": "OpenAI",
                "endpoint": "https://api.openai.com/v1/chat/completions",
                "model": "gpt-4o-mini",
                "apiKey": "sk-broken",
                "temperature": 0.7,
                "isActive": True,
            },
        )

        store = client.post("/api/mock/stores", json={"name": "Fallback 생성 매장"}).json()
        menu = client.post(
            "/api/mock/menus",
            json={
                "storeId": store["id"],
                "name": "Fallback 치킨",
                "type": "MAIN",
                "basePrice": 18000,
                "allergens": [],
                "isAvailable": True,
                "sortOrder": 0,
            },
        ).json()

        generated = client.post(
            f"/api/mock/stores/{store['id']}/orders/generate",
            json={"generatedBy": "fallback-generator"},
        )

        assert generated.status_code == 200
        body = generated.json()
        assert body["generatedBy"] == "fallback-generator"
        assert body["items"][0]["menuId"] == menu["id"]
        assert re.fullmatch(r"[A-Z0-9]{6}", body["orderNumber"]) is not None


def test_console_flat_catalog_import_export_contract() -> None:
    with TestClient(app) as client:
        import_response = client.post(
            "/api/mock/catalog/import?mode=replace",
            json={
                "stores": [
                    {
                        "id": "STORE_FLAT",
                        "name": "Flat 매장",
                        "isActive": True,
                        "createdAt": "2026-01-01T00:00:00Z",
                        "updatedAt": "2026-01-01T00:00:00Z",
                    }
                ],
                "menus": [
                    {
                        "id": "MENU_FLAT",
                        "storeId": "STORE_FLAT",
                        "name": "Flat 메뉴",
                        "type": "MAIN",
                        "basePrice": 12000,
                        "allergens": ["대두"],
                        "isAvailable": True,
                        "createdAt": "2026-01-01T00:00:00Z",
                        "updatedAt": "2026-01-01T00:00:00Z",
                    }
                ],
                "optionGroups": [
                    {
                        "id": "GROUP_FLAT",
                        "menuId": "MENU_FLAT",
                        "name": "Flat 그룹",
                        "selectionType": "RADIO",
                        "isRequired": True,
                        "minSelect": 1,
                        "maxSelect": 1,
                        "sortOrder": 0,
                        "isAvailable": True,
                        "createdAt": "2026-01-01T00:00:00Z",
                        "updatedAt": "2026-01-01T00:00:00Z",
                    }
                ],
                "options": [
                    {
                        "id": "OPTION_FLAT",
                        "optionGroupId": "GROUP_FLAT",
                        "name": "Flat 옵션",
                        "effect": "NOTE",
                        "additionalPrice": 0,
                        "linkedMenuId": None,
                        "isDefaultSelected": False,
                        "sortOrder": 0,
                        "isAvailable": True,
                        "createdAt": "2026-01-01T00:00:00Z",
                        "updatedAt": "2026-01-01T00:00:00Z",
                    }
                ],
            },
        )

        assert import_response.status_code == 200
        imported = import_response.json()
        assert imported["imported"] == 4
        assert imported["errors"] == []
        assert imported["stores"][0]["id"] == "STORE_FLAT"
        assert imported["menus"][0]["id"] == "MENU_FLAT"
        assert imported["optionGroups"][0]["id"] == "GROUP_FLAT"
        assert imported["options"][0]["id"] == "OPTION_FLAT"

        export_response = client.get("/api/mock/catalog/export")
        assert export_response.status_code == 200
        exported = export_response.json()
        assert exported["stores"][0]["id"] == "STORE_FLAT"
        assert exported["menus"][0]["allergens"] == ["대두"]
        assert exported["optionGroups"][0]["isRequired"] is True
        assert exported["options"][0]["effect"] == "NOTE"
