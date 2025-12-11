"""FastAPI application entrypoint backed by MongoDB."""

import re
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageDraw, ImageFont, UnidentifiedImageError
from pymongo.collection import Collection
from pymongo.database import Database

from .config import Settings, get_settings
from .db.models import DescriptionDocument, PasswordResetTokenDocument, UserDocument
from .db.session import get_database, init_db
from .schemas import (
    AvatarUploadResponse,
    ChangePasswordRequest,
    DescriptionResponse,
    ForgotPasswordRequest,
    GenerateTextRequest,
    HistoryItem,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserOut,
)
from .services import auth, content, email as email_service, history as history_service, tts
from .services import cloudinary_service


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


def _ensure_utc_datetime(value: datetime | str | None) -> datetime:
    """Normalize stored timestamps (string or naive datetime) to UTC-aware datetime."""
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        try:
            normalized = value.replace("Z", "+00:00")
            dt = datetime.fromisoformat(normalized)
        except ValueError:
            dt = utc_now()
    else:
        dt = utc_now()

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def is_email(identifier: str) -> bool:
    """Kiểm tra xem identifier có phải là email không."""
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(email_pattern, identifier))


def is_phone_number(identifier: str) -> bool:
    """Kiểm tra xem identifier có phải là số điện thoại không."""
    phone_pattern = r"^[0-9]{10,11}$"
    return bool(re.match(phone_pattern, identifier))


app = FastAPI(title="AI Product Description Service")


@app.get("/")
def root() -> JSONResponse:
    return JSONResponse({"message": "AI Product Description Service đang chạy", "endpoints": ["/health", "/auth", "/api"]})

BASE_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
IMAGES_DIR = BASE_STATIC_DIR / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR = BASE_STATIC_DIR / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=BASE_STATIC_DIR), name="static")


def _users_collection(db: Database) -> Collection:
    return db.get_collection("users")


def _descriptions_collection(db: Database) -> Collection:
    return db.get_collection("descriptions")


def _reset_tokens_collection(db: Database) -> Collection:
    return db.get_collection("password_reset_tokens")


def _find_user_by_identifier(db: Database, identifier: str) -> Optional[UserDocument]:
    users = _users_collection(db)
    if is_email(identifier):
        return users.find_one({"email": identifier.lower()})
    if is_phone_number(identifier):
        return users.find_one({"phone_number": identifier})
    return None


def _token_subject(user: UserDocument) -> str:
    return user.get("email") or user.get("phone_number") or str(user["_id"])


def _user_out(user: UserDocument) -> UserOut:
    created_at = _ensure_utc_datetime(user.get("created_at"))
    return UserOut(
        id=str(user["_id"]),
        email=user.get("email"),
        phone_number=user.get("phone_number"),
        full_name=user.get("full_name"),
        avatar_url=user.get("avatar_url"),
        created_at=created_at.isoformat(),
    )


async def _process_avatar_upload(
    avatar: UploadFile,
    settings: Settings,
) -> str:
    try:
        contents = await avatar.read()
        image = Image.open(BytesIO(contents)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Ảnh đại diện không hợp lệ") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Không thể đọc tệp ảnh đại diện") from exc

    suffix = Path(avatar.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png"}:
        suffix = ".jpg"
    filename = f"{uuid4().hex}{suffix}"

    cloudinary_url: Optional[str] = None
    if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
        cloudinary_url = cloudinary_service.upload_image(image, filename)

    if cloudinary_url:
        return cloudinary_url

    avatar_path = AVATARS_DIR / filename
    save_kwargs = {"format": "PNG" if suffix == ".png" else "JPEG"}
    image.save(avatar_path, **save_kwargs)
    return f"/static/avatars/{filename}"


def _append_user_info(description: str, user: Optional[UserDocument]) -> str:
    if not user:
        return description
    parts: list[str] = []
    full_name = (user.get("full_name") or "").strip()
    email = (user.get("email") or "").strip()
    phone = (user.get("phone_number") or "").strip()

    if full_name:
        parts.append(f"Họ tên: {full_name}")
    if phone:
        parts.append(f"Số điện thoại: {phone}")
    if email:
        parts.append(f"Email: {email}")

    if not parts:
        return description

    footer = "\n\nThông tin người tạo:\n" + "\n".join(parts)
    return description + footer


def _overlay_user_info_on_image(image: Image.Image, user: Optional[UserDocument]) -> Image.Image:
    """Overlay user's full name and phone number onto the top-left corner of an image."""
    if not user:
        return image

    full_name = (user.get("full_name") or "").strip()
    phone = (user.get("phone_number") or "").strip()
    lines: list[str] = []
    if full_name:
        lines.append(f"Họ tên: {full_name}")
    if phone:
        lines.append(f"SĐT: {phone}")

    if not lines:
        return image

    base_image = image.convert("RGBA")
    draw = ImageDraw.Draw(base_image)

    # Dynamic font sizing with safe fallback
    min_dim = min(base_image.size)
    target_size = max(14, int(min_dim * 0.035))
    try:
        font = ImageFont.truetype("arial.ttf", target_size)
    except Exception:
        font = ImageFont.load_default()

    text_padding = 10
    line_spacing = 4

    bboxes = [draw.textbbox((0, 0), line, font=font) for line in lines]
    text_width = max((bbox[2] - bbox[0]) for bbox in bboxes)
    text_height = sum((bbox[3] - bbox[1]) for bbox in bboxes) + line_spacing * (len(lines) - 1)

    box_x = 8
    box_y = 8
    box_width = text_width + text_padding * 2
    box_height = text_height + text_padding * 2

    draw.rectangle(
        [(box_x, box_y), (box_x + box_width, box_y + box_height)],
        fill=(0, 0, 0, 160),
    )

    text_x = box_x + text_padding
    text_y = box_y + text_padding
    for idx, line in enumerate(lines):
        draw.text((text_x, text_y), line, font=font, fill=(255, 255, 255, 230))
        line_height = bboxes[idx][3] - bboxes[idx][1]
        text_y += line_height + line_spacing

    return base_image.convert("RGB")


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    seed_admin_user()
    
    # Configure Cloudinary
    settings = get_settings()
    if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
        cloudinary_service.configure_cloudinary(
            settings.cloudinary_cloud_name,
            settings.cloudinary_api_key,
            settings.cloudinary_api_secret
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://vercel.app",
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> JSONResponse:
    """Simple health-check endpoint."""
    return JSONResponse({"status": "ok"})


def seed_admin_user() -> None:
    db = get_database()
    users = _users_collection(db)
    email = "admin@example.com"
    if users.find_one({"email": email}):
        return
    admin: UserDocument = {
        "email": email,
        "phone_number": None,
        "full_name": "Admin",
        "hashed_password": auth.hash_password("123456"),
        "created_at": utc_now(),
    }
    users.insert_one(admin)


def get_current_user(
    token: Optional[str] = Depends(auth.optional_oauth2_scheme),
    db: Database = Depends(get_database),
) -> UserDocument:
    if not token:
        raise HTTPException(status_code=401, detail="Yêu cầu đăng nhập")
    identifier = auth.decode_access_token(token)
    if not identifier:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    user = _find_user_by_identifier(db, identifier)
    if not user:
        raise HTTPException(status_code=401, detail="Không tìm thấy người dùng")
    return user


def get_admin_user(current_user: UserDocument = Depends(get_current_user)) -> UserDocument:
    """Verify that current user is an admin."""
    if current_user.get("email") != "admin@example.com":
        raise HTTPException(status_code=403, detail="Chỉ admin mới có quyền truy cập")
    return current_user


@app.post("/auth/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Database = Depends(get_database)) -> TokenResponse:
    users = _users_collection(db)
    email = payload.email.strip().lower()
    phone_number = payload.phone_number.strip()
    full_name = payload.full_name.strip()
    avatar_url = payload.avatar_url.strip() if payload.avatar_url else None

    if not is_email(email):
        raise HTTPException(status_code=400, detail="Vui lòng nhập email hợp lệ")
    if not is_phone_number(phone_number):
        raise HTTPException(status_code=400, detail="Vui lòng nhập số điện thoại hợp lệ")

    if users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    if users.find_one({"phone_number": phone_number}):
        raise HTTPException(status_code=400, detail="Số điện thoại đã tồn tại")

    user: UserDocument = {
        "hashed_password": auth.hash_password(payload.password),
        "created_at": utc_now(),
        "email": email,
        "phone_number": phone_number,
        "full_name": full_name,
    }
    if avatar_url:
        user["avatar_url"] = avatar_url
    result = users.insert_one(user)

    token = auth.create_access_token(email or phone_number or str(result.inserted_id))
    return TokenResponse(access_token=token)


@app.post("/auth/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: UserDocument = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    db: Database = Depends(get_database),
) -> AvatarUploadResponse:
    avatar_url = await _process_avatar_upload(file, settings)

    users = _users_collection(db)
    users.update_one({"_id": current_user["_id"]}, {"$set": {"avatar_url": avatar_url}})

    return AvatarUploadResponse(url=avatar_url)


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Database = Depends(get_database)) -> TokenResponse:
    users = _users_collection(db)
    identifier = payload.identifier.strip()

    user = _find_user_by_identifier(db, identifier)

    if not user or not auth.verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Thông tin đăng nhập không chính xác")

    token = auth.create_access_token(_token_subject(user))
    return TokenResponse(access_token=token)


@app.post("/auth/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Database = Depends(get_database),
) -> MessageResponse:
    identifier = payload.identifier.strip()
    if not is_email(identifier):
        raise HTTPException(status_code=400, detail="Vui lòng nhập email hợp lệ")

    users = _users_collection(db)
    tokens = _reset_tokens_collection(db)

    email = identifier.lower()
    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Email chưa được đăng ký")

    tokens.update_many({"user_id": user["_id"], "used": False}, {"$set": {"used": True}})

    code, token_hash = auth.generate_reset_token()
    reset_entry: PasswordResetTokenDocument = {
        "user_id": user["_id"],
        "token_hash": token_hash,
        "created_at": utc_now(),
        "expires_at": utc_now() + timedelta(minutes=30),
        "used": False,
    }
    result = tokens.insert_one(reset_entry)
    reset_entry["_id"] = result.inserted_id

    try:
        mail_sent = email_service.send_password_reset_code(email, code)
    except RuntimeError as exc:
        tokens.delete_one({"_id": reset_entry["_id"]})
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    message = "Đã gửi mã xác thực tới email của bạn."
    if not mail_sent:
        message += " (Chế độ debug: kiểm tra log máy chủ để lấy mã.)"
    return MessageResponse(message=message)


@app.post("/auth/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Database = Depends(get_database),
) -> MessageResponse:
    identifier = payload.identifier.strip()
    if not is_email(identifier):
        raise HTTPException(status_code=400, detail="Vui lòng nhập email hợp lệ")

    users = _users_collection(db)
    tokens = _reset_tokens_collection(db)

    email = identifier.lower()
    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Email chưa được đăng ký")

    token_entry = tokens.find_one(
        {"user_id": user["_id"], "used": False},
        sort=[("created_at", -1)],
    )

    if not token_entry or not auth.match_reset_token(payload.token, token_entry["token_hash"]):
        raise HTTPException(status_code=400, detail="Mã xác thực không hợp lệ")

    expires_at = _ensure_utc_datetime(token_entry.get("expires_at"))
    if expires_at < utc_now():
        tokens.update_one({"_id": token_entry["_id"]}, {"$set": {"used": True}})
        raise HTTPException(status_code=400, detail="Mã xác thực đã hết hạn")

    users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": auth.hash_password(payload.new_password)}},
    )
    tokens.update_one({"_id": token_entry["_id"]}, {"$set": {"used": True}})

    return MessageResponse(message="Mật khẩu đã được đặt lại thành công.")


@app.post("/auth/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> MessageResponse:
    users = _users_collection(db)
    user = users.find_one({"_id": current_user["_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if not auth.verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu hiện tại")

    users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": auth.hash_password(payload.new_password)}},
    )

    return MessageResponse(message="Đã đổi mật khẩu thành công.")


@app.get("/auth/me", response_model=UserOut)
def me(current_user: UserDocument = Depends(get_current_user)) -> UserOut:
    return _user_out(current_user)


@app.put("/auth/profile", response_model=UserOut)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> UserOut:
    users = _users_collection(db)
    updates: dict[str, str] = {}

    if payload.full_name is not None:
        full_name = payload.full_name.strip()
        if len(full_name) < 2:
            raise HTTPException(status_code=400, detail="Họ tên cần ít nhất 2 ký tự")
        updates["full_name"] = full_name

    if payload.email is not None:
        email = payload.email.strip().lower()
        if not is_email(email):
            raise HTTPException(status_code=400, detail="Vui lòng nhập email hợp lệ")
        exists = users.find_one({"email": email, "_id": {"$ne": current_user["_id"]}})
        if exists:
            raise HTTPException(status_code=400, detail="Email đã tồn tại")
        updates["email"] = email

    if payload.phone_number is not None:
        phone = payload.phone_number.strip()
        if not is_phone_number(phone):
            raise HTTPException(status_code=400, detail="Vui lòng nhập số điện thoại hợp lệ")
        exists = users.find_one({"phone_number": phone, "_id": {"$ne": current_user["_id"]}})
        if exists:
            raise HTTPException(status_code=400, detail="Số điện thoại đã tồn tại")
        updates["phone_number"] = phone

    if not updates:
        raise HTTPException(status_code=400, detail="Không có thông tin cập nhật")

    users.update_one({"_id": current_user["_id"]}, {"$set": updates})
    updated = users.find_one({"_id": current_user["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return _user_out(updated)


def get_current_user_optional(
    token: Optional[str] = Depends(auth.optional_oauth2_scheme),
    db: Database = Depends(get_database),
) -> Optional[UserDocument]:
    if not token:
        return None
    identifier = auth.decode_access_token(token)
    if not identifier:
        return None
    return _find_user_by_identifier(db, identifier)


def _store_description(
    descriptions: Collection,
    description: DescriptionDocument,
) -> DescriptionDocument:
    result = descriptions.insert_one(description)
    description["_id"] = result.inserted_id
    return description


@app.post("/api/descriptions/image", response_model=DescriptionResponse)
async def generate_description_from_image(
    file: UploadFile = File(...),
    style: str = Form("Tiếp thị"),
    current_user: Optional[UserDocument] = Depends(get_current_user_optional),
    db: Database = Depends(get_database),
) -> DescriptionResponse:
    settings = get_settings()

    try:
        image_bytes = await file.read()
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Tệp hình ảnh không hợp lệ") from exc

    # Upload image to Cloudinary
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png"}:
        suffix = ".jpg"
    filename = f"{uuid4().hex}{suffix}"
    
    # Try to upload to Cloudinary, fallback to local storage if fails
    cloudinary_url: Optional[str] = None
    processed_image = _overlay_user_info_on_image(image, current_user)
    if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
        cloudinary_url = cloudinary_service.upload_image(processed_image, filename)
    
    # Fallback to local storage if Cloudinary is not configured or upload fails
    image_url: Optional[str] = None
    stored_image_path: Optional[str] = None
    if cloudinary_url:
        image_url = cloudinary_url
        stored_image_path = cloudinary_url
    else:
        # Save locally as fallback
        relative_image_path = Path("images") / filename
        image_path: Optional[Path] = None
        try:
            image_path = IMAGES_DIR / filename
            save_kwargs = {}
            if suffix in {".jpg", ".jpeg"}:
                save_kwargs["format"] = "JPEG"
            elif suffix == ".png":
                save_kwargs["format"] = "PNG"
            processed_image.save(image_path, **save_kwargs)
            if image_path:
                image_url = f"/static/{relative_image_path.as_posix()}"
                stored_image_path = relative_image_path.as_posix()
        except Exception:  # noqa: BLE001
            pass

    try:
        description_text = content.generate_from_image(settings.gemini_api_key, image, style)
    except Exception as e:
        print(f"Gemini Image Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo mô tả từ ảnh: {str(e)}")

    if not description_text:
        raise HTTPException(status_code=502, detail="Không tạo được mô tả từ hình ảnh")

    description_text = _append_user_info(description_text, current_user)

    history_payload = None
    if current_user:
        description_doc: DescriptionDocument = {
            "user_id": current_user["_id"],
            "timestamp": utc_now(),
            "source": "image",
            "style": style,
            "content": description_text,
            "image_path": stored_image_path,
        }
        stored = _store_description(_descriptions_collection(db), description_doc)
        history_payload = history_service.history_item_from_doc(stored)

    return DescriptionResponse(
        description=description_text,
        history_id=history_payload["id"] if history_payload else "",
        timestamp=history_payload["timestamp"] if history_payload else utc_now().isoformat(),
        style=style,
        source="image",
        image_url=history_payload.get("image_url") if history_payload else image_url,
    )


@app.post("/api/descriptions/text", response_model=DescriptionResponse)
async def generate_description_from_text(
    payload: GenerateTextRequest,
    current_user: Optional[UserDocument] = Depends(get_current_user_optional),
    db: Database = Depends(get_database),
) -> DescriptionResponse:
    settings = get_settings()

    try:
        description_text = content.generate_from_text(settings.gemini_api_key, payload.product_info, payload.style)
    except Exception as e:
        print(f"Gemini Text Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo mô tả từ văn bản: {str(e)}")

    if not description_text:
        raise HTTPException(status_code=502, detail="Không tạo được mô tả từ văn bản")

    description_text = _append_user_info(description_text, current_user)

    history_payload = None
    if current_user:
        description_doc: DescriptionDocument = {
            "user_id": current_user["_id"],
            "timestamp": utc_now(),
            "source": "text",
            "style": payload.style,
            "content": description_text,
            "image_path": None,
        }
        stored = _store_description(_descriptions_collection(db), description_doc)
        history_payload = history_service.history_item_from_doc(stored)

    return DescriptionResponse(
        description=description_text,
        history_id=history_payload["id"] if history_payload else "",
        timestamp=history_payload["timestamp"] if history_payload else utc_now().isoformat(),
        style=payload.style,
        source="text",
        image_url=history_payload.get("image_url") if history_payload else None,
    )


@app.get("/api/history", response_model=list[HistoryItem])
def get_history(
    limit: int = 20,
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> list[HistoryItem]:
    """Return recent description history."""
    entries = history_service.get_history_for_user(
        _descriptions_collection(db),
        current_user["_id"],
        limit,
    )
    return [HistoryItem(**entry) for entry in entries]


@app.get("/api/styles")
def get_styles() -> JSONResponse:
    """Return supported writing styles."""
    return JSONResponse(sorted(content.STYLE_PROMPTS.keys()))


@app.get("/users", response_model=list[UserOut])
def get_all_users(
    db: Database = Depends(get_database),
) -> list[UserOut]:
    """Get all users (no authentication required)."""
    users = _users_collection(db).find()
    return [_user_out(user) for user in users]


@app.post("/api/tts")
async def text_to_speech(
    payload: GenerateTextRequest,
    current_user: Optional[UserDocument] = Depends(get_current_user_optional),
) -> StreamingResponse:
    """Generate speech from text using Edge-TTS."""
    # Use product_info as the text to speak
    text = payload.product_info
    if not text:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp văn bản")
        
    try:
        audio_buffer = await tts.generate_speech(text)
    except Exception as e:
        print(f"TTS Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo giọng đọc: {str(e)}")
    
    return StreamingResponse(
        audio_buffer,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "attachment; filename=speech.mp3"}
    )


@app.delete("/api/history/{item_id}")
def delete_history_item(
    item_id: str,
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> JSONResponse:
    """Delete a specific history item."""
    item_id = item_id.strip()
    print(f"DEBUG: API received delete request for item_id: {item_id}")
    success = history_service.delete_history_item(
        _descriptions_collection(db),
        current_user["_id"],
        item_id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục lịch sử hoặc lỗi khi xóa")
    return JSONResponse({"status": "ok", "message": "Đã xóa mục lịch sử"})


@app.delete("/api/history")
def delete_all_history(
    current_user: UserDocument = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> JSONResponse:
    """Delete all history items for the current user."""
    print(f"DEBUG: API received delete ALL request for user {current_user['_id']}")
    count = history_service.delete_all_history(
        _descriptions_collection(db),
        current_user["_id"],
    )
    return JSONResponse({"status": "ok", "message": f"Đã xóa {count} mục lịch sử"})
