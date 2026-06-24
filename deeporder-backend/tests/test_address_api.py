from pathlib import Path

from fastapi.testclient import TestClient

db_path = Path("deeporder.db")
if db_path.exists():
    db_path.unlink()

from app.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402


def test_juso_popup_returns_auto_submit_html() -> None:
    settings = get_settings()
    original_key = settings.juso_confirm_key
    original_return_url = settings.juso_return_url
    settings.juso_confirm_key = "test-juso-key"
    settings.juso_return_url = "http://127.0.0.1:8000/api/address/juso-callback"

    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/address/juso-popup",
                params={"origin": "http://127.0.0.1:5173"},
            )

        assert response.status_code == 200
        assert "addrLinkUrl.do" in response.text
        assert 'name="confmKey" value="test-juso-key"' in response.text
        assert "resultType" in response.text
        assert "useDetailAddr" in response.text
        assert "origin=http%3A%2F%2F127.0.0.1%3A5173" in response.text
    finally:
        settings.juso_confirm_key = original_key
        settings.juso_return_url = original_return_url


def test_juso_callback_returns_post_message_html() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/address/juso-callback?origin=http://127.0.0.1:5173",
            data={
                "zoneNo": "12345",
                "roadAddrPart1": "서울시 강남구 테스트로 1",
                "jibunAddr": "서울시 강남구 테스트동 1-1",
                "addrDetail": "101호",
                "bdNm": "테스트빌딩",
            },
        )

    assert response.status_code == 200
    assert "window.opener.postMessage" in response.text
    assert "deeporder.juso.selected" in response.text
    assert "서울시 강남구 테스트로 1" in response.text
    assert "12345" in response.text
