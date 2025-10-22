# 🚀 Hướng dẫn Deploy lên Production

## Tổng quan
- **Backend**: Render.com (miễn phí, hỗ trợ SQLite)
- **Frontend**: Vercel (miễn phí)
- **Image Storage**: Cloudinary

---

## 📦 PHẦN 1: Deploy Backend lên Render.com

### Bước 1: Push code lên GitHub
```bash
git push origin main
```

### Bước 2: Tạo tài khoản Render.com
1. Truy cập: https://render.com
2. Đăng ký bằng GitHub account
3. Cho phép Render truy cập repository của bạn

### Bước 3: Tạo Web Service mới
1. Click **"New +"** → **"Web Service"**
2. Chọn repository **PTUD2**
3. Cấu hình:
   - **Name**: `fruit-description-backend` (hoặc tên bạn muốn)
   - **Region**: Singapore (gần Việt Nam nhất)
   - **Branch**: `main`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

### Bước 4: Thêm Environment Variables
Trong phần **Environment**, thêm các biến sau:

```
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_secret_jwt_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_SENDER=your_email@gmail.com
PYTHON_VERSION=3.11.9
```

⚠️ **LƯU Ý**: 
- Lấy các giá trị từ file `.env` local của bạn
- **GEMINI_API_KEY**: Từ https://makersuite.google.com/app/apikey
- **CLOUDINARY_***: Từ Cloudinary Dashboard
- **SMTP_PASSWORD**: Sử dụng Gmail App Password, không phải mật khẩu thường
- Tạo JWT_SECRET mạnh bằng: `openssl rand -hex 32`

### Bước 5: Deploy
1. Click **"Create Web Service"**
2. Đợi 5-10 phút để build và deploy
3. Khi thành công, bạn sẽ có URL dạng: `https://fruit-description-backend.onrender.com`

### Bước 6: Kiểm tra Backend
Mở trình duyệt và truy cập:
```
https://fruit-description-backend.onrender.com/health
```

Nếu thấy `{"status":"ok"}` → Backend đã hoạt động! ✅

**🔗 LƯU LẠI URL BACKEND NÀY - Bạn sẽ cần nó cho Frontend!**

---

## 🎨 PHẦN 2: Deploy Frontend lên Vercel

### Bước 1: Cài đặt Vercel CLI (Tùy chọn)
```bash
npm install -g vercel
```

### Bước 2: Deploy bằng Vercel Dashboard (Đơn giản hơn)

#### Option A: Deploy qua Vercel Website (Khuyến nghị)
1. Truy cập: https://vercel.com
2. Đăng nhập bằng GitHub
3. Click **"Add New..."** → **"Project"**
4. Import repository **PTUD2**
5. Cấu hình:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

6. **Environment Variables**:
   Click **"Environment Variables"** và thêm:
   ```
   Key: NEXT_PUBLIC_API_BASE_URL
   Value: https://fruit-description-backend.onrender.com
   ```
   ⚠️ **Thay thế bằng URL Backend thật của bạn từ Bước 6 phía trên!**

7. Click **"Deploy"**
8. Đợi 2-3 phút
9. Khi xong, bạn sẽ có URL dạng: `https://your-project.vercel.app`

#### Option B: Deploy qua CLI
```bash
cd frontend
vercel login
vercel --prod
```

Khi được hỏi, nhập environment variable:
```
NEXT_PUBLIC_API_BASE_URL=https://fruit-description-backend.onrender.com
```

### Bước 3: Kiểm tra Frontend
Mở URL Vercel của bạn trong trình duyệt → Ứng dụng phải hoạt động!

---

## ✅ PHẦN 3: Kiểm tra toàn bộ hệ thống

### Test các chức năng:
1. ✅ Mở frontend URL
2. ✅ Đăng ký tài khoản mới
3. ✅ Đăng nhập
4. ✅ Upload ảnh trái cây → Tạo mô tả
5. ✅ Tạo mô tả từ text
6. ✅ Xem lịch sử
7. ✅ Kiểm tra ảnh hiển thị (từ Cloudinary)

---

## 🔧 Troubleshooting

### Backend không hoạt động
1. Kiểm tra logs trên Render Dashboard
2. Đảm bảo tất cả Environment Variables đã được thêm
3. Kiểm tra `/health` endpoint

### Frontend không gọi được API
1. Mở Developer Tools (F12) → Console
2. Kiểm tra lỗi CORS
3. Đảm bảo `NEXT_PUBLIC_API_BASE_URL` đúng với Backend URL
4. Redeploy frontend nếu cần: `vercel --prod`

### Ảnh không hiển thị
1. Kiểm tra Cloudinary credentials trong Render environment variables
2. Xem logs backend để kiểm tra upload

### Database bị reset
- Render Free tier có thể sleep sau 15 phút không hoạt động
- Database SQLite có thể bị xóa khi service restart
- **Giải pháp**: Nâng cấp lên paid plan hoặc chuyển sang PostgreSQL

---

## 📝 Lưu ý quan trọng

1. **Render Free tier**:
   - Service sleep sau 15 phút không dùng
   - Lần đầu truy cập sau khi sleep sẽ mất 30-60 giây để wake up
   - Database SQLite CÓ THỂ bị mất khi redeploy

2. **Vercel Free tier**:
   - 100GB bandwidth/tháng
   - Serverless Functions: 100 giờ/tháng
   - Đủ cho development và demo

3. **Bảo mật**:
   - Đổi `JWT_SECRET` thành giá trị ngẫu nhiên mạnh
   - Không commit API keys vào Git
   - Sử dụng environment variables cho tất cả secrets

4. **Performance**:
   - Lần đầu mở app có thể chậm (Render cold start)
   - Cloudinary cache ảnh tự động
   - Next.js optimize static assets

---

## 🎉 Hoàn thành!

Bây giờ ứng dụng của bạn đã online:
- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `https://fruit-description-backend.onrender.com`

Chia sẻ URL với bạn bè và enjoy! 🚀
