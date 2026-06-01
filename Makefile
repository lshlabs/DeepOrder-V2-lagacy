.PHONY: backend mock kds

backend:
	cd deeporder-backend && uvicorn app.main:app --reload --port 8000

mock:
	cd mock-delivery-api && uvicorn app.main:app --reload --port 8001

kds:
	npm --workspace kds-web run dev

