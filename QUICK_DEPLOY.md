# 🚀 Hướng dẫn Deploy nhanh (5-10 phút)

## ⚡ BƯỚC 1: Deploy Backend lên Render.com

### 1.1. Mở Render Dashboard
- Mở trình duyệt, truy cập: **https://dashboard.render.com**
- Click **"Get Started for Free"** hoặc **"Sign In"**
- Chọn **"Sign in with GitHub"**
- Cho phép Render truy cập GitHub repositories

### 1.2. Tạo Web Service
1. Click nút **"New +"** (góc trên bên phải)
2. Chọn **"Web Service"**
3. Tìm repository **"PTUD2"** trong danh sách
4. Click **"Connect"**

### 1.3. Cấu hình Service
Điền thông tin như sau:

**Basic Info:**
- **Name**: `fruit-ai-backend` (hoặc tên bạn thích)
- **Region**: `Singapore` (gần VN nhất)
- **Branch**: `main`
- **Runtime**: `Python 3`

**Build & Deploy:**
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`

**Instance Type:**
- Chọn **"Free"** ($0/month)

### 1.4. Environment Variables (QUAN TRỌNG!)
Scroll xuống phần **"Environment Variables"**, click **"Add Environment Variable"** và thêm:

```
GEMINI_API_KEY = (copy từ file .env của bạn)
JWT_SECRET = (copy từ file .env của bạn)
CLOUDINARY_CLOUD_NAME = (copy từ file .env của bạn)
CLOUDINARY_API_KEY = (copy từ file .env của bạn)
CLOUDINARY_API_SECRET = (copy từ file .env của bạn)
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USERNAME = (email của bạn)
SMTP_PASSWORD = (Gmail App Password)
SMTP_SENDER = (email của bạn)
PYTHON_VERSION = 3.11.9
```

⚠️ **Lưu ý**: Copy chính xác từ file `.env` của bạn!

### 1.5. Deploy
1. Click nút **"Create Web Service"** ở cuối trang
2. Chờ 5-10 phút để Render build và deploy
3. Theo dõi logs để xem tiến trình
4. Khi thấy **"Your service is live"** → Thành công! ✅

### 1.6. Lấy Backend URL
- Sau khi deploy xong, bạn sẽ thấy URL dạng:
  ```
  https://fruit-ai-backend-xxxx.onrender.com
  ```
- **Copy URL này** (sẽ cần cho bước 2)
- Test backend bằng cách mở: `https://your-backend-url.onrender.com/health`
- Nếu thấy `{"status":"ok"}` → Backend hoạt động! ✅

---

## ⚡ BƯỚC 2: Deploy Frontend lên Vercel

### 2.1. Login Vercel
Mở terminal và chạy:
```bash
vercel login
```
- Chọn email hoặc GitHub để login
- Trình duyệt sẽ mở, xác nhận login
- Quay lại terminal, thấy "Success!" là OK

### 2.2. Deploy Frontend
```bash
cd frontend
vercel --prod
```

**Khi được hỏi, trả lời như sau:**

1. **Set up and deploy?** → `Y` (Yes)
2. **Which scope?** → Chọn account của bạn (Enter)
3. **Link to existing project?** → `N` (No)
4. **What's your project's name?** → `fruit-ai-frontend` (hoặc tên khác)
5. **In which directory is your code located?** → `.` (Enter)
6. **Want to modify settings?** → `N` (No)

### 2.3. Thêm Environment Variable
Sau khi deploy xong, chạy lệnh này:

```bash
vercel env add NEXT_PUBLIC_API_BASE_URL production
```

Khi được hỏi giá trị, nhập:
```
https://fruit-ai-backend-xxxx.onrender.com
```
(Thay bằng URL backend thật từ Bước 1.6)

### 2.4. Redeploy để áp dụng env
```bash
vercel --prod
```

Chờ 1-2 phút, bạn sẽ có URL dạng:
```
https://fruit-ai-frontend-xxxx.vercel.app
```

✅ **XONG! Mở URL này trong trình duyệt để xem ứng dụng!**

---

## ✅ BƯỚC 3: Test ứng dụng

1. Mở Vercel URL trong trình duyệt
2. Click **"Đăng nhập / Đăng ký"**
3. Đăng ký tài khoản mới
4. Upload 1 ảnh trái cây hoặc nhập text
5. Xem kết quả mô tả AI
6. Kiểm tra lịch sử

Nếu mọi thứ hoạt động → **Thành công!** 🎉

---

## 🐛 Troubleshooting

**Frontend không kết nối được Backend:**
```bash
# Kiểm tra env variable
vercel env ls

# Nếu sai, xóa và thêm lại
vercel env rm NEXT_PUBLIC_API_BASE_URL production
vercel env add NEXT_PUBLIC_API_BASE_URL production
# Nhập đúng URL backend

# Redeploy
vercel --prod
```

**Backend bị sleep (Render Free tier):**
- Render free tier sleep sau 15 phút không dùng
- Lần đầu truy cập sẽ mất 30-60 giây để wake up
- Chờ 1 phút rồi thử lại

**Ảnh không hiển thị:**
- Kiểm tra Cloudinary credentials đã đúng chưa
- Xem logs backend trên Render dashboard

---

## 🎉 Hoàn tất!

App của bạn đã online tại:
- **Frontend**: https://fruit-ai-frontend-xxxx.vercel.app
- **Backend**: https://fruit-ai-backend-xxxx.onrender.com

Chia sẻ link cho bạn bè nhé! 🚀
