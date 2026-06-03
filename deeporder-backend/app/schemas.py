from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import OrderStatus


class WebhookOrderItemIn(BaseModel):
    name: str
    quantity: int = Field(gt=0)
    options: list[str] = Field(default_factory=list)
    unitPrice: int | None = Field(default=None, ge=0)
    totalPrice: int | None = Field(default=None, ge=0)


class WebhookOrderIn(BaseModel):
    orderId: str
    orderNumber: str
    customerRequest: str | None = None
    deliveryRequest: str | None = None
    orderedAt: datetime | None = None
    items: list[WebhookOrderItemIn] = Field(min_length=1)


class OrderWebhookIn(BaseModel):
    eventId: str
    eventType: Literal["ORDER_CREATED", "ORDER_CANCELLED"]
    platform: str
    storeId: str
    order: WebhookOrderIn


class WebhookResponse(BaseModel):
    result: Literal["PROCESSED", "DUPLICATE_EVENT"]
    eventId: str
    orderId: int | None = None
    message: str


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    quantity: int
    options: list[str]
    unit_price: int | None
    total_price: int | None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: str
    store_id: str
    external_order_id: str
    order_number: str
    status: OrderStatus
    customer_request: str | None
    delivery_request: str | None
    ordered_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut]


class KdsOrdersResponse(BaseModel):
    orders: list[OrderOut]


class UpdateOrderStatusIn(BaseModel):
    status: Literal["NEW", "COOKING", "DONE", "CANCELLED"]


class OrderStatusResponse(BaseModel):
    id: int
    status: OrderStatus


class ErrorResponse(BaseModel):
    detail: str | list[dict[str, Any]]

