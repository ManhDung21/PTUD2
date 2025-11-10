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


def _image_prompt(style: str) -> str:
    return f"""Viết mô tả bán hàng cho sản phẩm TRÁI CÂY trong hình ảnh.(nhận diện hình ảnh nếu không phải hình ảnh hãy trả lại cho tôi câu nói"Ảnh bạn cung cấp không phải là trái cây tôi không thể tạo mô tả!!") 
{get_style_prompt(style)}

Trả về theo định dạng:

🎯 [Tiêu đề ngắn gọn, có từ khóa SEO]
✨ [Slogan 1 câu ấn tượng]
📝 Mô tả:
[20-40 từ sinh động về trải nghiệm, nguồn gốc, hương vị và lợi ích]
💎 Điểm nổi bật(ngắn gọn 20-25 từ):
• [Chất lượng/quy trình]
• [Hương vị đặc trưng]
• [Giá trị dinh dưỡng]
🌟 Lợi ích:
(Ngắn gọn súc tích khoảng 10-20 từ)
[1-2 lợi ích thực tế]
🎁 Cam kết :
(ngắn gọn 10- 20 từ khoá)
[Chất lượng, giao hàng, hỗ trợ]
🍽️ Gợi ý(ngắn gọn 10-20 từ):
[1-2 cách sử dụng]
#️⃣ Từ khóa:
[1-2 hashtag/từ khóa]
Viết TIẾNG VIỆT tự nhiên, giàu cảm xúc. Không dùng dấu *.
"""


def _text_prompt(product_info: str, style: str) -> str:
    return f"""Viết mô tả hấp dẫn cho sản phẩm: "{product_info}" 
{get_style_prompt(style)}

Trả về theo định dạng:

🎯 [Tiêu đề ngắn gọn, có từ khóa SEO]
✨ [Slogan 1 câu sáng tạo]
📝 Mô tả:
[30-40 từ khơi gợi cảm xúc về nguồn gốc, hương vị, giá trị và lợi ích]
💎 Điểm nổi bật(ngắn gọn 20-25 từ):
• [Chất lượng/quy trình]
• [Hương vị đặc trưng]
• [Giá trị dinh dưỡng]
🌟 Lợi ích:
(Ngắn gọn súc tích)
[1-2 lợi ích thực tế]
🎁 Cam kết :
(ngắn gọn 10- 20 từ khoá)
[Chất lượng, giao hàng, hỗ trợ]
🍽️ Gợi ý(ngắn gọn 10-20 từ):
[1-2 cách sử dụng]
#️⃣ Từ khóa:
[1-2 hashtag/từ khóa]
Viết TIẾNG VIỆT tự nhiên, giàu cảm xúc. Không dùng dấu *.
"""



def _sanitize_output(text: str) -> str:
    return text.replace("*", "")


def generate_from_image(api_key: str, image: Image.Image, style: str) -> str:
    """Generate a product description from an image."""
    model = get_model(api_key)
    response = model.generate_content([_image_prompt(style), image])
    return _sanitize_output(response.text) if response and response.text else ""


def generate_from_text(api_key: str, product_info: str, style: str) -> str:
    """Generate a product description from product information text."""
    model = get_model(api_key)
    response = model.generate_content(_text_prompt(product_info, style))
    return _sanitize_output(response.text) if response and response.text else ""
