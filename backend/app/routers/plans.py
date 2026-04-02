from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..db.session import get_database, Database
from ..services.auth import get_current_user
from ..db.models import UserDocument

router = APIRouter()

class PlanFeature(BaseModel):
    text: str

class Plan(BaseModel):
    id: str
    name: str
    price: str
    period: str
    description: str
    features: List[str]
    color: str
    badge: Optional[str] = None
    buttonText: str
    amount_vnd: int  # Numeric amount for payment processing

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[str] = None
    period: Optional[str] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    color: Optional[str] = None
    badge: Optional[str] = None
    buttonText: Optional[str] = None
    amount_vnd: Optional[int] = None


DEFAULT_PLANS = [
    {
        "id": "free",
        "name": "Free",
        "price": "0đ",
        "period": "/tháng",
        "description": "Dành cho người mới bắt đầu",
        "features": [
            "5 lượt tạo mỗi ngày",
            "Tốc độ cơ bản",
            "Quảng cáo hiển thị",
            "Không hỗ trợ ưu tiên"
        ],
        "color": "gray",
        "buttonText": "Gói hiện tại",
        "amount_vnd": 0
    },
    {
        "id": "plus",
        "name": "Plus",
        "price": "99.000đ",
        "period": "/tháng",
        "description": "Cho người dùng thường xuyên",
        "features": [
            "50 lượt tạo mỗi ngày",
            "Tốc độ nhanh",
            "Không quảng cáo",
            "Hỗ trợ qua email"
        ],
        "color": "blue",
        "buttonText": "Nâng cấp Plus",
        "amount_vnd": 2000
    },
    {
        "id": "pro",
        "name": "Pro",
        "price": "199.000đ",
        "period": "/tháng",
        "description": "Sức mạnh không giới hạn",
        "features": [
            "Không giới hạn lượt tạo",
            "Tốc độ siêu tốc (Turbo)",
            "Tạo ảnh chất lượng cao 4K",
            "Hỗ trợ ưu tiên 24/7"
        ],
        "color": "purple",
        "badge": "Phổ biến nhất",
        "buttonText": "Nâng cấp Pro",
        "amount_vnd": 4000
    },
    {
        "id": "pro_3m",
        "name": "Pro (3 Tháng)",
        "price": "649.000đ",
        "period": "/3 tháng",
        "description": "Tiết kiệm 15%",
        "features": [
            "Tất cả tính năng Pro",
            "Không giới hạn lượt tạo",
            "Tạo ảnh chất lượng cao 4K",
            "Hỗ trợ ưu tiên 24/7"
        ],
        "color": "pink",
        "badge": "Tiết kiệm",
        "buttonText": "Mua 3 tháng",
        "amount_vnd": 6000
    },
    {
        "id": "pro_6m",
        "name": "Pro (6 Tháng)",
        "price": "1.119.000đ",
        "period": "/6 tháng",
        "description": "Tiết kiệm 25%",
        "features": [
            "Tất cả tính năng Pro",
            "Không giới hạn lượt tạo",
            "Tạo ảnh chất lượng cao 4K",
            "Hỗ trợ ưu tiên 24/7"
        ],
        "color": "rose",
        "badge": "Giá tốt nhất",
        "buttonText": "Mua 6 tháng",
        "amount_vnd": 8000
    }
]

@router.get("/")
def get_plans(db: Database = Depends(get_database)):
    plans = list(db.plans.find({}, {"_id": 0}))
    if not plans:
        # Seed default plans if none exist
        db.plans.insert_many(DEFAULT_PLANS)
        plans = DEFAULT_PLANS
    # Ensure they are sorted somehow, or just return as is
    # Let's sort based on predefined order
    order = ["free", "plus", "pro", "pro_3m", "pro_6m"]
    plans.sort(key=lambda x: order.index(x["id"]) if x["id"] in order else 99)
    return plans

def get_admin_user(current_user: UserDocument = Depends(get_current_user)) -> UserDocument:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.put("/{plan_id}")
def update_plan(
    plan_id: str,
    plan_update: PlanUpdate,
    db: Database = Depends(get_database),
    admin: UserDocument = Depends(get_admin_user)
):
    update_data = {k: v for k, v in plan_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided to update")

    result = db.plans.update_one({"id": plan_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    return {"message": "Plan updated successfully", "updated": update_data}
