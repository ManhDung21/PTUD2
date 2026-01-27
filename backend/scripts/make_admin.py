import os
import sys
from pymongo import MongoClient

def load_env():
    # Helper to load .env manually to avoid dependencies
    # Script location: backend/scripts/make_admin.py
    # .env location: root (.env)
    
    # Go up 2 levels: scripts -> backend -> root
    # Wait, previous logic was 3 levels. backend/scripts/make_admin.py:
    # dirname = backend/scripts
    # dirname = backend
    # dirname = root
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(os.path.dirname(current_dir)) # backend -> root
    
    env_path = os.path.join(root_dir, '.env')
    
    config = {}
    if os.path.exists(env_path):
        print(f"Loading config from {env_path}")
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'): continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    else:
        print(f"Warning: .env not found at {env_path}, using defaults")
        
    return config

def make_admin(email_or_phone):
    config = load_env()
    uri = config.get("MONGODB_URI", "mongodb://localhost:27017")
    db_name = config.get("MONGODB_DB", "ptud2")

    print(f"Connecting to MongoDB...")
    try:
        client = MongoClient(uri)
        db = client[db_name]
        users = db.users
        
        # Check connection
        client.admin.command('ping')
        print("Connected successfully.")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return False

    print(f"Searching for user: {email_or_phone}")
    user = users.find_one({
        "$or": [
            {"email": email_or_phone}, 
            {"phone_number": email_or_phone}
        ]
    })
    
    if not user:
        print(f"❌ User not found: {email_or_phone}")
        print("Available users:")
        for u in users.find().limit(5):
            print(f"- {u.get('email')} ({u.get('role', 'user')})")
        return False

    current_role = user.get("role", "user")
    if current_role == "admin":
        print(f"ℹ️ User {email_or_phone} is already an admin.")
        return True

    users.update_one({"_id": user["_id"]}, {"$set": {"role": "admin"}})
    print(f"✅ Successfully promoted {user.get('email', 'user')} to admin!")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\nUsage: python backend/scripts/make_admin.py <email_or_phone>")
        print("Example: python backend/scripts/make_admin.py myemail@example.com\n")
        sys.exit(1)
    
    make_admin(sys.argv[1])
