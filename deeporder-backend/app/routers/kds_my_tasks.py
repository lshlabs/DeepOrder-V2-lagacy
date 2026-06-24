from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_approved_kds_user
from app.database import get_db
from app.models import User, UserAssignedMenu
from app.schemas import AssignedMenuListOut, AssignedMenuOut, CreateAssignedMenuIn, UpdateAssignedMenuIn

router = APIRouter()


@router.get("/api/kds/my-tasks/menus", response_model=AssignedMenuListOut)
def list_assigned_menus(
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> AssignedMenuListOut:
    menus = db.scalars(
        select(UserAssignedMenu)
        .where(
            UserAssignedMenu.store_id == current_user.store_id,
            UserAssignedMenu.user_id == current_user.id,
        )
        .order_by(UserAssignedMenu.sort_order.asc(), UserAssignedMenu.created_at.asc(), UserAssignedMenu.id.asc())
    ).all()
    return AssignedMenuListOut(menus=[_to_menu_out(menu) for menu in menus])


@router.post("/api/kds/my-tasks/menus", status_code=status.HTTP_201_CREATED)
def create_assigned_menu(
    payload: CreateAssignedMenuIn,
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> Response:
    menu_name = payload.menuName.strip()
    normalized = _normalize_menu_name(menu_name)
    existing_menu = db.scalar(
        select(UserAssignedMenu).where(
            UserAssignedMenu.store_id == current_user.store_id,
            UserAssignedMenu.user_id == current_user.id,
            UserAssignedMenu.normalized_menu_name == normalized,
        )
    )
    if existing_menu is not None:
        return Response(status_code=status.HTTP_200_OK)

    menu = UserAssignedMenu(
        store_id=current_user.store_id,
        user_id=current_user.id,
        menu_name=menu_name,
        normalized_menu_name=normalized,
        sort_order=payload.sortOrder if payload.sortOrder is not None else _next_sort_order(db, current_user),
    )
    db.add(menu)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 등록된 담당 메뉴입니다.") from exc
    return Response(status_code=status.HTTP_201_CREATED)


@router.patch("/api/kds/my-tasks/menus/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
def update_assigned_menu(
    menu_id: int,
    payload: UpdateAssignedMenuIn,
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> Response:
    menu = _get_owned_menu(db, current_user, menu_id)
    menu.menu_name = payload.menuName.strip()
    menu.normalized_menu_name = _normalize_menu_name(menu.menu_name)
    if payload.sortOrder is not None:
        menu.sort_order = payload.sortOrder
    db.add(menu)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 등록된 담당 메뉴입니다.") from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/api/kds/my-tasks/menus/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assigned_menu(
    menu_id: int,
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> Response:
    menu = _get_owned_menu(db, current_user, menu_id)
    db.delete(menu)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _get_owned_menu(db: Session, current_user: User, menu_id: int) -> UserAssignedMenu:
    menu = db.scalar(
        select(UserAssignedMenu).where(
            UserAssignedMenu.id == menu_id,
            UserAssignedMenu.store_id == current_user.store_id,
            UserAssignedMenu.user_id == current_user.id,
        )
    )
    if menu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned menu not found.")
    return menu


def _next_sort_order(db: Session, current_user: User) -> int:
    menus = db.scalars(
        select(UserAssignedMenu.sort_order).where(
            UserAssignedMenu.store_id == current_user.store_id,
            UserAssignedMenu.user_id == current_user.id,
        )
    ).all()
    return (max(menus) + 1) if menus else 0


def _normalize_menu_name(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _to_menu_out(menu: UserAssignedMenu) -> AssignedMenuOut:
    return AssignedMenuOut(
        id=menu.id,
        menuName=menu.menu_name,
        normalizedMenuName=menu.normalized_menu_name,
        sortOrder=menu.sort_order,
    )


__all__ = ["router"]
