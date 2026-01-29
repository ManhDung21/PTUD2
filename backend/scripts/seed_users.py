
import os
import sys
from pymongo import MongoClient
from datetime import datetime, timezone
import bcrypt

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_db():
    try:
        from app.core.config import settings
        uri = settings.MONGODB_URI
        db_name = settings.MONGODB_DB
    except:
         # Fallback
        uri = "mongodb://localhost:27017"
        db_name = "ptud2"
        # Check if local .env exists in backend
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        if os.path.exists(env_path):
             with open(env_path) as f:
                for line in f:
                    if line.startswith("MONGODB_URI="):
                        uri = line.strip().split("=", 1)[1].strip('"').strip("'")
                    if line.startswith("MONGODB_DB="):
                        db_name = line.strip().split("=", 1)[1].strip('"').strip("'")

    print(f"Connecting to {uri} (DB: {db_name})")
    client = MongoClient(uri)
    return client[db_name]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def seed():
    db = get_db()
    users = db.users
    
    demo_users = [
        {
            "email": "pro@gmail.com",
            "full_name": "Pro User Demo",
            "password": "111111",
            "role": "user_pro",
            "phone_number": "0999888777"
        },
        {
            "email": "free@gmail.com",
            "full_name": "Free User Demo",
            "password": "111111",
            "role": "user_free",
            "phone_number": "0999111222"
        },
        {
            "email": "user@gmail.com",
            "full_name": "Regular User",
            "password": "111111",
            "role": "user",
            "phone_number": "0999333444"
        },
        {
            "email": "admin@gmail.com",
            "full_name": "Admin User",
            "password": "111111",
            "role": "admin",
            "phone_number": "0999000111"
        }
    ]

    for u in demo_users:
        existing = users.find_one({"email": u["email"]})
        if not existing:
            new_user = {
                "email": u["email"],
                "full_name": u["full_name"],
                "hashed_password": hash_password(u["password"]),
                "role": u["role"],
                "phone_number": u["phone_number"],
                "created_at": datetime.now(timezone.utc),
                "avatar_url": None
            }
            users.insert_one(new_user)
            print(f"Created user: {u['email']} | Role: {u['role']}")
        else:
            # Update role just in case
            users.update_one({"email": u['email']}, {"$set": {"role": u['role']}})
            print(f"Updated user: {u['email']} | Role: {u['role']}")

    print("\nSeeding complete!")

if __name__ == "__main__":
    seed()
