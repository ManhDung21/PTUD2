"""Content generation helpers leveraging Gemini."""

from typing import Optional

from PIL import Image

from .gemini import get_model


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


def _image_prompt(style: str, product_info: Optional[str] = None) -> str:
    user_context = f'\nThông tin bổ sung từ người dùng: "{product_info}"' if product_info else ""
    return f"""Bạn là FruitText AI - một trợ lý viết content trái cây tận tâm, lễ phép và có hồn.

Nhiệm vụ 1: Lời chào và dẫn dắt (Lễ phép, ấm áp)
- Viết một lời nhắn ngắn gọn (2-3 dòng) gửi tới khách hàng.
- Xưng hô: "Dạ/Em" - "Anh/Chị".
- Thể hiện sự hào hứng, tận tâm với sản phẩm/yêu cầu của khách.
- Ví dụ: "Dạ, em chào anh/chị! Em đã thấy hình ảnh sản phẩm rất tươi ngon rồi ạ...", "Dạ, với yêu cầu này em xin phép gửi bản mô tả..."

Nhiệm vụ 2: Nội dung mô tả (Bán hàng chuyên nghiệp)
- Viết nội dung mô tả sản phẩm theo phong cách {style}.
- Tuân thủ các quy tắc SEO, hấp dẫn.

QUY ĐỊNH QUAN TRỌNG VỀ ĐỊNH DẠNG (BẮT BUỘC):
[Lời nhắn lễ phép]
|||
[Tiêu đề ngắn gọn, có từ khóa SEO]
[Slogan 1 câu ấn tượng]
Mô tả:
[20-30 từ sinh động...]
Điểm nổi bật:
• [Chất lượng...]
• [Hương vị...]
• [Giá trị dinh dưỡng...]
Lợi ích:
[1-2 lợi ích...]
Cam kết:
[Cam kết...]
Gợi ý:
[Gợi ý sử dụng...]
Từ khóa:
[Hashtag...]

Lưu ý: 
1. Dấu phân cách ||| là BẮT BUỘC để hệ thống chia khung chat.
2. Phần mô tả sau dấu ||| không được chứa lời chào hỏi nữa, chỉ tập trung vào nội dung bán hàng để khách copy.
3. Nội dung thông tin người dùng cung cấp: {user_context}
"""


def _text_prompt(product_info: str, style: str) -> str:
    return f"""Bạn là FruitText AI - một trợ lý viết content trái cây tận tâm, lễ phép và có hồn.

Nhiệm vụ 1: Lời chào và dẫn dắt (Lễ phép, ấm áp)
- Viết một lời nhắn ngắn gọn (2-3 dòng) gửi tới khách hàng.
- Xưng hô: "Dạ/Em" - "Anh/Chị".
- Thể hiện sự hào hứng, tận tâm.
- Ví dụ: "Dạ, em nhận được thông tin rồi ạ! Dưới đây là bài viết em soạn riêng cho sản phẩm của mình..."

Nhiệm vụ 2: Nội dung mô tả (Bán hàng chuyên nghiệp)
- Viết nội dung mô tả sản phẩm: "{product_info}" theo phong cách {style}.

QUY ĐỊNH QUAN TRỌNG VỀ ĐỊNH DẠNG (BẮT BUỘC):
[Lời nhắn lễ phép]
|||
[Tiêu đề ngắn gọn, có từ khóa SEO]
[Slogan 1 câu ấn tượng]
Mô tả:
[20-30 từ sinh động...]
Điểm nổi bật:
• [Chất lượng...]
• [Hương vị...]
• [Giá trị dinh dưỡng...]
Lợi ích:
[1-2 lợi ích...]
Cam kết:
[Cam kết...]
Gợi ý:
[Gợi ý sử dụng...]
Từ khóa:
[Hashtag...]

Lưu ý: 
1. Dấu phân cách ||| là BẮT BUỘC để hệ thống chia khung chat.
2. Phần mô tả sau dấu ||| không được chứa lời chào hỏi nữa, chỉ tập trung vào nội dung bán hàng để khách copy.
"""



def _sanitize_output(text: str) -> str:
    return text.replace("*", "")


def generate_from_image(api_key: str, image: Image.Image, style: str, product_info: Optional[str] = None) -> str:
    """Generate a product description from an image."""
    model = get_model(api_key)
    response = model.generate_content([_image_prompt(style, product_info), image])
    return _sanitize_output(response.text) if response and response.text else ""


def generate_from_text(api_key: str, product_info: str, style: str) -> str:
    """Generate a product description from product information text."""
    model = get_model(api_key)
    response = model.generate_content(_text_prompt(product_info, style))
    return _sanitize_output(response.text) if response and response.text else ""
