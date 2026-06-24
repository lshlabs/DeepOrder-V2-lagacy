from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.models import MenuType, OptionEffect, OptionSelectionType


class QuantityRule(BaseModel):
    min: int = Field(default=1, ge=1)
    max: int = Field(default=10, ge=1)
    default: int = Field(default=1, ge=1)

    @model_validator(mode="after")
    def validate_range(self) -> "QuantityRule":
        if self.min > self.max:
            raise ValueError("quantity min must be less than or equal to max.")
        if not self.min <= self.default <= self.max:
            raise ValueError("quantity default must be between min and max.")
        return self


class StoreCreate(BaseModel):
    storeName: str | None = Field(default=None, min_length=1, max_length=120)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    isActive: bool = True

    @model_validator(mode="after")
    def validate_name(self) -> "StoreCreate":
        if not (self.storeName or self.name):
            raise ValueError("storeName or name is required.")
        return self


class StoreUpdate(BaseModel):
    storeName: str | None = Field(default=None, min_length=1, max_length=120)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    available: bool | None = None
    isActive: bool | None = None


class StoreResponse(BaseModel):
    id: str
    name: str
    address: str | None = None
    isActive: bool
    createdAt: str
    updatedAt: str
    storeId: str
    storeName: str
    platform: str
    available: bool


class OptionResponse(BaseModel):
    id: str
    optionGroupId: str
    optionId: str
    name: str
    additionalPrice: int
    effect: OptionEffect
    linkedMenuId: str | None = None
    linkedMenuName: str | None = None
    isDefaultSelected: bool
    defaultSelected: bool
    isAvailable: bool
    available: bool
    sortOrder: int
    createdAt: str
    updatedAt: str


class OptionGroupResponse(BaseModel):
    id: str
    menuId: str
    groupId: str
    name: str
    groupName: str
    selectionType: OptionSelectionType
    isRequired: bool
    required: bool
    minSelect: int
    maxSelect: int
    options: list[OptionResponse] = Field(default_factory=list)
    isAvailable: bool
    available: bool
    sortOrder: int
    createdAt: str
    updatedAt: str


class MenuCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: MenuType
    basePrice: int = Field(ge=0)
    allergens: dict[str, Any] | None = None
    quantityRule: QuantityRule = Field(default_factory=QuantityRule)
    available: bool = True
    sortOrder: int = 0


class MenuUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    type: MenuType | None = None
    basePrice: int | None = Field(default=None, ge=0)
    allergens: dict[str, Any] | None = None
    quantityRule: QuantityRule | None = None
    available: bool | None = None
    sortOrder: int | None = None


class MenuResponse(BaseModel):
    id: str
    storeId: str
    isAvailable: bool
    createdAt: str
    updatedAt: str
    menuId: str
    name: str
    type: MenuType
    basePrice: int
    allergens: list[str]
    quantityRule: QuantityRule
    optionGroups: list[OptionGroupResponse] = Field(default_factory=list)
    available: bool
    sortOrder: int


class OptionGroupCreate(BaseModel):
    groupName: str = Field(min_length=1, max_length=120)
    selectionType: OptionSelectionType
    required: bool = False
    minSelect: int = Field(default=0, ge=0)
    maxSelect: int = Field(default=1, ge=0)
    sortOrder: int = 0

    @model_validator(mode="after")
    def validate_selection_range(self) -> "OptionGroupCreate":
        if self.maxSelect < self.minSelect:
            raise ValueError("maxSelect must be greater than or equal to minSelect.")
        if self.required and self.minSelect < 1:
            raise ValueError("required option group must have minSelect >= 1.")
        return self


class OptionGroupUpdate(BaseModel):
    groupName: str | None = Field(default=None, min_length=1, max_length=120)
    selectionType: OptionSelectionType | None = None
    required: bool | None = None
    minSelect: int | None = Field(default=None, ge=0)
    maxSelect: int | None = Field(default=None, ge=0)
    available: bool | None = None
    sortOrder: int | None = None


class OptionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    additionalPrice: int = Field(default=0, ge=0)
    effect: OptionEffect = OptionEffect.NONE
    linkedMenuId: str | None = None
    defaultSelected: bool = False
    available: bool = True
    sortOrder: int = 0


class OptionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    additionalPrice: int | None = Field(default=None, ge=0)
    effect: OptionEffect | None = None
    linkedMenuId: str | None = None
    defaultSelected: bool | None = None
    available: bool | None = None
    sortOrder: int | None = None


class DuplicateOptionGroupRequest(BaseModel):
    targetMenuId: str = Field(min_length=1)


class CatalogImportOption(BaseModel):
    optionId: str | None = None
    name: str = Field(min_length=1, max_length=120)
    additionalPrice: int = Field(default=0, ge=0)
    effect: OptionEffect = OptionEffect.NONE
    linkedMenuId: str | None = None
    defaultSelected: bool = False
    available: bool = True
    sortOrder: int = 0


class CatalogImportOptionGroup(BaseModel):
    groupId: str | None = None
    groupName: str = Field(min_length=1, max_length=120)
    selectionType: OptionSelectionType
    required: bool = False
    minSelect: int = Field(default=0, ge=0)
    maxSelect: int = Field(default=1, ge=0)
    options: list[CatalogImportOption] = Field(default_factory=list)
    available: bool = True
    sortOrder: int = 0

    @model_validator(mode="after")
    def validate_selection_range(self) -> "CatalogImportOptionGroup":
        if self.maxSelect < self.minSelect:
            raise ValueError("maxSelect must be greater than or equal to minSelect.")
        if self.required and self.minSelect < 1:
            raise ValueError("required option group must have minSelect >= 1.")
        return self


class CatalogImportMenu(BaseModel):
    menuId: str | None = None
    name: str = Field(min_length=1, max_length=120)
    type: MenuType
    basePrice: int = Field(ge=0)
    allergens: dict[str, Any] | None = None
    quantityRule: QuantityRule = Field(default_factory=QuantityRule)
    optionGroups: list[CatalogImportOptionGroup] = Field(default_factory=list)
    available: bool = True
    sortOrder: int = 0


class CatalogImportStore(BaseModel):
    storeId: str | None = None
    storeName: str = Field(min_length=1, max_length=120)
    platform: str = "MOCK_DELIVERY"
    available: bool = True
    menus: list[CatalogImportMenu] = Field(default_factory=list)


class CatalogImportRequest(BaseModel):
    stores: list[CatalogImportStore] = Field(default_factory=list)


class CatalogExportStore(StoreResponse):
    menus: list[MenuResponse] = Field(default_factory=list)


class CatalogExportResponse(BaseModel):
    stores: list[CatalogExportStore] = Field(default_factory=list)
    menus: list[MenuResponse] = Field(default_factory=list)
    optionGroups: list[OptionGroupResponse] = Field(default_factory=list)
    options: list[OptionResponse] = Field(default_factory=list)
    imported: int = 0
    errors: list[str] = Field(default_factory=list)


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
