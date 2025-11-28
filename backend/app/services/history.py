"""History helpers for converting MongoDB documents to API responses."""

from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, Optional

from bson import ObjectId
from pymongo.collection import Collection

from ..db.models import DescriptionDocument


def _ensure_utc(value: datetime | str | None) -> datetime:
    """Convert stored timestamps to UTC-aware datetimes for consistent API responses."""
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        try:
            normalized = value.replace("Z", "+00:00")
            dt = datetime.fromisoformat(normalized)
        except ValueError:
            dt = datetime.now(timezone.utc)
    else:
        dt = datetime.now(timezone.utc)

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


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
    
    # If stored as an absolute path (e.g., /media/filename), return directly
    if image_path.startswith("/"):
        return image_path
    
    # If it's a local path starting with /static/, return as-is
    if image_path.startswith("/static/"):
        return image_path
    
    # Otherwise, assume it's a relative path and prepend /static/
    return f"/static/{Path(image_path).as_posix()}"


def history_item_from_doc(description: DescriptionDocument) -> Dict[str, str | None]:
    content = description.get("content", "")
    timestamp = _ensure_utc(description.get("timestamp"))
    return {
        "id": str(description.get("_id", "")),
        "timestamp": timestamp.isoformat(),
        "source": description.get("source", ""),
        "style": description.get("style", ""),
        "summary": content[:200] + ("..." if len(content) > 200 else ""),
        "full_description": content,
        "image_url": _image_url(description.get("image_path")),
    }


def get_history_for_user(collection: Collection, user_id: ObjectId, limit: int = 20) -> Iterable[Dict[str, str | None]]:
    cursor = (
        collection.find({"user_id": user_id})
        .sort("timestamp", -1)
        .limit(limit)
    )
    return [history_item_from_doc(doc) for doc in cursor]


def delete_history_item(collection: Collection, user_id: ObjectId, item_id: str) -> bool:
    """Delete a specific history item for a user."""
    try:
        print(f"DEBUG: Attempting to delete item {item_id} for user {user_id}")
        result = collection.delete_one({"_id": ObjectId(item_id), "user_id": user_id})
        print(f"DEBUG: Delete result count: {result.deleted_count}")
        return result.deleted_count > 0
    except Exception as e:
        print(f"DEBUG: Error deleting history item: {e}")
        return False


def delete_all_history(collection: Collection, user_id: ObjectId) -> int:
    """Delete all history items for a user."""
    print(f"DEBUG: Attempting to delete ALL history for user {user_id}")
    result = collection.delete_many({"user_id": user_id})
    print(f"DEBUG: Deleted {result.deleted_count} items")
    return result.deleted_count
