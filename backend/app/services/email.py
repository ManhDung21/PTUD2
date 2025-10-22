"""Email utilities for transactional messages using Resend or SMTP fallback."""

import smtplib
from email.message import EmailMessage
from typing import Any

import httpx

from ..config import get_settings

RESET_SUBJECT = "Mã xác thực đặt lại mật khẩu"
RESET_BODY_TEMPLATE = """Xin chào,

Bạn đã yêu cầu đặt lại mật khẩu. Mã xác thực của bạn là: {code}
Mã có hiệu lực trong 30 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.

Trân trọng.
"""


def _log_debug(message: str) -> None:
    settings = get_settings()
    if settings.debug:
        print(f"[DEBUG] {message}")


def _require_smtp_settings() -> tuple[str, int, str, str, str]:
    settings = get_settings()
    host = settings.smtp_host
    port = settings.smtp_port
    username = settings.smtp_username
    password = settings.smtp_password
    sender = settings.smtp_sender
    if not all([host, port, username, password, sender]):
        raise RuntimeError("Thiếu cấu hình SMTP")
    return host, int(port), username, password, sender


def _send_with_resend(recipient: str, subject: str, body: str) -> bool:
    settings = get_settings()
    if not settings.resend_api_key or not settings.resend_sender:
        return False

    payload: dict[str, Any] = {
        "from": settings.resend_sender,
        "to": [recipient],
        "subject": subject,
        "text": body,
    }

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15.0,
        )
        response.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        error_text = exc.response.text if getattr(exc, "response", None) else str(exc)
        _log_debug(f"Gửi email qua Resend thất bại: {error_text}")
        return False


def _send_with_smtp(recipient: str, subject: str, body: str) -> bool:
    try:
        host, port, username, password, sender = _require_smtp_settings()
    except RuntimeError as exc:
        _log_debug(f"Không gửi SMTP do thiếu cấu hình: {exc}")
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)

    try:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(username, password)
            smtp.send_message(message)
        return True
    except (smtplib.SMTPException, OSError) as exc:
        _log_debug(f"Gửi email qua SMTP thất bại: {exc}")
        return False


def send_password_reset_code(recipient: str, code: str) -> bool:
    body = RESET_BODY_TEMPLATE.format(code=code)

    if _send_with_resend(recipient, RESET_SUBJECT, body):
        return True

    sent_via_smtp = _send_with_smtp(recipient, RESET_SUBJECT, body)
    if not sent_via_smtp:
        settings = get_settings()
        if not settings.debug:
            raise RuntimeError("Không thể gửi email xác thực")
        _log_debug(f"Email không gửi được. Mã đặt lại cho {recipient}: {code}")
    return sent_via_smtp
