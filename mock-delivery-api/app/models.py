from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.database import Base


class MockWebhookLogStatus(StrEnum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class MockOrder(Base):
    __tablename__ = "mock_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    order_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    order_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class MockWebhookLog(Base):
    __tablename__ = "mock_webhook_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    order_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    webhook_url: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[MockWebhookLogStatus] = mapped_column(Enum(MockWebhookLogStatus), nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    http_status_code: Mapped[int | None] = mapped_column(Integer)
    response_body: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    request_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

