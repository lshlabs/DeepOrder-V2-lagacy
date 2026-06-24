from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_approved_kds_user
from app.database import get_db
from app.models import Order, OrderStatus, User
from app.schemas import OrderStatusResponse, UpdateOrderStatusIn

router = APIRouter()


@router.patch("/api/orders/{order_id}/status", response_model=OrderStatusResponse)
def update_order_status(
    order_id: int,
    payload: UpdateOrderStatusIn,
    current_user: User = Depends(get_approved_kds_user),
    db: Session = Depends(get_db),
) -> OrderStatusResponse:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if order.store_id != current_user.store_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden store access.")

    order.status = OrderStatus(payload.status)
    db.commit()
    db.refresh(order)
    return OrderStatusResponse(id=order.id, status=order.status)
