import re

from app.models import AnalysisStatus, RiskLevel


def analyze_with_keywords(
    *,
    customer_request: str | None,
    delivery_request: str | None,
    item_options: list[str],
) -> dict:
    customer_text = (customer_request or "").strip()
    delivery_text = (delivery_request or "").strip()
    option_texts = {option.strip() for option in item_options if option.strip()}

    kitchen_actions: list[dict] = []
    packing_actions: list[dict] = []
    ignored_requests: list[dict] = []
    risk_level = RiskLevel.LOW
    needs_human_check = False

    allergy_target = _extract_allergy_target(customer_text)
    if allergy_target:
        kitchen_actions.append(
            _action(
                action_type="ALLERGY",
                label="알레르기",
                target=allergy_target,
                display_text=f"알레르기: {allergy_target}",
                severity=RiskLevel.HIGH,
                requires_human_check=True,
                source_text=_source_sentence(customer_text, allergy_target),
            )
        )
        risk_level = RiskLevel.HIGH
        needs_human_check = True

    excluded_target = _extract_excluded_target(customer_text)
    if excluded_target:
        kitchen_actions.append(
            _action(
                action_type="EXCLUDE_INGREDIENT",
                label="제외",
                target=excluded_target,
                display_text=f"제외: {excluded_target}",
                severity=RiskLevel.MEDIUM,
                requires_human_check=True,
                source_text=_source_sentence(customer_text, excluded_target),
            )
        )
        risk_level = max_risk(risk_level, RiskLevel.MEDIUM)
        needs_human_check = True

    safety_target = _extract_first_match(
        customer_text,
        ["덜 익혀", "날것처럼", "반만 익혀", "아주 덜 익게"],
    )
    if safety_target and not _is_structured_option(safety_target, option_texts):
        kitchen_actions.append(
            _action(
                action_type="SAFETY_CHECK",
                label="확인",
                target=safety_target,
                display_text=f"확인: {safety_target}",
                severity=RiskLevel.HIGH,
                requires_human_check=True,
                source_text=_source_sentence(customer_text, safety_target),
            )
        )
        risk_level = RiskLevel.HIGH
        needs_human_check = True

    cooking_target = _extract_cooking_target(customer_text)
    if cooking_target and not _is_structured_option(cooking_target, option_texts):
        kitchen_actions.append(
            _action(
                action_type="COOKING_REQUEST",
                label="조리",
                target=cooking_target,
                display_text=f"조리: {cooking_target}",
                severity=RiskLevel.LOW,
                requires_human_check=False,
                source_text=_source_sentence(customer_text, cooking_target),
            )
        )

    packing_target = _extract_first_match(
        customer_text,
        ["소스 따로", "수저", "젓가락", "포장"],
    )
    if packing_target:
        packing_actions.append(
            {
                "type": "PACKING_REQUEST",
                "label": "포장",
                "target": packing_target,
                "displayText": f"포장: {packing_target}",
                "severity": RiskLevel.LOW.value,
                "requiresHumanCheck": False,
                "source": "CUSTOMER_REQUEST",
                "sourceText": _source_sentence(customer_text, packing_target),
                "matchedMenuItemIds": [],
            }
        )

    if delivery_text:
        ignored_requests.append({"type": "DELIVERY", "text": delivery_text})

    tags = _legacy_tags(kitchen_actions, packing_actions, ignored_requests)
    cooking_notes = [action["displayText"] for action in kitchen_actions]
    packing_notes = [action["displayText"] for action in packing_actions]

    return {
        "summary": " / ".join(cooking_notes) if cooking_notes else "특이 요청 없음",
        "tags": tags,
        "cooking_notes": cooking_notes,
        "packing_notes": packing_notes,
        "delivery_notes": [],
        "kitchen_actions": kitchen_actions,
        "packing_actions": packing_actions,
        "ignored_requests": ignored_requests,
        "risk_level": risk_level,
        "warnings": [],
        "needs_human_check": needs_human_check,
        "analysis_status": AnalysisStatus.FALLBACK,
    }


def _action(
    *,
    action_type: str,
    label: str,
    target: str,
    display_text: str,
    severity: RiskLevel,
    requires_human_check: bool,
    source_text: str,
) -> dict:
    return {
        "type": action_type,
        "label": label,
        "target": target,
        "displayText": display_text,
        "severity": severity.value,
        "requiresHumanCheck": requires_human_check,
        "source": "CUSTOMER_REQUEST",
        "sourceText": source_text,
        "matchedMenuItemIds": [],
    }


def _extract_allergy_target(text: str) -> str | None:
    if not _contains_any(text, ["알레르기", "알러지", "견과", "땅콩", "새우", "갑각류", "우유", "난류", "계란", "밀", "대두"]):
        return None
    known_targets = ["견과류", "견과", "땅콩", "새우", "갑각류", "우유", "난류", "계란", "밀", "대두"]
    for target in known_targets:
        if target in text:
            return "견과류" if target == "견과" else target

    match = re.search(r"([가-힣A-Za-z0-9]+)\s*(?:알레르기|알러지)", text)
    if match:
        return match.group(1)
    return "알레르기 확인"


def _extract_excluded_target(text: str) -> str | None:
    patterns = [
        r"([가-힣A-Za-z0-9]+)(?:은|는|이|가)\s*(?:빼주시고|빼주세요|빼줘|빼|제외)",
        r"([가-힣A-Za-z0-9]+)\s*(?:빼주시고|빼주세요|빼줘|빼|제외)",
        r"([가-힣A-Za-z0-9]+)\s*(?:없이|넣지)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return None


def _extract_cooking_target(text: str) -> str | None:
    phrase_map = {
        "덜 맵게": "덜 맵게",
        "덜맵게": "덜 맵게",
        "안 맵게": "안 맵게",
        "맵게": "맵게",
        "국물 많이": "국물 많이",
        "국물 적게": "국물 적게",
        "바싹": "바싹 튀김",
        "바삭하게": "바싹 튀김",
        "푹 익혀": "푹 익힘",
        "따뜻하게": "따뜻하게",
        "소스 많이": "소스 많이",
        "소스 적게": "소스 적게",
        "면 불지 않게": "면 불지 않게",
    }
    for phrase, target in phrase_map.items():
        if phrase in text:
            return target
    return None


def _extract_first_match(text: str, phrases: list[str]) -> str | None:
    for phrase in phrases:
        if phrase in text:
            return phrase
    return None


def _source_sentence(text: str, target: str) -> str:
    for sentence in re.split(r"[.\n]", text):
        stripped = sentence.strip()
        if target and target in stripped:
            return stripped
    return text.strip()


def _is_structured_option(target: str, option_texts: set[str]) -> bool:
    normalized_target = target.replace(" ", "")
    return any(normalized_target in option.replace(" ", "") for option in option_texts)


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def _legacy_tags(kitchen_actions: list[dict], packing_actions: list[dict], ignored_requests: list[dict]) -> list[str]:
    tags = set()
    for action in kitchen_actions:
        if action["type"] == "ALLERGY":
            tags.add("알레르기위험")
        elif action["type"] == "EXCLUDE_INGREDIENT":
            tags.add("재료제외")
        else:
            tags.add("조리요청")
    if packing_actions:
        tags.add("포장요청")
    if ignored_requests:
        tags.add("배달요청")
    return sorted(tags)


def max_risk(left: RiskLevel, right: RiskLevel) -> RiskLevel:
    weights = {RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3}
    return right if weights[right] > weights[left] else left
