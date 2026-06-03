from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import MockWebhookLogStatus


class SampleOrderRequest(BaseModel):
    storeId: str = "STORE_001"


class MockOrderItem(BaseModel):
    name: str
    quantity: int = Field(gt=0)
    options: list[str] = Field(default_factory=list)
    unitPrice: int = Field(ge=0)
    totalPrice: int = Field(ge=0)


class MockOrderBody(BaseModel):
    orderId: str
    orderNumber: str
    customerRequest: str | None = None
    deliveryRequest: str | None = None
    orderedAt: datetime | None = None
    items: list[MockOrderItem] = Field(min_length=1)


class MockOrderPayload(BaseModel):
    eventId: str
    eventType: Literal["ORDER_CREATED", "ORDER_CANCELLED"] = "ORDER_CREATED"
    platform: str = "MOCK_DELIVERY"
    storeId: str
    order: MockOrderBody


class SampleOrderResponse(BaseModel):
    generatedOrderId: int
    payload: MockOrderPayload


class SendOrderRequest(BaseModel):
    generatedOrderId: int | None = None
    webhookUrl: str | None = None
    payload: MockOrderPayload | None = None


class SendOrderResponse(BaseModel):
    logId: int
    success: bool
    status: MockWebhookLogStatus
    httpStatusCode: int | None = None
    responseBody: str | None = None
    errorMessage: str | None = None
    payload: MockOrderPayload


class MockWebhookLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    order_id: str
    webhook_url: str
    status: MockWebhookLogStatus
    success: bool
    http_status_code: int | None
    response_body: str | None
    error_message: str | None
    request_payload: dict[str, Any]
    created_at: datetime


class MockWebhookLogsResponse(BaseModel):
    logs: list[MockWebhookLogOut]

