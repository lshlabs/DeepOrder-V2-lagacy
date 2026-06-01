# Mock Delivery API

FastAPI service that behaves like a virtual delivery platform for DeepOrder demos.

## Initial Scope

- sample order payload generation
- webhook sending to DeepOrder Backend
- webhook send logs
- future AI order generation and random simulation

## Local Run

```bash
cd mock-delivery-api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001
```

