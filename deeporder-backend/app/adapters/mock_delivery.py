from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status

from app.adapters.base import PlatformAdapter
from app.normalization import NormalizedOrderEvent, NormalizedOrderItem, NormalizedOrderOption


class MockDeliveryAdapter(PlatformAdapter):
    platform_name = "MOCK_DELIVERY"

    def can_handle(self, headers: dict[str, Any], body: dict[str, Any]) -> bool:
        return str(body.get("platform", "")).strip().upper() == self.platform_name

    def validate_signature(
        self,
        headers: dict[str, Any],
        raw_body: bytes | None,
        body: dict[str, Any],
    ) -> None:
        # Local mock platform currently has no signature contract.
        return None

    def parse_event(
        self,
        headers: dict[str, Any],
        body: dict[str, Any],
    ) -> NormalizedOrderEvent:
        event_id = _require_str(body, "eventId")
        event_type = _require_str(body, "eventType")
        platform = _require_str(body, "platform").upper()
        store_id = _require_str(body, "storeId")

        order_body = body.get("order")
        if not isinstance(order_body, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid mock delivery payload: order must be an object.",
            )

        order_id = _require_str(order_body, "orderId")
        order_number = _optional_str(order_body.get("orderNumber"))
        customer_request = _optional_str(order_body.get("customerRequest"))
        delivery_request = _optional_str(order_body.get("deliveryRequest"))
        occurred_at = _parse_datetime(order_body.get("orderedAt"))

        items_payload = order_body.get("items")
        if not isinstance(items_payload, list) or not items_payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid mock delivery payload: order.items must be a non-empty array.",
            )

        items = [_parse_item(item) for item in items_payload]

        return NormalizedOrderEvent(
            source_platform=platform,
            source_event_id=event_id,
            source_event_type=event_type,
            source_occurred_at=occurred_at,
            source_store_id=store_id,
            source_order_id=order_id,
            source_order_number=order_number,
            customer_request=customer_request,
            delivery_request=delivery_request,
            items=items,
            raw_payload=body,
            raw_headers=headers or None,
        )


def _parse_item(item: Any) -> NormalizedOrderItem:
    if not isinstance(item, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid mock delivery payload: order.items entries must be objects.",
        )

    quantity = item.get("quantity")
    if not isinstance(quantity, int) or quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid mock delivery payload: item.quantity must be a positive integer.",
        )

    options_payload = item.get("options", [])
    if not isinstance(options_payload, list):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid mock delivery payload: item.options must be an array.",
        )

    return NormalizedOrderItem(
        external_line_id=_optional_str(item.get("itemId") or item.get("lineId")),
        name=_require_str(item, "name"),
        quantity=quantity,
        unit_price=_optional_non_negative_int(item.get("unitPrice")),
        total_price=_optional_non_negative_int(item.get("totalPrice")),
        options=[_parse_option(option) for option in options_payload],
    )


def _parse_option(option: Any) -> NormalizedOrderOption:
    if isinstance(option, dict):
        return NormalizedOrderOption(
            group_name=_optional_str(option.get("groupName")),
            option_name=_require_str(option, "optionName"),
            option_type=_optional_str(option.get("optionType")),
            additional_price=_optional_non_negative_int(option.get("additionalPrice")),
            raw_option=option,
        )

    option_text = str(option).strip()
    if not option_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid mock delivery payload: option text must not be empty.",
        )

    if ":" in option_text:
        group_name, option_name = option_text.split(":", 1)
        return NormalizedOrderOption(
            group_name=group_name.strip() or None,
            option_name=option_name.strip() or option_text,
            raw_option=option_text,
        )

    return NormalizedOrderOption(
        group_name=None,
        option_name=option_text,
        raw_option=option_text,
    )


def _require_str(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid mock delivery payload: {key} must be a non-empty string.",
        )
    return value.strip()


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return str(value)


def _optional_non_negative_int(value: Any) -> int | None:
    if value is None:
        return None
    if not isinstance(value, int) or value < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid mock delivery payload: price fields must be non-negative integers.",
        )
    return value


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid mock delivery payload: orderedAt must be an ISO datetime string.",
        )
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid mock delivery payload: orderedAt must be an ISO datetime string.",
        ) from exc
