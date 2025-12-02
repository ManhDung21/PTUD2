# 🍎 FruiText AI - Mô Tả Sản Phẩm Trái Cây Tự Động

Ứng dụng web AI thông minh giúp tạo mô tả sản phẩm trái cây chuyên nghiệp cho sàn thương mại điện tử, sử dụng Google Gemini AI với kiến trúc FastAPI + Next.js.

## ✨ Tính năng

### 🎨 Tạo Mô Tả AI
- **Phân tích từ hình ảnh**: Upload hoặc chụp ảnh trái cây, AI tự động tạo mô tả chi tiết
- **Tạo từ text**: Nhập mô tả ngắn gọn, AI mở rộng thành mô tả chuyên nghiệp
- **Đa phong cách viết**: Tiếp thị, Chuyên nghiệp, Thân thiện, Kể chuyện
- **Đánh giá SEO tự động**: Tính điểm SEO và đưa ra gợi ý tối ưu

### 🔊 Tiện ích thông minh
- **Text-to-Speech (TTS)**: Đọc mô tả sản phẩm bằng giọng đọc tự nhiên (Edge-TTS)
- **Chia sẻ mạng xã hội**: Chia sẻ nhanh mô tả và hình ảnh lên Facebook, TikTok

### 👤 Quản Lý Tài Khoản
- **Đăng ký/Đăng nhập**: Hỗ trợ cả **Email** và **Số điện thoại**
- **Xác thực JWT**: Bảo mật với JSON Web Token
- **Quên mật khẩu**: Khôi phục mật khẩu với mã đặt lại
- **Lịch sử cá nhân**: Lưu trữ và xem lại các mô tả đã tạo

## 🔄 Workflow tổng quan

```mermaid
flowchart TD
    subgraph UI[Frontend Next.js]
        A1[1. Người dùng truy cập web/app]
        A2[2. Đăng nhập/đăng ký]
        A3[3. Chọn chế độ: Hình ảnh / Text]
        A4[4. Nhập dữ liệu hoặc chụp ảnh]
        A5[5. Xem kết quả, nghe đọc, chia sẻ]
    end

    subgraph BE[Backend FastAPI]
        B1[6. /auth/login - xác thực JWT]
        B2[7. /api/descriptions/image]
        B3[8. /api/descriptions/text]
        B4[9. /api/tts - Text to Speech]
        B5[10. Lưu lịch sử mô tả]
        B6[11. /api/history]
    end

    subgraph External[External Services]
        C1[Google Gemini API]
        C2[MongoDB Database]
        C3[Cloudinary (Image Storage)]
    end

    A1 --> A2
    A2 -->|Gửi email/mật khẩu| B1
    B1 -->|JWT token| A2
    A2 --> A3
    A3 --> A4

    A4 -->|POST /api/descriptions/image| B2
    A4 -->|POST /api/descriptions/text| B3
    A5 -->|POST /api/tts| B4

    B2 -->|Upload ảnh| C3
    B2 -->|Gọi Gemini phân tích hình| C1
    B3 -->|Gọi Gemini sinh text| C1

    B2 -->|Lưu mô tả| B5
    B3 -->|Lưu mô tả| B5

    B5 -->|Ghi dữ liệu| C2

    A5 -->|GET /api/history| B6
    B6 -->|Đọc dữ liệu| C2
```

## 🚀 Cài đặt

### Yêu cầu hệ thống
- **Python 3.8+** (Backend)
- **Node.js 18+** và **npm** (Frontend)
- **MongoDB** (Local hoặc Atlas)
- Kết nối internet

### Cấu trúc dự án
```
PTUD2/
├── backend/          # FastAPI Backend
│   ├── app/
│   │   ├── db/      # Database connection (MongoDB)
│   │   ├── services/ # Business logic (Gemini, TTS, Cloudinary)
│   │   └── main.py  # API endpoints
│   └── requirements.txt
├── frontend/         # Next.js Frontend
│   ├── app/
│   └── package.json
└── .env             # Environment variables
```

### Các bước cài đặt

1. **Clone hoặc tải project**

2. **Cấu hình API Key**

   Tạo file `.env` ở thư mục gốc và cấu hình các biến sau:
   ```env
   # AI & Database
   GEMINI_API_KEY=AIzaSy...your_api_key
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB=fruitext_db

   # Security
   JWT_SECRET=your_secret_key_here

   # Cloudinary (Lưu trữ ảnh)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Social Sharing (Frontend)
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   NEXT_PUBLIC_FACEBOOK_APP_ID=your_fb_app_id
   NEXT_PUBLIC_TIKTOK_CLIENT_KEY=your_tiktok_key
   ```

3. **Cài đặt Backend**
```bash
# Cài đặt dependencies Python
pip install -r backend/requirements.txt
```

4. **Cài đặt Frontend**
```bash
cd frontend
npm install
cd ..
```

## 📖 Hướng dẫn chạy ứng dụng

### 🔴 Backend (FastAPI)

**Terminal 1:**
```bash
# Windows PowerShell
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Linux/Mac
python -m uvicorn app.main:app --reload --port 8000
```

✅ Backend chạy tại: **http://localhost:8000**  
📄 API Documentation: **http://localhost:8000/docs**

### 🟢 Frontend (Next.js)

**Terminal 2:**
```bash
cd frontend
npm run dev
```

✅ Frontend chạy tại: **http://localhost:3000**

---

## 🎯 Hướng dẫn sử dụng

### 1. Đăng ký/Đăng nhập
- Hỗ trợ đăng ký bằng Email hoặc Số điện thoại.
- Đăng nhập để lưu lịch sử và sử dụng đầy đủ tính năng.

### 2. Tạo mô tả từ hình ảnh
1. Chọn tab "📸 Phân tích hình ảnh".
2. Upload hình hoặc dùng camera chụp ảnh.
3. AI sẽ phân tích và tạo mô tả chi tiết.

### 3. Tạo mô tả từ text
1. Chọn tab "✍️ Tạo từ mô tả text".
2. Nhập thông tin ngắn gọn (VD: "Táo Fuji Nhật, ngọt giòn").
3. AI sẽ viết lại thành bài quảng cáo hấp dẫn.

### 4. Tiện ích khác
- **Nghe đọc**: Nhấn biểu tượng loa để nghe AI đọc mô tả.
- **Chia sẻ**: Nhấn nút chia sẻ để đăng lên Facebook hoặc chuẩn bị nội dung cho TikTok.

## 🛠️ Công nghệ sử dụng

### Backend
- **FastAPI**: Modern Python web framework
- **MongoDB**: NoSQL Database linh hoạt
- **Google Gemini AI**: Model AI đa phương thức
- **Edge-TTS**: Chuyển văn bản thành giọng nói
- **Cloudinary**: Lưu trữ hình ảnh đám mây
- **JWT Authentication**: Xác thực an toàn

### Frontend
- **Next.js 15**: React framework hiện đại
- **TypeScript**: Type-safe JavaScript
- **Axios**: HTTP client
- **Tailwind CSS** (hoặc CSS Modules): Styling

## 📊 API Endpoints

### Authentication
- `POST /auth/register` - Đăng ký
- `POST /auth/login` - Đăng nhập
- `GET /auth/me` - Thông tin user
- `POST /auth/forgot-password` - Quên mật khẩu

### Descriptions
- `POST /api/descriptions/image` - Tạo mô tả từ hình ảnh
- `POST /api/descriptions/text` - Tạo mô tả từ text
- `GET /api/history` - Lịch sử mô tả
- `GET /api/styles` - Danh sách phong cách viết

### Utilities
- `POST /api/tts` - Chuyển văn bản thành giọng nói
- `GET /health` - Health check

**Swagger UI**: http://localhost:8000/docs

## ⚠️ Lưu ý
- Cần có **MongoDB** đang chạy để backend hoạt động.
- API key Gemini có giới hạn requests miễn phí.
- Cấu hình đầy đủ Cloudinary để tính năng upload ảnh hoạt động ổn định nhất.

## 📞 Hỗ trợ
Nếu gặp lỗi, vui lòng kiểm tra:
1. MongoDB đã chạy chưa?
2. Các biến môi trường trong `.env` đã đúng chưa?
3. Port 8000 và 3000 có bị chiếm dụng không?

## 📄 License
MIT License.
