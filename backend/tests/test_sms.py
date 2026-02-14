#!/usr/bin/env python3
"""
SMS Integration Testing Script for CareOps
Tests all SMS features without requiring full app setup
"""

import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.database import SessionLocal
    from app import models
    from app.services.sms_service import get_sms_service, TelegramSMSService
    from app.services.automation_service import get_automation_service
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from backend directory:")
    print("  cd backend && python tests/test_sms.py")
    sys.exit(1)


class Colors:
    """Terminal colors for better output"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(60)}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.END}\n")


def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")


def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")


def print_info(text):
    print(f"{Colors.CYAN}ℹ️  {text}{Colors.END}")


def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")


def test_telegram_configuration():
    """Test 1: Telegram Bot Configuration"""
    print_header("Test 1: Telegram Bot Configuration")
    
    from app.config import settings
    
    if not settings.TELEGRAM_BOT_TOKEN:
        print_error("TELEGRAM_BOT_TOKEN not configured in .env")
        print_info("Add to .env: TELEGRAM_BOT_TOKEN=your_token_here")
        return False
    
    print_success(f"Bot token configured: {settings.TELEGRAM_BOT_TOKEN[:20]}...")
    
    # Test bot connection
    db = SessionLocal()
    try:
        sms_service = TelegramSMSService("test-workspace", db)
        bot_info = sms_service.get_bot_info()
        
        if bot_info.get("success"):
            bot = bot_info.get("bot", {})
            print_success(f"Bot connected: @{bot.get('username')} ({bot.get('first_name')})")
            return True
        else:
            print_error(f"Bot connection failed: {bot_info.get('error')}")
            return False
    finally:
        db.close()


def test_workspace_configuration(workspace_id: str):
    """Test 2: Workspace SMS Configuration"""
    print_header("Test 2: Workspace SMS Configuration")
    
    db = SessionLocal()
    try:
        # Check workspace exists
        workspace = db.query(models.Workspace).filter(
            models.Workspace.id == workspace_id
        ).first()
        
        if not workspace:
            print_error(f"Workspace {workspace_id} not found")
            return False
        
        print_success(f"Workspace found: {workspace.business_name}")
        
        # Check SMS integration
        integration = db.query(models.Integration).filter(
            models.Integration.workspace_id == workspace_id,
            models.Integration.type == "sms"
        ).first()
        
        if integration:
            chat_id = integration.config.get('telegram_chat_id')
            if chat_id:
                print_success(f"Workspace chat ID configured: {chat_id}")
                return True
            else:
                print_warning("No chat ID configured for workspace")
                print_info("Configure in Dashboard > SMS Config")
                return False
        else:
            print_warning("No SMS integration found")
            print_info("Configure in Dashboard > Settings > Integrations")
            return False
    finally:
        db.close()


def test_send_test_sms(chat_id: str):
    """Test 3: Send Test SMS"""
    print_header("Test 3: Send Test SMS")
    
    if not chat_id:
        print_error("Chat ID required for testing")
        print_info("Get your chat ID:")
        print_info("1. Message your bot")
        print_info("2. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates")
        print_info("3. Find 'chat':{'id':123456789}")
        return False
    
    db = SessionLocal()
    try:
        sms_service = TelegramSMSService("test-workspace", db)
        
        test_message = f"""
<b>🧪 CareOps SMS Test</b>

This is a test message from CareOps SMS system.

Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Status: ✅ Working perfectly!

If you received this, SMS is configured correctly.
        """.strip()
        
        print_info(f"Sending test SMS to chat ID: {chat_id}")
        result = sms_service._send_telegram_message(chat_id, test_message)
        
        if result.get("success"):
            print_success("Test SMS sent successfully!")
            print_info("Check your Telegram for the message")
            return True
        else:
            print_error(f"Failed to send test SMS: {result.get('error')}")
            return False
    finally:
        db.close()


def test_booking_confirmation(workspace_id: str, chat_id: str):
    """Test 4: Booking Confirmation SMS"""
    print_header("Test 4: Booking Confirmation SMS")
    
    db = SessionLocal()
    try:
        # Create test contact
        test_contact = models.Contact(
            workspace_id=workspace_id,
            name="Test User",
            email="test@example.com",
            phone=f"telegram:{chat_id}",  # Store chat ID in phone
            source="test"
        )
        db.add(test_contact)
        db.flush()
        
        # Create test service
        test_service = models.ServiceType(
            workspace_id=workspace_id,
            name="Test Service",
            duration_minutes=60,
            location="Test Location"
        )
        db.add(test_service)
        db.flush()
        
        # Create test booking
        test_booking = models.Booking(
            workspace_id=workspace_id,
            contact_id=test_contact.id,
            service_type_id=test_service.id,
            scheduled_at=datetime.now() + timedelta(days=1),
            end_time=datetime.now() + timedelta(days=1, hours=1),
            location="Test Location",
            notes="This is a test booking",
            status="pending"
        )
        db.add(test_booking)
        db.commit()
        
        print_info(f"Created test booking ID: {test_booking.id}")
        
        # Send booking confirmation SMS
        sms_service = get_sms_service(workspace_id, db)
        success = sms_service.send_booking_confirmation(test_booking)
        
        if success:
            print_success("Booking confirmation SMS sent!")
            print_info("Check your Telegram for the confirmation")
        else:
            print_error("Failed to send booking confirmation SMS")
        
        # Cleanup
        db.delete(test_booking)
        db.delete(test_service)
        db.delete(test_contact)
        db.commit()
        
        return success
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()


def test_reminder_system(workspace_id: str):
    """Test 5: Reminder System"""
    print_header("Test 5: Automated Reminder System")
    
    db = SessionLocal()
    try:
        automation = get_automation_service(db)
        
        print_info("Testing booking reminders...")
        automation.send_booking_reminders()
        print_success("Booking reminders processed")
        
        print_info("Testing form reminders...")
        automation.send_form_reminders()
        print_success("Form reminders processed")
        
        print_info("Testing inventory checks...")
        automation.check_low_stock_items()
        print_success("Inventory checks processed")
        
        return True
    except Exception as e:
        print_error(f"Reminder system test failed: {str(e)}")
        return False
    finally:
        db.close()


def test_low_stock_alert(workspace_id: str):
    """Test 6: Low Stock Alert"""
    print_header("Test 6: Low Stock Alert SMS")
    
    db = SessionLocal()
    try:
        # Create test inventory item
        test_item = models.InventoryItem(
            workspace_id=workspace_id,
            name="Test Item",
            description="Test inventory item",
            quantity=5,
            low_stock_threshold=10,
            unit="pieces"
        )
        db.add(test_item)
        db.commit()
        
        print_info(f"Created test inventory item: {test_item.name}")
        print_info(f"Quantity: {test_item.quantity}, Threshold: {test_item.low_stock_threshold}")
        
        # Send low stock alert
        sms_service = get_sms_service(workspace_id, db)
        success = sms_service.send_low_stock_alert(test_item)
        
        if success:
            print_success("Low stock alert SMS sent!")
            print_info("Check your Telegram for the alert")
        else:
            print_warning("Low stock alert not sent (chat ID may not be configured)")
        
        # Cleanup
        db.delete(test_item)
        db.commit()
        
        return success
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()


def run_all_tests(workspace_id: str = None, chat_id: str = None):
    """Run all SMS tests"""
    print_header("CareOps SMS Integration Tests")
    print(f"{Colors.BOLD}Starting comprehensive SMS testing...{Colors.END}\n")
    
    results = []
    
    # Test 1: Configuration
    results.append(("Configuration", test_telegram_configuration()))
    
    # Test 2: Workspace (if workspace_id provided)
    if workspace_id:
        results.append(("Workspace Config", test_workspace_configuration(workspace_id)))
    else:
        print_warning("Skipping workspace test (no workspace_id provided)")
    
    # Test 3: Test SMS (if chat_id provided)
    if chat_id:
        results.append(("Test SMS", test_send_test_sms(chat_id)))
    else:
        print_warning("Skipping test SMS (no chat_id provided)")
    
    # Test 4: Booking Confirmation (if both provided)
    if workspace_id and chat_id:
        results.append(("Booking Confirmation", test_booking_confirmation(workspace_id, chat_id)))
    else:
        print_warning("Skipping booking confirmation test")
    
    # Test 5: Reminder System
    if workspace_id:
        results.append(("Reminder System", test_reminder_system(workspace_id)))
    else:
        print_warning("Skipping reminder system test")
    
    # Test 6: Low Stock Alert
    if workspace_id:
        results.append(("Low Stock Alert", test_low_stock_alert(workspace_id)))
    else:
        print_warning("Skipping low stock alert test")
    
    # Print summary
    print_header("Test Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        if result:
            print_success(f"{test_name}")
        else:
            print_error(f"{test_name}")
    
    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print_success("All tests passed! SMS integration is working correctly. 🎉")
    elif passed > 0:
        print_warning(f"Some tests passed. Review failures above.")
    else:
        print_error("All tests failed. Check configuration.")
    
    return passed == total


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test CareOps SMS Integration")
    parser.add_argument("--workspace-id", help="Workspace ID for testing")
    parser.add_argument("--chat-id", help="Your Telegram Chat ID for testing")
    parser.add_argument("--all", action="store_true", help="Run all tests (requires workspace-id and chat-id)")
    
    args = parser.parse_args()
    
    if args.all:
        if not args.workspace_id or not args.chat_id:
            print_error("--all requires both --workspace-id and --chat-id")
            print_info("Usage: python test_sms.py --all --workspace-id=YOUR_ID --chat-id=YOUR_CHAT_ID")
            sys.exit(1)
    
    success = run_all_tests(
        workspace_id=args.workspace_id,
        chat_id=args.chat_id
    )
    
    sys.exit(0 if success else 1)