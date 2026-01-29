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
    # Add backend directory to sys.path to allow imports
    sys.path.append(os.path.dirname(os.path.abspath(__file__))) # backend
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # root
    
    uri = None
    try:
        from app.core.config import settings
        uri = settings.MONGODB_URI
        print(f"Loaded URI from app settings: {uri}")
    except ImportError as e:
        print(f"Failed to import settings: {e}")
        # Fallback manual load
        dotenv_path = r"C:\Users\vinht\PTUD2\.env"
        dotenv.load_dotenv(dotenv_path)
        uri = os.getenv("MONGODB_URI")

    if not uri:
        print("URI not found in env/settings. Using Default 127.0.0.1.")
        uri = "mongodb://127.0.0.1:27017"

    print(f"Connecting to MongoDB...")
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Force a connection check
        client.admin.command('ping')
        print("Connected successfully!")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    # Potential DB names
    db_names = ["ptud2", "fruit_text_db", "test_db"]
    
    for db_name in db_names:
        print(f"\n--- Checking database: {db_name} ---")
        db = client[db_name]
        
        # Check users collection
        users = db.users
        target_email = "admin@gmail.com"
        user = users.find_one({"email": target_email})
        
        if user:
            print(f"User found: {target_email} in {db_name}")
            print(f"Current role: {user.get('role')}")
            
            if user.get("role") != "admin":
                print("Updating role to 'admin'...")
                users.update_one({"email": target_email}, {"$set": {"role": "admin"}})
                print("Update complete.")
            else:
                print("User is already admin.")
        else:
            print(f"User {target_email} NOT found in {db_name}.")
        
    # List all admins for verification
    print("\nCurrent Admins:")
    for admin in users.find({"role": "admin"}):
        print(f"- {admin.get('email')} ({admin.get('full_name')})")

if __name__ == "__main__":
    fix_admin()
