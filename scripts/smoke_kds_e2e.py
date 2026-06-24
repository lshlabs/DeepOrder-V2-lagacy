#!/usr/bin/env python3
"""
개요: auth/store-context 기반 local DeepOrder 운영 흐름에서
register -> admin approve -> login -> refresh -> auth me -> mock order generate/send
-> KDS authenticated query -> status transition -> unauthorized block -> logout
-> revoked refresh failure 까지 자동 점검하기 위한 smoke test 스크립트.
"""

from __future__ import annotations

import json
import os
import random
import string
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


MOCK_API_BASE = os.environ.get("MOCK_API_BASE", "http://127.0.0.1:8001/api/mock")
DEEPORDER_API_BASE = os.environ.get("DEEPORDER_API_BASE", "http://127.0.0.1:8000")
WEBHOOK_ENDPOINT = f"{DEEPORDER_API_BASE}/api/external/orders/webhook"
ADMIN_TOKEN = os.environ.get("SMOKE_ADMIN_TOKEN", "deeporder-admin-token")
REQUEST_TIMEOUT_SECONDS = 10
POLL_INTERVAL_SECONDS = 0.5
POLL_TIMEOUT_SECONDS = 10


class SmokeFailure(RuntimeError):
    pass


def main() -> int:
    print("== DeepOrder KDS smoke test ==")
    print(f"mock api: {MOCK_API_BASE}")
    print(f"deeporder api: {DEEPORDER_API_BASE}")

    require_service(f"{DEEPORDER_API_BASE}/health", "deeporder-backend")
    require_service("http://127.0.0.1:8001/health", "mock-delivery-api")
    ensure_active_webhook_config()

    owner = register_user("smoke-owner")
    print(f"registered owner: user_id={owner['user']['id']} store_id={owner['store']['storeId']}")
    approve_user(owner["user"]["id"])

    session = login_user(owner["credentials"]["email"], owner["credentials"]["password"])
    print("login ok")

    me = get_current_user(session["accessToken"])
    if me["store"]["storeId"] != owner["store"]["storeId"]:
        raise SmokeFailure("auth me store mismatch")
    print("auth me ok")

    refreshed = refresh_access_token(session["refreshToken"])
    if not refreshed.get("accessToken"):
        raise SmokeFailure("refresh did not return accessToken")
    session["accessToken"] = refreshed["accessToken"]
    print("refresh ok")

    ensure_mock_catalog(owner["store"]["storeId"], owner["store"]["storeName"])

    generated_order = post_json(
        f"{MOCK_API_BASE}/stores/{quote(owner['store']['storeId'])}/orders/generate",
        {"generatedBy": "smoke-kds-e2e"},
    )
    order_id = generated_order["orderId"]
    print(f"generated order: {order_id}")

    send_record = post_json(f"{MOCK_API_BASE}/orders/send", generated_order)
    if send_record["status"] != "success":
        raise SmokeFailure(f"send failed: {send_record['message']}")
    print(f"send ok: http={send_record['httpStatus']}")

    created_order = poll_for_order(session["accessToken"], order_id)
    backend_order_id = created_order["id"]
    print(f"backend receipt ok: order_id={backend_order_id} status={created_order['status']}")

    intruder = register_user("smoke-intruder")
    approve_user(intruder["user"]["id"])
    intruder_session = login_user(intruder["credentials"]["email"], intruder["credentials"]["password"])
    verify_unauthorized_store_access(intruder_session["accessToken"], backend_order_id, order_id)
    print("unauthorized store/status access blocked")

    transition_order(session["accessToken"], backend_order_id, "COOKING")
    transition_order(session["accessToken"], backend_order_id, "DONE")
    print("status transition ok: NEW -> COOKING -> DONE")

    logout_user(session["refreshToken"])
    print("logout ok")

    expect_refresh_revoked(session["refreshToken"])
    print("revoked refresh rejected as expected")

    print("smoke test passed")
    return 0


def require_service(url: str, name: str) -> None:
    body = request_json(url, method="GET")
    if not isinstance(body, dict) or body.get("status") != "ok":
        raise SmokeFailure(f"{name} health check failed: {body!r}")
    print(f"health ok: {name}")


def ensure_active_webhook_config() -> None:
    configs = request_json(f"{MOCK_API_BASE}/api-configs", method="GET")
    matching = next((config for config in configs if config["endpoint"] == WEBHOOK_ENDPOINT), None)

    if matching:
        if not matching["isActive"]:
            patch_json(f"{MOCK_API_BASE}/api-configs/{quote(matching['id'])}", {"isActive": True})
        print(f"active api config ok: {matching['name']}")
        return

    created = post_json(
        f"{MOCK_API_BASE}/api-configs",
        {
            "name": "DeepOrder Local Webhook",
            "provider": "DeepOrder",
            "endpoint": WEBHOOK_ENDPOINT,
            "model": "webhook",
            "apiKey": "",
            "temperature": 0,
            "isActive": True,
        },
    )
    print(f"created api config: {created['id']}")


def register_user(prefix: str) -> dict[str, Any]:
    suffix = random_suffix()
    email = f"{prefix}-{suffix}@example.com"
    password = "password1234"
    payload = {
        "name": f"{prefix}-{suffix}",
        "email": email,
        "password": password,
        "storeName": f"{prefix}-store-{suffix}",
        "storePhone": "010-0000-0000",
        "zipNo": "12345",
        "roadAddress": "서울시 테스트로 1",
        "jibunAddress": "서울시 테스트동 1-1",
        "addressDetail": "101호",
    }
    registered = post_json(f"{DEEPORDER_API_BASE}/api/auth/register", payload)
    return {
        **registered,
        "credentials": {"email": email, "password": password},
    }


def approve_user(user_id: int) -> None:
    patch_json(
        f"{DEEPORDER_API_BASE}/api/admin/users/{user_id}/approval",
        {"approvalStatus": "APPROVED"},
        headers={"X-Admin-Token": ADMIN_TOKEN},
    )


def login_user(email: str, password: str) -> dict[str, Any]:
    return post_json(
        f"{DEEPORDER_API_BASE}/api/auth/login",
        {"email": email, "password": password},
    )


def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    return post_json(
        f"{DEEPORDER_API_BASE}/api/auth/refresh",
        {"refreshToken": refresh_token},
    )


def get_current_user(access_token: str) -> dict[str, Any]:
    return request_json(
        f"{DEEPORDER_API_BASE}/api/auth/me",
        method="GET",
        headers={"Authorization": f"Bearer {access_token}"},
    )


def logout_user(refresh_token: str) -> None:
    request_json(
        f"{DEEPORDER_API_BASE}/api/auth/logout",
        method="POST",
        body={"refreshToken": refresh_token},
    )


def expect_refresh_revoked(refresh_token: str) -> None:
    try:
        refresh_access_token(refresh_token)
    except SmokeFailure as exc:
        if "HTTP 401" not in str(exc):
            raise
        return
    raise SmokeFailure("revoked refresh token unexpectedly succeeded")


def ensure_mock_catalog(store_id: str, store_name: str) -> None:
    payload = {
        "stores": [
            {
                "storeId": store_id,
                "storeName": store_name,
                "platform": "MOCK_DELIVERY",
                "available": True,
                "menus": [
                    {
                        "menuId": f"MENU_{store_id}",
                        "name": "Smoke 메뉴",
                        "type": "MAIN",
                        "basePrice": 12000,
                        "available": True,
                        "optionGroups": [
                            {
                                "groupId": f"GROUP_{store_id}",
                                "groupName": "맵기",
                                "selectionType": "RADIO",
                                "required": True,
                                "minSelect": 1,
                                "maxSelect": 1,
                                "options": [
                                    {
                                        "optionId": f"OPTION_{store_id}",
                                        "name": "보통맛",
                                        "effect": "NOTE",
                                        "additionalPrice": 0,
                                        "defaultSelected": True,
                                        "available": True,
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }
        ]
    }
    post_json(f"{MOCK_API_BASE}/catalog/import?mode=merge", payload)


def poll_for_order(access_token: str, external_order_id: str) -> dict[str, Any]:
    deadline = time.time() + POLL_TIMEOUT_SECONDS
    while time.time() < deadline:
        orders = request_json(
            f"{DEEPORDER_API_BASE}/api/kds/orders",
            method="GET",
            headers={"Authorization": f"Bearer {access_token}"},
        )["orders"]
        match = next(
            (order for order in orders if order["external_order_id"] == external_order_id),
            None,
        )
        if match:
            if match["status"] != "NEW":
                raise SmokeFailure(f"expected NEW after receipt, got {match['status']}")
            return match
        time.sleep(POLL_INTERVAL_SECONDS)
    raise SmokeFailure(f"order not visible in KDS feed: {external_order_id}")


def transition_order(access_token: str, order_id: int, target_status: str) -> None:
    response = patch_json(
        f"{DEEPORDER_API_BASE}/api/orders/{order_id}/status",
        {"status": target_status},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if response["status"] != target_status:
        raise SmokeFailure(f"failed to transition to {target_status}: {response}")

    orders = request_json(
        f"{DEEPORDER_API_BASE}/api/kds/orders",
        method="GET",
        headers={"Authorization": f"Bearer {access_token}"},
    )["orders"]
    current = next((order for order in orders if order["id"] == order_id), None)
    if not current:
        raise SmokeFailure(f"order missing after transition: {order_id}")
    if current["status"] != target_status:
        raise SmokeFailure(
            f"expected {target_status} in order list, got {current['status']}"
        )


def verify_unauthorized_store_access(access_token: str, order_id: int, external_order_id: str) -> None:
    orders = request_json(
        f"{DEEPORDER_API_BASE}/api/kds/orders",
        method="GET",
        headers={"Authorization": f"Bearer {access_token}"},
    )["orders"]
    if any(order["external_order_id"] == external_order_id for order in orders):
        raise SmokeFailure("unauthorized user unexpectedly received another store order")

    try:
        patch_json(
            f"{DEEPORDER_API_BASE}/api/orders/{order_id}/status",
            {"status": "COOKING"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    except SmokeFailure as exc:
        if "HTTP 403" not in str(exc):
            raise
        return
    raise SmokeFailure("unauthorized status transition unexpectedly succeeded")


def request_json(
    url: str,
    *,
    method: str,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> Any:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    merged_headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        **(headers or {}),
    }
    request = urllib.request.Request(
        url,
        data=payload,
        method=method,
        headers=merged_headers,
    )

    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SmokeFailure(f"{method} {url} -> HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise SmokeFailure(f"{method} {url} -> network error: {exc}") from exc


def post_json(url: str, body: dict[str, Any]) -> Any:
    return request_json(url, method="POST", body=body)


def patch_json(url: str, body: dict[str, Any], headers: dict[str, str] | None = None) -> Any:
    return request_json(url, method="PATCH", body=body, headers=headers)


def quote(value: str) -> str:
    return urllib.parse.quote(value, safe="")


def random_suffix() -> str:
    charset = string.ascii_lowercase + string.digits
    return "".join(random.choice(charset) for _ in range(8))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SmokeFailure as exc:
        print(f"smoke test failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
