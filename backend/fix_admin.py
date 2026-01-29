from app.db.database import get_database, _users_collection
import asyncio

def fix_admin():
    print("Fixing admin user role...")
    db = get_database()
    users = _users_collection(db)
    result = users.update_one(
        {"email": "admin@example.com"},
        {"$set": {"role": "admin"}}
    )
    print(f"Matched: {result.matched_count}, Modified: {result.modified_count}")

if __name__ == "__main__":
    fix_admin()
