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
    role: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone_number": {"$regex": search, "$options": "i"}}
        ]
    
    if role and role != "all":
        query["role"] = role
    
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
            plan_type=doc.get("plan_type", "free"),
            subscription_status=doc.get("subscription_status", "none"),
            subscription_end_date=doc.get("subscription_end_date"),
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
    
    # Calculate Total Revenue
    revenue_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue_result = list(db.payments.aggregate(revenue_pipeline))
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "total_users": user_count,
        "total_descriptions": description_count,
        "total_revenue": total_revenue,
        "descriptions_by_type": {
            "image": image_descriptions,
            "text": text_descriptions
        }
    }

from ..schemas import RoleUpdateRequest, HistoryItem

@router.get("/descriptions", response_model=List[HistoryItem])
async def get_all_descriptions(
    search: str = None,
    source: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"content": {"$regex": search, "$options": "i"}},
            {"prompt": {"$regex": search, "$options": "i"}},
            {"style": {"$regex": search, "$options": "i"}}
        ]
        
    if source and source != "all":
        query["source"] = source
        
    cursor = db.descriptions.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    descriptions_list = list(cursor)
    
    # Collect user IDs
    user_ids = {doc.get("user_id") for doc in descriptions_list if doc.get("user_id")}
    
    # Fetch users
    users_cursor = db.users.find({"_id": {"$in": list(user_ids)}}, {"email": 1, "full_name": 1})
    users_map = {doc["_id"]: doc for doc in users_cursor}
    
    results = []
    for doc in descriptions_list:
        user_info = users_map.get(doc.get("user_id"))
        results.append(HistoryItem(
            id=str(doc["_id"]),
            timestamp=doc["timestamp"].isoformat(),
            source=doc.get("source", "unknown"),
            style=doc.get("style", "unknown"),
            summary=doc.get("content", "")[:100] + "..." if len(doc.get("content", "")) > 100 else doc.get("content", ""),
            full_description=doc.get("content", ""),
            image_url=doc.get("image_path"),
            prompt=doc.get("prompt"),
            conversation_id=str(doc.get("conversation_id")) if doc.get("conversation_id") else None,
            user_email=user_info.get("email") if user_info else None,
            user_full_name=user_info.get("full_name") if user_info else None,
            rating=doc.get("rating")
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


from pydantic import BaseModel
class PlanUpdateRequest(BaseModel):
    plan_type: str

@router.put("/users/{user_id}/plan")
async def update_user_plan(
    user_id: str,
    plan_update: PlanUpdateRequest,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    if plan_update.plan_type not in ["free", "plus", "pro", "pro_3m", "pro_6m"]:
        raise HTTPException(status_code=400, detail="Invalid plan type")

    update_data = {"plan_type": plan_update.plan_type}
    from datetime import datetime, timedelta
    
    if plan_update.plan_type != "free":
        update_data["subscription_status"] = "active"
        days = 30
        if plan_update.plan_type == "pro_3m":
            days = 90
        elif plan_update.plan_type == "pro_6m":
            days = 180
        update_data["subscription_end_date"] = datetime.utcnow() + timedelta(days=days)
    else:
        update_data["subscription_status"] = "none"
        update_data["subscription_end_date"] = None

    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": "Plan updated successfully"}



from datetime import datetime, timedelta
from ..schemas import TimeSeriesResponse, TimeSeriesDataPoint

@router.get("/analytics/timeseries", response_model=TimeSeriesResponse)
async def get_timeseries_analytics(
    granularity: str = "day",
    start_date: str = None,
    end_date: str = None,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    """
    Get time series analytics data for:
    - New user registrations
    - Description creations
    - Active users (based on last_login or description activity)
    
    Granularity: hour, day, week, month, year
    """
    # Validate granularity
    valid_granularities = ["hour", "day", "week", "month", "year"]
    if granularity not in valid_granularities:
        raise HTTPException(status_code=400, detail=f"Invalid granularity. Must be one of: {valid_granularities}")
    
    # Parse dates
    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    else:
        end_dt = datetime.utcnow()
    
    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    else:
        # Default to 30 days ago for day/hour, more for larger granularities
        if granularity == "hour":
            start_dt = end_dt - timedelta(days=7)
        elif granularity == "day":
            start_dt = end_dt - timedelta(days=30)
        elif granularity == "week":
            start_dt = end_dt - timedelta(weeks=12)
        elif granularity == "month":
            start_dt = end_dt - timedelta(days=365)
        else:  # year
            start_dt = end_dt - timedelta(days=365 * 3)
    
    # Date format strings for MongoDB
    format_map = {
        "hour": "%Y-%m-%dT%H:00:00",
        "day": "%Y-%m-%d",
        "week": "%Y-W%U",  # Year-Week
        "month": "%Y-%m",
        "year": "%Y"
    }
    date_format = format_map[granularity]
    
    # Aggregation for new registrations
    registrations_pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_dt, "$lte": end_dt}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": date_format,
                        "date": "$created_at"
                    }
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    # Aggregation for descriptions created
    descriptions_pipeline = [
        {
            "$match": {
                "timestamp": {"$gte": start_dt, "$lte": end_dt}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": date_format,
                        "date": "$timestamp"
                    }
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    # Aggregation for active users (users who created descriptions)
    active_users_pipeline = [
        {
            "$match": {
                "timestamp": {"$gte": start_dt, "$lte": end_dt}
            }
        },
        {
            "$group": {
                "_id": {
                    "period": {
                        "$dateToString": {
                            "format": date_format,
                            "date": "$timestamp"
                        }
                    },
                    "user_id": "$user_id"
                }
            }
        },
        {
            "$group": {
                "_id": "$_id.period",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]

    # Aggregation for new pro purchases
    pro_purchases_pipeline = [
        {
            "$match": {
                "status": "completed",
                "plan_type": {"$in": ["pro", "pro_3m", "pro_6m"]},
                "created_at": {"$gte": start_dt.timestamp(), "$lte": end_dt.timestamp()}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": date_format,
                        "date": {"$toDate": {"$multiply": ["$created_at", 1000]}}
                    }
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    # Execute aggregations
    registrations_data = list(db.users.aggregate(registrations_pipeline))
    descriptions_data = list(db.descriptions.aggregate(descriptions_pipeline))
    active_users_data = list(db.descriptions.aggregate(active_users_pipeline))
    pro_purchases_data = list(db.payments.aggregate(pro_purchases_pipeline))
    
    # Convert to dictionaries for easy lookup
    registrations_dict = {item["_id"]: item["count"] for item in registrations_data}
    descriptions_dict = {item["_id"]: item["count"] for item in descriptions_data}
    active_users_dict = {item["_id"]: item["count"] for item in active_users_data}
    pro_purchases_dict = {item["_id"]: item["count"] for item in pro_purchases_data}
    
    # Get all unique timestamps
    all_timestamps = set(registrations_dict.keys()) | set(descriptions_dict.keys()) | set(active_users_dict.keys()) | set(pro_purchases_dict.keys())
    
    # Build response data
    result_data = []
    for timestamp in sorted(all_timestamps):
        result_data.append(TimeSeriesDataPoint(
            timestamp=timestamp,
            new_registrations=registrations_dict.get(timestamp, 0),
            descriptions_created=descriptions_dict.get(timestamp, 0),
            active_users=active_users_dict.get(timestamp, 0),
            new_pro_purchases=pro_purchases_dict.get(timestamp, 0)
        ))
    
    return TimeSeriesResponse(
        data=result_data,
        granularity=granularity
    )

from ..schemas import PaymentItem

@router.get("/payments", response_model=List[PaymentItem])
async def get_all_payments(
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    cursor = db.payments.find({}).sort("created_at", -1).skip(skip).limit(limit)
    payments_list = list(cursor)
    
    # Collect user IDs
    user_ids = {doc.get("user_id") for doc in payments_list if doc.get("user_id")}
    
    # Fetch users
    users_cursor = db.users.find({"_id": {"$in": list(user_ids)}}, {"email": 1, "full_name": 1})
    users_map = {doc["_id"]: doc for doc in users_cursor}
    
    results = []
    for doc in payments_list:
        user_info = users_map.get(doc.get("user_id"))
        
        # Format created_at safely
        created_at_str = ""
        if doc.get("created_at"):
            if isinstance(doc["created_at"], (int, float)):
                from datetime import datetime
                created_at_str = datetime.fromtimestamp(doc["created_at"]).isoformat()
            else:
                created_at_str = str(doc["created_at"])
                
        results.append(PaymentItem(
            id=str(doc["_id"]),
            user_email=user_info.get("email") if user_info else None,
            user_full_name=user_info.get("full_name") if user_info else None,
            payos_order_code=doc.get("payos_order_code"),
            plan_type=doc.get("plan_type", "unknown"),
            amount=doc.get("amount", 0),
            status=doc.get("status", "unknown"),
            created_at=created_at_str
        ))
    return results
