from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pymongo.database import Database
import stripe
import os
import time
import json
import hmac
import hashlib
import uuid
import httpx
from datetime import datetime, timedelta

from payos import PayOS
from payos.type import ItemData, PaymentData

from ..db.session import get_database
from ..services.auth import get_current_user
from ..db.models import UserDocument
from ..config import get_settings

router = APIRouter()

@router.post("/create-checkout-session")
async def create_checkout_session(
    plan_type: str, # "plus" or "pro"
    current_user: UserDocument = Depends(get_current_user),
    settings = Depends(get_settings),
    db: Database = Depends(get_database)
):
    stripe.api_key = settings.stripe_secret_key
    
    price_id = ""
    if plan_type == "plus":
        price_id = settings.stripe_price_plus_id
    elif plan_type == "pro":
        price_id = settings.stripe_price_pro_id
    elif plan_type == "pro_3m":
        price_id = getattr(settings, 'stripe_price_pro_3m_id', settings.stripe_price_pro_id)
    elif plan_type == "pro_6m":
        price_id = getattr(settings, 'stripe_price_pro_6m_id', settings.stripe_price_pro_id)
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

        db["payments"].insert_one({
            "user_id": current_user["_id"],
            "stripe_session_id": checkout_session.id,
            "plan_type": plan_type,
            "amount": checkout_session.amount_total if hasattr(checkout_session, 'amount_total') else 0,
            "currency": "vnd",
            "status": "pending",
            "created_at": time.time()
        })

        return {"url": checkout_session.url}
    except Exception as e:
        print(f"Stripe Checkout Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-momo-payment")
async def create_momo_payment(
    plan_type: str, # "plus" or "pro"
    current_user: UserDocument = Depends(get_current_user),
    settings = Depends(get_settings),
    db: Database = Depends(get_database)
):
    if not settings.momo_partner_code or not settings.momo_access_key or not settings.momo_secret_key:
        raise HTTPException(status_code=500, detail="Chưa cấu hình API MoMo (Vui lòng thiết lập MOMO_PARTNER_CODE, v.v...)")

    endpoint = "https://test-payment.momo.vn/v2/gateway/api/create"
    partnerCode = settings.momo_partner_code
    accessKey = settings.momo_access_key
    secretKey = settings.momo_secret_key

    # Tự động nhận diện Backend URL khi Deploy (qua NEXT_PUBLIC_API_BASE_URL)
    backend_url = os.environ.get("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8000")
    ipnUrl = f"{backend_url.rstrip('/')}/api/payments/momo-webhook" 

    plan_doc = db.plans.find_one({"id": plan_type})
    if plan_doc and "amount_vnd" in plan_doc:
        amount_val = plan_doc["amount_vnd"]
        orderInfo = f"Mua {plan_doc.get('name', plan_type)}"
    else:
        # Fallback if plans not in DB
        orderInfo = "Mua Gói Plus" if plan_type == "plus" else "Mua Gói Pro 3 Tháng" if plan_type == "pro_3m" else "Mua Gói Pro 6 Tháng" if plan_type == "pro_6m" else "Mua Gói Pro"
        amount_mapping = {"plus": 2000, "pro": 4000, "pro_3m": 6000, "pro_6m": 8000}
        amount_val = amount_mapping.get(plan_type, 4000)
    
    amount = str(amount_val)
    redirectUrl = settings.frontend_url + '/settings?success=true'
    orderId = str(uuid.uuid4())
    requestId = str(uuid.uuid4())
    requestType = "captureWallet"
    extraData = ""

    # Generate Momo Signature
    rawSignature = f"accessKey={accessKey}&amount={amount}&extraData={extraData}&ipnUrl={ipnUrl}&orderId={orderId}&orderInfo={orderInfo}&partnerCode={partnerCode}&redirectUrl={redirectUrl}&requestId={requestId}&requestType={requestType}"
    h = hmac.new(bytes(secretKey, 'utf-8'), bytes(rawSignature, 'utf-8'), hashlib.sha256)
    signature = h.hexdigest()

    data = {
        'partnerCode': partnerCode,
        'partnerName': "FruitText",
        'storeId': "MomoTestStore",
        'requestId': requestId,
        'amount': amount,
        'orderId': orderId,
        'orderInfo': orderInfo,
        'redirectUrl': redirectUrl,
        'ipnUrl': ipnUrl,
        'lang': 'vi',
        'extraData': extraData,
        'requestType': requestType,
        'signature': signature
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(endpoint, json=data)
            response_data = response.json()
            
            if response_data.get('resultCode') == 0:
                db["payments"].insert_one({
                    "user_id": current_user["_id"],
                    "momo_order_id": orderId,
                    "plan_type": plan_type,
                    "amount": int(amount),
                    "currency": "vnd",
                    "status": "pending",
                    "created_at": time.time()
                })
                return {"url": response_data.get('payUrl')}
            else:
                raise HTTPException(status_code=400, detail=response_data.get('message', 'MoMo error'))
    except Exception as e:
        print(f"MoMo Checkout Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-payos-payment")
async def create_payos_payment(
    plan_type: str, # "plus" or "pro"
    current_user: UserDocument = Depends(get_current_user),
    settings = Depends(get_settings),
    db: Database = Depends(get_database)
):
    if not settings.payos_client_id or not settings.payos_api_key or not settings.payos_checksum_key:
        raise HTTPException(status_code=500, detail="Chưa cấu hình API PayOS (Vui lòng thiết lập PAYOS_CLIENT_ID, v.v...)")

    payos = PayOS(
        client_id=settings.payos_client_id,
        api_key=settings.payos_api_key,
        checksum_key=settings.payos_checksum_key
    )

    # Lấy thông tin giá từ DB
    plan_doc = db.plans.find_one({"id": plan_type})
    if plan_doc and "amount_vnd" in plan_doc:
        amount = plan_doc["amount_vnd"]
        plan_name = plan_doc.get("name", plan_type)
    else:
        # TEST MODE: Hao mức tiền xuống 2.000đ để test (PayOS yêu cầu tối thiểu là 2.000đ)
        amount_mapping = {"plus": 2000, "pro": 4000, "pro_3m": 6000, "pro_6m": 8000}
        amount = amount_mapping.get(plan_type, 2000)
        plan_name = "Gói Plus" if plan_type == "plus" else "Gói Pro 3 Tháng" if plan_type == "pro_3m" else "Gói Pro 6 Tháng" if plan_type == "pro_6m" else "Gói Pro"
    
    order_code = int(time.time() * 1000) % 9007199254740991

    item = ItemData(name=plan_name, quantity=1, price=amount)
    
    payment_data = PaymentData(
        orderCode=order_code,
        amount=amount,
        description=f"Thanh toan {plan_name}".replace(" ", "")[:25], # Ensure safe string
        items=[item],
        cancelUrl=settings.frontend_url + '/?canceled=true',
        returnUrl=settings.frontend_url + '/?success=true'
    )

    try:
        payos_create_payment = payos.createPaymentLink(payment_data)

        # Trạng thái pending, lưu orderCode để webhook có thể check lại
        db["payments"].insert_one({
            "user_id": current_user["_id"],
            "payos_order_code": order_code,
            "plan_type": plan_type,
            "amount": amount,
            "currency": "vnd",
            "status": "pending",
            "created_at": time.time()
        })

        return {"url": payos_create_payment.checkoutUrl}
    except Exception as e:
        print(f"PayOS Checkout Error: {e}")
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
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        await handle_stripe_checkout(session, db)
    
    return {"status": "success"}

@router.post("/payos-webhook")
async def payos_webhook_received(request: Request, db: Database = Depends(get_database), settings = Depends(get_settings)):
    try:
        data = await request.json()
        
        payos = PayOS(
            client_id=settings.payos_client_id,
            api_key=settings.payos_api_key,
            checksum_key=settings.payos_checksum_key
        )
        
        # In production, verify the webhook signature here.
        webhook_data = payos.verifyPaymentWebhookData(data)
        
        if webhook_data.code == "00" or data.get("code") == "00":
            order_code = webhook_data.orderCode
        
            # Find the pending payment
            payment = db["payments"].find_one({"payos_order_code": order_code, "status": "pending"})
            
            if payment:
                await handle_successful_payment(
                    user_id=payment["user_id"],
                    plan_type=payment["plan_type"],
                    db=db,
                    payment_id=payment["_id"],
                    is_stripe=False
                )

        return {"success": True}
    except Exception as e:
        print("Payos Webhook Exception:", str(e))
        return {"success": False}


@router.post("/momo-webhook")
async def momo_webhook_received(request: Request, db: Database = Depends(get_database), settings = Depends(get_settings)):
    try:
        data = await request.json()
        
        # Verify signature using settings.momo_secret_key
        order_info = data.get('orderInfo')
        amount = data.get('amount')
        order_id = data.get('orderId')
        result_code = data.get('resultCode')
        
        # Note: In production you MUST verify the signature from MoMo here.
        # Check if transaction is successful
        if result_code == 0: 
            # Find pending payment
            payment = db["payments"].find_one({"momo_order_id": order_id, "status": "pending"})
            
            if payment:
                await handle_successful_payment(
                    user_id=payment["user_id"],
                    plan_type=payment["plan_type"],
                    db=db,
                    payment_id=payment["_id"],
                    is_stripe=False
                )
                
        # Momo requires status 204 No Content for ipnUrl but standard json response also works
        return {"message": "Success"}
    except Exception as e:
        print("Momo Webhook Exception:", str(e))
        raise HTTPException(status_code=400, detail="Invalid request")


async def handle_stripe_checkout(session, db: Database):
    user_id_str = session.get('metadata', {}).get('user_id')
    plan_type = session.get('metadata', {}).get('plan_type')
    
    from bson import ObjectId
    
    if user_id_str and plan_type:
        payment = db["payments"].find_one({"stripe_session_id": session.id})
        if payment:
            await handle_successful_payment(
                user_id=ObjectId(user_id_str),
                plan_type=plan_type,
                db=db,
                payment_id=payment["_id"],
                is_stripe=True
            )

async def handle_successful_payment(user_id, plan_type: str, db: Database, payment_id, is_stripe: bool):
    # 1. Update Payment Status
    db["payments"].update_one(
        {"_id": payment_id},
        {"$set": {"status": "completed"}}
    )
    
    # 2. Update User Plan
    now = datetime.utcnow()
    # Determine adding days by plan
    days = 30
    if plan_type == "pro_3m":
        days = 90
    elif plan_type == "pro_6m":
        days = 180
    end_date = now + timedelta(days=days)
    
    display_plan = "pro" if plan_type in ["pro_3m", "pro_6m"] else plan_type
    
    db["users"].update_one(
        {"_id": user_id},
        {"$set": {
            "role": "user",
            "plan_type": display_plan,      # Gói hiển thị
            "subscription_status": "active",
            "subscription_end_date": end_date
        }}
    )
    print(f"DEBUG: Tự động nâng cấp tài khoản {user_id} lên {plan_type} thành công.")
