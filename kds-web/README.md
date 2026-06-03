# KDS Web

React + TypeScript web client for kitchen display workflows.

## Initial Scope

- Vite app shell
- `/kds` page
- polling `GET /api/kds/orders?storeId=STORE_001`
- NEW, COOKING, DONE order columns
- status transition actions

## Local Run

```bash
cd kds-web
npm install
npm run dev
```

## Environment

```bash
VITE_DEEPORDER_API_URL=http://127.0.0.1:8000
VITE_STORE_ID=STORE_001
```
