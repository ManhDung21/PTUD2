from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from pymongo.collection import Collection

from ..db.models import ConversationDocument, DescriptionDocument, UserDocument


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_conversation(
    conversations_col: Collection,
    user_id: ObjectId,
    title: Optional[str] = None
) -> ConversationDocument:
    doc: ConversationDocument = {
        "user_id": user_id,
        "title": title or "New Conversation",
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    result = conversations_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def get_conversations(
    conversations_col: Collection,
    user_id: ObjectId,
    limit: int = 50,
    skip: int = 0
) -> List[ConversationDocument]:
    cursor = conversations_col.find(
        {"user_id": user_id}
    ).sort("updated_at", -1).skip(skip).limit(limit)
    return list(cursor)


def get_conversation(
    conversations_col: Collection,
    conversation_id: str,
    user_id: ObjectId
) -> Optional[ConversationDocument]:
    if not ObjectId.is_valid(conversation_id):
        return None
    return conversations_col.find_one({
        "_id": ObjectId(conversation_id),
        "user_id": user_id
    })


def update_conversation_title(
    conversations_col: Collection,
    conversation_id: str,
    user_id: ObjectId,
    new_title: str
) -> bool:
    if not ObjectId.is_valid(conversation_id):
        return False
    
    result = conversations_col.update_one(
        {"_id": ObjectId(conversation_id), "user_id": user_id},
        {"$set": {"title": new_title, "updated_at": utc_now()}}
    )
    return result.modified_count > 0


def delete_conversation(
    conversations_col: Collection,
    descriptions_col: Collection,
    conversation_id: str,
    user_id: ObjectId
) -> bool:
    if not ObjectId.is_valid(conversation_id):
        return False
    
    # Check ownership
    conv = conversations_col.find_one({"_id": ObjectId(conversation_id), "user_id": user_id})
    if not conv:
        return False

    # Delete conversation
    conversations_col.delete_one({"_id": ObjectId(conversation_id)})
    
    # Delete related messages
    descriptions_col.delete_many({"conversation_id": ObjectId(conversation_id)})
    
    return True


def get_messages_for_conversation(
    descriptions_col: Collection,
    conversation_id: str,
    user_id: ObjectId
) -> List[DescriptionDocument]:
    if not ObjectId.is_valid(conversation_id):
        return []
        
    cursor = descriptions_col.find({
        "conversation_id": ObjectId(conversation_id),
        "user_id": user_id
    }).sort("timestamp", 1) # Ascending for chat history
    
    return list(cursor)
