from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text, Time, JSON, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), nullable=False)  # 'owner' or 'staff'
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owned_workspaces = relationship("Workspace", back_populates="owner", foreign_keys="Workspace.owner_id")
    workspace_memberships = relationship("WorkspaceMember", back_populates="user")
    assigned_conversations = relationship("Conversation", back_populates="assigned_user")
    
    __table_args__ = (
        CheckConstraint("role IN ('owner', 'staff')", name="check_user_role"),
    )


class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    business_name = Column(String(255), nullable=False)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip = Column(String(20))
    country = Column(String(100))
    timezone = Column(String(100), default="UTC")
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    is_active = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="owned_workspaces", foreign_keys=[owner_id])
    members = relationship("WorkspaceMember", back_populates="workspace")
    integrations = relationship("Integration", back_populates="workspace")
    contacts = relationship("Contact", back_populates="workspace")
    conversations = relationship("Conversation", back_populates="workspace")
    contact_forms = relationship("ContactForm", back_populates="workspace")
    service_types = relationship("ServiceType", back_populates="workspace")
    bookings = relationship("Booking", back_populates="workspace")
    post_booking_forms = relationship("PostBookingForm", back_populates="workspace")
    inventory_items = relationship("InventoryItem", back_populates="workspace")
    automation_rules = relationship("AutomationRule", back_populates="workspace")
    alerts = relationship("Alert", back_populates="workspace")
    activity_logs = relationship("ActivityLog", back_populates="workspace")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permissions = Column(JSON, default={"inbox": True, "bookings": True, "forms": True, "inventory": False})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")
    
    __table_args__ = (
        CheckConstraint("workspace_id != user_id", name="check_different_workspace_user"),
    )


class Integration(Base):
    __tablename__ = "integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # 'email', 'sms', 'calendar', 'storage'
    provider = Column(String(50))  # 'gmail', 'twilio', 'google_calendar'
    config = Column(JSON, nullable=False)  # encrypted credentials
    is_active = Column(Boolean, default=True)
    last_synced_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="integrations")
    
    __table_args__ = (
        CheckConstraint("type IN ('email', 'sms', 'calendar', 'storage')", name="check_integration_type"),
    )


class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), index=True)
    phone = Column(String(50))
    source = Column(String(100), default="manual")  # 'contact_form', 'booking', 'manual'
    custom_custom_metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="contacts")
    conversations = relationship("Conversation", back_populates="contact")
    bookings = relationship("Booking", back_populates="contact")
    form_submissions = relationship("FormSubmission", back_populates="contact")


class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="open")  # 'open', 'closed'
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    automation_paused = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="conversations")
    contact = relationship("Contact", back_populates="conversations")
    assigned_user = relationship("User", back_populates="assigned_conversations")
    messages = relationship("Message", back_populates="conversation")
    
    __table_args__ = (
        CheckConstraint("status IN ('open', 'closed')", name="check_conversation_status"),
    )


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_type = Column(String(50), nullable=False)  # 'contact', 'staff', 'automation'
    sender_id = Column(UUID(as_uuid=True))  # user_id if staff, contact_id if contact
    content = Column(Text, nullable=False)
    channel = Column(String(50), default="email")  # 'email', 'sms', 'internal'
    is_automated = Column(Boolean, default=False)
    custom_custom_metadata = Column(JSON, default={})
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    
    __table_args__ = (
        CheckConstraint("sender_type IN ('contact', 'staff', 'automation')", name="check_sender_type"),
        CheckConstraint("channel IN ('email', 'sms', 'internal')", name="check_channel"),
    )


class ContactForm(Base):
    __tablename__ = "contact_forms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    fields = Column(JSON, default=[])  # Array of field definitions
    welcome_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="contact_forms")


class ServiceType(Base):
    __tablename__ = "service_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    duration_minutes = Column(Integer, nullable=False)
    location = Column(Text)
    color = Column(String(7), default="#3B82F6")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="service_types")
    availability_slots = relationship("AvailabilitySlot", back_populates="service_type")
    bookings = relationship("Booking", back_populates="service_type")
    post_booking_forms = relationship("PostBookingForm", back_populates="service_type")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_type_id = Column(UUID(as_uuid=True), ForeignKey("service_types.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Sunday, 6=Saturday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    service_type = relationship("ServiceType", back_populates="availability_slots")
    
    __table_args__ = (
        CheckConstraint("day_of_week >= 0 AND day_of_week <= 6", name="check_day_of_week"),
    )


class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"))
    service_type_id = Column(UUID(as_uuid=True), ForeignKey("service_types.id", ondelete="SET NULL"))
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="pending")
    location = Column(Text)
    notes = Column(Text)
    google_calendar_event_id = Column(String(255))
    reminder_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="bookings")
    contact = relationship("Contact", back_populates="bookings")
    service_type = relationship("ServiceType", back_populates="bookings")
    form_submissions = relationship("FormSubmission", back_populates="booking")
    inventory_usage = relationship("InventoryUsage", back_populates="booking")
    
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'confirmed', 'completed', 'no_show', 'cancelled')", 
                       name="check_booking_status"),
    )


class PostBookingForm(Base):
    __tablename__ = "post_booking_forms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    service_type_id = Column(UUID(as_uuid=True), ForeignKey("service_types.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    fields = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="post_booking_forms")
    service_type = relationship("ServiceType", back_populates="post_booking_forms")
    submissions = relationship("FormSubmission", back_populates="form")


class FormSubmission(Base):
    __tablename__ = "form_submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id = Column(UUID(as_uuid=True), ForeignKey("post_booking_forms.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"))
    data = Column(JSON, nullable=False)
    status = Column(String(50), default="pending")
    submitted_at = Column(DateTime(timezone=True))
    reminder_sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    form = relationship("PostBookingForm", back_populates="submissions")
    booking = relationship("Booking", back_populates="form_submissions")
    contact = relationship("Contact", back_populates="form_submissions")
    
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'completed', 'overdue')", name="check_submission_status"),
    )


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=10)
    unit = Column(String(50), default="pieces")
    vendor_email = Column(String(255))
    linked_service_ids = Column(JSON, default=[])  # ADD THIS LINE if not present
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="inventory_items")
    usage = relationship("InventoryUsage", back_populates="item")
    
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="check_quantity_non_negative"),
    )


class InventoryUsage(Base):
    __tablename__ = "inventory_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL"))
    quantity_used = Column(Integer, nullable=False)
    notes = Column(Text)
    used_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    item = relationship("InventoryItem", back_populates="usage")
    booking = relationship("Booking", back_populates="inventory_usage")


class AutomationRule(Base):
    __tablename__ = "automation_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    trigger = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    config = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="automation_rules")


class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    priority = Column(String(20), default="medium")
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(500))
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="alerts")
    
    __table_args__ = (
        CheckConstraint("priority IN ('low', 'medium', 'high')", name="check_alert_priority"),
    )


class ActivityLog(Base):
    __tablename__ = "activity_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(UUID(as_uuid=True))
    custom_custom_metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="activity_logs")
