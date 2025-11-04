"""Helper functions for interacting with Facebook Graph API."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json

import httpx
from fastapi import HTTPException, status

from ..config import get_settings

settings = get_settings()
GRAPH_API_BASE = f"https://graph.facebook.com/{settings.facebook_graph_version}"


def _base64_url_decode(value: str) -> bytes:
    padding = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(value + padding)


def decode_signed_request(signed_request: str, app_secret: str) -> dict:
    """Validate and decode the signed_request payload from Facebook."""
    try:
        encoded_sig, encoded_payload = signed_request.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "signed_request không hợp lệ.") from exc

    sig = _base64_url_decode(encoded_sig)
    payload_bytes = _base64_url_decode(encoded_payload)

    expected_sig = hmac.new(
        app_secret.encode("utf-8"),
        msg=encoded_payload.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()

    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Chữ ký Facebook không hợp lệ.")

    try:
        data = json.loads(payload_bytes.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payload Facebook không hợp lệ.") from exc

    return data


async def _post_photo(endpoint: str, token: str, caption: str, image_url: str) -> dict:
    """Send a photo post request to a Facebook Graph API endpoint."""
    if not token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Thiếu access token Facebook.")

    payload = {"caption": caption, "url": image_url, "access_token": token}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(endpoint, data=payload)
    except httpx.HTTPError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Lỗi kết nối tới Facebook Graph API: {exc}") from exc

    data = response.json()
    if response.status_code >= 400:
        message = data.get("error", {}).get("message", "Request thất bại.")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Facebook trả về lỗi: {message}")

    return data


async def share_to_page(
    caption: str,
    image_url: str,
    page_id: str | None = None,
    token: str | None = None,
) -> dict:
    """Post a photo with caption to a Facebook Page."""
    target_page_id = page_id or settings.facebook_page_id
    access_token = token or settings.facebook_page_access_token

    if not target_page_id or not access_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Thiếu page_id hoặc page_access_token.")

    endpoint = f"{GRAPH_API_BASE}/{target_page_id}/photos"
    return await _post_photo(endpoint, access_token, caption, image_url)


async def share_to_group(
    caption: str,
    image_url: str,
    group_id: str | None = None,
    token: str | None = None,
) -> dict:
    """Post a photo with caption to a Facebook Group."""
    target_group_id = group_id or settings.facebook_group_id
    access_token = token or settings.facebook_user_access_token

    if not target_group_id or not access_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Thiếu group_id hoặc user_access_token.")

    endpoint = f"{GRAPH_API_BASE}/{target_group_id}/photos"
    return await _post_photo(endpoint, access_token, caption, image_url)
