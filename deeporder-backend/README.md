# DeepOrder Backend

FastAPI service for receiving external order webhooks, storing normalized orders, and serving KDS APIs.

## Initial Scope

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{user_id}/approval`
- `POST /api/external/orders/webhook`
- eventId idempotency
- order and order item persistence
- background AI request analysis with keyword fallback
- `GET /api/kds/orders`
- `PATCH /api/orders/{order_id}/status`

## Local Run

```bash
cd deeporder-backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

## Environment

```bash
DEEPORDER_DATABASE_URL=sqlite:///./deeporder.db
DEEPORDER_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
DEEPORDER_JWT_SECRET_KEY=your_jwt_secret_here
DEEPORDER_ACCESS_TOKEN_EXPIRE_MINUTES=120
DEEPORDER_REFRESH_TOKEN_EXPIRE_DAYS=14
DEEPORDER_ADMIN_TOKEN=your_admin_token_here
JUSO_CONFIRM_KEY=your_juso_confirm_key_here
JUSO_RETURN_URL=http://127.0.0.1:8000/api/address/juso-callback
```

## Auth / Admin Notes

- KDS 주문 조회는 `Authorization: Bearer <accessToken>`이 필요합니다.
- access token 만료 시 `POST /api/auth/refresh`로 새 access token을 발급합니다.
- `POST /api/auth/logout`은 refresh token을 revoke 합니다.
- `POST /api/auth/login`의 `autoLogin=true`는 장기 refresh token 만료를 사용하고, 미체크 시 세션형 refresh token 만료를 사용합니다.
- 관리자 승인 API는 `X-Admin-Token` 헤더 기반으로 보호됩니다.
- `GET /api/kds/orders?storeId=...` 방식은 제거됐고, 현재 사용자의 `store_id` 기준으로만 조회합니다.

## Sample Webhook

```json
{
  "eventId": "evt_001",
  "eventType": "ORDER_CREATED",
  "platform": "MOCK_DELIVERY",
  "storeId": "STORE_001",
  "order": {
    "orderId": "mock_order_001",
    "orderNumber": "A-001",
    "customerRequest": "양상추는 빼주세요.",
    "deliveryRequest": "문 앞에 놓아주세요.",
    "items": [
      {
        "name": "제육덮밥",
        "quantity": 1,
        "options": ["덜 맵게"],
        "unitPrice": 9000,
        "totalPrice": 9000
      }
    ]
  }
}
```

## AI Request Analyzer

Order intake does not depend on AI success. After an `ORDER_CREATED` webhook is stored, the backend creates a pending `order_ai_analysis` row and analyzes request text in a background task.

The default provider is Gemini. If `DEEPORDER_AI_PROVIDER=gemini` and `DEEPORDER_GEMINI_API_KEY` are configured, the service calls Gemini with the configured model. If the provider is not configured or the call fails, the backend stores a keyword-based fallback analysis.

```bash
DEEPORDER_AI_PROVIDER=gemini
DEEPORDER_GEMINI_API_KEY=
DEEPORDER_GEMINI_MODEL=gemini-2.5-flash-lite
DEEPORDER_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
DEEPORDER_OPENAI_API_KEY=
DEEPORDER_OPENAI_MODEL=
DEEPORDER_OPENAI_BASE_URL=https://api.openai.com/v1
```

Set `DEEPORDER_AI_PROVIDER=openai` to use the optional OpenAI-compatible provider. Model changes do not require code changes; update the relevant model environment variable.

KDS order responses include `aiAnalysis`.
