from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from fastapi import HTTPException, status

from app.normalization import NormalizedOrderEvent


class SignatureValidationError(HTTPException):
    def __init__(self, detail: str = "Webhook signature validation failed.") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )


class PlatformAdapter(ABC):
    platform_name: str

    @abstractmethod
    def can_handle(self, headers: dict[str, Any], body: dict[str, Any]) -> bool:
        raise NotImplementedError

    def validate_signature(
        self,
        headers: dict[str, Any],
        raw_body: bytes | None,
        body: dict[str, Any],
    ) -> None:
        return None

    @abstractmethod
    def parse_event(
        self,
        headers: dict[str, Any],
        body: dict[str, Any],
    ) -> NormalizedOrderEvent:
        raise NotImplementedError
