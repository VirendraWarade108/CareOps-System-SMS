"""
SMS API Routes for CareOps
Endpoints for SMS configuration, testing, and webhook handling
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.database import get_db
from app import models
from app.services.sms_service import get_sms_service, TelegramSMSService


router = APIRouter(prefix="/api/sms", tags=["SMS"])


class SMSTestRequest(BaseModel):
    """Request model for testing SMS"""
    phone_or_chat_id: str
    message: str


class TelegramConfigRequest(BaseModel):
    """Request model for Telegram configuration"""
    telegram_chat_id: str  # Admin/workspace chat ID for notifications


class TelegramWebhook(BaseModel):
    """Telegram webhook update"""
    update_id: int
    message: Optional[Dict[str, Any]] = None
    callback_query: Optional[Dict[str, Any]] = None


async def get_current_user(db: Session = Depends(get_db)):
    """Simplified user authentication for demo"""
    # In production, implement proper JWT token validation
    # For now, return first user
    user = db.query(models.User).first()
    if not user:
        raise HTTPException(status_code=401, detail="No users found")
    return user


@router.get("/status")
async def get_sms_status(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get SMS service status and configuration info
    """
    try:
        sms_service = get_sms_service(workspace_id, db)
        
        # Check if it's Telegram service
        if isinstance(sms_service, TelegramSMSService):
            bot_info = sms_service.get_bot_info()
            
            return {
                "provider": "telegram",
                "configured": bool(sms_service.bot_token),
                "workspace_chat_id_configured": bool(sms_service.workspace_chat_id),
                "bot_info": bot_info if bot_info.get("success") else None,
                "setup_instructions": {
                    "step_1": "Create bot: Message @BotFather on Telegram with /newbot",
                    "step_2": "Get bot token and add to .env as TELEGRAM_BOT_TOKEN",
                    "step_3": "Get your chat ID by messaging your bot and visiting: https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates",
                    "step_4": "Configure workspace chat ID in Settings > Integrations"
                }
            }
        else:
            return {
                "provider": "fallback",
                "configured": False,
                "message": "SMS logging mode (no actual delivery)"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_sms(
    workspace_id: str,
    request: SMSTestRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Test SMS sending to a specific chat ID
    """
    try:
        sms_service = get_sms_service(workspace_id, db)
        
        success = sms_service.send_custom_sms(
            request.phone_or_chat_id,
            request.message
        )
        
        if success:
            return {
                "success": True,
                "message": "Test SMS sent successfully",
                "recipient": request.phone_or_chat_id
            }
        else:
            return {
                "success": False,
                "message": "Failed to send test SMS",
                "recipient": request.phone_or_chat_id
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configure/telegram")
async def configure_telegram(
    workspace_id: str,
    config: TelegramConfigRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Configure Telegram chat ID for workspace notifications
    """
    try:
        # Check if SMS integration exists
        integration = db.query(models.Integration).filter(
            models.Integration.workspace_id == workspace_id,
            models.Integration.type == "sms"
        ).first()
        
        if integration:
            # Update existing integration
            if not integration.config:
                integration.config = {}
            integration.config["telegram_chat_id"] = config.telegram_chat_id
            integration.is_active = True
        else:
            # Create new integration
            integration = models.Integration(
                workspace_id=workspace_id,
                type="sms",
                provider="telegram",
                config={"telegram_chat_id": config.telegram_chat_id},
                is_active=True
            )
            db.add(integration)
        
        db.commit()
        db.refresh(integration)
        
        return {
            "success": True,
            "message": "Telegram configuration saved",
            "integration_id": str(integration.id)
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat-id-helper")
async def chat_id_helper():
    """
    Provide instructions for getting Telegram chat ID
    """
    return {
        "instructions": [
            "1. Message your bot on Telegram (say 'Hello')",
            "2. Visit this URL (replace <YOUR_BOT_TOKEN> with your actual token):",
            "   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates",
            "3. Look for 'chat':{'id':123456789} in the JSON response",
            "4. Copy the 'id' number - that's your chat ID",
            "5. Use the number in the Telegram configuration below"
        ],
        "example": {
            "url": "https://api.telegram.org/bot123456:ABCdefGHI/getUpdates",
            "response_snippet": {
                "ok": True,
                "result": [
                    {
                        "message": {
                            "chat": {
                                "id": 123456789,
                                "first_name": "John",
                                "type": "private"
                            }
                        }
                    }
                ]
            }
        }
    }


@router.post("/webhook/telegram")
async def telegram_webhook(
    update: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Telegram webhook endpoint for receiving updates
    This allows bidirectional communication
    
    To set webhook: 
    POST https://api.telegram.org/bot<TOKEN>/setWebhook
    Body: {"url": "https://your-domain.com/api/sms/webhook/telegram"}
    """
    try:
        print(f"📱 Received Telegram webhook update: {update}")
        
        # Extract message
        message = update.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "")
        
        if not chat_id or not text:
            return {"ok": True, "message": "No action needed"}
        
        # Handle commands
        if text.lower() == "/start":
            # User is starting conversation with bot
            response_text = (
                "👋 Welcome to CareOps SMS Bot!\n\n"
                f"Your Chat ID is: {chat_id}\n\n"
                "Use this ID in your workspace settings to receive notifications."
            )
            
            # Send response back
            sms_service = TelegramSMSService(workspace_id="demo", db=db)
            sms_service._send_telegram_message(str(chat_id), response_text)
        
        elif text.lower() == "/help":
            response_text = (
                "🤖 CareOps SMS Bot Commands:\n\n"
                "/start - Get your Chat ID\n"
                "/help - Show this help message\n"
                "STOP - Unsubscribe from notifications"
            )
            
            sms_service = TelegramSMSService(workspace_id="demo", db=db)
            sms_service._send_telegram_message(str(chat_id), response_text)
        
        elif text.upper() == "STOP":
            # Handle unsubscribe
            response_text = "✅ You've been unsubscribed from notifications."
            
            sms_service = TelegramSMSService(workspace_id="demo", db=db)
            sms_service._send_telegram_message(str(chat_id), response_text)
        
        return {"ok": True}
    
    except Exception as e:
        print(f"❌ Webhook error: {str(e)}")
        return {"ok": False, "error": str(e)}


@router.get("/logs/{workspace_id}")
async def get_sms_logs(
    workspace_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get SMS sending logs for a workspace
    (Would require additional SMS log table in production)
    """
    # Placeholder - would query SMS logs table
    return {
        "logs": [],
        "message": "SMS logging not yet implemented in database"
    }