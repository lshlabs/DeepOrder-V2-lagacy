from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.console import router as console_router
from app.database import create_db_and_tables
from app.mock_orders import router as mock_orders_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    create_db_and_tables()
    yield


app = FastAPI(title="Mock Delivery API", version="0.1.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(console_router)
app.include_router(mock_orders_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "mock-delivery-api"}
