from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pymongo.database import Database
import stripe
import os

from ..db.session import get_database
from ..services.auth import get_current_user
from ..db.models import UserDocument
from ..config import get_settings

router = APIRouter(prefix="/api/payments", tags=["payments"])

@router.post("/create-checkout-session")
async def create_checkout_session(
    plan_type: str, # "plus" or "pro"
    current_user: UserDocument = Depends(get_current_user),
    settings = Depends(get_settings)
):
    stripe.api_key = settings.stripe_secret_key
    
    price_id = ""
    if plan_type == "plus":
        price_id = settings.stripe_price_plus_id
    elif plan_type == "pro":
        price_id = settings.stripe_price_pro_id
    else:
        raise HTTPException(status_code=400, detail="Invalid plan type")

    if not price_id:
        print(f"DEBUG: Missing Price ID for plan '{plan_type}'")
        print(f"DEBUG: Settings - Plus ID: {settings.stripe_price_plus_id}, Pro ID: {settings.stripe_price_pro_id}")
        raise HTTPException(status_code=500, detail="Missing pricing configuration")

    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.get("email"),
            line_items=[
                {
                    'price': price_id,
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=settings.frontend_url + '/settings?success=true',
            cancel_url=settings.frontend_url + '/settings?canceled=true',
            metadata={
                "user_id": str(current_user["_id"]),
                "plan_type": plan_type
            }
        )
        return {"url": checkout_session.url}
    except Exception as e:
        print(f"Stripe Checkout Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def webhook_received(request: Request, db: Database = Depends(get_database), settings = Depends(get_settings)):
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET
    request_data = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            request_data, sig_header, webhook_secret
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        # Fulfill the purchase...
        await handle_checkout_session(session, db)
    
    return {"status": "success"}

async def handle_checkout_session(session, db: Database):
    # Logic to update user role based on metadata
    pass
