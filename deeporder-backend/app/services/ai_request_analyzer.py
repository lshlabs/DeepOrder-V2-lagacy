import json
from typing import Any

import httpx
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import SessionLocal
from app.models import AnalysisStatus, Order, OrderAIAnalysis, RiskLevel
from app.services.fallback_request_analyzer import analyze_with_keywords


class AIAnalysisResult(BaseModel):
    summary: str = ""
    tags: list[str] = Field(default_factory=list)
    cookingNotes: list[str] = Field(default_factory=list)
    packingNotes: list[str] = Field(default_factory=list)
    deliveryNotes: list[str] = Field(default_factory=list)
    kitchenActions: list[dict[str, Any]] = Field(default_factory=list)
    packingActions: list[dict[str, Any]] = Field(default_factory=list)
    ignoredRequests: list[dict[str, Any]] = Field(default_factory=list)
    riskLevel: RiskLevel = RiskLevel.LOW
    warnings: list[str] = Field(default_factory=list)
    needsHumanCheck: bool = False


def analyze_order_request(order_id: int) -> None:
    with SessionLocal() as db:
        order = db.scalar(
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.ai_analysis))
            .where(Order.id == order_id)
        )
        if not order:
            return

        analysis = order.ai_analysis or OrderAIAnalysis(order_id=order.id)
        db.add(analysis)
        analysis.analysis_status = AnalysisStatus.PENDING
        db.commit()

        item_options = [option for item in order.items for option in item.options]

        try:
            result = _analyze_with_configured_provider(order=order, item_options=item_options)
            _apply_analysis(
                analysis,
                {
                    "summary": result.summary,
                    "tags": result.tags,
                    "cooking_notes": result.cookingNotes,
                    "packing_notes": result.packingNotes,
                    "delivery_notes": result.deliveryNotes,
                    "kitchen_actions": result.kitchenActions,
                    "packing_actions": result.packingActions,
                    "ignored_requests": result.ignoredRequests,
                    "risk_level": result.riskLevel,
                    "warnings": result.warnings,
                    "needs_human_check": result.needsHumanCheck,
                    "analysis_status": AnalysisStatus.COMPLETED,
                    "error_message": None,
                },
            )
        except Exception as exc:
            fallback = analyze_with_keywords(
                customer_request=order.customer_request,
                delivery_request=order.delivery_request,
                item_options=item_options,
            )
            fallback["error_message"] = str(exc)
            _apply_analysis(analysis, fallback)

        db.commit()


def _analyze_with_configured_provider(order: Order, item_options: list[str]) -> AIAnalysisResult:
    settings = get_settings()
    provider = settings.ai_provider.strip().lower()

    if provider == "gemini":
        return _analyze_with_gemini(order=order, item_options=item_options)
    if provider == "openai":
        return _analyze_with_openai_compatible(order=order, item_options=item_options)

    raise RuntimeError(f"Unsupported AI provider: {settings.ai_provider}")


def _analyze_with_gemini(order: Order, item_options: list[str]) -> AIAnalysisResult:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("Gemini API key is not configured.")

    prompt = _build_prompt(order=order, item_options=item_options)
    response = httpx.post(
        (
            f"{settings.gemini_base_url.rstrip('/')}/models/"
            f"{settings.gemini_model}:generateContent"
        ),
        params={"key": settings.gemini_api_key},
        json={
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        },
        timeout=15.0,
    )
    response.raise_for_status()
    content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    return AIAnalysisResult.model_validate(json.loads(_strip_json_fence(content)))


def _analyze_with_openai_compatible(order: Order, item_options: list[str]) -> AIAnalysisResult:
    settings = get_settings()
    if not settings.openai_api_key or not settings.openai_model:
        raise RuntimeError("OpenAI-compatible provider is not configured.")

    response = httpx.post(
        f"{settings.openai_base_url.rstrip('/')}/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.openai_model,
            "messages": [
                {
                    "role": "system",
                    "content": _system_instruction(),
                },
                {
                    "role": "user",
                    "content": json.dumps(_build_ai_input(order, item_options), ensure_ascii=False),
                },
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        },
        timeout=15.0,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    return AIAnalysisResult.model_validate(json.loads(content))


def _build_prompt(order: Order, item_options: list[str]) -> str:
    return "\n".join(
        [
            _system_instruction(),
            "Analyze this order and return JSON only.",
            json.dumps(_build_ai_input(order, item_options), ensure_ascii=False),
        ]
    )


def _system_instruction() -> str:
    return (
        "You analyze Korean delivery orders for a kitchen display system. "
        "Return JSON only with exactly these fields: summary, tags, cookingNotes, "
        "packingNotes, deliveryNotes, kitchenActions, packingActions, ignoredRequests, "
        "riskLevel, warnings, needsHumanCheck. riskLevel must be LOW, MEDIUM, or HIGH. "
        "kitchenActions must contain short action cards for kitchen work. "
        "Each action object must include type, label, target, displayText, severity, "
        "requiresHumanCheck, source, sourceText, matchedMenuItemIds. "
        "Allowed action types are ALLERGY, EXCLUDE_INGREDIENT, TASTE_ADJUSTMENT, "
        "COOKING_REQUEST, SAFETY_CHECK. Use '알레르기: {target}' for allergy displayText "
        "and '조리: {target}' for normal cooking requests. "
        "Do not repeat item options that are already structured in the item options list. "
        "Classify delivery-only requests into ignoredRequests, not kitchenActions. "
        "Mark allergy or safety-related requests as HIGH risk and needsHumanCheck=true. "
        "Keep summary, tags, warnings, and notes minimal because KDS displays kitchenActions. "
        "Do not include markdown."
    )


def _build_ai_input(order: Order, item_options: list[str]) -> dict[str, Any]:
    return {
        "orderNumber": order.order_number,
        "items": [
            {
                "name": item.name,
                "id": item.id,
                "quantity": item.quantity,
                "options": item.options,
            }
            for item in order.items
        ],
        "customerRequest": order.customer_request or "",
        "deliveryRequest": order.delivery_request or "",
        "itemOptions": item_options,
    }


def _strip_json_fence(content: str) -> str:
    stripped = content.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return stripped


def _apply_analysis(analysis: OrderAIAnalysis, data: dict[str, Any]) -> None:
    try:
        analysis.summary = str(data["summary"])
        analysis.tags = list(data["tags"])
        analysis.cooking_notes = list(data["cooking_notes"])
        analysis.packing_notes = list(data["packing_notes"])
        analysis.delivery_notes = list(data["delivery_notes"])
        analysis.kitchen_actions = list(data.get("kitchen_actions", []))
        analysis.packing_actions = list(data.get("packing_actions", []))
        analysis.ignored_requests = list(data.get("ignored_requests", []))
        analysis.risk_level = RiskLevel(data["risk_level"])
        analysis.warnings = list(data["warnings"])
        analysis.needs_human_check = bool(data["needs_human_check"])
        analysis.analysis_status = AnalysisStatus(data["analysis_status"])
        analysis.error_message = data.get("error_message")
    except (KeyError, TypeError, ValueError, ValidationError) as exc:
        analysis.summary = "요청사항 분석 실패"
        analysis.tags = []
        analysis.cooking_notes = []
        analysis.packing_notes = []
        analysis.delivery_notes = []
        analysis.kitchen_actions = []
        analysis.packing_actions = []
        analysis.ignored_requests = []
        analysis.risk_level = RiskLevel.LOW
        analysis.warnings = ["분석 결과 저장 중 오류 발생"]
        analysis.needs_human_check = True
        analysis.analysis_status = AnalysisStatus.FAILED
        analysis.error_message = str(exc)
