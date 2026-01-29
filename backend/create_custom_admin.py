import sys
import os

# Ensure the backend directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))

# Inject dummy env vars for pydantic validation if missing
if "GEMINI_API_KEY" not in os.environ:
    os.environ["GEMINI_API_KEY"] = "dummy_key_for_script"
if "JWT_SECRET" not in os.environ:
    os.environ["JWT_SECRET"] = "dummy_secret_for_script"

sys.path.append(current_dir)

from app.db.session import get_database, init_db
from app.services.auth import hash_password, _users_collection
from datetime import datetime, timezone

def create_admin():
    print("Initializing database...")
    init_db()
    db = get_database()
    users = _users_collection(db)
    
    email = "admin@gmail.com"
    password = "111111"
    
    print(f"Checking for user: {email}")
    existing_user = users.find_one({"email": email})
    
    if existing_user:
        print(f"User {email} exists. Updating password and role...")
        users.update_one(
            {"email": email},
            {"$set": {
                "hashed_password": hash_password(password),
                "role": "admin"
            }}
        )
        print("Updated successfully.")
    else:
        print(f"Creating new user {email}...")
        user_data = {
            "email": email,
            "phone_number": None,
            "full_name": "Admin User",
            "hashed_password": hash_password(password),
            "role": "admin",
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc),
        }
        users.insert_one(user_data)
        print("Created successfully.")

if __name__ == "__main__":
    create_admin()
