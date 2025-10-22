"""History helpers for converting database models to API responses."""

from pathlib import Path
from typing import Dict, Iterable, Optional

from sqlmodel import Session, select

from ..db.models import Description


def _image_url(image_path: Optional[str]) -> Optional[str]:
    """
    Convert image_path to accessible URL.
    If image_path is already a full URL (Cloudinary), return as-is.
    If it's a local path, convert to static URL.
    """
    if not image_path:
        return None
    
    # If already a full URL (starts with http/https), return as-is
    if image_path.startswith("http://") or image_path.startswith("https://"):
        return image_path
    
    # If it's a local path starting with /static/, return as-is
    if image_path.startswith("/static/"):
        return image_path
    
    # Otherwise, assume it's a relative path and prepend /static/
    return f"/static/{Path(image_path).as_posix()}"


def history_item_from_db(description: Description) -> Dict[str, str | None]:
    return {
        "id": str(description.id),
        "timestamp": description.timestamp.isoformat(),
        "source": description.source,
        "style": description.style,
        "summary": description.content[:200] + ("..." if len(description.content) > 200 else ""),
        "full_description": description.content,
        "image_url": _image_url(description.image_path),
    }


def get_history_for_user(session: Session, user_id: int, limit: int = 20) -> Iterable[Dict[str, str]]:
    statement = (
        select(Description)
        .where(Description.user_id == user_id)
        .order_by(Description.timestamp.desc())
        .limit(limit)
    )
    return [history_item_from_db(desc) for desc in session.exec(statement)]
