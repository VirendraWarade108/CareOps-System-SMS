from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta, datetime
import uvicorn
import atexit

from app.database import get_db, Base, engine
from app.config import settings
from app import models, schemas
from app.utils.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.services.email_service import get_email_service
from app.services.automation_service import get_automation_service
from app.scheduler import start_scheduler, stop_scheduler

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CareOps API",
    description="Unified Operations Platform for Service Businesses",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# ============== STARTUP/SHUTDOWN ==============
@app.on_event("startup")
async def startup_event():
    """Start background scheduler on app startup"""
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    """Stop background scheduler on app shutdown"""
    stop_scheduler()


# Ensure scheduler stops on exit
atexit.register(stop_scheduler)


# ============== DEPENDENCIES ==============
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """Get current authenticated user"""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


async def get_current_workspace(
    workspace_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> models.Workspace:
    """Get workspace and verify user has access"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Check if user is owner or member
    if workspace.owner_id != current_user.id:
        is_member = db.query(models.WorkspaceMember).filter(
            models.WorkspaceMember.workspace_id == workspace_id,
            models.WorkspaceMember.user_id == current_user.id
        ).first()
        
        if not is_member:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return workspace


# ============== AUTHENTICATION ROUTES ==============
@app.post("/api/auth/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register new user"""
    # Check if user exists
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }


@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login user"""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user info"""
    return current_user


# ============== WORKSPACE ROUTES ==============
@app.post("/api/workspaces", response_model=schemas.WorkspaceResponse)
def create_workspace(
    workspace: schemas.WorkspaceCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new workspace"""
    import re
    
    # Generate slug from business name
    slug = re.sub(r'[^a-z0-9]+', '-', workspace.business_name.lower()).strip('-')
    
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while db.query(models.Workspace).filter(models.Workspace.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    db_workspace = models.Workspace(
        **workspace.dict(),
        slug=slug,
        owner_id=current_user.id
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    
    return db_workspace


@app.get("/api/workspaces", response_model=List[schemas.WorkspaceResponse])
def get_workspaces(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's workspaces"""
    # Get owned workspaces
    owned = db.query(models.Workspace).filter(
        models.Workspace.owner_id == current_user.id
    ).all()
    
    # Get member workspaces
    memberships = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.user_id == current_user.id
    ).all()
    
    member_workspaces = [m.workspace for m in memberships]
    
    return owned + member_workspaces


@app.get("/api/workspaces/{workspace_id}", response_model=schemas.WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get workspace details"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    return workspace


@app.patch("/api/workspaces/{workspace_id}")
def update_workspace(
    workspace_id: str,
    update_data: dict,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Update workspace settings"""
    for key, value in update_data.items():
        if hasattr(workspace, key) and key not in ['id', 'slug', 'owner_id', 'created_at']:
            setattr(workspace, key, value)
    
    db.commit()
    db.refresh(workspace)
    return workspace


@app.patch("/api/workspaces/{workspace_id}/activate")
def activate_workspace(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Activate workspace after onboarding"""
    workspace.is_active = True
    workspace.onboarding_step = 8  # Completed
    db.commit()
    db.refresh(workspace)
    return {"message": "Workspace activated successfully", "workspace": workspace}


@app.patch("/api/workspaces/{workspace_id}/onboarding-step")
def update_onboarding_step(
    workspace_id: str,
    request_data: dict,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Update onboarding step"""
    step = request_data.get('step')
    if step is None:
        raise HTTPException(status_code=400, detail="Step value required")
    
    workspace.onboarding_step = int(step)
    db.commit()
    db.refresh(workspace)
    return workspace


# ============== STAFF MANAGEMENT ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/staff")
def invite_staff(
    workspace_id: str,
    invite_data: dict,
    workspace: models.Workspace = Depends(get_current_workspace),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite staff member to workspace"""
    # Only owner can invite
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only workspace owner can invite staff")
    
    email = invite_data.get('email')
    permissions = invite_data.get('permissions', {
        'inbox': True,
        'bookings': True,
        'forms': True,
        'inventory': False
    })
    
    # Check if user exists
    staff_user = db.query(models.User).filter(models.User.email == email).first()
    
    if not staff_user:
        # Create staff user with temporary password
        temp_password = get_password_hash("changeme123")
        staff_user = models.User(
            email=email,
            password_hash=temp_password,
            full_name=invite_data.get('name', ''),
            role='staff'
        )
        db.add(staff_user)
        db.flush()
    
    # Check if already member
    existing = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == workspace_id,
        models.WorkspaceMember.user_id == staff_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    # Create membership
    member = models.WorkspaceMember(
        workspace_id=workspace_id,
        user_id=staff_user.id,
        permissions=permissions
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    
    return {"message": "Staff member invited successfully", "member": member}


@app.get("/api/workspaces/{workspace_id}/staff")
def list_staff(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List all staff members"""
    members = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == workspace_id
    ).all()
    
    result = []
    for member in members:
        user = db.query(models.User).filter(models.User.id == member.user_id).first()
        result.append({
            "id": str(member.id),
            "user_id": str(member.user_id),
            "email": user.email if user else None,
            "full_name": user.full_name if user else None,
            "permissions": member.permissions,
            "created_at": member.created_at.isoformat()
        })
    
    return result


@app.patch("/api/workspaces/{workspace_id}/staff/{member_id}")
def update_staff_permissions(
    workspace_id: str,
    member_id: str,
    update_data: dict,
    workspace: models.Workspace = Depends(get_current_workspace),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update staff member permissions"""
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only workspace owner can update permissions")
    
    member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.id == member_id,
        models.WorkspaceMember.workspace_id == workspace_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    member.permissions = update_data.get('permissions', member.permissions)
    db.commit()
    db.refresh(member)
    
    return member


@app.delete("/api/workspaces/{workspace_id}/staff/{member_id}")
def remove_staff(
    workspace_id: str,
    member_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove staff member from workspace"""
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only workspace owner can remove staff")
    
    member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.id == member_id,
        models.WorkspaceMember.workspace_id == workspace_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    db.delete(member)
    db.commit()
    
    return {"message": "Staff member removed successfully"}


# ============== INTEGRATION ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/integrations")
def create_integration(
    workspace_id: str,
    integration: schemas.IntegrationCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create new integration"""
    db_integration = models.Integration(
        workspace_id=workspace_id,
        type=integration.type,
        provider=integration.provider,
        config=integration.config
    )
    db.add(db_integration)
    db.commit()
    db.refresh(db_integration)
    return db_integration


@app.get("/api/workspaces/{workspace_id}/integrations")
def list_integrations(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List all integrations"""
    integrations = db.query(models.Integration).filter(
        models.Integration.workspace_id == workspace_id
    ).all()
    return integrations


# ============== CONTACT ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/contacts", response_model=schemas.ContactResponse)
def create_contact(
    workspace_id: str,
    contact: schemas.ContactCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create new contact"""
    db_contact = models.Contact(workspace_id=workspace_id, **contact.dict())
    db.add(db_contact)
    db.flush()
    
    # Create conversation
    conversation = models.Conversation(
        workspace_id=workspace_id,
        contact_id=db_contact.id,
        status="open"
    )
    db.add(conversation)
    
    db.commit()
    db.refresh(db_contact)
    
    # Send welcome email via automation
    try:
        email_service = get_email_service(workspace_id, db)
        email_service.send_welcome_email(db_contact)
    except Exception as e:
        print(f"⚠️ Failed to send welcome email: {str(e)}")
    
    return db_contact


@app.get("/api/workspaces/{workspace_id}/contacts", response_model=List[schemas.ContactResponse])
def get_contacts(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Get all contacts for workspace"""
    contacts = db.query(models.Contact).filter(
        models.Contact.workspace_id == workspace_id
    ).all()
    
    return contacts


# ============== CONTACT FORM ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/contact-forms")
def create_contact_form(
    workspace_id: str,
    form: schemas.ContactFormCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create new contact form"""
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', form.name.lower()).strip('-')
    
    db_form = models.ContactForm(
    workspace_id=workspace_id,
    name=form.name,
    slug=slug,
    fields=[f.dict() for f in form.fields],
    welcome_message=form.welcome_message
    )
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form


@app.get("/api/workspaces/{workspace_id}/contact-forms")
def list_contact_forms(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List all contact forms"""
    forms = db.query(models.ContactForm).filter(
        models.ContactForm.workspace_id == workspace_id
    ).all()
    return forms


# ============== SERVICE TYPE ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/services")
def create_service(
    workspace_id: str,
    service: schemas.ServiceTypeCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create new service type"""
    db_service = models.ServiceType(
        workspace_id=workspace_id,
        name=service.name,
        description=service.description,
        duration_minutes=service.duration_minutes,
        location=service.location,
        color=service.color
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


@app.get("/api/workspaces/{workspace_id}/services")
def list_services(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List all service types"""
    services = db.query(models.ServiceType).filter(
        models.ServiceType.workspace_id == workspace_id
    ).all()
    return services


# ============== AVAILABILITY ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/services/{service_id}/availability")
def create_availability(
    workspace_id: str,
    service_id: str,
    availability: schemas.AvailabilitySlotCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create availability slot"""
    db_availability = models.AvailabilitySlot(
        service_type_id=service_id,
        day_of_week=availability.day_of_week,
        start_time=availability.start_time,
        end_time=availability.end_time
    )
    db.add(db_availability)
    db.commit()
    db.refresh(db_availability)
    return db_availability


@app.get("/api/workspaces/{workspace_id}/services/{service_id}/availability")
def list_availability(
    workspace_id: str,
    service_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List availability slots for service"""
    slots = db.query(models.AvailabilitySlot).filter(
        models.AvailabilitySlot.service_type_id == service_id
    ).all()
    return slots


# ============== BOOKING ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/bookings", response_model=schemas.BookingResponse)
def create_booking(
    workspace_id: str,
    booking: schemas.BookingCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create new booking"""
    from datetime import timedelta
    
    # Get or create contact
    contact = db.query(models.Contact).filter(
        models.Contact.workspace_id == workspace_id,
        models.Contact.email == booking.contact_email
    ).first()
    
    if not contact:
        contact = models.Contact(
            workspace_id=workspace_id,
            name=booking.contact_name,
            email=booking.contact_email,
            phone=booking.contact_phone,
            source="booking"
        )
        db.add(contact)
        db.flush()
    
    # Get service type for duration
    service = db.query(models.ServiceType).filter(
        models.ServiceType.id == booking.service_type_id
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service type not found")
    
    # Calculate end time
    end_time = booking.scheduled_at + timedelta(minutes=service.duration_minutes)
    
    db_booking = models.Booking(
        workspace_id=workspace_id,
        contact_id=contact.id,
        service_type_id=booking.service_type_id,
        scheduled_at=booking.scheduled_at,
        end_time=end_time,
        notes=booking.notes,
        location=service.location,
        status="pending"
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    
    # Send confirmation email
    try:
        email_service = get_email_service(workspace_id, db)
        email_service.send_booking_confirmation(db_booking)
    except Exception as e:
        print(f"⚠️ Failed to send booking confirmation: {str(e)}")
    
    return db_booking


@app.get("/api/workspaces/{workspace_id}/bookings", response_model=List[schemas.BookingResponse])
def get_bookings(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Get all bookings for workspace"""
    bookings = db.query(models.Booking).filter(
        models.Booking.workspace_id == workspace_id
    ).order_by(models.Booking.scheduled_at.desc()).all()
    
    return bookings


@app.patch("/api/bookings/{booking_id}")
def update_booking(
    booking_id: str,
    update: schemas.BookingUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update booking status/details"""
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(booking, field, value)
    
    db.commit()
    db.refresh(booking)
    return booking


# ============== POST-BOOKING FORM ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/post-booking-forms")
def create_post_booking_form(
    workspace_id: str,
    form: schemas.PostBookingFormCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create post-booking form"""
    db_form = models.PostBookingForm(
    workspace_id=workspace_id,
    service_type_id=form.service_type_id,
    name=form.name,
    description=form.description,
    fields=[f.dict() for f in form.fields]
    )
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form


@app.get("/api/workspaces/{workspace_id}/form-submissions")
def list_form_submissions(
    workspace_id: str,
    status: Optional[str] = None,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List form submissions"""
    query = db.query(models.FormSubmission).join(
        models.Booking
    ).filter(
        models.Booking.workspace_id == workspace_id
    )
    
    if status:
        query = query.filter(models.FormSubmission.status == status)
    
    submissions = query.all()
    return submissions


@app.patch("/api/form-submissions/{submission_id}")
def update_form_submission(
    submission_id: str,
    update_data: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update form submission status"""
    submission = db.query(models.FormSubmission).filter(
        models.FormSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    status_value = update_data.get('status')
    if status_value:
        submission.status = status_value
        if status_value == "completed":
            submission.submitted_at = datetime.now()
    
    db.commit()
    db.refresh(submission)
    return submission


# ============== CONVERSATION ROUTES ==============
@app.get("/api/workspaces/{workspace_id}/conversations")
def list_conversations(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List all conversations with contact info"""
    conversations = db.query(models.Conversation).filter(
        models.Conversation.workspace_id == workspace_id
    ).order_by(models.Conversation.last_message_at.desc()).all()
    
    result = []
    for conv in conversations:
        contact = db.query(models.Contact).filter(
            models.Contact.id == conv.contact_id
        ).first()
        conv_dict = {
            "id": str(conv.id),
            "workspace_id": str(conv.workspace_id),
            "contact_id": str(conv.contact_id),
            "status": conv.status,
            "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
            "automation_paused": conv.automation_paused,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "contact": {
                "name": contact.name if contact else "Unknown",
                "email": contact.email if contact else ""
            } if contact else None
        }
        result.append(conv_dict)
    return result


@app.get("/api/conversations/{conversation_id}/messages")
def get_messages(
    conversation_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for a conversation"""
    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(models.Message.sent_at.asc()).all()
    return messages


@app.post("/api/conversations/{conversation_id}/messages")
def send_message(
    conversation_id: str,
    message: schemas.MessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message in a conversation"""
    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    db_message = models.Message(
        conversation_id=conversation_id,
        sender_type="staff",
        sender_id=current_user.id,
        content=message.content,
        channel=message.channel
    )
    db.add(db_message)
    
    # Update conversation last message time and pause automation
    conversation.last_message_at = datetime.now()
    conversation.automation_paused = True
    
    db.commit()
    db.refresh(db_message)
    
    return db_message


# ============== INVENTORY ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/inventory")
def create_inventory_item(
    workspace_id: str,
    item: schemas.InventoryItemCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create inventory item"""
    # 🔍 DEBUG LOGGING
    print("\n" + "="*70)
    print("📦 CREATING INVENTORY ITEM")
    print("="*70)
    print(f"Workspace ID: {workspace_id}")
    print(f"Item Name: {item.name}")
    print(f"Linked Service IDs (received): {item.linked_service_ids}")
    print(f"Type: {type(item.linked_service_ids)}")
    print(f"Length: {len(item.linked_service_ids) if item.linked_service_ids else 0}")
    print("="*70 + "\n")
    
    try:
        db_item = models.InventoryItem(
            workspace_id=workspace_id,
            name=item.name,
            description=item.description,
            quantity=item.quantity,
            low_stock_threshold=item.low_stock_threshold,
            unit=item.unit,
            vendor_email=item.vendor_email,
            linked_service_ids=item.linked_service_ids
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        # 🔍 DEBUG: Verify what was saved
        print(f"✅ Created item ID: {db_item.id}")
        print(f"✅ Saved linked_service_ids: {db_item.linked_service_ids}")
        print(f"✅ Type in DB: {type(db_item.linked_service_ids)}")
        print()
        
        return db_item
        
    except Exception as e:
        db.rollback()
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workspaces/{workspace_id}/inventory")
def list_inventory(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List all inventory items"""
    items = db.query(models.InventoryItem).filter(
        models.InventoryItem.workspace_id == workspace_id
    ).all()
    return items


@app.patch("/api/inventory/{item_id}")
def update_inventory(
    item_id: str,
    update: schemas.InventoryItemUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update inventory item"""
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    return item


# backend/app/main.py
# Find the record_usage function and update the alert creation:

@app.post("/api/inventory/{item_id}/usage")
def record_usage(
    item_id: str,
    usage: schemas.InventoryUsageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record inventory usage"""
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Create usage record
    db_usage = models.InventoryUsage(
        item_id=item_id,
        booking_id=usage.booking_id,
        quantity_used=usage.quantity_used,
        notes=usage.notes
    )
    db.add(db_usage)
    
    # Update item quantity
    item.quantity -= usage.quantity_used
    
    # Create alert if low stock
    if item.quantity <= item.low_stock_threshold:
        # Check if alert already exists
        existing_alert = db.query(models.Alert).filter(
            models.Alert.workspace_id == item.workspace_id,
            models.Alert.type == "low_stock",
            models.Alert.link == f"/dashboard/inventory?item={item_id}",  # ✅ UPDATED ROUTE
            models.Alert.is_read == False
        ).first()
        
        if not existing_alert:
            alert = models.Alert(
                workspace_id=item.workspace_id,
                type="low_stock",
                priority="high",
                title=f"Low Stock: {item.name}",
                message=f"{item.name} is running low ({item.quantity} {item.unit} remaining)",
                link=f"/dashboard/inventory?item={item_id}"  # ✅ UPDATED ROUTE
            )
            db.add(alert)
            
            # Send email alert
            try:
                email_service = get_email_service(item.workspace_id, db)
                email_service.send_low_stock_alert(item)
            except Exception as e:
                print(f"⚠️ Failed to send low stock email: {str(e)}")
    
    db.commit()
    db.refresh(db_usage)
    return db_usage


# ============== ALERT ROUTES ==============
@app.get("/api/workspaces/{workspace_id}/alerts")
def get_alerts(
    workspace_id: str,
    unread_only: bool = False,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Get alerts for workspace"""
    query = db.query(models.Alert).filter(
        models.Alert.workspace_id == workspace_id
    )
    
    if unread_only:
        query = query.filter(models.Alert.is_read == False)
    
    alerts = query.order_by(models.Alert.created_at.desc()).all()
    return alerts


@app.patch("/api/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark alert as read"""
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


# ============== DASHBOARD ROUTES ==============
@app.get("/api/workspaces/{workspace_id}/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    from datetime import datetime, timedelta
    
    today = datetime.now().date()
    
    # Count today's bookings
    today_bookings = db.query(models.Booking).filter(
        models.Booking.workspace_id == workspace_id,
        models.Booking.scheduled_at >= today,
        models.Booking.scheduled_at < today + timedelta(days=1)
    ).count()
    
    # Count upcoming bookings
    upcoming_bookings = db.query(models.Booking).filter(
        models.Booking.workspace_id == workspace_id,
        models.Booking.scheduled_at >= datetime.now(),
        models.Booking.status == "pending"
    ).count()
    
    # Count new leads (contacts created in last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    new_leads = db.query(models.Contact).filter(
        models.Contact.workspace_id == workspace_id,
        models.Contact.created_at >= week_ago
    ).count()
    
    # Count pending forms
    pending_forms = db.query(models.FormSubmission).join(
        models.Booking
    ).filter(
        models.Booking.workspace_id == workspace_id,
        models.FormSubmission.status == "pending"
    ).count()
    
    # Count low stock items
    low_stock_items = db.query(models.InventoryItem).filter(
        models.InventoryItem.workspace_id == workspace_id,
        models.InventoryItem.quantity <= models.InventoryItem.low_stock_threshold
    ).count()
    
    # Count unread alerts
    unread_alerts = db.query(models.Alert).filter(
        models.Alert.workspace_id == workspace_id,
        models.Alert.is_read == False
    ).count()
    
    return {
        "total_bookings_today": today_bookings,
        "upcoming_bookings": upcoming_bookings,
        "new_leads": new_leads,
        "pending_forms": pending_forms,
        "low_stock_items": low_stock_items,
        "unread_alerts": unread_alerts
    }


# ============== PUBLIC ROUTES (No Auth) ==============
@app.get("/api/public/workspaces/{slug}")
def get_public_workspace(slug: str, db: Session = Depends(get_db)):
    """Get public workspace info"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.slug == slug,
        models.Workspace.is_active == True
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    return {
        "business_name": workspace.business_name,
        "address": workspace.address,
        "timezone": workspace.timezone
    }


@app.get("/api/public/workspaces/{slug}/services")
def get_public_services(slug: str, db: Session = Depends(get_db)):
    """Get public service types"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.slug == slug,
        models.Workspace.is_active == True
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    services = db.query(models.ServiceType).filter(
        models.ServiceType.workspace_id == workspace.id,
        models.ServiceType.is_active == True
    ).all()
    
    return services

@app.get("/api/public/workspaces/{slug}/services/{service_id}/availability")
def get_public_availability(slug: str, service_id: str, db: Session = Depends(get_db)):
    """Get availability slots for a service (public access)"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.slug == slug,
        models.Workspace.is_active == True
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    service = db.query(models.ServiceType).filter(
        models.ServiceType.id == service_id,
        models.ServiceType.workspace_id == workspace.id,
        models.ServiceType.is_active == True
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    slots = db.query(models.AvailabilitySlot).filter(
        models.AvailabilitySlot.service_type_id == service_id
    ).all()
    
    return slots

@app.post("/api/public/workspaces/{slug}/bookings")
def create_public_booking(
    slug: str,
    booking: schemas.BookingCreate,
    db: Session = Depends(get_db)
):
    """Create booking from public booking page"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.slug == slug,
        models.Workspace.is_active == True
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Get or create contact
    contact = db.query(models.Contact).filter(
        models.Contact.workspace_id == workspace.id,
        models.Contact.email == booking.contact_email
    ).first()
    
    if not contact:
        contact = models.Contact(
            workspace_id=workspace.id,
            name=booking.contact_name,
            email=booking.contact_email,
            phone=booking.contact_phone,
            source="booking"
        )
        db.add(contact)
        db.flush()
        
        # Create conversation for new contact
        conversation = models.Conversation(
            workspace_id=workspace.id,
            contact_id=contact.id,
            status="open"
        )
        db.add(conversation)
    
    # Get service
    service = db.query(models.ServiceType).filter(
        models.ServiceType.id == booking.service_type_id
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    from datetime import timedelta
    end_time = booking.scheduled_at + timedelta(minutes=service.duration_minutes)
    
    # Create booking
    db_booking = models.Booking(
        workspace_id=workspace.id,
        contact_id=contact.id,
        service_type_id=service.id,
        scheduled_at=booking.scheduled_at,
        end_time=end_time,
        notes=booking.notes,
        location=service.location,
        status="pending"
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    
    # Send confirmation email
    try:
        email_service = get_email_service(workspace.id, db)
        email_service.send_booking_confirmation(db_booking)
    except Exception as e:
        print(f"⚠️ Failed to send booking confirmation: {str(e)}")
    
    return {"message": "Booking created successfully", "booking_id": str(db_booking.id)}


@app.post("/api/public/workspaces/{slug}/contact")
def submit_public_contact_form(
    slug: str,
    form_data: dict,
    db: Session = Depends(get_db)
):
    """Submit contact form from public page"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.slug == slug,
        models.Workspace.is_active == True
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Extract contact info
    name = form_data.get('name')
    email = form_data.get('email')
    phone = form_data.get('phone')
    message = form_data.get('message')
    
    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required")
    
    # Check if contact exists
    contact = db.query(models.Contact).filter(
        models.Contact.workspace_id == workspace.id,
        models.Contact.email == email
    ).first()
    
    if not contact:
        contact = models.Contact(
            workspace_id=workspace.id,
            name=name,
            email=email,
            phone=phone,
            source="contact_form"
        )
        db.add(contact)
        db.flush()
    
    # Create or get conversation
    conversation = db.query(models.Conversation).filter(
        models.Conversation.workspace_id == workspace.id,
        models.Conversation.contact_id == contact.id
    ).first()
    
    if not conversation:
        conversation = models.Conversation(
            workspace_id=workspace.id,
            contact_id=contact.id,
            status="open"
        )
        db.add(conversation)
        db.flush()
    
    # Add message if provided
    if message:
        db_message = models.Message(
            conversation_id=conversation.id,
            sender_type="contact",
            sender_id=contact.id,
            content=message,
            channel="email"
        )
        db.add(db_message)
        conversation.last_message_at = datetime.now()
    
    db.commit()
    
    # Send welcome email
    try:
        email_service = get_email_service(workspace.id, db)
        email_service.send_welcome_email(contact)
    except Exception as e:
        print(f"⚠️ Failed to send welcome email: {str(e)}")
    
    return {"message": "Thank you! We'll be in touch soon.", "contact_id": str(contact.id)}


# ============== HEALTH CHECK ==============
@app.get("/")
def root():
    return {"message": "CareOps API is running", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "scheduler": "active"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)