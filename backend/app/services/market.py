import re
from datetime import datetime, timezone
import google.generativeai as genai

from pymongo.database import Database
from typing import Optional, Dict, Any

def extract_product_info(api_key: str, user_prompt: str) -> Optional[Dict[str, Any]]:
    """
    Dùng Gemini Flash (nhanh) để trích xuất tên sản phẩm và giá bán từ prompt của người dùng (cả bản free và pro).
    Trả về Dict: {"product_name": "Sầu riêng Ri6", "price": 65000} hoặc None nếu không có giá.
    """
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        instruction = f"""
Trích xuất tên nông sản và mức giá được nhắc đến trong đoạn text sau. 
Nếu có giá, hãy chuyển nó về dạng số nguyên (VD: 65k -> 65000).
Nếu không có giá bán, trả về "None".
Định dạng trả về duy nhất (không giải thích):
Tên: [Tên sản phẩm]
Giá: [Số nguyên]

Text: "{user_prompt}"
"""
        response = model.generate_content(instruction)
        text = response.text.strip()
        
        if "None" in text or not text:
            return None
            
        name_match = re.search(r"Tên:\s*(.*)", text)
        price_match = re.search(r"Giá:\s*(\d+)", text)
        
        if name_match and price_match:
            return {
                "product_name": name_match.group(1).strip().lower(),
                "price": int(price_match.group(1))
            }
    except Exception as e:
        print(f"Lỗi trích xuất thông tin thị trường: {e}")
    return None

def store_market_data(db: Database, api_key: str, user_prompt: str, user_id: str):
    """
    Sẽ đc chạy bất đồng bộ để phân tích và lưu giá người dùng mong muốn vào CSDL
    """
    extracted = extract_product_info(api_key, user_prompt)
    if not extracted:
        return
        
    try:
        db.get_collection("market_prices").insert_one({
            "product_name": extracted["product_name"],
            "price": extracted["price"],
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc)
        })
    except Exception as e:
        print(f"Lỗi lưu dữ liệu thị trường: {e}")


def get_market_average(db: Database, product_name: str) -> Optional[int]:
    """
    Tính trung bình giá của tất cả nỗ lực đăng bán sản phẩm này trong hệ thống
    """
    try:
        pipeline = [
            {"$match": {"product_name": {"$regex": product_name, "$options": "i"}}},
            {"$group": {"_id": None, "avg_price": {"$avg": "$price"}, "count": {"$sum": 1}}}
        ]
        result = list(db.get_collection("market_prices").aggregate(pipeline))
        if result and result[0]["count"] >= 3: # Ít nhất 3 người đăng mới tham chiếu
            return int(result[0]["avg_price"])
    except Exception:
        pass
    return None
