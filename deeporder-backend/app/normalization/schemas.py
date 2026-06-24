from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NormalizedOrderOption(BaseModel):
    model_config = ConfigDict(extra="allow")

    group_name: str | None = None
    option_name: str
    option_type: str | None = None
    additional_price: int | None = None
    raw_option: dict[str, Any] | str | None = None


class NormalizedOrderItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    external_line_id: str | None = None
    name: str
    quantity: int = Field(gt=0)
    unit_price: int | None = Field(default=None, ge=0)
    total_price: int | None = Field(default=None, ge=0)
    options: list[NormalizedOrderOption] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class NormalizedOrderEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

    source_platform: str
    source_event_id: str | None = None
    source_event_type: str
    source_occurred_at: datetime | None = None
    source_store_id: str
    source_order_id: str
    source_order_number: str | None = None
    customer_request: str | None = None
    delivery_request: str | None = None
    order_channel: str | None = None
    fulfillment_type: str | None = None
    currency: str | None = None
    items: list[NormalizedOrderItem] = Field(default_factory=list)
    raw_payload: dict[str, Any]
    raw_headers: dict[str, Any] | None = None
