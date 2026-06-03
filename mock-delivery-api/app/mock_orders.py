import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import MockOrder, MockWebhookLog, MockWebhookLogStatus
from app.sample_orders import create_sample_order_payload
from app.schemas import (
    MockOrderPayload,
    MockWebhookLogOut,
    MockWebhookLogsResponse,
    SampleOrderRequest,
    SampleOrderResponse,
    SendOrderRequest,
    SendOrderResponse,
)

router = APIRouter()


@router.post("/api/mock/orders/sample", response_model=SampleOrderResponse)
def create_sample_order(
    payload: SampleOrderRequest | None = None,
    db: Session = Depends(get_db),
) -> SampleOrderResponse:
    store_id = payload.storeId if payload else "STORE_001"
    order_payload = create_sample_order_payload(store_id=store_id)
    mock_order = MockOrder(
        event_id=order_payload.eventId,
        order_id=order_payload.order.orderId,
        order_number=order_payload.order.orderNumber,
        store_id=order_payload.storeId,
        payload=order_payload.model_dump(mode="json"),
    )
    db.add(mock_order)
    db.commit()
    db.refresh(mock_order)
    return SampleOrderResponse(generatedOrderId=mock_order.id, payload=order_payload)


@router.post("/api/mock/orders/send", response_model=SendOrderResponse)
def send_order_to_deeporder(
    request: SendOrderRequest | None = None,
    db: Session = Depends(get_db),
) -> SendOrderResponse:
    request = request or SendOrderRequest()
    order_payload = _resolve_order_payload(request=request, db=db)
    settings = get_settings()
    webhook_url = request.webhookUrl or str(settings.deeporder_webhook_url)

    http_status_code: int | None = None
    response_body: str | None = None
    error_message: str | None = None
    success = False

    try:
        response = httpx.post(
            webhook_url,
            json=order_payload.model_dump(mode="json"),
            timeout=10.0,
        )
        http_status_code = response.status_code
        response_body = response.text
        success = 200 <= response.status_code < 300
    except httpx.HTTPError as exc:
        error_message = str(exc)

    log = MockWebhookLog(
        event_id=order_payload.eventId,
        order_id=order_payload.order.orderId,
        webhook_url=webhook_url,
        status=MockWebhookLogStatus.SUCCESS if success else MockWebhookLogStatus.FAILED,
        success=success,
        http_status_code=http_status_code,
        response_body=response_body,
        error_message=error_message,
        request_payload=order_payload.model_dump(mode="json"),
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return SendOrderResponse(
        logId=log.id,
        success=log.success,
        status=log.status,
        httpStatusCode=log.http_status_code,
        responseBody=log.response_body,
        errorMessage=log.error_message,
        payload=order_payload,
    )


@router.get("/api/mock/webhook-logs", response_model=MockWebhookLogsResponse)
def list_webhook_logs(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> MockWebhookLogsResponse:
    logs = db.scalars(
        select(MockWebhookLog).order_by(MockWebhookLog.created_at.desc(), MockWebhookLog.id.desc()).limit(limit)
    ).all()
    return MockWebhookLogsResponse(logs=[MockWebhookLogOut.model_validate(log) for log in logs])


def _resolve_order_payload(request: SendOrderRequest, db: Session) -> MockOrderPayload:
    if request.payload:
        return request.payload

    if request.generatedOrderId:
        mock_order = db.get(MockOrder, request.generatedOrderId)
        if not mock_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Generated mock order not found.",
            )
        return MockOrderPayload.model_validate(mock_order.payload)

    latest_order = db.scalar(select(MockOrder).order_by(MockOrder.created_at.desc(), MockOrder.id.desc()))
    if latest_order:
        return MockOrderPayload.model_validate(latest_order.payload)

    order_payload = create_sample_order_payload(store_id="STORE_001")
    mock_order = MockOrder(
        event_id=order_payload.eventId,
        order_id=order_payload.order.orderId,
        order_number=order_payload.order.orderNumber,
        store_id=order_payload.storeId,
        payload=order_payload.model_dump(mode="json"),
    )
    db.add(mock_order)
    db.commit()
    db.refresh(mock_order)
    return order_payload

