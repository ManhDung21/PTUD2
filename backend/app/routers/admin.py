from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from ..db.session import get_database, Database
from ..db.models import UserDocument, DescriptionDocument
from ..services.auth import get_current_user
from ..schemas import UserOut
from bson import ObjectId

router = APIRouter()

def get_admin_user(current_user: UserDocument = Depends(get_current_user)) -> UserDocument:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin access required"
        )
    return current_user

@router.get("/users", response_model=List[UserOut])
async def get_all_users(
    search: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    query = {}
    if search:
        query = {
            "$or": [
                {"email": {"$regex": search, "$options": "i"}},
                {"full_name": {"$regex": search, "$options": "i"}},
                {"phone_number": {"$regex": search, "$options": "i"}}
            ]
        }
    
    users_cursor = db.users.find(query).sort("created_at", -1).skip(skip).limit(limit)
    users = []
    for doc in users_cursor:
        users.append(UserOut(
            id=str(doc["_id"]),
            email=doc.get("email"),
            phone_number=doc.get("phone_number"),
            full_name=doc.get("full_name"),
            role=doc.get("role", "user"),
            avatar_url=doc.get("avatar_url"),
            created_at=doc.get("created_at").isoformat() if doc.get("created_at") else ""
        ))
    return users

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Also delete related history
    db.descriptions.delete_many({"user_id": ObjectId(user_id)})
    
    return {"message": "User deleted successfully"}

@router.get("/stats")
async def get_stats(
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    user_count = db.users.count_documents({})
    description_count = db.descriptions.count_documents({})
    image_descriptions = db.descriptions.count_documents({"source": "image"})
    text_descriptions = db.descriptions.count_documents({"source": "text"})
    
    return {
        "total_users": user_count,
        "total_descriptions": description_count,
        "descriptions_by_type": {
            "image": image_descriptions,
            "text": text_descriptions
        }
    }

from ..schemas import RoleUpdateRequest, HistoryItem

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: RoleUpdateRequest,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    if role_update.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role_update.role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": "Role updated successfully"}


@router.get("/descriptions", response_model=List[HistoryItem])
async def get_all_descriptions(
    search: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    query = {}
    if search:
        query = {
            "$or": [
                {"content": {"$regex": search, "$options": "i"}},
                {"prompt": {"$regex": search, "$options": "i"}},
                {"style": {"$regex": search, "$options": "i"}}
            ]
        }
        
    cursor = db.descriptions.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    results = []
    
    for doc in cursor:
        results.append(HistoryItem(
            id=str(doc["_id"]),
            timestamp=doc["timestamp"].isoformat(),
            source=doc.get("source", "unknown"),
            style=doc.get("style", "unknown"),
            summary=doc.get("content", "")[:100] + "..." if len(doc.get("content", "")) > 100 else doc.get("content", ""),
            full_description=doc.get("content", ""),
            image_url=doc.get("image_path"),
            prompt=doc.get("prompt"),
            conversation_id=str(doc.get("conversation_id")) if doc.get("conversation_id") else None
        ))
    return results

@router.delete("/descriptions/{description_id}")
async def delete_description(
    description_id: str,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    if not ObjectId.is_valid(description_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    result = db.descriptions.delete_one({"_id": ObjectId(description_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Description not found")
        
    return {"message": "Description deleted successfully"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Also delete related history
    db.descriptions.delete_many({"user_id": ObjectId(user_id)})
    
    return {"message": "User deleted successfully"}

@router.get("/stats")
async def get_stats(
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    user_count = db.users.count_documents({})
    description_count = db.descriptions.count_documents({})
    image_descriptions = db.descriptions.count_documents({"source": "image"})
    text_descriptions = db.descriptions.count_documents({"source": "text"})
    
    return {
        "total_users": user_count,
        "total_descriptions": description_count,
        "descriptions_by_type": {
            "image": image_descriptions,
            "text": text_descriptions
        }
    }

from ..schemas import RoleUpdateRequest, HistoryItem

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: RoleUpdateRequest,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    if role_update.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role_update.role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": "Role updated successfully"}


@router.get("/descriptions", response_model=List[HistoryItem])
async def get_all_descriptions(
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    cursor = db.descriptions.find().sort("timestamp", -1).skip(skip).limit(limit)
    results = []
    
    # Pre-fetch user emails for mapping if needed, or query join.
    # Simple join approach:
    # A cleaner approach would be aggregation, but for <50 items loop is fine.
    
    for doc in cursor:
        results.append(HistoryItem(
            id=str(doc["_id"]),
            timestamp=doc["timestamp"].isoformat(),
            source=doc.get("source", "unknown"),
            style=doc.get("style", "unknown"),
            summary=doc.get("content", "")[:100] + "..." if len(doc.get("content", "")) > 100 else doc.get("content", ""),
            full_description=doc.get("content", ""),
            image_url=doc.get("image_path"),
            prompt=doc.get("prompt"),
            conversation_id=str(doc.get("conversation_id")) if doc.get("conversation_id") else None
        ))
    return results

@router.delete("/descriptions/{description_id}")
async def delete_description(
    description_id: str,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    if not ObjectId.is_valid(description_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    result = db.descriptions.delete_one({"_id": ObjectId(description_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Description not found")
        
    return {"message": "Description deleted successfully"}
