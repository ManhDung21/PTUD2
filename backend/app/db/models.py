"""Type hints for MongoDB documents used in the application."""

from datetime import datetime
from typing import Optional, TypedDict

from bson import ObjectId


class UserDocument(TypedDict, total=False):
    _id: ObjectId
    email: Optional[str]
    phone_number: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    avatar_url: Optional[str]
    role: Optional[str]  # "free", "plus", "pro", "admin"
    stripe_customer_id: Optional[str]
    subscription_status: Optional[str]  # 'active', 'past_due', 'canceled', 'none'
    subscription_end_date: Optional[datetime]
    plan_type: Optional[str]  # 'free', 'plus', 'pro'
    hashed_password: str
    created_at: datetime


class ConversationDocument(TypedDict, total=False):
    _id: ObjectId
    user_id: ObjectId
    title: str
    created_at: datetime
    updated_at: datetime


class DescriptionDocument(TypedDict, total=False):
    _id: ObjectId
    user_id: Optional[ObjectId]
    timestamp: datetime
    source: str
    style: str
    content: str
    image_path: Optional[str]
    content: str
    image_path: Optional[str]
    prompt: Optional[str]
    conversation_id: Optional[ObjectId]


class PasswordResetTokenDocument(TypedDict, total=False):
    _id: ObjectId
    user_id: ObjectId
    token_hash: str
    created_at: datetime
    expires_at: datetime
    expires_at: datetime
    used: bool


class PaymentDocument(TypedDict, total=False):
    _id: ObjectId
    user_id: ObjectId
    stripe_session_id: str
    amount: int
    currency: str
    status: str
    created_at: datetime
