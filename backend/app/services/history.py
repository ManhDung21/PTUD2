"""History helpers for converting MongoDB documents to API responses."""

from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, Optional

from bson import ObjectId
from pymongo.collection import Collection

from ..db.models import DescriptionDocument


def _image_url(relative_path: Optional[str]) -> Optional[str]:
    if not relative_path:
        return None
    return f"/static/{Path(relative_path).as_posix()}"


def history_item_from_doc(description: DescriptionDocument) -> Dict[str, str | None]:
    content = description.get("content", "")
    timestamp = description.get("timestamp") or datetime.utcnow()
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
