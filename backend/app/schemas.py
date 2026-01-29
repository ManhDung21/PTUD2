"""Pydantic models for request and response payloads."""

from typing import Optional, List

from pydantic import BaseModel, Field


class GenerateTextRequest(BaseModel):
    product_info: str = Field(..., min_length=1)
    style: str = Field(default="Tiếp thị")
    conversation_id: Optional[str] = None


class DescriptionResponse(BaseModel):
    description: str
    history_id: str
    timestamp: str
    style: str
    source: str
    image_url: Optional[str]
    image_url: Optional[str]
    prompt: Optional[str] = None
    conversation_id: Optional[str] = None


class HistoryItem(BaseModel):
    id: str
    timestamp: str
    source: str
    style: str
    summary: str
    full_description: str
    image_url: Optional[str]
    image_url: Optional[str]
    prompt: Optional[str] = None
    conversation_id: Optional[str] = None


class Conversation(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class ConversationCreate(BaseModel):
    title: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: str


class RegisterRequest(BaseModel):
    email: str = Field(..., description="Địa chỉ email")
    phone_number: str = Field(..., min_length=10, max_length=11, description="Số điện thoại")
    full_name: str = Field(..., min_length=2, description="Họ tên")
    password: str = Field(min_length=6)
    avatar_url: Optional[str] = Field(default=None, description="Ảnh đại diện (tùy chọn)")


class LoginRequest(BaseModel):
    identifier: str  # Email hoặc số điện thoại
    password: str = Field(min_length=6)


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, description="Họ tên")
    email: Optional[str] = Field(default=None, description="Email")
    phone_number: Optional[str] = Field(default=None, description="Số điện thoại")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "user"
    avatar_url: Optional[str] = None
    created_at: str


class ForgotPasswordRequest(BaseModel):
    identifier: str


class ResetPasswordRequest(BaseModel):
    identifier: str
    token: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=6)
    new_password: str = Field(min_length=6)


class MessageResponse(BaseModel):
    message: str


class AvatarUploadResponse(BaseModel):
    url: str


class RoleUpdateRequest(BaseModel):
    role: str


class TimeSeriesDataPoint(BaseModel):
    timestamp: str
    active_users: int = 0
    descriptions_created: int = 0
    new_registrations: int = 0


class TimeSeriesResponse(BaseModel):
    data: List[TimeSeriesDataPoint]
    granularity: str
