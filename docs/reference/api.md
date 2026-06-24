# API Notes

This file will collect endpoint contracts as each step is implemented.

## DeepOrder Backend

- `GET /health`
- `POST /api/external/orders/webhook`
- `GET /api/kds/orders?storeId=STORE_FLAT`
- `PATCH /api/orders/{order_id}/status`

### `POST /api/external/orders/webhook`

Receives external order events from a delivery platform adapter.

Supported event types:

- `ORDER_CREATED`
- `ORDER_CANCELLED`

Idempotency:

- `eventId` is stored in `webhook_events`.
- If the same `eventId` is received again, the API returns `DUPLICATE_EVENT` and does not create another order.

### `GET /api/kds/orders`

Returns normalized orders for a store.

Required query:

- `storeId`

Each order includes `aiAnalysis` when an analysis row exists. Analysis can be `PENDING`, `COMPLETED`, `FALLBACK`, or `FAILED`.

AI provider configuration is environment-driven. The default is Gemini:

```text
DEEPORDER_AI_PROVIDER=gemini
DEEPORDER_GEMINI_MODEL=gemini-2.5-flash-lite
```

If Gemini is not configured or fails, `analysisStatus` is stored as `FALLBACK` with keyword-based analysis.

Example `aiAnalysis` shape:

```json
{
  "summary": "알레르기: 견과류 / 제외: 양상추",
  "tags": ["알레르기위험", "재료제외"],
  "cookingNotes": ["알레르기: 견과류", "제외: 양상추"],
  "packingNotes": [],
  "deliveryNotes": [],
  "kitchenActions": [
    {
      "type": "ALLERGY",
      "label": "알레르기",
      "target": "견과류",
      "displayText": "알레르기: 견과류",
      "severity": "HIGH",
      "requiresHumanCheck": true,
      "source": "CUSTOMER_REQUEST",
      "sourceText": "견과류 알레르기 있어요",
      "matchedMenuItemIds": []
    },
    {
      "type": "EXCLUDE_INGREDIENT",
      "label": "제외",
      "target": "양상추",
      "displayText": "제외: 양상추",
      "severity": "MEDIUM",
      "requiresHumanCheck": true,
      "source": "CUSTOMER_REQUEST",
      "sourceText": "양상추는 빼주시고",
      "matchedMenuItemIds": []
    }
  ],
  "packingActions": [],
  "ignoredRequests": [{"type": "DELIVERY", "text": "문 앞에 놓아주세요"}],
  "riskLevel": "HIGH",
  "warnings": [],
  "needsHumanCheck": true,
  "analysisStatus": "FALLBACK"
}
```

### `PATCH /api/orders/{order_id}/status`

Updates an order status.

Supported statuses:

- `NEW`
- `COOKING`
- `DONE`
- `CANCELLED`

## Mock Delivery API

- `GET /health`
- `GET /console`
- `GET /api/mock/stores`
- `POST /api/mock/stores`
- `GET /api/mock/stores/{store_id}/menus`
- `POST /api/mock/stores/{store_id}/menus`
- `GET /api/mock/stores/{store_id}/menus/{menu_id}`
- `PUT /api/mock/stores/{store_id}/menus/{menu_id}`
- `DELETE /api/mock/stores/{store_id}/menus/{menu_id}`
- `POST /api/mock/stores/{store_id}/menus/{menu_id}/option-groups`
- `PUT /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}`
- `DELETE /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}`
- `POST /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options`
- `PUT /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options/{option_id}`
- `DELETE /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options/{option_id}`
- `POST /api/mock/orders/sample`
- `POST /api/mock/orders/send`
- `GET /api/mock/webhook-logs`

### `GET /console`

Serves the browser-based Mock Delivery Console.

The console supports:

- sample order creation
- sending the generated order to DeepOrder Backend
- generated payload preview
- recent webhook send logs

### Catalog APIs

Step 7-1 adds catalog APIs for Store/Menu/OptionGroup/Option data.

Key rules:

- `MAIN` and `SET` menus can have option groups.
- `SIDE` and `DRINK` menus cannot have option groups.
- `linkedMenuId` must reference an available menu in the same store.
- Delete operations mark resources as `available=false`.

Create store:

```json
{
  "storeName": "테스트 치킨집"
}
```

Create menu:

```json
{
  "name": "양념치킨",
  "type": "MAIN",
  "basePrice": 23000,
  "allergens": {
    "rawText": "닭고기, 대두",
    "normalizedAllergens": ["닭고기", "대두"],
    "parseStatus": "MANUAL"
  },
  "quantityRule": {"min": 1, "max": 10, "default": 1}
}
```

Create option group:

```json
{
  "groupName": "요청사항",
  "selectionType": "CHECKBOX",
  "required": false,
  "minSelect": 0,
  "maxSelect": 2
}
```

Create option:

```json
{
  "name": "치킨무 X",
  "additionalPrice": 0,
  "effect": "EXCLUDE",
  "linkedMenuId": "MENU_002"
}
```

### `POST /api/mock/orders/sample`

Creates and stores one sample `ORDER_CREATED` payload.

Request body:

```json
{
  "storeId": "STORE_FLAT"
}
```

Response includes:

- `generatedOrderId`
- `payload`

### `POST /api/mock/orders/send`

Sends a generated or provided order payload to the DeepOrder Backend webhook URL.

Request body options:

- `generatedOrderId`: send a previously generated sample order.
- `payload`: send a caller-provided mock order payload.
- `webhookUrl`: override the default webhook target.

If no body is provided, the API sends the latest generated order. If no generated order exists, it creates a sample order first.

The default webhook target is:

```text
http://localhost:8000/api/external/orders/webhook
```

### `GET /api/mock/webhook-logs`

Returns recent webhook send logs.

Optional query:

- `limit`: 1 to 100, default 20
