from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.adapters import get_adapter
from app.database import get_db
from app.schemas import WebhookResponse
from app.services.ai_request_analyzer import analyze_order_request
from app.services.order_ingestion import ingest_order_event

router = APIRouter()


@router.post("/api/external/orders/webhook", response_model=WebhookResponse)
async def receive_order_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> WebhookResponse:
    raw_body = await request.body()
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Webhook payload must be a JSON object.",
        )

    headers = _extract_headers(request)
    adapter = get_adapter(headers, body)
    adapter.validate_signature(headers, raw_body, body)
    normalized_event = adapter.parse_event(headers, body)
    result = ingest_order_event(db=db, event=normalized_event)
    if result.enqueue_ai and result.order_id_for_ai is not None:
        background_tasks.add_task(analyze_order_request, result.order_id_for_ai)
    return result.response


def _extract_headers(request: Request) -> dict[str, Any]:
    return dict(request.headers.items())
