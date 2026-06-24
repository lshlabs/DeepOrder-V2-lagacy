from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from app.adapters.base import PlatformAdapter
from app.adapters.mock_delivery import MockDeliveryAdapter


class UnsupportedPlatformError(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unsupported external platform payload.",
        )


ADAPTERS: list[PlatformAdapter] = [
    MockDeliveryAdapter(),
]


def get_adapter(headers: dict[str, Any], body: dict[str, Any]) -> PlatformAdapter:
    for adapter in ADAPTERS:
        if adapter.can_handle(headers, body):
            return adapter
    raise UnsupportedPlatformError()
