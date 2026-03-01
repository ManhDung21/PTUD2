"""Content generation helpers leveraging Gemini."""

from typing import Optional
import io
import base64
from PIL import Image
import anthropic

from pymongo.database import Database
from .gemini import get_model
from .market import extract_product_info, get_market_average


STYLE_PROMPTS = {
"Tiếp thị": """
    Viết theo phong cách MARKETING mạnh mẽ và giàu cảm xúc.
    Dùng ngôn từ gợi cảm, kích thích mong muốn sở hữu, nhấn mạnh LỢI ÍCH và GIÁ TRỊ ĐẶC BIỆT của sản phẩm.
    Tạo cảm giác KHAN HIẾM, ĐỘC QUYỀN và thôi thúc hành động (CTA) mạnh mẽ.
    Giọng văn nên ngắn gọn, dồn dập, lôi cuốn như một chiến dịch quảng cáo cao cấp.
""",

"Chuyên nghiệp": """
    Viết theo phong cách CHUYÊN NGHIỆP, đáng tin cậy và chuẩn mực.
    Nhấn mạnh THÔNG TIN CHÍNH XÁC về nguồn gốc, chất lượng, tiêu chuẩn sản xuất và chứng nhận.
    Giọng văn mang tính học thuật nhẹ, thể hiện sự UY TÍN và CAM KẾT của thương hiệu.
    Tránh sáo rỗng, tập trung vào GIÁ TRỊ THỰC và SỰ KHÁC BIỆT của sản phẩm.
""",

"Thân thiện": """
    Viết theo phong cách THÂN THIỆN, tự nhiên và gần gũi như đang trò chuyện với người quen.
    Dùng ngôn từ nhẹ nhàng, dễ hiểu, pha chút hài hước hoặc cảm xúc đời thường.
    Tạo cảm giác TIN CẬY và GẮN KẾT, giúp người đọc thấy bạn đang THẬT LÒNG chia sẻ sản phẩm tốt.
    Giọng văn nên mang năng lượng tích cực, vui vẻ và chân thành.
""",

"Kể chuyện": """
    Viết theo phong cách KỂ CHUYỆN, dẫn dắt bằng cảm xúc và trải nghiệm thực tế.
    Mở đầu bằng một câu chuyện ngắn, gợi tò mò, sau đó khéo léo lồng ghép thông tin sản phẩm.
    Hãy khiến người đọc như đang sống trong câu chuyện đó, cảm nhận được HÀNH TRÌNH và GIÁ TRỊ mà sản phẩm mang lại.
    Kết thúc bằng một thông điệp cảm động hoặc lời kêu gọi tinh tế, khơi gợi mong muốn trải nghiệm.
""",

}


def get_style_prompt(style: str) -> str:
    """Return the Gemini writing style prompt."""
    return STYLE_PROMPTS.get(style, STYLE_PROMPTS["Tiếp thị"])


def _image_prompt(style: str, product_info: Optional[str] = None, user_name: Optional[str] = None, user_tier: str = "free", market_avg: Optional[int] = None) -> str:
    pro_instruction = ""
    market_text = f"\n3. DỮ LIỆU THỊ TRƯỜNG NỘI BỘ: Hiện tại nhà nông trong hệ thống đang bán mặt hàng này dao động quanh mức trung bình {market_avg} VNĐ. Hãy dùng mức giá này rải vào phần Gợi ý." if market_avg else ""
    if user_tier in ["plus", "pro"]:
        pro_instruction = f"""
ĐẶC QUYỀN PRO: 
1. BẠN LÀ CHUYÊN GIA COPYWRITING VÀ KINH DOANH NÔNG SẢN HÀNG ĐẦU VIỆT NAM. Hãy dùng ngôn từ mộc mạc, chân thành đi thẳng vào lòng người mua, mang đậm chất chợ quê hoặc nhà vườn truyền thống Việt Nam. 
2. PHÂN TÍCH THỊ TRƯỜNG VÀ GỢI Ý GIÁ BÁN: Hãy nhìn hình ảnh, tự động phân tích cung cầu, thị hiếu và đưa ra [Gợi ý định giá] hợp lý cho sản phẩm này dựa trên kinh nghiệm. Đặt vào phần 'Gợi ý Giá Bán & Chiến Lược'.{market_text}
"""

    return f"""Bạn là FruitText AI - một trợ lý viết nội dung (content) trái cây tận tâm, tinh tế và thuần Việt.

Thông tin khách hàng: {user_name if user_name else "Chưa rõ tên"}

Nhiệm vụ: PHÂN TÍCH HÌNH ẢNH và YÊU CẦU:
{pro_instruction}

NGUYÊN TẮC CỐT LÕI (BẮT BUỘC):
1. **TRANG TRỌNG TIẾNG VIỆT**: Hạn chế sử dụng tiếng Anh tốn diện tích, chỉ giữ lại các thuật ngữ quen thuộc.
2. **NGẮN GỌN, SÚC TÍCH**: Hãy viết bài thật ngắn gọn, cô đọng (tổng độ dài tối đa chỉ bằng 2/3 so với bình thường). TRÁNH LẶP LẠI các cấu trúc câu cũ rích, lặp ý, hãy dùng ngôn từ thật phong phú, đa dạng.
3. **ĐIỂM NHẤN THỊ GIÁC**: KHÔNG ĐƯỢC DÙNG DẤU SAO (*) để in đậm hay in nghiêng vì hệ thống không hỗ trợ Markdown. Thay vào đó, hãy **VIẾT HOA CÁC TỪ KHÓA QUAN TRỌNG** và sử dụng thật nhiều biểu tượng cảm xúc (EMOJI) 🌈🔥 để làm bài viết thật bắt mắt, sinh động.
4. **ĐỌC VỊ KHÁCH HÀNG**: Quan sát cách khách hàng giao tiếp để điều chỉnh giọng điệu:
   - Nếu họ nhắn ngắn, cộc lốc -> Trả lời điềm đạm, tập trung vào công việc.
   - Nếu họ dùng nhiều icon, teen code -> Trả lời vui vẻ, năng lượng, cực nhiều emoji.
   - Nếu họ nhắn trang trọng, đầy đủ -> Trả lời lễ phép, kính cẩn (Dạ thưa...).

TRƯỜNG HỢP 1: HÌNH ẢNH KHÔNG PHẢI LÀ TRÁI CÂY/MÓN ĂN TỪ TRÁI CÂY
-> Trả lời ngắn gọn, lịch sự từ chối.
-> VD: "Dạ, em rất tiếc nhưng đây không phải là hình ảnh trái cây ạ. Anh/Chị vui lòng gửi lại ảnh đúng chủ đề để em hỗ trợ nhé!"

TRƯỜNG HỢP 2: HÌNH ẢNH LÀ TRÁI CÂY
-> Bước 1: NHẬN DIỆN CHÍNH XÁC loại trái cây trong ảnh.
-> Bước 2: SO SÁNH với yêu cầu của khách (nếu có): "{product_info}"
   - Nếu khách nói sai (VD: khách bảo "táo" nhưng ảnh là "ổi"):
     -> Lời nhắn xã giao PHẢI đính chính khéo léo: "Dạ, em thấy trong hình là quả [Tên thật trong ảnh] chứ không phải [Tên khách nói] ạ. Em xin phép viết bài về [Tên thật trong ảnh] cho chuẩn nhé!"
     -> Nội dung bên dưới viết về [Tên thật trong ảnh].
   - Nếu khách nói đúng hoặc không nhập tên quả:
     -> Lời nhắn xã giao bình thường, khen ngợi vẻ ngon mắt của trái cây trong ảnh.

-> Bước 3: Thực hiện tạo nội dung chuẩn SEO (theo loại quả TRONG ẢNH) với định dạng:

[Lời nhắn xã giao (có đính chính nếu cần)]
|||
[Tiêu đề ngắn gọn, hấp dẫn, chuẩn văn phong Việt Nam]
[Slogan 1 câu ấn tượng]
Mô tả:
[20-30 từ sinh động, hấp dẫn...]
Điểm nổi bật:
• [Chất lượng...]
• [Hương vị...]
• [Giá trị dinh dưỡng...]
Lợi ích:
[Tập trung vào tâm lý người Việt: quà biếu, thắp hương, bổ sung vitamin cho gia đình, giải nhiệt mùa hè...]
Cam kết:
[Cam kết chuẩn người Việt: Bao ăn, bao đổi trả, nguồn gốc rõ ràng, không hóa chất, an toàn cho trẻ nhỏ...]
Gợi ý:
[Gợi ý món ăn Việt: Làm sinh tố, nước ép, chè, gỏi, chưng yến, hoặc bày mâm ngũ quả...]
Liên hệ & Đặt hàng:
[HÃY CUNG CẤP Địa chỉ khu vườn/Mua hàng. Nếu khách CÓ cung cấp địa chỉ, số điện thoại hoặc tên vườn -> HÃY MANG XUỐNG ĐÂY. Nếu KHÔNG -> ĐỂ TRỐNG (đừng bịa ra địa chỉ) HOẶC ghi là "Hãy bình luận để nhận báo giá và địa chỉ mua hàng nhé!"].
Từ khóa:
[Thẻ tag tiếng Việt...]

Lưu ý: 
1. Dấu phân cách ||| là BẮT BUỘC.
2. Nội dung phải THUẦN VIỆT, gần gũi với đời sống người Việt Nam.
3. Nội dung bổ sung: {product_info or "Không có"}
"""


def _text_prompt(product_info: str, style: str, user_name: Optional[str] = None, user_tier: str = "free", market_avg: Optional[int] = None) -> str:
    pro_instruction = ""
    market_text = f"\n3. DỮ LIỆU THỊ TRƯỜNG NỘI BỘ: Hiện tại nhà nông trong hệ thống đang bán mặt hàng này dao động quanh mức trung bình {market_avg} VNĐ. Hãy dùng mức giá này tham chiếu vào phần Gợi ý." if market_avg else ""
    if user_tier in ["plus", "pro"]:
        pro_instruction = f"""
ĐẶC QUYỀN PRO: 
1. BẠN LÀ CHUYÊN GIA COPYWRITING VÀ KINH DOANH NÔNG SẢN HÀNG ĐẦU VIỆT NAM. Hãy dùng ngôn từ mộc mạc, chân thành đi vào lòng người mang đậm chất Việt Nam. 
2. PHÂN TÍCH THỊ TRƯỜNG VÀ GỢI Ý GIÁ BÁN: Hãy tự động phân tích cung cầu, thị hiếu và đưa ra [Gợi ý định giá] hợp lý cho sản phẩm này dựa trên kinh nghiệm. Đặt vào phần 'Gợi ý Giá Bán & Chiến Lược'.{market_text}
"""

    return f"""Bạn là FruitText AI - một trợ lý viết nội dung (content) trái cây tận tâm, tinh tế và thuần Việt.

Thông tin khách hàng: {user_name if user_name else "Chưa rõ tên"}

Nhiệm vụ: PHÂN TÍCH YÊU CẦU NGƯỜI DÙNG: "{product_info}" theo các nguyên tắc sau:
{pro_instruction}

NGUYÊN TẮC CỐT LÕI (BẮT BUỘC):
1. **TRANG TRỌNG TIẾNG VIỆT**: Hạn chế sử dụng tiếng Anh tốn diện tích, chỉ giữ lại các thuật ngữ quen thuộc.
2. **NGẮN GỌN, SÚC TÍCH**: Hãy viết bài thật ngắn gọn, cô đọng (tổng độ dài tối đa chỉ bằng 2/3 so với bình thường). TRÁNH LẶP LẠI các cấu trúc câu cũ rích, lặp ý, hãy dùng từ rực rỡ, mới mẻ.
3. **ĐIỂM NHẤN THỊ GIÁC**: KHÔNG ĐƯỢC DÙNG DẤU SAO (*) để in đậm hay in nghiêng. Thay vào đó, hãy **VIẾT HOA CÁC TỪ KHÓA QUAN TRỌNG** và sử dụng biểu tượng cảm xúc (EMOJI) 🌈🔥 để giúp bài viết thật bắt mắt, sống động.
4. **ĐỌC VỊ KHÁCH HÀNG**: QUAN TRỌNG
   - Input cộc lốc -> Output: Điềm đạm, chuyên nghiệp, ngắn gọn. 
   - Input thân thiện -> Output: Nhẹ nhàng, tình cảm.
   - Input vui vẻ -> Output: Hào hứng, năng lượng, siêu nhiều emoji 😄🍎.

TRƯỜNG HỢP 1: GIAO TIẾP XÃ GIAO / CHÀO HỎI
-> Trả lời tự nhiên theo đúng tông giọng đã phân tích ở trên.
-> KHÔNG dùng dấu phân cách |||

TRƯỜNG HỢP 2: YÊU CẦU VIẾT NỘI DUNG (Content)
-> Thực hiện tạo bài viết theo phong cách {style} với định dạng BẮT BUỘC:

[Lời nhắn xã giao phù hợp tông giọng]
|||
[Tiêu đề ngắn gọn, hấp dẫn, chuẩn văn phong Việt Nam]
[Slogan 1 câu ấn tượng]
Mô tả:
[20-30 từ sinh động...]
Điểm nổi bật:
• [Chất lượng...]
• [Hương vị...]
• [Giá trị dinh dưỡng...]
Lợi ích:
[Tập trung vào tâm lý người Việt: quà biếu, thắp hương, bổ sung vitamin cho gia đình, giải nhiệt...]
Cam kết:
[Cam kết chuẩn người Việt: Bao ăn, bao bù, nguồn gốc vườn nhà, không chất bảo quản...]
Gợi ý:
[Gợi ý món ăn Việt: Làm sinh tố, nước ép, chè, gỏi, bày mâm lễ...]
Liên hệ & Đặt hàng:
[HÃY CUNG CẤP Địa chỉ khu vườn/Mua hàng. Nếu khách CÓ cung cấp địa chỉ, số điện thoại hoặc tên vườn -> HÃY MANG XUỐNG ĐÂY. Nếu KHÔNG -> ĐỂ TRỐNG (đừng bịa ra địa chỉ) HOẶC ghi là "Hãy bình luận để nhận báo giá và địa chỉ mua hàng nhé!"].
Từ khóa:
[Thẻ tag tiếng Việt...]

Lưu ý: 
1. CHỈ dùng dấu phân cách ||| khi viết nội dung bán hàng.
2. Nội dung phải THUẦN VIỆT, đánh đúng tâm lý khách hàng Việt Nam.
"""



def _pil_to_base64(image: Image.Image) -> str:
    buffered = io.BytesIO()
    if image.format == "PNG" or image.mode == "RGBA":
        image = image.convert("RGB")
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def generate_from_image(api_key: str, image: Image.Image, style: str, product_info: Optional[str] = None, user_name: Optional[str] = None, user_tier: str = "free", anthropic_api_key: Optional[str] = None, db: Optional[Database] = None) -> str:
    """Generate a product description from an image."""
    
    market_avg = None
    if user_tier in ["plus", "pro"] and db and product_info:
        # Ngầm lấy giá thị trường
        extracted = extract_product_info(api_key, product_info)
        if extracted:
            market_avg = get_market_average(db, extracted["product_name"])

    prompt = _image_prompt(style, product_info, user_name, user_tier, market_avg)
    
    # Đối với Plus/Pro, dùng Claude nếu có API Key
    if user_tier in ["plus", "pro"] and anthropic_api_key:
        try:
            client = anthropic.Anthropic(api_key=anthropic_api_key)
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": _pil_to_base64(image)
                                }
                            }
                        ]
                    }
                ]
            )
            return _sanitize_output(response.content[0].text)
        except Exception as e:
            print(f"Anthropic Image Error: {e}, falling back to Gemini")

    # Bản Free hoặc Fallback -> dùng Gemini (Bật Search tool nếu là Pro Fallback)
    import google.generativeai as genai
    tools = [genai.protos.Tool(google_search_retrieval=genai.protos.GoogleSearchRetrieval())] if user_tier in ["plus", "pro"] else None
    model_name = "gemini-2.5-pro" if user_tier in ["plus", "pro"] else "gemini-2.5-flash"
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name, tools=tools)
    response = model.generate_content([prompt, image])
    return _sanitize_output(response.text) if response and response.text else ""


def generate_from_text(api_key: str, product_info: str, style: str, user_name: Optional[str] = None, user_tier: str = "free", anthropic_api_key: Optional[str] = None, db: Optional[Database] = None) -> str:
    """Generate a product description from product information text."""
    
    market_avg = None
    if user_tier in ["plus", "pro"] and db and product_info:
        extracted = extract_product_info(api_key, product_info)
        if extracted:
            market_avg = get_market_average(db, extracted["product_name"])

    prompt = _text_prompt(product_info, style, user_name, user_tier, market_avg)

    # Đối với Plus/Pro, dùng Claude nếu có API Key
    if user_tier in ["plus", "pro"] and anthropic_api_key:
        try:
            client = anthropic.Anthropic(api_key=anthropic_api_key)
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return _sanitize_output(response.content[0].text)
        except Exception as e:
            print(f"Anthropic Text Error: {e}, falling back to Gemini")

    import google.generativeai as genai
    tools = [genai.protos.Tool(google_search_retrieval=genai.protos.GoogleSearchRetrieval())] if user_tier in ["plus", "pro"] else None
    model_name = "gemini-2.5-pro" if user_tier in ["plus", "pro"] else "gemini-2.5-flash"
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name, tools=tools)
    response = model.generate_content(prompt)
    return _sanitize_output(response.text) if response and response.text else ""

def generate_chat_title(api_key: str, prompt: str, generated_text: str) -> str:
    """Generate a short chat title based on the user prompt and AI response."""
    model = get_model(api_key)
    instruction = f"Tạo một tiêu đề rất ngắn (2-4 từ) tóm tắt đoạn chat sau. Chỉ trả về tiêu đề, KHÔNG GIẢI THÍCH.\n\nUser: {prompt}\nAI: {generated_text}"
    try:
        response = model.generate_content(instruction)
        if response and response.text:
            title = response.text.replace('"', '').replace('\n', '').strip()
            return title[:50]
    except Exception as e:
        print(f"Error generating chat title: {e}")
    return "Đoạn chat mới"
