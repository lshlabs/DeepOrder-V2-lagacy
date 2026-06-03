from datetime import UTC, datetime
from uuid import uuid4

from app.schemas import MockOrderBody, MockOrderItem, MockOrderPayload


def create_sample_order_payload(store_id: str) -> MockOrderPayload:
    order_uuid = uuid4().hex[:10].upper()
    event_uuid = uuid4().hex

    return MockOrderPayload(
        eventId=f"mock_evt_{event_uuid}",
        eventType="ORDER_CREATED",
        platform="MOCK_DELIVERY",
        storeId=store_id,
        order=MockOrderBody(
            orderId=f"mock_order_{order_uuid}",
            orderNumber=f"M-{order_uuid[:6]}",
            customerRequest="양상추는 빼주시고 제육은 덜 맵게 부탁드려요.",
            deliveryRequest="문 앞에 놓고 벨은 누르지 말아주세요.",
            orderedAt=datetime.now(UTC),
            items=[
                MockOrderItem(
                    name="제육덮밥",
                    quantity=1,
                    options=["덜 맵게", "양상추 제외"],
                    unitPrice=9000,
                    totalPrice=9000,
                ),
                MockOrderItem(
                    name="콜라",
                    quantity=1,
                    options=[],
                    unitPrice=2000,
                    totalPrice=2000,
                ),
            ],
        ),
    )

