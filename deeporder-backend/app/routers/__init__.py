from fastapi import APIRouter

from app.routers.admin_users import router as admin_users_router
from app.routers.address import router as address_router
from app.routers.auth import router as auth_router
from app.routers.kds_my_tasks import router as kds_my_tasks_router
from app.routers.kds_orders import router as kds_orders_router
from app.routers.kds_staff import router as kds_staff_router
from app.routers.kds_store import router as kds_store_router
from app.routers.order_status import router as order_status_router
from app.routers.order_webhooks import router as order_webhooks_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(admin_users_router)
router.include_router(address_router)
router.include_router(order_webhooks_router)
router.include_router(kds_orders_router)
router.include_router(kds_store_router)
router.include_router(kds_my_tasks_router)
router.include_router(kds_staff_router)
router.include_router(order_status_router)

__all__ = ["router"]
