from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str = Field(..., validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_API_KEY"))
    jwt_secret: str = Field(..., validation_alias="JWT_SECRET")
    mongodb_uri: str = Field(default="mongodb://localhost:27017", validation_alias="MONGODB_URI")
    mongodb_db: str = Field(default="ptud2", validation_alias="MONGODB_DB")
    debug: bool = Field(default=True)
    app_name: str = Field(default="AI Product Description Generator")
    smtp_host: str | None = Field(default=None, validation_alias="SMTP_HOST")
    smtp_port: int | None = Field(default=None, validation_alias="SMTP_PORT")
    smtp_username: str | None = Field(default=None, validation_alias="SMTP_USERNAME")
    smtp_password: str | None = Field(default=None, validation_alias="SMTP_PASSWORD")
    smtp_sender: str | None = Field(default=None, validation_alias="SMTP_SENDER")
    cloudinary_cloud_name: str | None = Field(default=None, validation_alias="CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key: str | None = Field(default=None, validation_alias="CLOUDINARY_API_KEY")
    cloudinary_api_secret: str | None = Field(default=None, validation_alias="CLOUDINARY_API_SECRET")
    resend_api_key: str | None = Field(default=None, validation_alias="RESEND_API_KEY")
    resend_sender: str | None = Field(default=None, validation_alias="RESEND_SENDER")
    stripe_secret_key: str | None = Field(default=None, validation_alias="STRIPE_SECRET_KEY")
    stripe_publishable_key: str | None = Field(default=None, validation_alias="STRIPE_PUBLISHABLE_KEY")
    stripe_webhook_secret: str | None = Field(default=None, validation_alias="STRIPE_WEBHOOK_SECRET")
    frontend_url: str = Field(default="http://localhost:3000", validation_alias="FRONTEND_URL")
    
    # Pricing IDs
    stripe_price_plus_id: str | None = Field(default=None, validation_alias="STRIPE_PRICE_PLUS_ID")
    stripe_price_pro_id: str | None = Field(default=None, validation_alias="STRIPE_PRICE_PRO_ID")

    # Cấu hình đọc file .env
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
