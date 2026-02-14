"""
Email Service for CareOps
Handles all email sending with automation triggers
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app import models


class EmailService:
    """Email service for sending automated emails"""
    
    def __init__(self, workspace_id: str, db: Session):
        self.workspace_id = workspace_id
        self.db = db
        self.config = self._get_email_config()
    
    def _get_email_config(self) -> Optional[dict]:
        """Get email integration config for workspace"""
        integration = self.db.query(models.Integration).filter(
            models.Integration.workspace_id == self.workspace_id,
            models.Integration.type == "email",
            models.Integration.is_active == True
        ).first()
        
        if integration:
            return integration.config
        
        # Fallback to default config
        return {
            "smtp_host": settings.SMTP_HOST,
            "smtp_port": settings.SMTP_PORT,
            "smtp_user": settings.SMTP_USER,
            "smtp_password": settings.SMTP_PASSWORD
        }
    
    def _send_email(self, to_email: str, subject: str, body: str, html: bool = True):
        """Send email via SMTP"""
        if not self.config or not self.config.get("smtp_user"):
            print(f"📧 [DEMO MODE] Email would be sent to {to_email}")
            print(f"   Subject: {subject}")
            print(f"   Body: {body[:100]}...")
            return True
        
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = self.config['smtp_user']
            msg['To'] = to_email
            msg['Subject'] = subject
            
            if html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.config['smtp_host'], self.config['smtp_port']) as server:
                server.starttls()
                server.login(self.config['smtp_user'], self.config['smtp_password'])
                server.send_message(msg)
            
            print(f"✅ Email sent to {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {str(e)}")
            print(f"📧 [DEMO MODE] Would have sent: {subject}")
            return False
    
    def send_welcome_email(self, contact: models.Contact):
        """Send welcome email to new contact"""
        workspace = self.db.query(models.Workspace).filter(
            models.Workspace.id == self.workspace_id
        ).first()
        
        subject = f"Welcome! Thanks for contacting {workspace.business_name}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Hi {contact.name}! 👋</h2>
                <p>Thank you for reaching out to <strong>{workspace.business_name}</strong>.</p>
                <p>We've received your inquiry and one of our team members will get back to you shortly.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Your Contact Information:</strong></p>
                    <p style="margin: 5px 0;">📧 Email: {contact.email}</p>
                    {f'<p style="margin: 5px 0;">📱 Phone: {contact.phone}</p>' if contact.phone else ''}
                </div>
                
                <p>In the meantime, feel free to:</p>
                <ul>
                    <li>Book an appointment online</li>
                    <li>Reply to this email with any questions</li>
                    <li>Visit our website for more information</li>
                </ul>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    Best regards,<br>
                    <strong>{workspace.business_name} Team</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                    This is an automated message. Please do not reply directly to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(contact.email, subject, body)
    
    def send_booking_confirmation(self, booking: models.Booking):
        """Send booking confirmation email"""
        workspace = self.db.query(models.Workspace).filter(
            models.Workspace.id == self.workspace_id
        ).first()
        
        contact = self.db.query(models.Contact).filter(
            models.Contact.id == booking.contact_id
        ).first()
        
        service = self.db.query(models.ServiceType).filter(
            models.ServiceType.id == booking.service_type_id
        ).first()
        
        subject = f"Booking Confirmed - {service.name} on {booking.scheduled_at.strftime('%B %d, %Y')}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">✅ Booking Confirmed!</h1>
                </div>
                
                <div style="margin: 30px 0;">
                    <h2 style="color: #2563eb;">Hi {contact.name}!</h2>
                    <p>Your appointment has been confirmed. Here are the details:</p>
                </div>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                <strong>Service:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                {service.name}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                <strong>Date:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                {booking.scheduled_at.strftime('%A, %B %d, %Y')}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                <strong>Time:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                {booking.scheduled_at.strftime('%I:%M %p')}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                <strong>Duration:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                {service.duration_minutes} minutes
                            </td>
                        </tr>
                        {f'''<tr>
                            <td style="padding: 10px 0;">
                                <strong>Location:</strong>
                            </td>
                            <td style="padding: 10px 0; text-align: right;">
                                {booking.location}
                            </td>
                        </tr>''' if booking.location else ''}
                    </table>
                </div>
                
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;">
                        <strong>📍 Important:</strong> Please arrive 10 minutes early for check-in.
                    </p>
                </div>
                
                {f'<p><strong>Additional Notes:</strong><br>{booking.notes}</p>' if booking.notes else ''}
                
                <p style="margin-top: 30px;">If you need to reschedule or cancel, please contact us as soon as possible.</p>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    Looking forward to seeing you!<br>
                    <strong>{workspace.business_name}</strong><br>
                    {workspace.contact_email or ''}<br>
                    {workspace.contact_phone or ''}
                </p>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(contact.email, subject, body)
    
    def send_booking_reminder(self, booking: models.Booking):
        """Send reminder before booking"""
        workspace = self.db.query(models.Workspace).filter(
            models.Workspace.id == self.workspace_id
        ).first()
        
        contact = self.db.query(models.Contact).filter(
            models.Contact.id == booking.contact_id
        ).first()
        
        service = self.db.query(models.ServiceType).filter(
            models.ServiceType.id == booking.service_type_id
        ).first()
        
        subject = f"Reminder: Appointment Tomorrow - {service.name}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">🔔 Appointment Reminder</h2>
                <p>Hi {contact.name},</p>
                <p>This is a friendly reminder about your upcoming appointment:</p>
                
                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>{service.name}</strong></p>
                    <p style="margin: 5px 0;">📅 {booking.scheduled_at.strftime('%A, %B %d at %I:%M %p')}</p>
                    {f'<p style="margin: 5px 0;">📍 {booking.location}</p>' if booking.location else ''}
                </div>
                
                <p>See you soon!</p>
                <p style="color: #6b7280; font-size: 14px;">
                    <strong>{workspace.business_name}</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(contact.email, subject, body)
    
    def send_form_reminder(self, submission: models.FormSubmission):
        """Send reminder to complete pending form"""
        workspace = self.db.query(models.Workspace).filter(
            models.Workspace.id == self.workspace_id
        ).first()
        
        contact = self.db.query(models.Contact).filter(
            models.Contact.id == submission.contact_id
        ).first()
        
        form = self.db.query(models.PostBookingForm).filter(
            models.PostBookingForm.id == submission.form_id
        ).first()
        
        subject = f"Action Needed: Please Complete Your {form.name}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #f59e0b;">📋 Form Completion Required</h2>
                <p>Hi {contact.name},</p>
                <p>We noticed you haven't completed your <strong>{form.name}</strong> yet.</p>
                
                <p>Please take a moment to fill it out so we can better prepare for your visit.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Complete Form
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                    Thank you,<br>
                    <strong>{workspace.business_name}</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(contact.email, subject, body)
    
    def send_low_stock_alert(self, item: models.InventoryItem):
        """Send low stock alert to vendor"""
        workspace = self.db.query(models.Workspace).filter(
            models.Workspace.id == self.workspace_id
        ).first()
        
        to_email = item.vendor_email or workspace.contact_email
        
        if not to_email:
            print(f"⚠️ No email configured for low stock alert: {item.name}")
            return False
        
        subject = f"⚠️ Low Stock Alert: {item.name}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #92400e;">⚠️ Low Stock Alert</h2>
                </div>
                
                <p>The following item is running low in inventory:</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2563eb;">{item.name}</h3>
                    <p style="margin: 5px 0;"><strong>Current Stock:</strong> {item.quantity} {item.unit}</p>
                    <p style="margin: 5px 0;"><strong>Threshold:</strong> {item.low_stock_threshold} {item.unit}</p>
                    {f'<p style="margin: 5px 0;"><strong>Description:</strong> {item.description}</p>' if item.description else ''}
                </div>
                
                <p>Please reorder this item to avoid running out of stock.</p>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    <strong>{workspace.business_name}</strong><br>
                    Automated Inventory Alert
                </p>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, subject, body)


def get_email_service(workspace_id: str, db: Session) -> EmailService:
    """Factory function to get email service instance"""
    return EmailService(workspace_id, db)