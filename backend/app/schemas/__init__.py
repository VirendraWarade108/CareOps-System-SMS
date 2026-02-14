from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, List, Any
from datetime import datetime, time
from uuid import UUID


def empty_str_to_none(v):
    """Convert empty strings to None for optional fields"""
    if v == '' or (isinstance(v, str) and v.strip() == ''):
        return None
    return v


# ============== USER SCHEMAS ==============
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role: str = Field(default="owner")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: UUID
    role: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ============== WORKSPACE SCHEMAS ==============
class WorkspaceBase(BaseModel):
    business_name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    timezone: str = "UTC"
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None

    @validator('contact_email', pre=True, always=True)
    def validate_contact_email(cls, v):
        return empty_str_to_none(v)

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    business_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    timezone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None

    @validator('contact_email', pre=True, always=True)
    def validate_contact_email(cls, v):
        return empty_str_to_none(v)

class WorkspaceResponse(WorkspaceBase):
    id: UUID
    slug: str
    owner_id: UUID
    is_active: bool
    onboarding_step: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============== CONTACT SCHEMAS ==============
class ContactBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: str = "manual"
    custom_custom_metadata: Dict[str, Any] = {}

    @validator('email', pre=True, always=True)
    def validate_email(cls, v):
        return empty_str_to_none(v)

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== CONVERSATION & MESSAGE SCHEMAS ==============
class MessageCreate(BaseModel):
    content: str
    channel: str = "email"

class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_type: str
    sender_id: Optional[UUID] = None
    content: str
    channel: str
    is_automated: bool
    sent_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    contact_id: UUID
    status: str
    last_message_at: datetime
    assigned_to: Optional[UUID] = None
    automation_paused: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationWithMessages(ConversationResponse):
    messages: List[MessageResponse] = []
    contact: ContactResponse


# ============== SERVICE & BOOKING SCHEMAS ==============
class ServiceTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int
    location: Optional[str] = None
    color: str = "#3B82F6"

class ServiceTypeCreate(ServiceTypeBase):
    pass

class ServiceTypeResponse(ServiceTypeBase):
    id: UUID
    workspace_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AvailabilitySlotBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: time
    end_time: time

class AvailabilitySlotCreate(AvailabilitySlotBase):
    pass

class AvailabilitySlotResponse(AvailabilitySlotBase):
    id: UUID
    service_type_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class BookingBase(BaseModel):
    scheduled_at: datetime
    notes: Optional[str] = None

class BookingCreate(BookingBase):
    service_type_id: UUID
    contact_name: str
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None

    @validator('contact_email', pre=True, always=True)
    def validate_contact_email(cls, v):
        return empty_str_to_none(v)

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class BookingResponse(BookingBase):
    id: UUID
    workspace_id: UUID
    contact_id: Optional[UUID]
    service_type_id: Optional[UUID]
    end_time: datetime
    status: str
    location: Optional[str]
    reminder_sent: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== FORM SCHEMAS ==============
class FormFieldDefinition(BaseModel):
    type: str
    label: str
    name: str
    required: bool = False
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None

class ContactFormBase(BaseModel):
    name: str
    fields: List[FormFieldDefinition]
    welcome_message: Optional[str] = None

class ContactFormCreate(ContactFormBase):
    pass

class ContactFormResponse(ContactFormBase):
    id: UUID
    workspace_id: UUID
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True

class ContactFormSubmission(BaseModel):
    data: Dict[str, Any]

class PostBookingFormBase(BaseModel):
    name: str
    description: Optional[str] = None
    fields: List[FormFieldDefinition]

class PostBookingFormCreate(PostBookingFormBase):
    service_type_id: UUID

class PostBookingFormResponse(PostBookingFormBase):
    id: UUID
    workspace_id: UUID
    service_type_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class FormSubmissionResponse(BaseModel):
    id: UUID
    form_id: UUID
    booking_id: UUID
    contact_id: Optional[UUID]
    data: Dict[str, Any]
    status: str
    submitted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ============== INVENTORY SCHEMAS ==============
class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int = 0
    low_stock_threshold: int = 10
    unit: str = "pieces"
    vendor_email: Optional[EmailStr] = None
    linked_service_ids: List[str] = []   # ✅ ADDED — was missing, caused 500

    @validator('vendor_email', pre=True, always=True)
    def validate_vendor_email(cls, v):
        return empty_str_to_none(v)

    @validator('description', pre=True, always=True)
    def validate_description(cls, v):
        return empty_str_to_none(v)

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    vendor_email: Optional[EmailStr] = None
    linked_service_ids: Optional[List[str]] = None

    @validator('vendor_email', pre=True, always=True)
    def validate_vendor_email(cls, v):
        return empty_str_to_none(v)

    @validator('description', pre=True, always=True)
    def validate_description(cls, v):
        return empty_str_to_none(v)

class InventoryItemResponse(InventoryItemBase):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InventoryUsageCreate(BaseModel):
    booking_id: Optional[UUID] = None
    quantity_used: int
    notes: Optional[str] = None


# ============== INTEGRATION SCHEMAS ==============
class IntegrationBase(BaseModel):
    type: str
    provider: Optional[str] = None
    config: Dict[str, Any]

class IntegrationCreate(IntegrationBase):
    pass

class IntegrationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    type: str
    provider: Optional[str]
    is_active: bool
    last_synced_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ============== ALERT SCHEMAS ==============
class AlertCreate(BaseModel):
    workspace_id: UUID
    type: str
    priority: str = "medium"
    title: str
    message: str
    link: Optional[str] = None

class AlertResponse(AlertCreate):
    id: UUID
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============== DASHBOARD SCHEMAS ==============
class DashboardStats(BaseModel):
    total_bookings_today: int
    upcoming_bookings: int
    new_leads: int
    pending_forms: int
    low_stock_items: int
    unread_alerts: int

class BookingCalendarSlot(BaseModel):
    date: datetime
    available: bool
    bookings: List[BookingResponse] = []


# ============== ONBOARDING SCHEMAS ==============
class OnboardingStatus(BaseModel):
    current_step: int
    completed_steps: List[int]
    is_complete: bool
    workspace: WorkspaceResponse

class EmailIntegrationSetup(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str

class ActivateWorkspaceRequest(BaseModel):
    confirm: bool = True