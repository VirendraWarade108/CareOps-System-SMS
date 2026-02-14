"""
FREE SMS Service for CareOps using Telegram Bot API
Provides unlimited free SMS-like notifications via Telegram
"""

import requests
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.config import settings
from app import models


class TelegramSMSService:
    """
    Free SMS service using Telegram Bot API
    
    Setup Instructions:
    1. Create a bot: Message @BotFather on Telegram with /newbot
    2. Get your bot token
    3. Add bot token to .env as TELEGRAM_BOT_TOKEN
    4. Users share their Telegram chat_id to receive notifications
    5. Admin/workspace chat_id can be set for alerts
    """
    
    def __init__(self, workspace_id: str, db: Session):
        self.workspace_id = workspace_id
        self.db = db
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        self.workspace_chat_id = self._get_workspace_chat_id()
    
    def _get_workspace_chat_id(self) -> Optional[str]:
        """Get Telegram chat ID for workspace notifications"""
        workspace = self.db.query(models.Workspace).filter(
            models.Workspace.id == self.workspace_id
        ).first()
        
        # Check if workspace has SMS integration configured
        integration = self.db.query(models.Integration).filter(
            models.Integration.workspace_id == self.workspace_id,
            models.Integration.type == "sms",
            models.Integration.is_active == True
        ).first()
        
        if integration and integration.config:
            return integration.config.get('telegram_chat_id')
        
        return None
    
    def _send_telegram_message(
        self, 
        chat_id: str, 
        message: str, 
        parse_mode: str = "HTML"
    ) -> Dict[str, Any]:
        """
        Send message via Telegram Bot API
        
        Args:
            chat_id: Telegram chat ID (can be user ID or group ID)
            message: Message text (supports HTML formatting)
            parse_mode: Message formatting (HTML or Markdown)
        
        Returns:
            API response dict
        """
        if not self.bot_token:
            print(f"📱 [DEMO MODE] Would send SMS via Telegram to {chat_id}")
            print(f"   Message: {message[:100]}...")
            return {
                "success": True, 
                "demo_mode": True,
                "message": "Telegram bot token not configured"
            }
        
        try:
            url = f"{self.base_url}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": message,
                "parse_mode": parse_mode
            }
            
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("ok"):
                print(f"✅ Telegram message sent to {chat_id}")
                return {"success": True, "data": result}
            else:
                print(f"❌ Telegram API error: {result.get('description')}")
                return {"success": False, "error": result.get('description')}
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to send Telegram message: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _get_contact_chat_id(self, contact: models.Contact) -> Optional[str]:
        """
        Get Telegram chat ID for a contact
        Can be stored in contact metadata or phone field
        """
        if not contact:
            return None
        
        # Check if chat_id is in contact metadata
        if contact.custom_custom_metadata:
            telegram_id = contact.custom_custom_metadata.get('telegram_chat_id')
            if telegram_id:
                return str(telegram_id)
        
        # Check if phone field contains telegram chat ID
        # Format: telegram:123456789 or just the ID if it starts with digits
        if contact.phone:
            phone = contact.phone.strip()
            if phone.startswith('telegram:'):
                return phone.replace('telegram:', '')
            # If it's numeric and long (Telegram IDs are typically 9-10 digits)
            elif phone.isdigit() and len(phone) >= 9:
                return phone
        
        return None
    
    def send_booking_confirmation(self, booking: models.Booking) -> bool:
        """Send booking confirmation SMS"""
        workspace = self.db.query(models.Workspace).filter(
            models.Workspace.id == self.workspace_id
        ).first()
        
        contact = self.db.query(models.Contact).filter(
            models.Contact.id == booking.contact_id
        ).first()
        
        service = self.db.query(models.ServiceType).filter(
            models.ServiceType.id == booking.service_type_id
        ).first()
        
        chat_id = self._get_contact_chat_id(contact)
        
        if not chat_id:
            print(f"⚠️ No Telegram chat ID for contact {contact.email}")
            return False
        
        message = f"""
<b>✅ Booking Confirmed - {workspace.business_name}</b>

Hi {contact.name}! Your appointment is confirmed:

<b>Service:</b> {service.name if service else 'N/A'}
<b>Date:</b> {booking.scheduled_at.strftime('%A, %B %d, %Y')}
<b>Time:</b> {booking.scheduled_at.strftime('%I:%M %p')}
<b>Duration:</b> {service.duration_minutes if service else 'N/A'} minutes

{f'<b>Location:</b> {booking.location}' if booking.location else ''}

{f'<b>Notes:</b> {booking.notes}' if booking.notes else ''}

Please arrive 10 minutes early.

Reply STOP to unsubscribe.
        """.strip()
        
        result = self._send_telegram_message(chat_id, message)
        return result.get("success", False)
    
    def send_booking_reminder(self, booking: models.Booking) -> bool:
        """Send appointment reminder SMS"""
        contact = self.db.query(models.Contact).filter(
            models.Contact.id == booking.contact_id
        ).first()
        
        service = self.db.query(models.ServiceType).filter(
            models.ServiceType.id == booking.service_type_id
        ).first()
        
        chat_id = self._get_contact_chat_id(contact)
        
        if not chat_id:
            print(f"⚠️ No Telegram chat ID for contact {contact.email}")
            return False
        
        message = f"""
<b>🔔 Appointment Reminder</b>

Hi {contact.name}, reminder for your appointment tomorrow:

<b>Service:</b> {service.name if service else 'N/A'}
<b>Date:</b> {booking.scheduled_at.strftime('%A, %B %d')}
<b>Time:</b> {booking.scheduled_at.strftime('%I:%M %p')}

{f'<b>Location:</b> {booking.location}' if booking.location else ''}

See you soon!

Reply STOP to unsubscribe.
        """.strip()
        
        result = self._send_telegram_message(chat_id, message)
        return result.get("success", False)
    
    def send_form_reminder(self, submission: models.FormSubmission) -> bool:
        """Send form completion reminder SMS"""
        contact = self.db.query(models.Contact).filter(
            models.Contact.id == submission.contact_id
        ).first()
        
        form = self.db.query(models.PostBookingForm).filter(
            models.PostBookingForm.id == submission.form_id
        ).first()
        
        chat_id = self._get_contact_chat_id(contact)
        
        if not chat_id:
            print(f"⚠️ No Telegram chat ID for contact {contact.email}")
            return False
        
        message = f"""
<b>📋 Action Required: Complete Your Form</b>

Hi {contact.name}, please complete your <b>{form.name if form else 'intake form'}</b>.

This helps us prepare for your appointment.

Complete the form at your earliest convenience.

Reply STOP to unsubscribe.
        """.strip()
        
        result = self._send_telegram_message(chat_id, message)
        return result.get("success", False)
    
    def send_low_stock_alert(self, item: models.InventoryItem) -> bool:
        """Send low stock alert to workspace admin"""
        workspace = self.db.query(models.Workspace).filter(
            models.Workspace.id == self.workspace_id
        ).first()
        
        # Send to workspace admin chat
        if not self.workspace_chat_id:
            print(f"⚠️ No workspace Telegram chat ID configured")
            return False
        
        message = f"""
<b>⚠️ LOW STOCK ALERT</b>

<b>Item:</b> {item.name}
<b>Current Stock:</b> {item.quantity} {item.unit}
<b>Threshold:</b> {item.low_stock_threshold} {item.unit}

{f'<b>Description:</b> {item.description}' if item.description else ''}

Please reorder soon to avoid running out.

<i>CareOps Inventory Alert - {workspace.business_name}</i>
        """.strip()
        
        result = self._send_telegram_message(self.workspace_chat_id, message)
        return result.get("success", False)
    
    def send_staff_notification(
        self, 
        user_id: str, 
        title: str, 
        message: str
    ) -> bool:
        """Send notification to staff member"""
        user = self.db.query(models.User).filter(
            models.User.id == user_id
        ).first()
        
        if not user:
            return False
        
        # Try to get chat ID from user metadata (if added)
        # For now, send to workspace chat
        if not self.workspace_chat_id:
            print(f"⚠️ No workspace Telegram chat ID configured")
            return False
        
        formatted_message = f"""
<b>🔔 {title}</b>

{message}

<i>CareOps Staff Notification</i>
        """.strip()
        
        result = self._send_telegram_message(self.workspace_chat_id, formatted_message)
        return result.get("success", False)
    
    def send_custom_sms(self, chat_id: str, message: str) -> bool:
        """Send custom SMS message"""
        result = self._send_telegram_message(chat_id, message)
        return result.get("success", False)
    
    def get_bot_info(self) -> Dict[str, Any]:
        """Get information about the Telegram bot"""
        if not self.bot_token:
            return {"error": "Bot token not configured"}
        
        try:
            url = f"{self.base_url}/getMe"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("ok"):
                return {"success": True, "bot": result.get("result")}
            else:
                return {"success": False, "error": result.get('description')}
        
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": str(e)}
    
    def get_chat_id_from_update(self, update: Dict[str, Any]) -> Optional[str]:
        """
        Extract chat ID from Telegram webhook update
        Useful for getting user's chat ID when they message the bot
        """
        try:
            if "message" in update:
                return str(update["message"]["chat"]["id"])
            elif "callback_query" in update:
                return str(update["callback_query"]["message"]["chat"]["id"])
        except (KeyError, TypeError):
            pass
        
        return None


def get_sms_service(workspace_id: str, db: Session) -> TelegramSMSService:
    """Factory function to get SMS service instance"""
    return TelegramSMSService(workspace_id, db)


# Fallback SMS service for when Telegram is not configured
class FallbackSMSService:
    """
    Fallback SMS service that logs messages instead of sending
    Used when no SMS provider is configured
    """
    
    def __init__(self, workspace_id: str, db: Session):
        self.workspace_id = workspace_id
        self.db = db
    
    def _log_sms(self, recipient: str, message: str):
        """Log SMS message to console"""
        print(f"📱 [SMS LOG] To: {recipient}")
        print(f"   Message: {message[:100]}...")
        print(f"   Timestamp: {datetime.now().isoformat()}")
    
    def send_booking_confirmation(self, booking: models.Booking) -> bool:
        contact = self.db.query(models.Contact).filter(
            models.Contact.id == booking.contact_id
        ).first()
        self._log_sms(contact.phone or contact.email, "Booking confirmation")
        return True
    
    def send_booking_reminder(self, booking: models.Booking) -> bool:
        contact = self.db.query(models.Contact).filter(
            models.Contact.id == booking.contact_id
        ).first()
        self._log_sms(contact.phone or contact.email, "Appointment reminder")
        return True
    
    def send_form_reminder(self, submission: models.FormSubmission) -> bool:
        contact = self.db.query(models.Contact).filter(
            models.Contact.id == submission.contact_id
        ).first()
        self._log_sms(contact.phone or contact.email, "Form completion reminder")
        return True
    
    def send_low_stock_alert(self, item: models.InventoryItem) -> bool:
        self._log_sms("admin", f"Low stock alert: {item.name}")
        return True
    
    def send_staff_notification(self, user_id: str, title: str, message: str) -> bool:
        self._log_sms("staff", f"{title}: {message}")
        return True
    
    def send_custom_sms(self, recipient: str, message: str) -> bool:
        self._log_sms(recipient, message)
        return True