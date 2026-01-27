"""MongoDB connection utilities and helpers."""

from typing import Optional

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

from ..config import get_settings

settings = get_settings()

_client: Optional[MongoClient] = None
_resolved_db_name: Optional[str] = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        # Debug: Print masked URI to verify env var loading
        uri = settings.mongodb_uri
        masked_uri = uri.replace(uri.split("@")[0], "mongodb+srv://****:****") if "@" in uri else "mongodb://****"
        print(f"Connecting to MongoDB: {masked_uri}")
        _client = MongoClient(uri)
    return _client


def get_database() -> Database:
    client = get_client()
    return client[_resolve_db_name(client, settings.mongodb_db)]


def _resolve_db_name(client: MongoClient, desired_name: str) -> str:
    global _resolved_db_name

    if _resolved_db_name is not None:
        return _resolved_db_name

    lowercase_target = desired_name.lower()

    try:
        existing_names = client.list_database_names()
    except PyMongoError:
        _resolved_db_name = desired_name
        return _resolved_db_name

    for name in existing_names:
        if name.lower() == lowercase_target:
            _resolved_db_name = name
            break
    else:
        _resolved_db_name = desired_name

    return _resolved_db_name


def init_db() -> None:
    """Ensure collections and indexes exist."""
    db = get_database()

    users = db.get_collection("users")
    users.create_index("email", unique=True, sparse=True)
    users.create_index("phone_number", unique=True, sparse=True)

    descriptions = db.get_collection("descriptions")
    descriptions.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])

    tokens = db.get_collection("password_reset_tokens")
    tokens.create_index("user_id")
    tokens.create_index("created_at")
