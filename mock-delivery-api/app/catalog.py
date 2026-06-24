from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Menu, MenuType, Option, OptionEffect, OptionGroup, OptionSelectionType, Store
from app.schemas import (
    CatalogExportResponse,
    CatalogExportStore,
    CatalogImportRequest,
    CatalogImportStore,
    DuplicateOptionGroupRequest,
    MenuCreate,
    MenuResponse,
    MenuUpdate,
    OptionCreate,
    OptionGroupCreate,
    OptionGroupResponse,
    OptionGroupUpdate,
    OptionResponse,
    OptionUpdate,
    QuantityRule,
    StoreCreate,
    StoreResponse,
    StoreUpdate,
)

router = APIRouter(prefix="/api/mock", tags=["catalog"])


@router.get("/stores", response_model=list[StoreResponse])
def list_stores(db: Session = Depends(get_db)) -> list[StoreResponse]:
    stores = db.scalars(select(Store).order_by(Store.id)).all()
    return [_store_response(store) for store in stores]


@router.post("/stores", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def create_store(payload: StoreCreate, db: Session = Depends(get_db)) -> StoreResponse:
    store_name = payload.storeName or payload.name or ""
    store = Store(
        store_id=_next_store_id(db),
        store_name=store_name.strip(),
        available=payload.isActive,
    )
    db.add(store)
    db.commit()
    db.refresh(store)
    return _store_response(store)


@router.put("/stores/{store_id}", response_model=StoreResponse)
def update_store(store_id: str, payload: StoreUpdate, db: Session = Depends(get_db)) -> StoreResponse:
    store = _get_store_or_404(db, store_id)
    next_name = payload.storeName if payload.storeName is not None else payload.name
    if next_name is not None:
        store.store_name = next_name.strip()
    next_available = payload.available if payload.available is not None else payload.isActive
    if next_available is not None:
        store.available = next_available
    db.commit()
    db.refresh(store)
    return _store_response(store)


@router.delete("/stores/{store_id}", response_model=StoreResponse)
def delete_store(store_id: str, db: Session = Depends(get_db)) -> StoreResponse:
    store = _get_store_or_404(db, store_id)
    response = _store_response(store)
    menu_ids = [menu.menu_id for menu in db.scalars(select(Menu).where(Menu.store_id == store_id)).all()]
    group_ids = [
        group.group_id
        for group in db.scalars(select(OptionGroup).where(OptionGroup.store_id == store_id)).all()
    ]
    if group_ids:
        db.query(Option).filter(Option.store_id == store_id, Option.group_id.in_(group_ids)).delete(
            synchronize_session=False
        )
    if menu_ids:
        db.query(OptionGroup).filter(
            OptionGroup.store_id == store_id, OptionGroup.menu_id.in_(menu_ids)
        ).delete(synchronize_session=False)
        db.query(Menu).filter(Menu.store_id == store_id, Menu.menu_id.in_(menu_ids)).delete(
            synchronize_session=False
        )
    db.delete(store)
    db.commit()
    return response


@router.get("/stores/{store_id}/menus", response_model=list[MenuResponse])
def list_menus(
    store_id: str,
    menu_type: MenuType | None = Query(default=None, alias="type"),
    available: bool | None = None,
    db: Session = Depends(get_db),
) -> list[MenuResponse]:
    _get_store_or_404(db, store_id)
    query = select(Menu).where(Menu.store_id == store_id)
    if menu_type:
        query = query.where(Menu.type == menu_type)
    if available is not None:
        query = query.where(Menu.available == available)
    menus = db.scalars(query.order_by(Menu.sort_order, Menu.id)).all()
    return [_menu_response(db, menu) for menu in menus]


@router.post("/stores/{store_id}/menus", response_model=MenuResponse, status_code=status.HTTP_201_CREATED)
def create_menu(store_id: str, payload: MenuCreate, db: Session = Depends(get_db)) -> MenuResponse:
    _get_store_or_404(db, store_id)
    menu = Menu(
        store_id=store_id,
        menu_id=_next_menu_id(db, store_id),
        name=payload.name.strip(),
        type=payload.type,
        base_price=payload.basePrice,
        allergens_json=payload.allergens,
        quantity_min=payload.quantityRule.min,
        quantity_max=payload.quantityRule.max,
        quantity_default=payload.quantityRule.default,
        available=payload.available,
        sort_order=payload.sortOrder,
    )
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return _menu_response(db, menu)


@router.get("/stores/{store_id}/menus/{menu_id}", response_model=MenuResponse)
def get_menu(store_id: str, menu_id: str, db: Session = Depends(get_db)) -> MenuResponse:
    menu = _get_menu_or_404(db, store_id, menu_id)
    return _menu_response(db, menu)


@router.put("/stores/{store_id}/menus/{menu_id}", response_model=MenuResponse)
def update_menu(
    store_id: str,
    menu_id: str,
    payload: MenuUpdate,
    db: Session = Depends(get_db),
) -> MenuResponse:
    menu = _get_menu_or_404(db, store_id, menu_id)
    if payload.name is not None:
        menu.name = payload.name.strip()
    if payload.type is not None:
        menu.type = payload.type
    if payload.basePrice is not None:
        menu.base_price = payload.basePrice
    if payload.allergens is not None:
        menu.allergens_json = payload.allergens
    if payload.quantityRule is not None:
        menu.quantity_min = payload.quantityRule.min
        menu.quantity_max = payload.quantityRule.max
        menu.quantity_default = payload.quantityRule.default
    if payload.available is not None:
        menu.available = payload.available
    if payload.sortOrder is not None:
        menu.sort_order = payload.sortOrder
    db.commit()
    db.refresh(menu)
    return _menu_response(db, menu)


@router.delete("/stores/{store_id}/menus/{menu_id}", response_model=MenuResponse)
def delete_menu(store_id: str, menu_id: str, db: Session = Depends(get_db)) -> MenuResponse:
    menu = _get_menu_or_404(db, store_id, menu_id)
    menu.available = False
    db.commit()
    db.refresh(menu)
    return _menu_response(db, menu)


@router.post(
    "/stores/{store_id}/menus/{menu_id}/option-groups",
    response_model=OptionGroupResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_option_group(
    store_id: str,
    menu_id: str,
    payload: OptionGroupCreate,
    db: Session = Depends(get_db),
) -> OptionGroupResponse:
    menu = _get_menu_or_404(db, store_id, menu_id)
    if menu.type not in {MenuType.MAIN, MenuType.SET}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only MAIN or SET menus can have option groups.",
        )
    group = OptionGroup(
        store_id=store_id,
        menu_id=menu_id,
        group_id=_next_group_id(db, store_id, menu_id),
        group_name=payload.groupName.strip(),
        selection_type=payload.selectionType,
        required=payload.required,
        min_select=payload.minSelect,
        max_select=payload.maxSelect,
        sort_order=payload.sortOrder,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return _option_group_response(db, group)


@router.put(
    "/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}",
    response_model=OptionGroupResponse,
)
def update_option_group(
    store_id: str,
    menu_id: str,
    group_id: str,
    payload: OptionGroupUpdate,
    db: Session = Depends(get_db),
) -> OptionGroupResponse:
    group = _get_option_group_or_404(db, store_id, menu_id, group_id)
    next_required = group.required if payload.required is None else payload.required
    next_min = group.min_select if payload.minSelect is None else payload.minSelect
    next_max = group.max_select if payload.maxSelect is None else payload.maxSelect
    if next_max < next_min:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="maxSelect must be >= minSelect.")
    if next_required and next_min < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="required option group must have minSelect >= 1.",
        )

    if payload.groupName is not None:
        group.group_name = payload.groupName.strip()
    if payload.selectionType is not None:
        group.selection_type = payload.selectionType
    if payload.required is not None:
        group.required = payload.required
    if payload.minSelect is not None:
        group.min_select = payload.minSelect
    if payload.maxSelect is not None:
        group.max_select = payload.maxSelect
    if payload.available is not None:
        group.available = payload.available
    if payload.sortOrder is not None:
        group.sort_order = payload.sortOrder
    db.commit()
    db.refresh(group)
    return _option_group_response(db, group)


@router.delete(
    "/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}",
    response_model=OptionGroupResponse,
)
def delete_option_group(
    store_id: str,
    menu_id: str,
    group_id: str,
    db: Session = Depends(get_db),
) -> OptionGroupResponse:
    group = _get_option_group_or_404(db, store_id, menu_id, group_id)
    group.available = False
    db.commit()
    db.refresh(group)
    return _option_group_response(db, group)


@router.post(
    "/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options",
    response_model=OptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_option(
    store_id: str,
    menu_id: str,
    group_id: str,
    payload: OptionCreate,
    db: Session = Depends(get_db),
) -> OptionResponse:
    _get_option_group_or_404(db, store_id, menu_id, group_id)
    _validate_linked_menu(db, store_id, payload.linkedMenuId)
    option = Option(
        store_id=store_id,
        group_id=group_id,
        option_id=_next_option_id(db, store_id, group_id),
        name=payload.name.strip(),
        additional_price=payload.additionalPrice,
        effect=payload.effect,
        linked_menu_id=payload.linkedMenuId,
        default_selected=payload.defaultSelected,
        available=payload.available,
        sort_order=payload.sortOrder,
    )
    db.add(option)
    db.commit()
    db.refresh(option)
    return _option_response(db, option)


@router.put(
    "/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options/{option_id}",
    response_model=OptionResponse,
)
def update_option(
    store_id: str,
    menu_id: str,
    group_id: str,
    option_id: str,
    payload: OptionUpdate,
    db: Session = Depends(get_db),
) -> OptionResponse:
    _get_option_group_or_404(db, store_id, menu_id, group_id)
    option = _get_option_or_404(db, store_id, group_id, option_id)
    if payload.linkedMenuId is not None:
        _validate_linked_menu(db, store_id, payload.linkedMenuId)

    if payload.name is not None:
        option.name = payload.name.strip()
    if payload.additionalPrice is not None:
        option.additional_price = payload.additionalPrice
    if payload.effect is not None:
        option.effect = payload.effect
    if payload.linkedMenuId is not None:
        option.linked_menu_id = payload.linkedMenuId
    if payload.defaultSelected is not None:
        option.default_selected = payload.defaultSelected
    if payload.available is not None:
        option.available = payload.available
    if payload.sortOrder is not None:
        option.sort_order = payload.sortOrder
    db.commit()
    db.refresh(option)
    return _option_response(db, option)


@router.delete(
    "/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options/{option_id}",
    response_model=OptionResponse,
)
def delete_option(
    store_id: str,
    menu_id: str,
    group_id: str,
    option_id: str,
    db: Session = Depends(get_db),
) -> OptionResponse:
    _get_option_group_or_404(db, store_id, menu_id, group_id)
    option = _get_option_or_404(db, store_id, group_id, option_id)
    option.available = False
    db.commit()
    db.refresh(option)
    return _option_response(db, option)


@router.post(
    "/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/duplicate",
    response_model=OptionGroupResponse,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_option_group(
    store_id: str,
    menu_id: str,
    group_id: str,
    payload: DuplicateOptionGroupRequest,
    db: Session = Depends(get_db),
) -> OptionGroupResponse:
    source_group = _get_option_group_or_404(db, store_id, menu_id, group_id)
    target_menu = _get_menu_or_404(db, store_id, payload.targetMenuId)
    if target_menu.type not in {MenuType.MAIN, MenuType.SET}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only MAIN or SET menus can receive option groups.",
        )
    cloned_group = _clone_option_group(db, source_group, target_menu.menu_id)
    db.commit()
    db.refresh(cloned_group)
    return _option_group_response(db, cloned_group)


@router.post(
    "/stores/{store_id}/menus/{source_menu_id}/option-groups/duplicate-to/{target_menu_id}",
    response_model=MenuResponse,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_menu_option_groups(
    store_id: str,
    source_menu_id: str,
    target_menu_id: str,
    db: Session = Depends(get_db),
) -> MenuResponse:
    _get_menu_or_404(db, store_id, source_menu_id)
    target_menu = _get_menu_or_404(db, store_id, target_menu_id)
    if source_menu_id == target_menu_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target menu must be different from source menu.",
        )
    if target_menu.type not in {MenuType.MAIN, MenuType.SET}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only MAIN or SET menus can receive option groups.",
        )

    source_groups = db.scalars(
        select(OptionGroup)
        .where(
            OptionGroup.store_id == store_id,
            OptionGroup.menu_id == source_menu_id,
            OptionGroup.available.is_(True),
        )
        .order_by(OptionGroup.sort_order, OptionGroup.id)
    ).all()
    for source_group in source_groups:
        _clone_option_group(db, source_group, target_menu_id)

    db.commit()
    db.refresh(target_menu)
    return _menu_response(db, target_menu)


@router.get("/catalog/export", response_model=CatalogExportResponse)
def export_catalog(db: Session = Depends(get_db)) -> CatalogExportResponse:
    stores = db.scalars(select(Store).order_by(Store.id)).all()
    menus = db.scalars(select(Menu).order_by(Menu.store_id, Menu.sort_order, Menu.id)).all()
    groups = db.scalars(select(OptionGroup).order_by(OptionGroup.menu_id, OptionGroup.sort_order)).all()
    options = db.scalars(select(Option).order_by(Option.group_id, Option.sort_order)).all()
    return CatalogExportResponse(
        stores=[
            CatalogExportStore(
                **_store_response(store).model_dump(),
                menus=[
                    _menu_response(db, menu)
                    for menu in db.scalars(
                        select(Menu).where(Menu.store_id == store.store_id).order_by(Menu.sort_order, Menu.id)
                    ).all()
                ],
            )
            for store in stores
        ],
        menus=[_menu_response(db, menu) for menu in menus],
        optionGroups=[_option_group_response(db, group) for group in groups],
        options=[_option_response(db, option) for option in options],
    )


@router.post("/catalog/import", response_model=CatalogExportResponse)
def import_catalog(
    payload: dict,
    mode: str = Query(default="merge", pattern="^(merge|replace)$"),
    db: Session = Depends(get_db),
) -> CatalogExportResponse:
    if _is_flat_catalog_payload(payload):
        imported = _import_flat_catalog(db, payload, mode)
        db.commit()
        response = export_catalog(db)
        response.imported = imported
        return response

    import_payload = CatalogImportRequest.model_validate(payload)
    if mode == "replace":
        db.query(Option).delete()
        db.query(OptionGroup).delete()
        db.query(Menu).delete()
        db.query(Store).delete()
        db.flush()

    for store_payload in import_payload.stores:
        _upsert_import_store(db, store_payload)

    db.commit()
    response = export_catalog(db)
    response.imported = _count_imported_items(import_payload)
    return response


def _get_store_or_404(db: Session, store_id: str) -> Store:
    store = db.scalar(select(Store).where(Store.store_id == store_id))
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found.")
    return store


def _get_menu_or_404(db: Session, store_id: str, menu_id: str) -> Menu:
    menu = db.scalar(select(Menu).where(Menu.store_id == store_id, Menu.menu_id == menu_id))
    if not menu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu not found.")
    return menu


def _get_option_group_or_404(db: Session, store_id: str, menu_id: str, group_id: str) -> OptionGroup:
    group = db.scalar(
        select(OptionGroup).where(
            OptionGroup.store_id == store_id,
            OptionGroup.menu_id == menu_id,
            OptionGroup.group_id == group_id,
        )
    )
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option group not found.")
    return group


def _get_option_or_404(db: Session, store_id: str, group_id: str, option_id: str) -> Option:
    option = db.scalar(
        select(Option).where(
            Option.store_id == store_id,
            Option.group_id == group_id,
            Option.option_id == option_id,
        )
    )
    if not option:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found.")
    return option


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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="linkedMenuId must reference an available menu in the same store.",
        )


def _clone_option_group(db: Session, source_group: OptionGroup, target_menu_id: str) -> OptionGroup:
    cloned_group = OptionGroup(
        store_id=source_group.store_id,
        menu_id=target_menu_id,
        group_id=_next_group_id(db, source_group.store_id, target_menu_id),
        group_name=source_group.group_name,
        selection_type=source_group.selection_type,
        required=source_group.required,
        min_select=source_group.min_select,
        max_select=source_group.max_select,
        available=source_group.available,
        sort_order=source_group.sort_order,
    )
    db.add(cloned_group)
    source_options = db.scalars(
        select(Option)
        .where(
            Option.store_id == source_group.store_id,
            Option.group_id == source_group.group_id,
            Option.available.is_(True),
        )
        .order_by(Option.sort_order, Option.id)
    ).all()
    for source_option in source_options:
        db.add(
            Option(
                store_id=source_option.store_id,
                group_id=cloned_group.group_id,
                option_id=_next_option_id(db, source_option.store_id, cloned_group.group_id),
                name=source_option.name,
                additional_price=source_option.additional_price,
                effect=source_option.effect,
                linked_menu_id=source_option.linked_menu_id,
                default_selected=source_option.default_selected,
                available=source_option.available,
                sort_order=source_option.sort_order,
            )
        )
    return cloned_group


def _upsert_import_store(db: Session, payload: CatalogImportStore) -> Store:
    store_id = payload.storeId or _next_store_id(db)
    store = db.scalar(select(Store).where(Store.store_id == store_id))
    if store:
        store.store_name = payload.storeName.strip()
        store.platform = payload.platform
        store.available = payload.available
    else:
        store = Store(
            store_id=store_id,
            store_name=payload.storeName.strip(),
            platform=payload.platform,
            available=payload.available,
        )
        db.add(store)
    db.flush()

    for menu_payload in payload.menus:
        menu_id = menu_payload.menuId or _next_menu_id(db, store_id)
        menu = db.scalar(select(Menu).where(Menu.store_id == store_id, Menu.menu_id == menu_id))
        if menu:
            menu.name = menu_payload.name.strip()
            menu.type = menu_payload.type
            menu.base_price = menu_payload.basePrice
            menu.allergens_json = menu_payload.allergens
            menu.quantity_min = menu_payload.quantityRule.min
            menu.quantity_max = menu_payload.quantityRule.max
            menu.quantity_default = menu_payload.quantityRule.default
            menu.available = menu_payload.available
            menu.sort_order = menu_payload.sortOrder
        else:
            menu = Menu(
                store_id=store_id,
                menu_id=menu_id,
                name=menu_payload.name.strip(),
                type=menu_payload.type,
                base_price=menu_payload.basePrice,
                allergens_json=menu_payload.allergens,
                quantity_min=menu_payload.quantityRule.min,
                quantity_max=menu_payload.quantityRule.max,
                quantity_default=menu_payload.quantityRule.default,
                available=menu_payload.available,
                sort_order=menu_payload.sortOrder,
            )
            db.add(menu)
        db.flush()

        for group_payload in menu_payload.optionGroups:
            group_id = group_payload.groupId or _next_group_id(db, store_id, menu_id)
            group = db.scalar(
                select(OptionGroup).where(
                    OptionGroup.store_id == store_id,
                    OptionGroup.menu_id == menu_id,
                    OptionGroup.group_id == group_id,
                )
            )
            if group:
                group.group_name = group_payload.groupName.strip()
                group.selection_type = group_payload.selectionType
                group.required = group_payload.required
                group.min_select = group_payload.minSelect
                group.max_select = group_payload.maxSelect
                group.available = group_payload.available
                group.sort_order = group_payload.sortOrder
            else:
                group = OptionGroup(
                    store_id=store_id,
                    menu_id=menu_id,
                    group_id=group_id,
                    group_name=group_payload.groupName.strip(),
                    selection_type=group_payload.selectionType,
                    required=group_payload.required,
                    min_select=group_payload.minSelect,
                    max_select=group_payload.maxSelect,
                    available=group_payload.available,
                    sort_order=group_payload.sortOrder,
                )
                db.add(group)
            db.flush()

            for option_payload in group_payload.options:
                option_id = option_payload.optionId or _next_option_id(db, store_id, group_id)
                option = db.scalar(
                    select(Option).where(
                        Option.store_id == store_id,
                        Option.group_id == group_id,
                        Option.option_id == option_id,
                    )
                )
                if option:
                    option.name = option_payload.name.strip()
                    option.additional_price = option_payload.additionalPrice
                    option.effect = option_payload.effect
                    option.linked_menu_id = option_payload.linkedMenuId
                    option.default_selected = option_payload.defaultSelected
                    option.available = option_payload.available
                    option.sort_order = option_payload.sortOrder
                else:
                    db.add(
                        Option(
                            store_id=store_id,
                            group_id=group_id,
                            option_id=option_id,
                            name=option_payload.name.strip(),
                            additional_price=option_payload.additionalPrice,
                            effect=option_payload.effect,
                            linked_menu_id=option_payload.linkedMenuId,
                            default_selected=option_payload.defaultSelected,
                            available=option_payload.available,
                            sort_order=option_payload.sortOrder,
                        )
                    )
    return store


def _store_response(store: Store) -> StoreResponse:
    return StoreResponse(
        id=store.store_id,
        name=store.store_name,
        isActive=store.available,
        createdAt=_iso(store.created_at),
        updatedAt=_iso(store.updated_at),
        storeId=store.store_id,
        storeName=store.store_name,
        platform=store.platform,
        available=store.available,
    )


def _menu_response(db: Session, menu: Menu) -> MenuResponse:
    groups = db.scalars(
        select(OptionGroup)
        .where(OptionGroup.store_id == menu.store_id, OptionGroup.menu_id == menu.menu_id)
        .order_by(OptionGroup.sort_order, OptionGroup.id)
    ).all()
    return MenuResponse(
        id=menu.menu_id,
        storeId=menu.store_id,
        isAvailable=menu.available,
        createdAt=_iso(menu.created_at),
        updatedAt=_iso(menu.updated_at),
        menuId=menu.menu_id,
        name=menu.name,
        type=menu.type,
        basePrice=menu.base_price,
        allergens=_allergens_from_json(menu.allergens_json),
        quantityRule=QuantityRule(
            min=menu.quantity_min,
            max=menu.quantity_max,
            default=menu.quantity_default,
        ),
        optionGroups=[_option_group_response(db, group) for group in groups],
        available=menu.available,
        sortOrder=menu.sort_order,
    )


def _option_group_response(db: Session, group: OptionGroup) -> OptionGroupResponse:
    options = db.scalars(
        select(Option)
        .where(Option.store_id == group.store_id, Option.group_id == group.group_id)
        .order_by(Option.sort_order, Option.id)
    ).all()
    return OptionGroupResponse(
        id=group.group_id,
        menuId=group.menu_id,
        groupId=group.group_id,
        name=group.group_name,
        groupName=group.group_name,
        selectionType=group.selection_type,
        isRequired=group.required,
        required=group.required,
        minSelect=group.min_select,
        maxSelect=group.max_select,
        options=[_option_response(db, option) for option in options],
        isAvailable=group.available,
        available=group.available,
        sortOrder=group.sort_order,
        createdAt=_iso(group.created_at),
        updatedAt=_iso(group.updated_at),
    )


def _option_response(db: Session, option: Option) -> OptionResponse:
    linked_menu_name = None
    if option.linked_menu_id:
        linked_menu = db.scalar(
            select(Menu).where(Menu.store_id == option.store_id, Menu.menu_id == option.linked_menu_id)
        )
        linked_menu_name = linked_menu.name if linked_menu else None
    return OptionResponse(
        id=option.option_id,
        optionGroupId=option.group_id,
        optionId=option.option_id,
        name=option.name,
        additionalPrice=option.additional_price,
        effect=option.effect,
        linkedMenuId=option.linked_menu_id,
        linkedMenuName=linked_menu_name,
        isDefaultSelected=option.default_selected,
        defaultSelected=option.default_selected,
        isAvailable=option.available,
        available=option.available,
        sortOrder=option.sort_order,
        createdAt=_iso(option.created_at),
        updatedAt=_iso(option.updated_at),
    )


def _iso(value) -> str:
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _allergens_from_json(value) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, dict):
        normalized = value.get("normalizedAllergens")
        if isinstance(normalized, list):
            return [str(item) for item in normalized]
    return []


def _count_imported_items(payload: CatalogImportRequest) -> int:
    count = 0
    for store in payload.stores:
        count += 1
        for menu in store.menus:
            count += 1
            for group in menu.optionGroups:
                count += 1 + len(group.options)
    return count


def _is_flat_catalog_payload(payload: dict) -> bool:
    return any(key in payload for key in ("menus", "optionGroups", "options")) or any(
        isinstance(store, dict) and "id" in store for store in payload.get("stores", [])
    )


def _import_flat_catalog(db: Session, payload: dict, mode: str) -> int:
    if mode == "replace":
        db.query(Option).delete()
        db.query(OptionGroup).delete()
        db.query(Menu).delete()
        db.query(Store).delete()
        db.flush()

    imported = 0
    for item in payload.get("stores", []):
        store_id = item.get("id") or item.get("storeId")
        name = item.get("name") or item.get("storeName")
        if not store_id or not name:
            continue
        store = db.scalar(select(Store).where(Store.store_id == store_id))
        if store and mode == "merge":
            continue
        if not store:
            store = Store(store_id=store_id, store_name=name)
            db.add(store)
        store.store_name = name
        store.available = bool(item.get("isActive", item.get("available", True)))
        imported += 1
    db.flush()

    for item in payload.get("menus", []):
        menu_id = item.get("id") or item.get("menuId")
        store_id = item.get("storeId")
        if not menu_id or not store_id:
            continue
        menu = db.scalar(select(Menu).where(Menu.store_id == store_id, Menu.menu_id == menu_id))
        if menu and mode == "merge":
            continue
        if not menu:
            menu = Menu(store_id=store_id, menu_id=menu_id)
            db.add(menu)
        menu.name = item.get("name", "")
        menu.type = MenuType(item.get("type", "MAIN"))
        menu.base_price = int(item.get("basePrice", 0))
        menu.allergens_json = _allergens_to_json(item.get("allergens") or [])
        menu.available = bool(item.get("isAvailable", item.get("available", True)))
        menu.sort_order = int(item.get("sortOrder", 0))
        imported += 1
    db.flush()

    for item in payload.get("optionGroups", []):
        group_id = item.get("id") or item.get("groupId")
        menu_id = item.get("menuId")
        menu = db.scalar(select(Menu).where(Menu.menu_id == menu_id)) if menu_id else None
        if not group_id or not menu:
            continue
        group = db.scalar(
            select(OptionGroup).where(
                OptionGroup.store_id == menu.store_id,
                OptionGroup.menu_id == menu.menu_id,
                OptionGroup.group_id == group_id,
            )
        )
        if group and mode == "merge":
            continue
        if not group:
            group = OptionGroup(store_id=menu.store_id, menu_id=menu.menu_id, group_id=group_id)
            db.add(group)
        group.group_name = item.get("name") or item.get("groupName", "")
        group.selection_type = OptionSelectionType(item.get("selectionType", "RADIO"))
        group.required = bool(item.get("isRequired", item.get("required", False)))
        group.min_select = int(item.get("minSelect", 0))
        group.max_select = int(item.get("maxSelect", 1))
        group.available = bool(item.get("isAvailable", item.get("available", True)))
        group.sort_order = int(item.get("sortOrder", 0))
        imported += 1
    db.flush()

    for item in payload.get("options", []):
        option_id = item.get("id") or item.get("optionId")
        group_id = item.get("optionGroupId") or item.get("groupId")
        group = db.scalar(select(OptionGroup).where(OptionGroup.group_id == group_id)) if group_id else None
        if not option_id or not group:
            continue
        option = db.scalar(
            select(Option).where(
                Option.store_id == group.store_id,
                Option.group_id == group.group_id,
                Option.option_id == option_id,
            )
        )
        if option and mode == "merge":
            continue
        if not option:
            option = Option(store_id=group.store_id, group_id=group.group_id, option_id=option_id)
            db.add(option)
        option.name = item.get("name", "")
        option.effect = OptionEffect(item.get("effect", "NONE"))
        option.additional_price = int(item.get("additionalPrice", 0))
        option.linked_menu_id = item.get("linkedMenuId")
        option.default_selected = bool(item.get("isDefaultSelected", item.get("defaultSelected", False)))
        option.available = bool(item.get("isAvailable", item.get("available", True)))
        option.sort_order = int(item.get("sortOrder", 0))
        imported += 1
    return imported


def _allergens_to_json(allergens: list[str]) -> dict[str, object]:
    return {
        "rawText": ", ".join(allergens),
        "normalizedAllergens": allergens,
        "parseStatus": "MANUAL",
    }


def _next_store_id(db: Session) -> str:
    return _next_prefixed_id(db, Store, Store.store_id, "STORE")


def _next_menu_id(db: Session, store_id: str) -> str:
    return _next_prefixed_id(db, Menu, Menu.menu_id, "MENU", Menu.store_id == store_id)


def _next_group_id(db: Session, store_id: str, menu_id: str) -> str:
    return _next_prefixed_id(db, OptionGroup, OptionGroup.group_id, "GROUP", OptionGroup.store_id == store_id)


def _next_option_id(db: Session, store_id: str, group_id: str) -> str:
    return _next_prefixed_id(db, Option, Option.option_id, "OPTION", Option.store_id == store_id)


def _next_prefixed_id(db: Session, model, column, prefix: str, *filters) -> str:
    count_query = select(func.count()).select_from(model)
    for filter_ in filters:
        count_query = count_query.where(filter_)
    next_number = db.scalar(count_query) + 1
    while True:
        candidate = f"{prefix}_{next_number:03d}"
        exists_query = select(column).where(column == candidate)
        for filter_ in filters:
            exists_query = exists_query.where(filter_)
        if not db.scalar(exists_query):
            return candidate
        next_number += 1
