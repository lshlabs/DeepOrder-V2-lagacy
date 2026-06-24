import html
import json
from urllib.parse import parse_qsl, urlencode

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import HTMLResponse

from app.config import get_settings

router = APIRouter()

JUSO_POPUP_URL = "https://business.juso.go.kr/addrlink/addrLinkUrl.do"


@router.get("/api/address/juso-popup", response_class=HTMLResponse)
def open_juso_popup(request: Request, origin: str) -> HTMLResponse:
    settings = get_settings()
    if not settings.juso_confirm_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JUSO_CONFIRM_KEY is not configured.",
        )

    return_url = _build_return_url(request, origin)
    html_content = f"""
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>주소 검색 연결 중</title>
  </head>
  <body>
    <form id="juso-form" method="post" action="{html.escape(JUSO_POPUP_URL)}">
      <input type="hidden" name="confmKey" value="{html.escape(settings.juso_confirm_key)}" />
      <input type="hidden" name="returnUrl" value="{html.escape(return_url)}" />
      <input type="hidden" name="resultType" value="4" />
      <input type="hidden" name="useDetailAddr" value="N" />
    </form>
    <script>
      document.getElementById("juso-form").submit();
    </script>
  </body>
</html>
""".strip()
    return HTMLResponse(content=html_content)


@router.get("/api/address/juso-callback", response_class=HTMLResponse)
async def juso_callback_get(request: Request) -> HTMLResponse:
    return await _juso_callback_response(request)


@router.post("/api/address/juso-callback", response_class=HTMLResponse)
async def juso_callback_post(request: Request) -> HTMLResponse:
    return await _juso_callback_response(request)


async def _juso_callback_response(request: Request) -> HTMLResponse:
    params = dict(request.query_params)
    if request.method == "POST":
        body = (await request.body()).decode("utf-8", errors="ignore")
        params.update(dict(parse_qsl(body, keep_blank_values=True)))

    target_origin = params.get("origin", "")
    address_payload = {
        "zipNo": params.get("zoneNo", ""),
        "roadAddress": params.get("roadAddrPart1") or params.get("roadAddr", ""),
        "jibunAddress": params.get("jibunAddr", ""),
        "addressDetail": params.get("addrDetail") or params.get("roadAddrPart2", ""),
        "buildingName": params.get("bdNm", ""),
    }
    script_payload = json.dumps(
        {"type": "deeporder.juso.selected", "payload": address_payload},
        ensure_ascii=False,
    )

    html_content = f"""
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>주소 검색 완료</title>
  </head>
  <body>
    <p>주소를 전달하는 중입니다.</p>
    <script>
      const message = {script_payload};
      const targetOrigin = {json.dumps(target_origin, ensure_ascii=False)};
      if (window.opener && targetOrigin) {{
        window.opener.postMessage(message, targetOrigin);
        window.close();
      }} else {{
        document.body.innerHTML = "<p>주소 검색 결과를 전달할 수 없습니다. 창을 닫고 다시 시도해주세요.</p>";
      }}
    </script>
  </body>
</html>
""".strip()
    return HTMLResponse(content=html_content)


def _build_return_url(request: Request, origin: str) -> str:
    settings = get_settings()
    base_url = settings.juso_return_url or str(request.url_for("juso_callback_get"))
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{urlencode({'origin': origin})}"
