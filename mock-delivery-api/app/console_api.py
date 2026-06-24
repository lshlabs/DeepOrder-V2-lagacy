import json
import random
import string
from datetime import datetime, timezone
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import (
    ApiConfig,
    ConsoleOrderRecord,
    Menu,
    MenuType,
    Option,
    OptionEffect,
    OptionGroup,
    OptionSelectionType,
    Store,
)
from app.schemas import MockOrderBody, MockOrderItem, MockOrderPayload

router = APIRouter(prefix="/api/mock", tags=["console"])


class StoreOut(BaseModel):
    id: str
    name: str
    address: str | None = None
    isActive: bool
    createdAt: str
    updatedAt: str


class StoreCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    address: str | None = None
    isActive: bool = True


class StoreUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    address: str | None = None
    isActive: bool | None = None


class MenuOut(BaseModel):
    id: str
    storeId: str
    name: str
    type: MenuType
    basePrice: int
    allergens: list[str]
    isAvailable: bool
    sortOrder: int = 0
    createdAt: str
    updatedAt: str


class MenuCreateIn(BaseModel):
    storeId: str
    name: str = Field(min_length=1, max_length=120)
    type: MenuType
    basePrice: int = Field(ge=0)
    allergens: list[str] = Field(default_factory=list)
    isAvailable: bool = True
    sortOrder: int = 0


class MenuUpdateIn(BaseModel):
    storeId: str | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)
    type: MenuType | None = None
    basePrice: int | None = Field(default=None, ge=0)
    allergens: list[str] | None = None
    isAvailable: bool | None = None
    sortOrder: int | None = None


class OptionGroupOut(BaseModel):
    id: str
    menuId: str
    name: str
    selectionType: Literal["RADIO", "CHECKBOX"]
    isRequired: bool
    minSelect: int
    maxSelect: int
    sortOrder: int = 0
    isAvailable: bool
    createdAt: str
    updatedAt: str


class OptionGroupCreateIn(BaseModel):
    menuId: str
    name: str = Field(min_length=1, max_length=120)
    selectionType: Literal["RADIO", "CHECKBOX"]
    isRequired: bool = False
    minSelect: int = Field(default=0, ge=0)
    maxSelect: int = Field(default=1, ge=0)
    sortOrder: int = 0
    isAvailable: bool = True


class OptionGroupUpdateIn(BaseModel):
    menuId: str | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)
    selectionType: Literal["RADIO", "CHECKBOX"] | None = None
    isRequired: bool | None = None
    minSelect: int | None = Field(default=None, ge=0)
    maxSelect: int | None = Field(default=None, ge=0)
    sortOrder: int | None = None
    isAvailable: bool | None = None


class OptionOut(BaseModel):
    id: str
    optionGroupId: str
    name: str
    effect: Literal["NONE", "ADD", "EXCLUDE", "REPLACE", "NOTE"]
    additionalPrice: int
    linkedMenuId: str | None
    isDefaultSelected: bool
    sortOrder: int = 0
    isAvailable: bool
    createdAt: str
    updatedAt: str


class OptionCreateIn(BaseModel):
    optionGroupId: str
    name: str = Field(min_length=1, max_length=120)
    effect: Literal["NONE", "ADD", "EXCLUDE", "REPLACE", "NOTE"] = "NONE"
    additionalPrice: int = Field(default=0, ge=0)
    linkedMenuId: str | None = None
    isDefaultSelected: bool = False
    sortOrder: int = 0
    isAvailable: bool = True


class OptionUpdateIn(BaseModel):
    optionGroupId: str | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)
    effect: Literal["NONE", "ADD", "EXCLUDE", "REPLACE", "NOTE"] | None = None
    additionalPrice: int | None = Field(default=None, ge=0)
    linkedMenuId: str | None = None
    isDefaultSelected: bool | None = None
    sortOrder: int | None = None
    isAvailable: bool | None = None


class DuplicateOptionGroupIn(BaseModel):
    targetMenuId: str


class DuplicateOptionGroupOut(BaseModel):
    optionGroup: OptionGroupOut
    options: list[OptionOut]


class DuplicateAllOptionGroupsOut(BaseModel):
    optionGroups: list[OptionGroupOut]
    options: list[OptionOut]


class CatalogData(BaseModel):
    stores: list[StoreOut] = Field(default_factory=list)
    menus: list[MenuOut] = Field(default_factory=list)
    optionGroups: list[OptionGroupOut] = Field(default_factory=list)
    options: list[OptionOut] = Field(default_factory=list)


class CatalogImportResult(BaseModel):
    imported: int
    errors: list[str]


class ApiConfigOut(BaseModel):
    id: str
    name: str
    provider: str
    endpoint: str
    model: str
    apiKey: str
    temperature: float
    isActive: bool
    createdAt: str
    updatedAt: str


class ApiConfigCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    provider: str = Field(min_length=1, max_length=64)
    endpoint: str = Field(min_length=1, max_length=500)
    model: str = Field(min_length=1, max_length=120)
    apiKey: str = ""
    temperature: float = 0.7
    isActive: bool = False


class ApiConfigUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    provider: str | None = Field(default=None, min_length=1, max_length=64)
    endpoint: str | None = Field(default=None, min_length=1, max_length=500)
    model: str | None = Field(default=None, min_length=1, max_length=120)
    apiKey: str | None = None
    temperature: float | None = None
    isActive: bool | None = None


class GeneratedOrderOptionOut(BaseModel):
    groupName: str
    optionName: str
    effect: Literal["NONE", "ADD", "EXCLUDE", "REPLACE", "NOTE"]
    additionalPrice: int


class GeneratedOrderItemOut(BaseModel):
    menuId: str
    menuName: str
    type: MenuType
    basePrice: int
    quantity: int
    selectedOptions: list[GeneratedOrderOptionOut]
    itemTotal: int


class GeneratedOrderOut(BaseModel):
    orderId: str
    orderNumber: str
    storeId: str
    storeName: str
    createdAt: str
    generatedBy: str
    items: list[GeneratedOrderItemOut]
    totalPrice: int


class GenerateOrderIn(BaseModel):
    generatedBy: str = "fallback-generator"


class OrderRecordOut(BaseModel):
    id: str
    createdAt: str
    status: Literal["success", "error"]
    httpStatus: int
    storeName: str
    payload: str
    message: str


@router.patch("/stores/{store_id}", response_model=StoreOut)
def patch_store(store_id: str, payload: StoreUpdateIn, db: Session = Depends(get_db)) -> StoreOut:
    store = _get_store(db, store_id)
    if payload.name is not None:
        store.store_name = payload.name.strip()
    if payload.isActive is not None:
        store.available = payload.isActive
    db.commit()
    db.refresh(store)
    return _store_out(store)


@router.post("/menus", response_model=MenuOut, status_code=status.HTTP_201_CREATED)
def create_menu(payload: MenuCreateIn, db: Session = Depends(get_db)) -> MenuOut:
    _get_store(db, payload.storeId)
    menu = Menu(
        store_id=payload.storeId,
        menu_id=_next_menu_id(db, payload.storeId),
        name=payload.name.strip(),
        type=payload.type,
        base_price=payload.basePrice,
        allergens_json=_allergens_to_json(payload.allergens),
        available=payload.isAvailable,
        sort_order=payload.sortOrder,
    )
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return _menu_out(menu)


@router.patch("/menus/{menu_id}", response_model=MenuOut)
def patch_menu(menu_id: str, payload: MenuUpdateIn, db: Session = Depends(get_db)) -> MenuOut:
    menu = _get_menu_by_id(db, menu_id)
    _apply_menu_update(menu, payload)
    db.commit()
    db.refresh(menu)
    return _menu_out(menu)


@router.delete("/menus/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu(menu_id: str, db: Session = Depends(get_db)) -> None:
    menu = _get_menu_by_id(db, menu_id)
    for group in _groups_for_menu(db, menu.menu_id, available_only=False):
        for option in _options_for_group(db, group.group_id, available_only=False):
            db.delete(option)
        db.delete(group)
    db.delete(menu)
    db.commit()


@router.post("/menus/{menu_id}/clone", response_model=MenuOut, status_code=status.HTTP_201_CREATED)
def clone_menu(menu_id: str, db: Session = Depends(get_db)) -> MenuOut:
    source = _get_menu_by_id(db, menu_id)
    cloned = Menu(
        store_id=source.store_id,
        menu_id=_next_menu_id(db, source.store_id),
        name=f"{source.name} (복사본)",
        type=source.type,
        base_price=source.base_price,
        allergens_json=source.allergens_json,
        quantity_min=source.quantity_min,
        quantity_max=source.quantity_max,
        quantity_default=source.quantity_default,
        available=source.available,
        sort_order=_next_menu_sort_order(db, source.store_id),
    )
    db.add(cloned)
    db.flush()

    for group in _groups_for_menu(db, source.menu_id, available_only=False):
        _clone_group(db, group, cloned.menu_id)

    db.commit()
    db.refresh(cloned)
    return _menu_out(cloned)


@router.get("/menus/{menu_id}/option-groups", response_model=list[OptionGroupOut])
def list_option_groups(menu_id: str, db: Session = Depends(get_db)) -> list[OptionGroupOut]:
    _get_menu_by_id(db, menu_id)
    return [_group_out(group) for group in _groups_for_menu(db, menu_id)]


@router.post(
    "/option-groups",
    response_model=OptionGroupOut,
    status_code=status.HTTP_201_CREATED,
)
def create_option_group(
    payload: OptionGroupCreateIn, db: Session = Depends(get_db)
) -> OptionGroupOut:
    menu = _get_menu_by_id(db, payload.menuId)
    if menu.type not in {MenuType.MAIN, MenuType.SET}:
        raise HTTPException(status_code=400, detail="Only MAIN or SET menus can have option groups.")
    _validate_group_range(payload.isRequired, payload.minSelect, payload.maxSelect)
    group = OptionGroup(
        store_id=menu.store_id,
        menu_id=menu.menu_id,
        group_id=_next_group_id(db, menu.store_id, menu.menu_id),
        group_name=payload.name.strip(),
        selection_type=OptionSelectionType(payload.selectionType),
        required=payload.isRequired,
        min_select=payload.minSelect,
        max_select=payload.maxSelect,
        available=payload.isAvailable,
        sort_order=payload.sortOrder,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return _group_out(group)


@router.patch("/option-groups/{group_id}", response_model=OptionGroupOut)
def patch_option_group(
    group_id: str, payload: OptionGroupUpdateIn, db: Session = Depends(get_db)
) -> OptionGroupOut:
    group = _get_group_by_id(db, group_id)
    next_required = group.required if payload.isRequired is None else payload.isRequired
    next_min = group.min_select if payload.minSelect is None else payload.minSelect
    next_max = group.max_select if payload.maxSelect is None else payload.maxSelect
    _validate_group_range(next_required, next_min, next_max)

    if payload.name is not None:
        group.group_name = payload.name.strip()
    if payload.selectionType is not None:
        group.selection_type = OptionSelectionType(payload.selectionType)
    if payload.isRequired is not None:
        group.required = payload.isRequired
    if payload.minSelect is not None:
        group.min_select = payload.minSelect
    if payload.maxSelect is not None:
        group.max_select = payload.maxSelect
    if payload.sortOrder is not None:
        group.sort_order = payload.sortOrder
    if payload.isAvailable is not None:
        group.available = payload.isAvailable
    db.commit()
    db.refresh(group)
    return _group_out(group)


@router.delete("/option-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_option_group(group_id: str, db: Session = Depends(get_db)) -> None:
    group = _get_group_by_id(db, group_id)
    for option in _options_for_group(db, group.group_id, available_only=False):
        db.delete(option)
    db.delete(group)
    db.commit()


@router.post(
    "/option-groups/{group_id}/clone",
    response_model=OptionGroupOut,
    status_code=status.HTTP_201_CREATED,
)
def clone_option_group(group_id: str, db: Session = Depends(get_db)) -> OptionGroupOut:
    source = _get_group_by_id(db, group_id)
    cloned = _clone_group(db, source, source.menu_id, suffix=" (복사본)")
    db.commit()
    db.refresh(cloned)
    return _group_out(cloned)


@router.post(
    "/option-groups/{group_id}/duplicate",
    response_model=DuplicateOptionGroupOut,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_option_group(
    group_id: str, payload: DuplicateOptionGroupIn, db: Session = Depends(get_db)
) -> DuplicateOptionGroupOut:
    source = _get_group_by_id(db, group_id)
    target = _get_menu_by_id(db, payload.targetMenuId)
    if target.type not in {MenuType.MAIN, MenuType.SET}:
        raise HTTPException(status_code=400, detail="Only MAIN or SET menus can receive option groups.")
    cloned = _clone_group(db, source, target.menu_id)
    db.commit()
    db.refresh(cloned)
    options = _options_for_group(db, cloned.group_id)
    return DuplicateOptionGroupOut(
        optionGroup=_group_out(cloned),
        options=[_option_out(option) for option in options],
    )


@router.post(
    "/menus/{source_menu_id}/option-groups/duplicate",
    response_model=DuplicateAllOptionGroupsOut,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_all_option_groups(
    source_menu_id: str, payload: DuplicateOptionGroupIn, db: Session = Depends(get_db)
) -> DuplicateAllOptionGroupsOut:
    _get_menu_by_id(db, source_menu_id)
    target = _get_menu_by_id(db, payload.targetMenuId)
    if source_menu_id == target.menu_id:
        raise HTTPException(status_code=400, detail="target menu must be different from source menu.")
    if target.type not in {MenuType.MAIN, MenuType.SET}:
        raise HTTPException(status_code=400, detail="Only MAIN or SET menus can receive option groups.")

    cloned_groups: list[OptionGroup] = []
    cloned_options: list[Option] = []
    for group in _groups_for_menu(db, source_menu_id):
        cloned = _clone_group(db, group, target.menu_id)
        db.flush()
        cloned_groups.append(cloned)
        cloned_options.extend(_options_for_group(db, cloned.group_id))
    db.commit()
    return DuplicateAllOptionGroupsOut(
        optionGroups=[_group_out(group) for group in cloned_groups],
        options=[_option_out(option) for option in cloned_options],
    )


@router.get("/option-groups/{group_id}/options", response_model=list[OptionOut])
def list_options(group_id: str, db: Session = Depends(get_db)) -> list[OptionOut]:
    _get_group_by_id(db, group_id)
    return [_option_out(option) for option in _options_for_group(db, group_id)]


@router.post("/options", response_model=OptionOut, status_code=status.HTTP_201_CREATED)
def create_option(payload: OptionCreateIn, db: Session = Depends(get_db)) -> OptionOut:
    group = _get_group_by_id(db, payload.optionGroupId)
    _validate_linked_menu(db, group.store_id, payload.linkedMenuId)
    option = Option(
        store_id=group.store_id,
        group_id=group.group_id,
        option_id=_next_option_id(db, group.store_id, group.group_id),
        name=payload.name.strip(),
        effect=OptionEffect(payload.effect),
        additional_price=payload.additionalPrice,
        linked_menu_id=payload.linkedMenuId,
        default_selected=payload.isDefaultSelected,
        sort_order=payload.sortOrder,
        available=payload.isAvailable,
    )
    db.add(option)
    db.commit()
    db.refresh(option)
    return _option_out(option)


@router.patch("/options/{option_id}", response_model=OptionOut)
def patch_option(option_id: str, payload: OptionUpdateIn, db: Session = Depends(get_db)) -> OptionOut:
    option = _get_option_by_id(db, option_id)
    if payload.linkedMenuId is not None:
        _validate_linked_menu(db, option.store_id, payload.linkedMenuId)
    if payload.name is not None:
        option.name = payload.name.strip()
    if payload.effect is not None:
        option.effect = OptionEffect(payload.effect)
    if payload.additionalPrice is not None:
        option.additional_price = payload.additionalPrice
    if payload.linkedMenuId is not None:
        option.linked_menu_id = payload.linkedMenuId
    if payload.isDefaultSelected is not None:
        option.default_selected = payload.isDefaultSelected
    if payload.sortOrder is not None:
        option.sort_order = payload.sortOrder
    if payload.isAvailable is not None:
        option.available = payload.isAvailable
    db.commit()
    db.refresh(option)
    return _option_out(option)


@router.delete("/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_option(option_id: str, db: Session = Depends(get_db)) -> None:
    option = _get_option_by_id(db, option_id)
    db.delete(option)
    db.commit()


@router.post("/options/{option_id}/clone", response_model=OptionOut, status_code=status.HTTP_201_CREATED)
def clone_option(option_id: str, db: Session = Depends(get_db)) -> OptionOut:
    source = _get_option_by_id(db, option_id)
    cloned = Option(
        store_id=source.store_id,
        group_id=source.group_id,
        option_id=_next_option_id(db, source.store_id, source.group_id),
        name=f"{source.name} (복사본)",
        effect=source.effect,
        additional_price=source.additional_price,
        linked_menu_id=source.linked_menu_id,
        default_selected=source.default_selected,
        available=source.available,
        sort_order=_next_option_sort_order(db, source.group_id),
    )
    db.add(cloned)
    db.commit()
    db.refresh(cloned)
    return _option_out(cloned)


@router.get("/stores/{store_id}/linkable-menus", response_model=list[MenuOut])
def linkable_menus(store_id: str, db: Session = Depends(get_db)) -> list[MenuOut]:
    _get_store(db, store_id)
    menus = db.scalars(
        select(Menu)
        .where(
            Menu.store_id == store_id,
            Menu.available.is_(True),
            Menu.type.in_([MenuType.SIDE, MenuType.DRINK]),
        )
        .order_by(Menu.sort_order, Menu.id)
    ).all()
    return [_menu_out(menu) for menu in menus]


@router.get("/stores/{store_id}/target-menus", response_model=list[MenuOut])
def target_menus(
    store_id: str, excludeMenuId: str | None = None, db: Session = Depends(get_db)
) -> list[MenuOut]:
    _get_store(db, store_id)
    query = select(Menu).where(
        Menu.store_id == store_id,
        Menu.available.is_(True),
        Menu.type.in_([MenuType.MAIN, MenuType.SET]),
    )
    if excludeMenuId:
        query = query.where(Menu.menu_id != excludeMenuId)
    return [_menu_out(menu) for menu in db.scalars(query.order_by(Menu.sort_order, Menu.id)).all()]


@router.get("/catalog/export-flat", response_model=CatalogData)
def export_catalog_flat(db: Session = Depends(get_db)) -> CatalogData:
    return _catalog_data(db)


@router.post("/catalog/import-flat", response_model=CatalogImportResult)
def import_catalog_flat(
    payload: CatalogData, mode: Literal["merge", "replace"] = "merge", db: Session = Depends(get_db)
) -> CatalogImportResult:
    if mode == "replace":
        db.query(Option).delete()
        db.query(OptionGroup).delete()
        db.query(Menu).delete()
        db.query(Store).delete()
        db.flush()

    imported = 0
    for store_payload in payload.stores:
        store = db.scalar(select(Store).where(Store.store_id == store_payload.id))
        if store and mode == "merge":
            continue
        if not store:
            store = Store(store_id=store_payload.id, store_name=store_payload.name)
            db.add(store)
        store.store_name = store_payload.name
        store.available = store_payload.isActive
        imported += 1
    db.flush()

    for menu_payload in payload.menus:
        _get_store(db, menu_payload.storeId)
        menu = db.scalar(
            select(Menu).where(Menu.store_id == menu_payload.storeId, Menu.menu_id == menu_payload.id)
        )
        if menu and mode == "merge":
            continue
        if not menu:
            menu = Menu(store_id=menu_payload.storeId, menu_id=menu_payload.id)
            db.add(menu)
        menu.name = menu_payload.name
        menu.type = menu_payload.type
        menu.base_price = menu_payload.basePrice
        menu.allergens_json = _allergens_to_json(menu_payload.allergens)
        menu.available = menu_payload.isAvailable
        menu.sort_order = menu_payload.sortOrder
        imported += 1
    db.flush()

    for group_payload in payload.optionGroups:
        menu = _get_menu_by_id(db, group_payload.menuId)
        group = db.scalar(
            select(OptionGroup).where(
                OptionGroup.store_id == menu.store_id,
                OptionGroup.menu_id == menu.menu_id,
                OptionGroup.group_id == group_payload.id,
            )
        )
        if group and mode == "merge":
            continue
        if not group:
            group = OptionGroup(
                store_id=menu.store_id,
                menu_id=menu.menu_id,
                group_id=group_payload.id,
            )
            db.add(group)
        group.group_name = group_payload.name
        group.selection_type = OptionSelectionType(group_payload.selectionType)
        group.required = group_payload.isRequired
        group.min_select = group_payload.minSelect
        group.max_select = group_payload.maxSelect
        group.available = group_payload.isAvailable
        group.sort_order = group_payload.sortOrder
        imported += 1
    db.flush()

    for option_payload in payload.options:
        group = _get_group_by_id(db, option_payload.optionGroupId)
        option = db.scalar(
            select(Option).where(
                Option.store_id == group.store_id,
                Option.group_id == group.group_id,
                Option.option_id == option_payload.id,
            )
        )
        if option and mode == "merge":
            continue
        if not option:
            option = Option(
                store_id=group.store_id,
                group_id=group.group_id,
                option_id=option_payload.id,
            )
            db.add(option)
        option.name = option_payload.name
        option.effect = OptionEffect(option_payload.effect)
        option.additional_price = option_payload.additionalPrice
        option.linked_menu_id = option_payload.linkedMenuId
        option.default_selected = option_payload.isDefaultSelected
        option.available = option_payload.isAvailable
        option.sort_order = option_payload.sortOrder
        imported += 1

    db.commit()
    return CatalogImportResult(imported=imported, errors=[])


@router.get("/api-configs", response_model=list[ApiConfigOut])
def list_api_configs(db: Session = Depends(get_db)) -> list[ApiConfigOut]:
    configs = db.scalars(select(ApiConfig).order_by(ApiConfig.id)).all()
    return [_api_config_out(config) for config in configs]


@router.post("/api-configs", response_model=ApiConfigOut, status_code=status.HTTP_201_CREATED)
def create_api_config(payload: ApiConfigCreateIn, db: Session = Depends(get_db)) -> ApiConfigOut:
    if payload.isActive:
        _deactivate_api_configs(db)
    config = ApiConfig(
        config_id=_next_config_id(db),
        name=payload.name.strip(),
        provider=payload.provider.strip(),
        endpoint=payload.endpoint.strip(),
        model=payload.model.strip(),
        api_key=payload.apiKey,
        temperature=payload.temperature,
        active=payload.isActive,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return _api_config_out(config)


@router.patch("/api-configs/{config_id}", response_model=ApiConfigOut)
def patch_api_config(
    config_id: str, payload: ApiConfigUpdateIn, db: Session = Depends(get_db)
) -> ApiConfigOut:
    config = _get_api_config(db, config_id)
    if payload.isActive:
        _deactivate_api_configs(db, exclude_id=config.config_id)
    if payload.name is not None:
        config.name = payload.name.strip()
    if payload.provider is not None:
        config.provider = payload.provider.strip()
    if payload.endpoint is not None:
        config.endpoint = payload.endpoint.strip()
    if payload.model is not None:
        config.model = payload.model.strip()
    if payload.apiKey is not None and "••••" not in payload.apiKey:
        config.api_key = payload.apiKey
    if payload.temperature is not None:
        config.temperature = payload.temperature
    if payload.isActive is not None:
        config.active = payload.isActive
    db.commit()
    db.refresh(config)
    return _api_config_out(config)


@router.delete("/api-configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_api_config(config_id: str, db: Session = Depends(get_db)) -> None:
    config = _get_api_config(db, config_id)
    db.delete(config)
    db.commit()


@router.get("/api-configs/active", response_model=ApiConfigOut | None)
def active_api_config(db: Session = Depends(get_db)) -> ApiConfigOut | None:
    config = db.scalar(select(ApiConfig).where(ApiConfig.active.is_(True)).order_by(ApiConfig.id))
    return _api_config_out(config) if config else None


@router.post("/stores/{store_id}/orders/generate", response_model=GeneratedOrderOut)
def generate_order(
    store_id: str, payload: GenerateOrderIn | None = None, db: Session = Depends(get_db)
) -> GeneratedOrderOut:
    payload = payload or GenerateOrderIn()
    store = _get_store(db, store_id)
    menus = db.scalars(
        select(Menu)
        .where(
            Menu.store_id == store_id,
            Menu.available.is_(True),
            Menu.type.in_([MenuType.MAIN, MenuType.SET]),
        )
        .order_by(Menu.sort_order, Menu.id)
    ).all()
    if not menus:
        raise HTTPException(status_code=400, detail="주문 가능한 메뉴(메인/세트)가 없습니다")

    active = db.scalar(select(ApiConfig).where(ApiConfig.active.is_(True)).order_by(ApiConfig.id))
    generated = _try_generate_order_with_ai(db, store, menus, active)
    if generated is not None:
        return generated

    chosen_menus = menus[: min(len(menus), random.randint(1, 3))]
    items = [_build_fallback_order_item(db, menu) for menu in chosen_menus]
    return GeneratedOrderOut(
        orderId=_next_record_id(db, "ORDER"),
        orderNumber=_next_order_number(),
        storeId=store.store_id,
        storeName=store.store_name,
        createdAt=_now_iso(),
        generatedBy="fallback-generator",
        items=items,
        totalPrice=sum(item.itemTotal for item in items),
    )


@router.post("/orders/send")
def send_order(request: dict, db: Session = Depends(get_db)):
    order = GeneratedOrderOut.model_validate(request)
    settings = get_settings()
    if not order.items:
        record = _create_order_record(
            db,
            "error",
            422,
            order.storeName,
            order.model_dump(mode="json"),
            "전송할 주문 항목이 없습니다.",
        )
    else:
        headers = {"Content-Type": "application/json"}
        payload: dict[str, object] = _generated_order_to_mock_payload(order, db).model_dump(mode="json")
        try:
            response = httpx.post(
                str(settings.deeporder_webhook_url),
                json=payload,
                headers=headers,
                timeout=10.0,
            )
            status_label = "success" if 200 <= response.status_code < 300 else "error"
            message = response.text or f"HTTP {response.status_code}"
            http_status = response.status_code
        except httpx.HTTPError as exc:
            status_label = "error"
            message = str(exc)
            http_status = 0

        record = _create_order_record(
            db,
            status_label,
            http_status,
            order.storeName,
            order.model_dump(mode="json"),
            message,
        )
    db.commit()
    db.refresh(record)
    return _order_record_out(record)


@router.get("/order-records", response_model=list[OrderRecordOut])
def list_order_records(db: Session = Depends(get_db)) -> list[OrderRecordOut]:
    records = db.scalars(
        select(ConsoleOrderRecord).order_by(
            ConsoleOrderRecord.created_at.desc(), ConsoleOrderRecord.id.desc()
        )
    ).all()
    return [_order_record_out(record) for record in records]


@router.delete("/order-records", status_code=status.HTTP_204_NO_CONTENT)
def clear_order_records(db: Session = Depends(get_db)) -> None:
    db.query(ConsoleOrderRecord).delete()
    db.commit()


def _iso(value: datetime | str | None) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str):
        return value
    return _now_iso()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _store_out(store: Store) -> StoreOut:
    return StoreOut(
        id=store.store_id,
        name=store.store_name,
        isActive=store.available,
        createdAt=_iso(store.created_at),
        updatedAt=_iso(store.updated_at),
    )


def _menu_out(menu: Menu) -> MenuOut:
    return MenuOut(
        id=menu.menu_id,
        storeId=menu.store_id,
        name=menu.name,
        type=menu.type,
        basePrice=menu.base_price,
        allergens=_allergens_from_json(menu.allergens_json),
        isAvailable=menu.available,
        sortOrder=menu.sort_order,
        createdAt=_iso(menu.created_at),
        updatedAt=_iso(menu.updated_at),
    )


def _group_out(group: OptionGroup) -> OptionGroupOut:
    selection = "CHECKBOX" if group.selection_type == OptionSelectionType.CHECKBOX else "RADIO"
    return OptionGroupOut(
        id=group.group_id,
        menuId=group.menu_id,
        name=group.group_name,
        selectionType=selection,
        isRequired=group.required,
        minSelect=group.min_select,
        maxSelect=group.max_select,
        sortOrder=group.sort_order,
        isAvailable=group.available,
        createdAt=_iso(group.created_at),
        updatedAt=_iso(group.updated_at),
    )


def _option_out(option: Option) -> OptionOut:
    return OptionOut(
        id=option.option_id,
        optionGroupId=option.group_id,
        name=option.name,
        effect=_console_effect(option.effect),
        additionalPrice=option.additional_price,
        linkedMenuId=option.linked_menu_id,
        isDefaultSelected=option.default_selected,
        sortOrder=option.sort_order,
        isAvailable=option.available,
        createdAt=_iso(option.created_at),
        updatedAt=_iso(option.updated_at),
    )


def _api_config_out(config: ApiConfig) -> ApiConfigOut:
    return ApiConfigOut(
        id=config.config_id,
        name=config.name,
        provider=config.provider,
        endpoint=config.endpoint,
        model=config.model,
        apiKey=_mask_key(config.api_key),
        temperature=config.temperature,
        isActive=config.active,
        createdAt=_iso(config.created_at),
        updatedAt=_iso(config.updated_at),
    )


def _order_record_out(record: ConsoleOrderRecord) -> OrderRecordOut:
    return OrderRecordOut(
        id=record.record_id,
        createdAt=_iso(record.created_at),
        status=record.status,
        httpStatus=record.http_status,
        storeName=record.store_name,
        payload=record.payload,
        message=record.message,
    )


def _mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "••••"
    return f"{key[:4]}••••••{key[-4:]}"


def _console_effect(effect: OptionEffect) -> Literal["NONE", "ADD", "EXCLUDE", "REPLACE", "NOTE"]:
    if effect in {OptionEffect.ADD, OptionEffect.ADD_ITEM, OptionEffect.LINK_MENU}:
        return "ADD"
    if effect in {OptionEffect.EXCLUDE, OptionEffect.EXCLUDE_ITEM}:
        return "EXCLUDE"
    if effect in {OptionEffect.REPLACE, OptionEffect.REPLACE_ITEM}:
        return "REPLACE"
    if effect in {OptionEffect.NOTE, OptionEffect.CHANGE_TASTE}:
        return "NOTE"
    return "NONE"


def _allergens_from_json(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, dict):
        normalized = value.get("normalizedAllergens")
        if isinstance(normalized, list):
            return [str(item) for item in normalized]
    return []


def _allergens_to_json(allergens: list[str]) -> dict[str, object]:
    return {"normalizedAllergens": allergens, "rawText": ", ".join(allergens), "parseStatus": "MANUAL"}


def _get_store(db: Session, store_id: str) -> Store:
    store = db.scalar(select(Store).where(Store.store_id == store_id))
    if not store:
        raise HTTPException(status_code=404, detail="Store not found.")
    return store


def _get_menu_by_id(db: Session, menu_id: str) -> Menu:
    menu = db.scalar(select(Menu).where(Menu.menu_id == menu_id))
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found.")
    return menu


def _get_group_by_id(db: Session, group_id: str) -> OptionGroup:
    group = db.scalar(select(OptionGroup).where(OptionGroup.group_id == group_id))
    if not group:
        raise HTTPException(status_code=404, detail="Option group not found.")
    return group


def _get_option_by_id(db: Session, option_id: str) -> Option:
    option = db.scalar(select(Option).where(Option.option_id == option_id))
    if not option:
        raise HTTPException(status_code=404, detail="Option not found.")
    return option


def _get_api_config(db: Session, config_id: str) -> ApiConfig:
    config = db.scalar(select(ApiConfig).where(ApiConfig.config_id == config_id))
    if not config:
        raise HTTPException(status_code=404, detail="ApiConfig not found.")
    return config


def _groups_for_menu(db: Session, menu_id: str, available_only: bool = True) -> list[OptionGroup]:
    query = select(OptionGroup).where(OptionGroup.menu_id == menu_id)
    if available_only:
        query = query.where(OptionGroup.available.is_(True))
    return list(db.scalars(query.order_by(OptionGroup.sort_order, OptionGroup.id)).all())


def _options_for_group(db: Session, group_id: str, available_only: bool = True) -> list[Option]:
    query = select(Option).where(Option.group_id == group_id)
    if available_only:
        query = query.where(Option.available.is_(True))
    return list(db.scalars(query.order_by(Option.sort_order, Option.id)).all())


def _apply_menu_update(menu: Menu, payload: MenuUpdateIn) -> None:
    if payload.name is not None:
        menu.name = payload.name.strip()
    if payload.type is not None:
        menu.type = payload.type
    if payload.basePrice is not None:
        menu.base_price = payload.basePrice
    if payload.allergens is not None:
        menu.allergens_json = _allergens_to_json(payload.allergens)
    if payload.isAvailable is not None:
        menu.available = payload.isAvailable
    if payload.sortOrder is not None:
        menu.sort_order = payload.sortOrder


def _validate_group_range(required: bool, min_select: int, max_select: int) -> None:
    if max_select < min_select:
        raise HTTPException(status_code=400, detail="maxSelect must be greater than or equal to minSelect.")
    if required and min_select < 1:
        raise HTTPException(status_code=400, detail="required option group must have minSelect >= 1.")


def _validate_linked_menu(db: Session, store_id: str, linked_menu_id: str | None) -> None:
    if not linked_menu_id:
        return
    linked_menu = db.scalar(
        select(Menu).where(
            Menu.store_id == store_id,
            Menu.menu_id == linked_menu_id,
            Menu.available.is_(True),
        )
    )
    if not linked_menu:
        raise HTTPException(
            status_code=400,
            detail="linkedMenuId must reference an available menu in the same store.",
        )


def _clone_group(
    db: Session, source: OptionGroup, target_menu_id: str, suffix: str = ""
) -> OptionGroup:
    cloned = OptionGroup(
        store_id=source.store_id,
        menu_id=target_menu_id,
        group_id=_next_group_id(db, source.store_id, target_menu_id),
        group_name=f"{source.group_name}{suffix}",
        selection_type=source.selection_type,
        required=source.required,
        min_select=source.min_select,
        max_select=source.max_select,
        available=source.available,
        sort_order=_next_group_sort_order(db, target_menu_id),
    )
    db.add(cloned)
    db.flush()
    for option in _options_for_group(db, source.group_id, available_only=False):
        db.add(
            Option(
                store_id=option.store_id,
                group_id=cloned.group_id,
                option_id=_next_option_id(db, option.store_id, cloned.group_id),
                name=option.name,
                effect=option.effect,
                additional_price=option.additional_price,
                linked_menu_id=option.linked_menu_id,
                default_selected=option.default_selected,
                available=option.available,
                sort_order=option.sort_order,
            )
        )
    return cloned


def _build_order_item(db: Session, menu: Menu) -> GeneratedOrderItemOut:
    return _build_fallback_order_item(db, menu)


def _build_fallback_order_item(db: Session, menu: Menu) -> GeneratedOrderItemOut:
    selected_options: list[GeneratedOrderOptionOut] = []
    for group in _groups_for_menu(db, menu.menu_id):
        available_options = _options_for_group(db, group.group_id)
        if not available_options:
            continue
        count = 1 if group.required else 0
        chosen = available_options[:count]
        for option in chosen:
            selected_options.append(
                GeneratedOrderOptionOut(
                    groupName=group.group_name,
                    optionName=option.name,
                    effect=_console_effect(option.effect),
                    additionalPrice=option.additional_price,
                )
            )
    quantity = 1
    options_total = sum(option.additionalPrice for option in selected_options)
    return GeneratedOrderItemOut(
        menuId=menu.menu_id,
        menuName=menu.name,
        type=menu.type,
        basePrice=menu.base_price,
        quantity=quantity,
        selectedOptions=selected_options,
        itemTotal=(menu.base_price + options_total) * quantity,
    )


def _try_generate_order_with_ai(
    db: Session,
    store: Store,
    menus: list[Menu],
    active_config: ApiConfig | None,
) -> GeneratedOrderOut | None:
    if not active_config or not active_config.api_key.strip():
        return None
    if _is_deeporder_webhook(active_config.endpoint):
        return None

    try:
        ai_items = _generate_order_items_with_ai(db, menus, active_config)
    except Exception:
        return None
    if not ai_items:
        return None

    return GeneratedOrderOut(
        orderId=_next_record_id(db, "ORDER"),
        orderNumber=_next_order_number(),
        storeId=store.store_id,
        storeName=store.store_name,
        createdAt=_now_iso(),
        generatedBy=f"{active_config.provider}:{active_config.model}",
        items=ai_items,
        totalPrice=sum(item.itemTotal for item in ai_items),
    )


def _generate_order_items_with_ai(
    db: Session,
    menus: list[Menu],
    active_config: ApiConfig,
) -> list[GeneratedOrderItemOut]:
    catalog_payload = _catalog_for_ai(db, menus)
    prompt = _build_ai_generation_prompt(catalog_payload)
    provider = active_config.provider.strip().lower()

    if provider in {"openai", "xai", "custom"}:
        raw_result = _call_openai_compatible_generator(active_config, prompt)
    elif provider in {"google", "gemini"} or "generativelanguage.googleapis.com" in active_config.endpoint:
        raw_result = _call_gemini_generator(active_config, prompt)
    else:
        return []

    return _validated_generated_items_from_ai(db, menus, raw_result)


def _call_openai_compatible_generator(active_config: ApiConfig, prompt: str) -> dict:
    response = httpx.post(
        active_config.endpoint,
        headers={
            "Authorization": f"Bearer {active_config.api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": active_config.model,
            "temperature": active_config.temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You generate realistic mock delivery orders from the provided catalog. "
                        "Return JSON only."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        },
        timeout=20.0,
    )
    response.raise_for_status()
    payload = response.json()
    content = payload["choices"][0]["message"]["content"]
    return json.loads(_strip_code_fence(content))


def _call_gemini_generator(active_config: ApiConfig, prompt: str) -> dict:
    endpoint = active_config.endpoint
    if "key=" not in endpoint:
        separator = "&" if "?" in endpoint else "?"
        endpoint = f"{endpoint}{separator}key={active_config.api_key}"

    response = httpx.post(
        endpoint,
        headers={"Content-Type": "application/json"},
        json={
            "generationConfig": {
                "temperature": active_config.temperature,
                "responseMimeType": "application/json",
            },
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                "You generate realistic mock delivery orders from the provided catalog. "
                                "Return JSON only.\n\n"
                                f"{prompt}"
                            )
                        }
                    ]
                }
            ],
        },
        timeout=20.0,
    )
    response.raise_for_status()
    payload = response.json()
    text = payload["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(_strip_code_fence(text))


def _catalog_for_ai(db: Session, menus: list[Menu]) -> list[dict[str, object]]:
    catalog: list[dict[str, object]] = []
    for menu in menus:
        groups = []
        for group in _groups_for_menu(db, menu.menu_id):
            options = _options_for_group(db, group.group_id)
            groups.append(
                {
                    "groupName": group.group_name,
                    "required": group.required,
                    "minSelect": group.min_select,
                    "maxSelect": group.max_select,
                    "selectionType": group.selection_type.value,
                    "options": [
                        {
                            "optionName": option.name,
                            "additionalPrice": option.additional_price,
                            "effect": _console_effect(option.effect),
                        }
                        for option in options
                    ],
                }
            )
        catalog.append(
            {
                "menuId": menu.menu_id,
                "menuName": menu.name,
                "type": menu.type.value,
                "basePrice": menu.base_price,
                "quantityMin": menu.quantity_min,
                "quantityMax": menu.quantity_max,
                "optionGroups": groups,
            }
        )
    return catalog


def _build_ai_generation_prompt(catalog_payload: list[dict[str, object]]) -> str:
    return (
        "Create 1 to 3 realistic mock delivery order items using only the catalog below.\n"
        "Rules:\n"
        "- Use only menuId values from the catalog.\n"
        "- Include at least one MAIN or SET menu.\n"
        "- Respect required option groups.\n"
        "- selectedOptions entries must reference existing groupName and optionName pairs.\n"
        "- Return JSON only in this shape:\n"
        '{ "items": [ { "menuId": "MENU_001", "quantity": 1, "selectedOptions": [ { "groupName": "맵기", "optionName": "보통" } ] } ] }\n\n'
        f"Catalog:\n{json.dumps(catalog_payload, ensure_ascii=False, indent=2)}"
    )


def _validated_generated_items_from_ai(
    db: Session,
    menus: list[Menu],
    raw_result: dict,
) -> list[GeneratedOrderItemOut]:
    raw_items = raw_result.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        return []

    menu_by_id = {menu.menu_id: menu for menu in menus}
    generated_items: list[GeneratedOrderItemOut] = []

    for raw_item in raw_items[:3]:
        if not isinstance(raw_item, dict):
            continue
        menu_id = str(raw_item.get("menuId", "")).strip()
        menu = menu_by_id.get(menu_id)
        if not menu:
            continue

        quantity = raw_item.get("quantity", menu.quantity_default)
        if not isinstance(quantity, int):
            quantity = menu.quantity_default
        quantity = max(menu.quantity_min, min(menu.quantity_max, quantity))

        selected_options = _validated_selected_options_for_menu(
            db,
            menu,
            raw_item.get("selectedOptions"),
        )
        item_total = (menu.base_price + sum(option.additionalPrice for option in selected_options)) * quantity
        generated_items.append(
            GeneratedOrderItemOut(
                menuId=menu.menu_id,
                menuName=menu.name,
                type=menu.type,
                basePrice=menu.base_price,
                quantity=quantity,
                selectedOptions=selected_options,
                itemTotal=item_total,
            )
        )

    return generated_items


def _validated_selected_options_for_menu(
    db: Session,
    menu: Menu,
    raw_selected_options: object,
) -> list[GeneratedOrderOptionOut]:
    requested_pairs: set[tuple[str, str]] = set()
    if isinstance(raw_selected_options, list):
        for raw_option in raw_selected_options:
            if isinstance(raw_option, dict):
                group_name = str(raw_option.get("groupName", "")).strip()
                option_name = str(raw_option.get("optionName", "")).strip()
                if group_name and option_name:
                    requested_pairs.add((group_name, option_name))

    selected_options: list[GeneratedOrderOptionOut] = []
    for group in _groups_for_menu(db, menu.menu_id):
        available_options = _options_for_group(db, group.group_id)
        if not available_options:
            continue

        group_matches = [
            option for option in available_options if (group.group_name, option.name) in requested_pairs
        ]

        if group.required and not group_matches:
            group_matches = available_options[:1]

        max_select = max(1, group.max_select) if group.required else max(group.max_select, 0)
        for option in group_matches[:max_select]:
            selected_options.append(
                GeneratedOrderOptionOut(
                    groupName=group.group_name,
                    optionName=option.name,
                    effect=_console_effect(option.effect),
                    additionalPrice=option.additional_price,
                )
            )
    return selected_options


def _strip_code_fence(value: str) -> str:
    stripped = value.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if len(lines) >= 3:
            return "\n".join(lines[1:-1]).strip()
    return stripped


def _catalog_data(db: Session) -> CatalogData:
    stores = db.scalars(select(Store).order_by(Store.id)).all()
    menus = db.scalars(select(Menu).order_by(Menu.store_id, Menu.sort_order, Menu.id)).all()
    groups = db.scalars(select(OptionGroup).order_by(OptionGroup.menu_id, OptionGroup.sort_order)).all()
    options = db.scalars(select(Option).order_by(Option.group_id, Option.sort_order)).all()
    return CatalogData(
        stores=[_store_out(store) for store in stores],
        menus=[_menu_out(menu) for menu in menus],
        optionGroups=[_group_out(group) for group in groups],
        options=[_option_out(option) for option in options],
    )


def _create_order_record(
    db: Session,
    record_status: Literal["success", "error"],
    http_status: int,
    store_name: str,
    payload: dict,
    message: str,
) -> ConsoleOrderRecord:
    record = ConsoleOrderRecord(
        record_id=_next_record_id(db, "ORDER_RECORD"),
        status=record_status,
        http_status=http_status,
        store_name=store_name,
        payload=json.dumps(payload, ensure_ascii=False, indent=2),
        message=message,
    )
    db.add(record)
    return record


def _is_deeporder_webhook(endpoint: str) -> bool:
    return endpoint.rstrip("/").endswith("/api/external/orders/webhook")


def _generated_order_to_mock_payload(order: GeneratedOrderOut, db: Session) -> MockOrderPayload:
    return MockOrderPayload(
        eventId=_next_record_id(db, "EVENT"),
        eventType="ORDER_CREATED",
        platform="MOCK_DELIVERY",
        storeId=order.storeId,
        order=MockOrderBody(
            orderId=order.orderId,
            orderNumber=order.orderNumber,
            orderedAt=datetime.fromisoformat(order.createdAt.replace("Z", "+00:00")),
            items=[
                MockOrderItem(
                    name=item.menuName,
                    quantity=item.quantity,
                    options=[
                        _format_selected_option(selected_option)
                        for selected_option in item.selectedOptions
                    ],
                    unitPrice=_calculate_unit_price(item),
                    totalPrice=item.itemTotal,
                )
                for item in order.items
            ],
        ),
    )


def _calculate_unit_price(item: GeneratedOrderItemOut) -> int:
    options_total = sum(option.additionalPrice for option in item.selectedOptions)
    return item.basePrice + options_total


def _format_selected_option(option: GeneratedOrderOptionOut) -> str:
    return f"{option.groupName}: {option.optionName}"


def _deactivate_api_configs(db: Session, exclude_id: str | None = None) -> None:
    configs = db.scalars(select(ApiConfig)).all()
    for config in configs:
        if config.config_id != exclude_id:
            config.active = False


def _next_config_id(db: Session) -> str:
    return _next_prefixed_id(db, ApiConfig, ApiConfig.config_id, "API_CONFIG")


def _next_record_id(db: Session, prefix: str) -> str:
    return f"{prefix}_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{random.randint(1000, 9999)}"


def _next_menu_id(db: Session, store_id: str) -> str:
    return _next_prefixed_id(db, Menu, Menu.menu_id, "MENU")


def _next_group_id(db: Session, store_id: str, menu_id: str) -> str:
    return _next_prefixed_id(db, OptionGroup, OptionGroup.group_id, "GROUP")


def _next_option_id(db: Session, store_id: str, group_id: str) -> str:
    return _next_prefixed_id(db, Option, Option.option_id, "OPTION")


def _next_prefixed_id(db: Session, model, column, prefix: str, *filters) -> str:
    next_number = 1
    while True:
        candidate = f"{prefix}_{next_number:03d}"
        query = select(column).where(column == candidate)
        for filter_ in filters:
            query = query.where(filter_)
        if not db.scalar(query):
            return candidate
        next_number += 1


def _next_menu_sort_order(db: Session, store_id: str) -> int:
    menus = db.scalars(select(Menu).where(Menu.store_id == store_id)).all()
    return max([menu.sort_order for menu in menus], default=-1) + 1


def _next_group_sort_order(db: Session, menu_id: str) -> int:
    groups = db.scalars(select(OptionGroup).where(OptionGroup.menu_id == menu_id)).all()
    return max([group.sort_order for group in groups], default=-1) + 1


def _next_option_sort_order(db: Session, group_id: str) -> int:
    options = db.scalars(select(Option).where(Option.group_id == group_id)).all()
    return max([option.sort_order for option in options], default=-1) + 1


def _next_order_number() -> str:
    charset = string.ascii_uppercase + string.digits
    return "".join(random.choice(charset) for _ in range(6))
