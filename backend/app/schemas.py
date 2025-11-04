"""Pydantic models for request and response payloads."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class GenerateTextRequest(BaseModel):
    product_info: str = Field(..., min_length=3)
    style: str = Field(default="Tiếp thị")


class DescriptionResponse(BaseModel):
    description: str
    history_id: str
    timestamp: str
    style: str
    source: str
    image_url: Optional[str]


class HistoryItem(BaseModel):
    id: str
    timestamp: str
    source: str
    style: str
    summary: str
    full_description: str
    image_url: Optional[str]


class UserCreate(BaseModel):
    identifier: str  # Email hoặc số điện thoại
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
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


class FacebookShareRequest(BaseModel):
    target: Literal["page", "group"]
    caption: str = Field(..., min_length=3)
    image_url: str = Field(..., min_length=3)
    override_page_id: str | None = None
    override_group_id: str | None = None
    override_page_token: str | None = None
    override_user_token: str | None = None


class FacebookShareResponse(BaseModel):
    message: str
    post_id: Optional[str] = None


class FacebookDeletionResponse(BaseModel):
    status: Literal["success"]
    message: str
    user_id: Optional[str] = None
    confirmation_code: Optional[str] = None
