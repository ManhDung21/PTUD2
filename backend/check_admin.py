import sys
import os
from pymongo import MongoClient
import dotenv

# Load environment variables
dotenv.load_dotenv()

# Setup path to leverage app modules if needed, but direct connection is safer for a script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Dummy env vars if missing (same trick as before)
os.environ.setdefault("GEMINI_API_KEY", "dummy")
os.environ.setdefault("JWT_SECRET", "dummy")

def fix_admin():
    # Get URI from env or default
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    client = MongoClient(uri)
    db = client["fruit_text_db"]  # Adjust db name if different
    
    # Check users collection
    users = db.users
    
    target_email = "admin@gmail.com"
    user = users.find_one({"email": target_email})
    
    if user:
        print(f"User found: {target_email}")
        print(f"Current role: {user.get('role')}")
        
        if user.get("role") != "admin":
            print("Updating role to 'admin'...")
            users.update_one({"email": target_email}, {"$set": {"role": "admin"}})
            print("Update complete.")
        else:
            print("User is already admin.")
    else:
        print(f"User {target_email} NOT found in database.")
        
    # List all admins for verification
    print("\nCurrent Admins:")
    for admin in users.find({"role": "admin"}):
        print(f"- {admin.get('email')} ({admin.get('full_name')})")

if __name__ == "__main__":
    fix_admin()
