"""
Automation Service for CareOps
Handles background jobs and automation triggers
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List

from app import models
from app.services.email_service import get_email_service


class AutomationService:
    """Service for handling automated tasks"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def send_booking_reminders(self):
        """Send reminders for bookings happening in next 24 hours"""
        tomorrow = datetime.now() + timedelta(days=1)
        day_after = tomorrow + timedelta(days=1)
        
        # Find bookings scheduled for tomorrow that haven't been reminded
        upcoming_bookings = self.db.query(models.Booking).filter(
            models.Booking.scheduled_at >= tomorrow,
            models.Booking.scheduled_at < day_after,
            models.Booking.status == "pending",
            models.Booking.reminder_sent == False
        ).all()
        
        print(f"📧 Sending reminders for {len(upcoming_bookings)} bookings...")
        
        for booking in upcoming_bookings:
            try:
                email_service = get_email_service(booking.workspace_id, self.db)
                email_service.send_booking_reminder(booking)
                
                booking.reminder_sent = True
                self.db.commit()
                
            except Exception as e:
                print(f"❌ Failed to send reminder for booking {booking.id}: {str(e)}")
                continue
    
    def send_form_reminders(self):
        """Send reminders for pending forms"""
        # Find form submissions that are pending and haven't been reminded recently
        one_day_ago = datetime.now() - timedelta(days=1)
        
        pending_submissions = self.db.query(models.FormSubmission).filter(
            models.FormSubmission.status == "pending",
            (models.FormSubmission.reminder_sent_at == None) | 
            (models.FormSubmission.reminder_sent_at < one_day_ago)
        ).all()
        
        print(f"📋 Sending form reminders for {len(pending_submissions)} submissions...")
        
        for submission in pending_submissions:
            try:
                booking = self.db.query(models.Booking).filter(
                    models.Booking.id == submission.booking_id
                ).first()
                
                if booking:
                    email_service = get_email_service(booking.workspace_id, self.db)
                    email_service.send_form_reminder(submission)
                    
                    submission.reminder_sent_at = datetime.now()
                    self.db.commit()
                
            except Exception as e:
                print(f"❌ Failed to send form reminder for submission {submission.id}: {str(e)}")
                continue
    
    def check_low_stock_items(self):
        """Check for low stock items and send alerts"""
        low_stock_items = self.db.query(models.InventoryItem).filter(
            models.InventoryItem.quantity <= models.InventoryItem.low_stock_threshold
        ).all()
        
        print(f"📦 Found {len(low_stock_items)} low stock items...")
        
        for item in low_stock_items:
            # Check if alert already exists
            existing_alert = self.db.query(models.Alert).filter(
                models.Alert.workspace_id == item.workspace_id,
                models.Alert.type == "low_stock",
                models.Alert.link == f"/inventory/{item.id}",
                models.Alert.is_read == False
            ).first()
            
            if existing_alert:
                continue  # Alert already sent
            
            try:
                # Create alert
                alert = models.Alert(
                    workspace_id=item.workspace_id,
                    type="low_stock",
                    priority="high",
                    title=f"Low Stock: {item.name}",
                    message=f"{item.name} is running low ({item.quantity} {item.unit} remaining)",
                    link=f"/inventory/{item.id}"
                )
                self.db.add(alert)
                
                # Send email if vendor configured
                if item.vendor_email:
                    email_service = get_email_service(item.workspace_id, self.db)
                    email_service.send_low_stock_alert(item)
                
                self.db.commit()
                
            except Exception as e:
                print(f"❌ Failed to create low stock alert for item {item.id}: {str(e)}")
                continue
    
    def process_automation_rules(self, workspace_id: str, trigger: str, entity_id: str):
        """Process automation rules for a specific trigger"""
        rules = self.db.query(models.AutomationRule).filter(
            models.AutomationRule.workspace_id == workspace_id,
            models.AutomationRule.trigger == trigger,
            models.AutomationRule.is_active == True
        ).all()
        
        for rule in rules:
            try:
                if rule.action == "send_email":
                    self._execute_email_action(rule, entity_id)
                elif rule.action == "create_task":
                    self._execute_task_action(rule, entity_id)
                
            except Exception as e:
                print(f"❌ Failed to execute rule {rule.id}: {str(e)}")
    
    def _execute_email_action(self, rule: models.AutomationRule, entity_id: str):
        """Execute email automation action"""
        email_service = get_email_service(rule.workspace_id, self.db)
        
        if rule.trigger == "new_contact":
            contact = self.db.query(models.Contact).filter(
                models.Contact.id == entity_id
            ).first()
            if contact:
                email_service.send_welcome_email(contact)
        
        elif rule.trigger == "booking_created":
            booking = self.db.query(models.Booking).filter(
                models.Booking.id == entity_id
            ).first()
            if booking:
                email_service.send_booking_confirmation(booking)
    
    def _execute_task_action(self, rule: models.AutomationRule, entity_id: str):
        """Execute task creation action"""
        # Placeholder for task creation logic
        pass


def get_automation_service(db: Session) -> AutomationService:
    """Factory function to get automation service instance"""
    return AutomationService(db)