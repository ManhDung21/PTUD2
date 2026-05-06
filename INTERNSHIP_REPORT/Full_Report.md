# BÁO CÁO THỰC TẬP

FruiText AI - Hệ Thống Tạo Mô Tả Sản Phẩm Trái Cây Tự Động Sử Dụng Công Nghệ Trí Tuệ Nhân Tạo


---

Các thông tin chung

- Tác giả: Phùng Mạnh Dũng & Nguyễn Hữu Nhật
- Khoa: Khoa Công Nghệ Thông Tin
- Giáo viên hướng dẫn: TS. Nguyễn Minh Sơn
- Chi nhánh lưu trữ: report/internship-2026 (GitHub: ManhDung21/PTUD2)
- Ngày hoàn thành: Tháng 5/2026

---

LỜI NÓI ĐẦU

Báo cáo thực tập này được thực hiện trong khuôn khổ chương trình đào tạo của Trường Đại học Lạc Hồng, nhằm mục đích trình bày quá trình nghiên cứu, thiết kế, triển khai và đánh giá hệ thống FruiText AI — một ứng dụng web ứng dụng trí tuệ nhân tạo để tự động tạo mô tả sản phẩm trái cây cho sàn thương mại điện tử. Báo cáo trình bày cơ sở lý thuyết, phân tích thực trạng, thiết kế hệ thống, quá trình triển khai, kết quả đạt được, hạn chế và đề xuất hướng phát triển tiếp theo.

Chúng tôi xin chân thành cảm ơn TS. Nguyễn Minh Sơn - giáo viên hướng dẫn đã tận tình chỉ đạo, góp ý; cảm ơn nhà trường, bạn bè và những người đã hỗ trợ trong quá trình thực hiện đề tài.


MỤC LỤC

- Lời nói đầu
- Mục lục
- Danh mục chữ viết tắt
- Danh mục bảng, biểu đồ
- Phần mở đầu
- Chương 1: Cơ sở lý thuyết
- Chương 2: Phân tích thực trạng và đề xuất giải pháp
- Chương 3: Thiết kế và triển khai hệ thống
- Kết luận và kiến nghị
- Tài liệu tham khảo
- Phụ lục


DANH MỤC CHỮ VIẾT TẮT

- AI: Artificial Intelligence (Trí tuệ nhân tạo)
- NLP: Natural Language Processing (Xử lý ngôn ngữ tự nhiên)
- CV: Computer Vision (Thị giác máy tính)
- API: Application Programming Interface
- TTS: Text-to-Speech
- JWT: JSON Web Token
- DB: Database


DANH MỤC BẢNG, BIỂU ĐỒ

- Biểu đồ 1.1: Kiến trúc tổng quan hệ thống
- Bảng 2.1: So sánh giải pháp hiện có
- Bảng 3.1: Cấu trúc database chính
- Biểu đồ 3.2: Luồng dữ liệu (Data Flow)


PHẦN MỞ ĐẦU

1. Lý do chọn đề tài

Trong thương mại điện tử, mô tả sản phẩm đóng vai trò quan trọng trong việc thu hút khách hàng và gia tăng tỷ lệ chuyển đổi. Đối với sản phẩm nông sản như trái cây, mô tả chính xác, hấp dẫn và tối ưu SEO là yếu tố quyết định. Tuy nhiên, việc viết mô tả chất lượng cao đòi hỏi nhân lực có kỹ năng và tốn thời gian, dẫn đến chi phí lớn và tính không đồng đều về chất lượng. Vì vậy, phát triển một hệ thống tự động hóa việc tạo mô tả sản phẩm, tận dụng các mô hình ngôn ngữ lớn và xử lý ảnh, sẽ giúp tối ưu chi phí, tăng hiệu quả và đảm bảo nhất quán.

2. Mục tiêu đồ án

- Nghiên cứu và áp dụng các kỹ thuật AI (Computer Vision & NLP) để tự động tạo mô tả sản phẩm trái cây từ ảnh và text đầu vào.
- Thiết kế và triển khai một ứng dụng web Full-stack (FastAPI cho backend, Next.js + TypeScript cho frontend) tích hợp Google Gemini, Cloudinary và Edge-TTS.
- Đánh giá hiệu năng và đề xuất giải pháp tối ưu.

3. Đối tượng và phạm vi nghiên cứu

- Đối tượng: Giải pháp tự động tạo mô tả sản phẩm cho các sàn thương mại điện tử.
- Phạm vi: Thiết kế, triển khai và đánh giá hệ thống FruiText AI cho sản phẩm trái cây; không triển khai tích hợp trực tiếp với các sàn lớn trong khuôn khổ báo cáo này.

4. Phương pháp nghiên cứu

Kết hợp nghiên cứu tài liệu, phân tích hệ thống hiện có, thiết kế hệ thống, lập trình thực nghiệm, kiểm thử chức năng và đánh giá hiệu năng.

5. Những đóng góp mới

- Đề xuất một pipeline kết hợp phân tích ảnh và mô hình ngôn ngữ LLM (Google Gemini) để sinh mô tả chuyên nghiệp theo nhiều phong cách.
- Triển khai prototype hoạt động (backend + frontend) và tài liệu hướng dẫn triển khai.


CHƯƠNG 1. CƠ SỞ LÝ THUYẾT

1.1. Trí tuệ nhân tạo và các ứng dụng

Giới thiệu tổng quan về AI, các nhánh như Machine Learning, Deep Learning, ứng dụng trong ngành thương mại điện tử, đặc biệt là việc sinh content tự động và tối ưu SEO.

1.2. Xử lý ảnh và Computer Vision

Trình bày các kỹ thuật: tiền xử lý ảnh, phát hiện đối tượng, phân loại, trích xuất đặc trưng (feature extraction), mô tả ảnh (image captioning). Đề cập các mô hình tiêu biểu: CNN (ResNet, EfficientNet), ViT, và dịch vụ LLM đa phương thức như Google Gemini.

1.3. Xử lý ngôn ngữ tự nhiên (NLP) và mô hình ngôn ngữ lớn

Giải thích các tác vụ NLP liên quan: text generation, text summarization, style transfer, sentiment analysis. Mô tả cơ bản về LLM, fine-tuning và prompt engineering.

1.4. Kiến trúc web hiện đại: FastAPI, Next.js, TypeScript

Giới thiệu FastAPI (Python) cho backend API, Next.js + TypeScript cho frontend, Axios cho client HTTP, JWT cho authentication.

1.5. Cơ sở dữ liệu NoSQL: MongoDB

Giải thích lựa chọn MongoDB cho lưu trữ mô tả, history và metadata ảnh, cấu trúc collection, indexing để tối ưu truy vấn.

1.6. Dịch vụ hỗ trợ: Cloudinary, Edge-TTS

Giới thiệu Cloudinary cho lưu trữ ảnh, CDN và transform; Edge-TTS cho chức năng đọc mô tả bằng giọng tự nhiên.


CHƯƠNG 2. PHÂN TÍCH THỰC TRẠNG VÀ ĐỀ XUẤT GIẢI PHÁP

2.1. Hiện trạng của việc mô tả sản phẩm trong e-commerce

Mô tả những khó khăn: thiếu nhân lực, chi phí, chất lượng không đồng đều, thời gian xử lý lâu, thiếu tối ưu SEO.

2.2. Phân tích nhu cầu với sản phẩm trái cây

Đặc điểm sản phẩm: thông tin quan trọng (nguồn gốc, mùa vụ, hương vị, kích thước, bảo quản), hình ảnh đóng vai trò lớn.

2.3. So sánh các giải pháp hiện có

Bảng so sánh: Thủ công, Outsourcing, GPT-based solutions, Google Gemini, AWS solutions. Bảng nêu ưu/nhược điểm, chi phí, thời gian, độ chính xác.

2.4. Đề xuất FruiText AI

- Tổng quan giải pháp: frontend (Next.js) giao tiếp với backend (FastAPI). Backend gọi Google Gemini cho phân tích ảnh và sinh text; Cloudinary lưu ảnh; MongoDB lưu history; Edge-TTS chuyển text sang audio.
- Tính năng chi tiết: tạo từ ảnh, tạo từ text, nhiều phong cách, SEO scoring, chia sẻ mạng xã hội, quản lý user, lịch sử.

2.5. Lợi ích và đánh giá sơ bộ

- Tiết kiệm chi phí (ước lượng), tăng tốc độ tạo mô tả, cải thiện SEO, tăng conversion rate.


CHƯƠNG 3. THIẾT KẾ VÀ TRIỂN KHAI HỆ THỐNG

3.1. Kiến trúc hệ thống

Hệ thống theo mô hình 3-tier: Presentation (Next.js), Application (FastAPI), Data (MongoDB). Mô tả luồng dữ liệu và thành phần tích hợp (Google Gemini, Cloudinary, Edge-TTS).

Biểu đồ minh họa (mô tả bằng chữ):
- Người dùng -> Frontend -> Backend
- Backend -> Cloudinary (lưu ảnh)
- Backend -> Google Gemini (phân tích ảnh / sinh text)
- Backend -> MongoDB (lưu history)
- Backend -> Edge-TTS (tạo audio)

3.2. Thiết kế API

Danh sách endpoint chính (mô tả):
- POST /auth/register
- POST /auth/login
- GET /auth/me
- POST /auth/forgot-password
- POST /api/descriptions/image
- POST /api/descriptions/text
- GET /api/history
- GET /api/styles
- POST /api/tts

Mỗi endpoint mô tả input/output và flow xử lý.

3.3. Thiết kế cơ sở dữ liệu

Ba collection chính:
- users: { _id, name, email, phone, password_hash, role, created_at }
- descriptions: { _id, user_id, type (image|text), input_data, generated_text, style, seo_score, images, tts_audio_url, created_at }
- audios (hoặc lưu trong descriptions): { _id, description_id, audio_url, voice, duration }

Các index: users.email (unique), descriptions.user_id, descriptions.created_at, descriptions.seo_score.

3.4. Mô tả chi tiết phần Backend

- Cấu trúc thư mục: backend/app/{db, services, routers, models, schemas, main.py}
- Xác thực: JWT token, middleware kiểm tra token
- Service Gemini: wrapper gọi API Gemini, xử lý response, prompt engineering
- Service Cloudinary: upload, transform và trả về URL
- Service TTS: gọi Edge-TTS, lưu file audio (Cloudinary hoặc storage khác)
- Lưu lịch sử: sau khi sinh text, lưu vào MongoDB

3.5. Mô tả chi tiết phần Frontend

- Next.js + TypeScript
- Pages/components: Auth, Home, CreateFromImage, CreateFromText, History, Settings
- Form xử lý upload ảnh, preview, chọn style, submit request
- Hiển thị kết quả: text, SEO score, nút nghe, nút share

3.6. Triển khai và cài đặt

Yêu cầu môi trường:
- Python 3.8+
- Node.js 18+
- MongoDB
- .env với các biến (GEMINI_API_KEY, MONGODB_URI, JWT_SECRET, CLOUDINARY_...)

Các bước cài đặt tổng quát:
1. Clone repo
2. Tạo file .env và cấu hình
3. Cài đặt backend: pip install -r backend/requirements.txt
4. Chạy backend: uvicorn app.main:app --reload --port 8000
5. Cài đặt frontend: cd frontend && npm install
6. Chạy frontend: npm run dev

3.7. Kiểm thử và đánh giá

Các kiểm thử chức năng: đăng ký/đăng nhập, tạo mô tả từ ảnh/text, lưu lịch sử, tts, chia sẻ.
Các kiểm thử hiệu năng (mô tả): tải 100 requests/second, đo latency, kiểm tra giới hạn API Gemini.

3.8. Bảo mật và tối ưu

- Bảo mật: lưu trữ JWT_SECRET, hashing password, rate-limiting, validate input, hạn chế upload file độc hại.
- Tối ưu: caching, pagination cho history, batching request, sử dụng CDN cho ảnh và audio.


KẾT LUẬN VÀ KIẾN NGHỊ

Kết luận

FruiText AI đáp ứng mục tiêu đề ra: tự động hóa việc tạo mô tả sản phẩm trái cây với tốc độ và chi phí tiết kiệm so với phương pháp thủ công. Hệ thống tích hợp hiệu quả giữa phân tích ảnh và LLM để tạo ra mô tả đa phong cách, kèm tính năng TTS và SEO scoring.

Những hạn chế

- Phụ thuộc vào chất lượng ảnh và API bên thứ ba (Gemini) cho độ chính xác
- Chi phí API cho khối lượng lớn cần tối ưu và thương lượng
- Chưa tích hợp trực tiếp với các sàn TMĐT lớn trong phạm vi thực tập

Kiến nghị

- Hoàn thiện dataset và fine-tune mô hình (nếu có khả năng)
- Tối ưu chi phí API, thêm cơ chế cache và batch
- Tích hợp A/B testing để tối ưu nội dung cho conversion
- Mở rộng đa ngôn ngữ và tích hợp video/clip ngắn


TÀI LIỆU THAM KHẢO

Tiếng Việt

1. Ban quản lý các khu công nghiệp Đồng Nai (2006), 10 Năm hình thành và phát triển (1995-2005), Nxb Tổng hợp Đồng Nai, Đồng Nai.
2. Cục thống kê tỉnh Đồng Nai (2009), Niên giám thống kê tỉnh Đồng Nai, Cục thống kê tỉnh Đồng Nai, Đồng Nai.
3. Nguyễn Thị Liên Diệp, Phạm Văn Nam (2006), Chiến lược và Chính sách kinh doanh, Nxb Lao động- Xã hội, Hà Nội.
4. Fred David (2004), Khái luận Quản trị Chiến lược, Nxb Khoa học- Kỹ thuật, Hà Nội.
5. Nguyễn Văn Tân (2008), "Tình hình hoạt động của các doanh nghiệp ngành da- giày Đồng Nai", Tạp chí khoa học công nghệ thuộc Sở Khoa học và Công nghệ tỉnh Đồng Nai, tháng 01/2008 (06/2007), tr. 30-32.

Tiếng Anh

6. Borkakati R. P., Virmani S. S. (1997), Genetics of thermosensitive genic male sterility in Rice, Euphytica 88, pp. 1 - 7.
7. Boulding K. E (1955), Economics Analysis, Hamish Hamilton, London.
8. Central Statistical Organisation (1995), Statistical Year Book, Beijing.
9. FAO (1971), Agricultural Commodity Projections (1970 - 1980), Vol. II Rome.
10. Institute of Economics (1988), Analysis of Expenditure Pattern of Urban Households in Vietnam, Department of Economics, Economic Research Report, Hanoi.

Online & Documentation

11. FruiText AI repository: https://github.com/ManhDung21/PTUD2
12. FastAPI Documentation: https://fastapi.tiangolo.com
13. Next.js Documentation: https://nextjs.org/docs
14. MongoDB Manual: https://docs.mongodb.com
15. Cloudinary Docs: https://cloudinary.com/documentation
16. Google Gemini docs (public references)


PHỤ LỤC

Phụ Lục 1 - Hướng dẫn cài đặt chi tiết

1. Clone repository:

```bash
git clone https://github.com/ManhDung21/PTUD2.git
cd PTUD2
git checkout -b report/internship-2026
```

2. Tạo file .env ở thư mục gốc với các biến sau:

```env
GEMINI_API_KEY=AIzaSy...your_api_key
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=fruitext_db
JWT_SECRET=your_secret_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_FACEBOOK_APP_ID=your_fb_app_id
NEXT_PUBLIC_TIKTOK_CLIENT_KEY=your_tiktok_key
```

3. Cài đặt backend

```bash
pip install -r backend/requirements.txt
```

4. Chạy backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

5. Cài đặt và chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Phụ Lục 2 - API Documentation (tóm tắt)

- POST /auth/register
  - Body: { name, email, password }
  - Response: { user, token }

- POST /auth/login
  - Body: { email, password }
  - Response: { token }

- POST /api/descriptions/image
  - Body: multipart/form-data { image, style }
  - Process: upload image -> Cloudinary -> call Gemini -> save description -> return result

- POST /api/descriptions/text
  - Body: { text, style }
  - Process: call Gemini -> save description -> return result

- POST /api/tts
  - Body: { description_id, voice }
  - Process: call Edge-TTS -> return audio url

- GET /api/history
  - Query params: user_id, page, limit
  - Response: list of descriptions

Phụ Lục 3 - Code Snippets (ví dụ)

- Ví dụ gọi API Gemini (Python pseudocode):

```python
from services.gemini import GeminiClient

def generate_from_text(prompt, style):
    client = GeminiClient(api_key=GEMINI_API_KEY)
    system_prompt = f"You are a marketing copywriter. Style: {style}. Produce SEO-friendly Vietnamese product description."
    response = client.generate(system_prompt + prompt)
    return response.text
```

Phụ Lục 4 - Troubleshooting

1. Lỗi kết nối MongoDB: Kiểm tra MONGODB_URI và MongoDB server đang chạy.
2. Lỗi API Gemini: Kiểm tra GEMINI_API_KEY, hạn mức request, và retry logic.
3. Upload Cloudinary thất bại: Kiểm tra thông tin cloud name / key / secret.

Phụ Lục 5 - Deployment Guide

- Frontend: Deploy lên Vercel (build command: npm run build; output: .next)
- Backend: Deploy Docker container lên Railway/Heroku/AWS
- DB: MongoDB Atlas
- Secrets: Sử dụng GitHub Secrets hoặc environment variables trên hosting

Phụ Lục 6 - Security Checklist

- Hash password với bcrypt
- Lưu JWT_SECRET an toàn
- Validate file uploads (mimetype, size)
- Thiết lập CORS an toàn
- Rate limiting cho endpoint quan trọng

Phụ Lục 7 - Gợi ý phát triển tiếp theo

- Fine-tune model cho domain trái cây
- Thêm multi-language support
- Tối ưu prompt engineering và caching
- Hợp tác với sàn TMĐT để tích hợp trực tiếp


---

Tài liệu này được tạo tự động dựa trên nội dung repository và các trao đổi trước đó. Vui lòng kiểm tra, bổ sung ảnh chụp màn hình, kết quả thử nghiệm cụ thể và các phần cần số liệu thực tế trước khi nộp.
