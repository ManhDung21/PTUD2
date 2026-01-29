from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from ..db.session import get_database, Database
from ..db.models import UserDocument
from ..services.auth import get_current_user
from ..services import conversations as conversation_service
from ..services import history as history_service # For formatting messages
from ..schemas import Conversation, ConversationCreate, ConversationUpdate, HistoryItem

router = APIRouter()

@router.post("/", response_model=Conversation)
def create_conversation(
    payload: ConversationCreate,
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    doc = conversation_service.create_conversation(
        db.get_collection("conversations"),
        current_user["_id"],
        payload.title
    )
    return Conversation(
        id=str(doc["_id"]),
        title=doc.get("title", ""),
        created_at=doc["created_at"].isoformat(),
        updated_at=doc["updated_at"].isoformat()
    )

@router.get("/", response_model=List[Conversation])
def get_conversations(
    limit: int = 50,
    skip: int = 0,
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    docs = conversation_service.get_conversations(
        db.get_collection("conversations"),
        current_user["_id"],
        limit,
        skip
    )
    return [
        Conversation(
            id=str(doc["_id"]),
            title=doc.get("title", "New Chat"),
            created_at=doc["created_at"].isoformat(),
            updated_at=doc["updated_at"].isoformat()
        )
        for doc in docs
    ]

@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    success = conversation_service.delete_conversation(
        db.get_collection("conversations"),
        db.get_collection("descriptions"),
        conversation_id,
        current_user["_id"]
    )
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")
    return {"message": "Conversation deleted"}

@router.patch("/{conversation_id}", response_model=Conversation)
def update_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    success = conversation_service.update_conversation_title(
        db.get_collection("conversations"),
        conversation_id,
        current_user["_id"],
        payload.title
    )
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    doc = conversation_service.get_conversation(
        db.get_collection("conversations"),
        conversation_id,
        current_user["_id"]
    )
    return Conversation(
        id=str(doc["_id"]),
        title=doc.get("title", ""),
        created_at=doc["created_at"].isoformat(),
        updated_at=doc["updated_at"].isoformat()
    )

@router.get("/{conversation_id}/messages", response_model=List[HistoryItem])
def get_conversation_messages(
    conversation_id: str,
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    # Verify access first
    conv = conversation_service.get_conversation(
        db.get_collection("conversations"),
        conversation_id,
        current_user["_id"]
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = conversation_service.get_messages_for_conversation(
        db.get_collection("descriptions"),
        conversation_id,
        current_user["_id"]
    )
    
    # Use history service logic to format messages as HistoryItems
    # We might need to map manual fields if HistoryItem format differs slightly from db doc
    formatted_messages = []
    for msg in messages:
        # Re-use the formatting logic from history service if possible, 
        # or reimplement mapping here. 
        # history_service.history_item_from_doc is usually handy.
        item = history_service.history_item_from_doc(msg)
        formatted_messages.append(HistoryItem(**item))
        
    return formatted_messages
