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
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    users_cursor = db.users.find().sort("created_at", -1)
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
