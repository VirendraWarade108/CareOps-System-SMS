"""
Background Job Scheduler for CareOps
Runs periodic automation tasks
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.database import SessionLocal
from app.services.automation_service import get_automation_service


scheduler = BackgroundScheduler()


def run_booking_reminders():
    """Job: Send booking reminders"""
    db = SessionLocal()
    try:
        automation = get_automation_service(db)
        automation.send_booking_reminders()
    except Exception as e:
        print(f"❌ Error in booking reminders job: {str(e)}")
    finally:
        db.close()


def run_form_reminders():
    """Job: Send form completion reminders"""
    db = SessionLocal()
    try:
        automation = get_automation_service(db)
        automation.send_form_reminders()
    except Exception as e:
        print(f"❌ Error in form reminders job: {str(e)}")
    finally:
        db.close()


def run_inventory_checks():
    """Job: Check inventory and send alerts"""
    db = SessionLocal()
    try:
        automation = get_automation_service(db)
        automation.check_low_stock_items()
    except Exception as e:
        print(f"❌ Error in inventory check job: {str(e)}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler"""
    
    # Send booking reminders daily at 10 AM
    scheduler.add_job(
        run_booking_reminders,
        trigger=CronTrigger(hour=10, minute=0),
        id='booking_reminders',
        name='Send booking reminders',
        replace_existing=True
    )
    
    # Send form reminders daily at 2 PM
    scheduler.add_job(
        run_form_reminders,
        trigger=CronTrigger(hour=14, minute=0),
        id='form_reminders',
        name='Send form completion reminders',
        replace_existing=True
    )
    
    # Check inventory every 6 hours
    scheduler.add_job(
        run_inventory_checks,
        trigger=CronTrigger(hour='*/6'),
        id='inventory_checks',
        name='Check inventory levels',
        replace_existing=True
    )
    
    scheduler.start()
    print("✅ Background scheduler started")


def stop_scheduler():
    """Stop the background scheduler"""
    scheduler.shutdown()
    print("🛑 Background scheduler stopped")