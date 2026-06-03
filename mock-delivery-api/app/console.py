from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

from app.config import get_settings

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/console")
def console(request: Request):
    settings = get_settings()
    return templates.TemplateResponse(
        request,
        "console.html",
        {
            "webhook_url": str(settings.deeporder_webhook_url),
        },
    )
