'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [error, setError] = useState('');

  // Step 1: Workspace data
  const [workspace, setWorkspace] = useState({
    business_name: '',
    address: '',
    city: '',
    state: '',
    timezone: 'America/New_York',
    contact_email: '',
    contact_phone: ''
  });

  // Step 2: Email Integration
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: ''
  });

  // Step 3: Contact Form
  const [contactForm, setContactForm] = useState({
    name: 'Contact Form',
    welcome_message: 'Thank you for contacting us! We will get back to you soon.',
    fields: [
      { type: 'text', label: 'Name', name: 'name', required: true },
      { type: 'email', label: 'Email', name: 'email', required: true },
      { type: 'phone', label: 'Phone', name: 'phone', required: false },
      { type: 'textarea', label: 'Message', name: 'message', required: false }
    ]
  });

  // Step 4: Service Types
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    location: workspace.address || '',
    color: '#3B82F6'
  });

  // Step 5: Availability - SEPARATE STATE PER SERVICE (THIS IS THE KEY FIX!)
  const [serviceAvailability, setServiceAvailability] = useState<{[key: string]: any[]}>({});
  const [currentAvailabilityService, setCurrentAvailabilityService] = useState('');
  const [syncAvailabilityFrom, setSyncAvailabilityFrom] = useState('');
  
  const defaultAvailability = () => [
    { day: 1, enabled: true, start: '09:00', end: '17:00' },
    { day: 2, enabled: true, start: '09:00', end: '17:00' },
    { day: 3, enabled: true, start: '09:00', end: '17:00' },
    { day: 4, enabled: true, start: '09:00', end: '17:00' },
    { day: 5, enabled: true, start: '09:00', end: '17:00' },
    { day: 6, enabled: false, start: '09:00', end: '17:00' },
    { day: 0, enabled: false, start: '09:00', end: '17:00' }
  ];

  // Step 6: Post-Booking Forms - SEPARATE STATE PER SERVICE (THIS IS THE KEY FIX!)
  const [servicePostBookingForms, setServicePostBookingForms] = useState<{[key: string]: any}>({});
  const [currentFormService, setCurrentFormService] = useState('');
  const [syncFormFrom, setSyncFormFrom] = useState('');
  
  const defaultPostBookingForm = () => ({
    name: 'Intake Form',
    description: 'Please complete this form before your appointment',
    fields: [
      { type: 'text', label: 'Emergency Contact Name', name: 'emergency_contact_name', required: true },
      { type: 'phone', label: 'Emergency Contact Phone', name: 'emergency_contact_phone', required: true },
      { type: 'textarea', label: 'Medical History', name: 'medical_history', required: false },
      { type: 'textarea', label: 'Current Medications', name: 'current_medications', required: false },
      { type: 'textarea', label: 'Allergies', name: 'allergies', required: false }
    ]
  });

  // Step 7: Inventory - SEPARATE STATE PER SERVICE (THIS IS THE KEY FIX!)
  const [serviceInventory, setServiceInventory] = useState<{[key: string]: any[]}>({});
  const [currentInventoryService, setCurrentInventoryService] = useState('all');
  const [syncInventoryFrom, setSyncInventoryFrom] = useState('');
  const [newInventoryItem, setNewInventoryItem] = useState({
    name: '',
    description: '',
    quantity: 0,
    low_stock_threshold: 10,
    unit: 'pieces',
    vendor_email: '',
    service_ids: [] as string[]
  });

  const nextStep = () => {
    setError('');
    setCurrentStep(Math.min(8, currentStep + 1));
  };
  
  const prevStep = () => {
    setError('');
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  // Step 1: Create Workspace
  const handleStep1 = async () => {
    if (!workspace.business_name) {
      setError('Business name is required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.post('/api/workspaces', workspace);
      setWorkspaceId(response.data.id);
      await api.patch(`/api/workspaces/${response.data.id}/onboarding-step`, { step: 2 });
      nextStep();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Email Integration
  const handleStep2 = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await api.post(`/api/workspaces/${workspaceId}/integrations`, {
        type: 'email',
        provider: 'smtp',
        config: emailConfig
      });
      await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 3 });
      nextStep();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to setup email');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Contact Form
  const handleStep3 = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await api.post(`/api/workspaces/${workspaceId}/contact-forms`, contactForm);
      await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 4 });
      nextStep();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create contact form');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Add Service
  const addService = async () => {
    if (!newService.name) {
      setError('Service name is required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/services`, {
        name: newService.name,
        description: newService.description || null,
        duration_minutes: newService.duration_minutes,
        location: newService.location || null,
        color: newService.color || '#3B82F6',
      });
      const serviceId = response.data.id;
      setServices([...services, response.data]);
      
      // Initialize SEPARATE state for this service (KEY FIX!)
      setServiceAvailability(prev => ({ 
        ...prev, 
        [serviceId]: defaultAvailability() // Create NEW array for this service
      }));
      setServicePostBookingForms(prev => ({ 
        ...prev, 
        [serviceId]: defaultPostBookingForm() // Create NEW object for this service
      }));
      setServiceInventory(prev => ({ 
        ...prev, 
        [serviceId]: [] 
      }));
      
      setNewService({
        name: '',
        description: '',
        duration_minutes: 60,
        location: workspace.address || '',
        color: '#3B82F6'
      });
      setError('');
    } catch (error: any) {
      setError('Error adding service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep4 = async () => {
    if (services.length === 0) {
      setError('Please add at least one service type');
      return;
    }
    
    await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 5 });
    
    // Auto-select first service
    if (services.length > 0) {
      setCurrentAvailabilityService(services[0].id);
    }
    
    nextStep();
  };

  // Step 5: Availability (per service)
  const syncAvailability = () => {
    if (!syncAvailabilityFrom || !currentAvailabilityService) return;
    const sourceAvailability = serviceAvailability[syncAvailabilityFrom];
    if (sourceAvailability) {
      // Create a DEEP COPY (not reference) - THIS IS CRITICAL!
      setServiceAvailability(prev => ({
        ...prev,
        [currentAvailabilityService]: JSON.parse(JSON.stringify(sourceAvailability))
      }));
    }
  };

  // Update availability for current service - FIXED VERSION
  const updateCurrentAvailability = (index: number, field: string, value: any) => {
    if (!currentAvailabilityService) return;
    
    setServiceAvailability(prev => {
      // Get current service's availability (or create default if doesn't exist)
      const currentServiceSlots = prev[currentAvailabilityService] || defaultAvailability();
      
      // Create a NEW array with the update
      const updatedSlots = currentServiceSlots.map((slot, idx) => 
        idx === index ? { ...slot, [field]: value } : slot
      );
      
      // Return NEW state object with updated array for current service
      return {
        ...prev,
        [currentAvailabilityService]: updatedSlots
      };
    });
  };

  const handleStep5 = async () => {
    if (!currentAvailabilityService) {
      setError('Please configure availability for at least one service');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Save availability for each service
      for (const serviceId of Object.keys(serviceAvailability)) {
        const availability = serviceAvailability[serviceId];
        for (const slot of availability) {
          if (slot.enabled) {
            await api.post(
              `/api/workspaces/${workspaceId}/services/${serviceId}/availability`,
              {
                day_of_week: slot.day,
                start_time: slot.start,
                end_time: slot.end
              }
            );
          }
        }
      }
      
      await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 6 });
      
      // Auto-select first service for forms
      if (services.length > 0) {
        setCurrentFormService(services[0].id);
      }
      
      nextStep();
    } catch (error: any) {
      setError('Failed to save availability');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 6: Post-Booking Forms (per service)
  const syncPostBookingForm = () => {
    if (!syncFormFrom || !currentFormService) return;
    const sourceForm = servicePostBookingForms[syncFormFrom];
    if (sourceForm) {
      // Create a DEEP COPY (not reference) - THIS IS CRITICAL!
      setServicePostBookingForms(prev => ({
        ...prev,
        [currentFormService]: JSON.parse(JSON.stringify(sourceForm))
      }));
    }
  };

  // Update form for current service - FIXED VERSION
  const updateCurrentForm = (field: string, value: any) => {
    if (!currentFormService) return;
    
    setServicePostBookingForms(prev => {
      const currentForm = prev[currentFormService] || defaultPostBookingForm();
      
      return {
        ...prev,
        [currentFormService]: {
          ...currentForm,
          [field]: value
        }
      };
    });
  };

  const handleStep6 = async () => {
    if (!currentFormService) {
      setError('Please configure forms for at least one service');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Save post-booking forms for each service
      for (const serviceId of Object.keys(servicePostBookingForms)) {
        const form = servicePostBookingForms[serviceId];
        await api.post(`/api/workspaces/${workspaceId}/post-booking-forms`, {
          service_type_id: serviceId,
          name: form.name,
          description: form.description,
          fields: form.fields
        });
      }
      
      await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 7 });
      nextStep();
    } catch (error: any) {
      setError('Failed to create post-booking forms');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 7: Inventory (per service or shared)
  const syncInventory = () => {
    if (!syncInventoryFrom || !currentInventoryService || currentInventoryService === 'all') return;
    const sourceInventory = serviceInventory[syncInventoryFrom];
    if (sourceInventory) {
      setServiceInventory(prev => ({
        ...prev,
        [currentInventoryService]: JSON.parse(JSON.stringify(sourceInventory))
      }));
    }
  };

  const addInventoryItem = async () => {
    if (!newInventoryItem.name) {
    setError('Item name is required');
    return;
    }
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/inventory`, {
        name: newInventoryItem.name,
        description: newInventoryItem.description || null,
        quantity: newInventoryItem.quantity,
        low_stock_threshold: newInventoryItem.low_stock_threshold,
        unit: newInventoryItem.unit || 'pieces',
        vendor_email: newInventoryItem.vendor_email || null,
        linked_service_ids: newInventoryItem.service_ids || [],
      });
      
      // Add to selected service inventory or all services
      if (currentInventoryService === 'all') {
        // Add to all services
        services.forEach(service => {
          setServiceInventory(prev => ({
            ...prev,
            [service.id]: [...(prev[service.id] || []), response.data]
          }));
        });
      } else {
        // Add to specific service(s)
        const selectedServiceIds = newInventoryItem.service_ids.length > 0 
          ? newInventoryItem.service_ids 
          : [currentInventoryService];
          
        selectedServiceIds.forEach(serviceId => {
          setServiceInventory(prev => ({
            ...prev,
            [serviceId]: [...(prev[serviceId] || []), response.data]
          }));
        });
      }
      
      setNewInventoryItem({
        name: '',
        description: '',
        quantity: 0,
        low_stock_threshold: 10,
        unit: 'pieces',
        vendor_email: '',
        service_ids: []
      });
      setError('');
    } catch (error: any) {
      setError('Error adding inventory item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep7 = async () => {
    await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 8 });
    nextStep();
  };

  // Step 8: Activate
  const handleActivate = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await api.patch(`/api/workspaces/${workspaceId}/activate`);
      router.push('/dashboard');
    } catch (error: any) {
      setError('Error activating workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get current service's availability (FIXED - returns correct service's data)
  const getCurrentAvailability = () => {
    if (!currentAvailabilityService) return defaultAvailability();
    return serviceAvailability[currentAvailabilityService] || defaultAvailability();
  };

  // Get current service's form (FIXED - returns correct service's data)
  const getCurrentForm = () => {
    if (!currentFormService) return defaultPostBookingForm();
    return servicePostBookingForms[currentFormService] || defaultPostBookingForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Progress Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of 8
            </span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 8) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${(currentStep / 8) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Error Message */}
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* STEPS 1-4 REMAIN THE SAME - Workspace, Email, Contact Form, Services */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Create Your Workspace</h2>
              <p className="text-gray-600 mb-8">Let's start with the basics about your business</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Business Name *</label>
                  <input
                    type="text"
                    value={workspace.business_name}
                    onChange={(e) => setWorkspace({ ...workspace, business_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Acme Healthcare"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Address</label>
                  <input
                    type="text"
                    value={workspace.address}
                    onChange={(e) => setWorkspace({ ...workspace, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">City</label>
                    <input
                      type="text"
                      value={workspace.city}
                      onChange={(e) => setWorkspace({ ...workspace, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">State</label>
                    <input
                      type="text"
                      value={workspace.state}
                      onChange={(e) => setWorkspace({ ...workspace, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Contact Email</label>
                  <input
                    type="email"
                    value={workspace.contact_email}
                    onChange={(e) => setWorkspace({ ...workspace, contact_email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contact@acme.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Contact Phone</label>
                  <input
                    type="tel"
                    value={workspace.contact_phone}
                    onChange={(e) => setWorkspace({ ...workspace, contact_phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Timezone</label>
                  <select
                    value={workspace.timezone}
                    onChange={(e) => setWorkspace({ ...workspace, timezone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Phoenix">Arizona</option>
                    <option value="America/Anchorage">Alaska</option>
                    <option value="Pacific/Honolulu">Hawaii</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleStep1}
                disabled={isLoading || !workspace.business_name}
                className="mt-8 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
              >
                {isLoading ? 'Creating Workspace...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* Step 2: Email Integration */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Email Integration</h2>
              <p className="text-gray-600 mb-8">Connect your email to send confirmations and reminders</p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>💡 Demo Mode:</strong> You can skip email configuration for now. The system will simulate sending emails.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">SMTP Host</label>
                  <input
                    type="text"
                    value={emailConfig.smtp_host}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">SMTP Port</label>
                  <input
                    type="number"
                    value={emailConfig.smtp_port}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={emailConfig.smtp_user}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">App Password (Optional)</label>
                  <input
                    type="password"
                    value={emailConfig.smtp_password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStep2}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg transition"
                >
                  {isLoading ? 'Saving...' : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Contact Form */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Contact Form Setup</h2>
              <p className="text-gray-600 mb-8">Configure the form that customers will use to reach you</p>

              <div className="space-y-5 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Form Name</label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Welcome Message</label>
                  <textarea
                    value={contactForm.welcome_message}
                    onChange={(e) => setContactForm({ ...contactForm, welcome_message: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Form Fields Preview</h3>
                <div className="space-y-3">
                  {contactForm.fields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm bg-white p-3 rounded border border-gray-200">
                      <span className="font-medium text-gray-900">{field.label}</span>
                      <span className="text-gray-500">({field.type})</span>
                      {field.required && <span className="text-red-500 text-xs font-semibold">Required</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStep3}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg transition"
                >
                  {isLoading ? 'Saving...' : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Services */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Service Types</h2>
              <p className="text-gray-600 mb-8">What services do you offer to your customers?</p>

              {/* Existing Services */}
              {services.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="font-semibold text-gray-900">Your Services</h3>
                  {services.map((service, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-2">⏱ {service.duration_minutes} minutes</p>
                        </div>
                        <span 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: service.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Service */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-4">Add New Service</h3>
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Service name (e.g., Consultation, Checkup)"
                    />
                  </div>
                  <div>
                    <textarea
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description (optional)"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        value={newService.duration_minutes}
                        onChange={(e) => setNewService({ ...newService, duration_minutes: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="15"
                        step="15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                      <input
                        type="color"
                        value={newService.color}
                        onChange={(e) => setNewService({ ...newService, color: e.target.value })}
                        className="w-full h-[50px] border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addService}
                    disabled={isLoading || !newService.name}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition shadow-sm"
                  >
                    ➕ Add Service
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStep4}
                  disabled={services.length === 0}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg transition"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Availability (PER SERVICE - FIXED VERSION) */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Set Availability Per Service</h2>
              <p className="text-gray-600 mb-8">Configure different schedules for each service type</p>

              {/* Service Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-700">Select Service to Configure</label>
                <select
                  value={currentAvailabilityService}
                  onChange={(e) => setCurrentAvailabilityService(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a service...</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sync Option */}
              {currentAvailabilityService && services.length > 1 && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-purple-900 mb-1">
                        Copy Availability from Another Service
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={syncAvailabilityFrom}
                          onChange={(e) => setSyncAvailabilityFrom(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select source service...</option>
                          {services
                            .filter(s => s.id !== currentAvailabilityService && serviceAvailability[s.id])
                            .map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={syncAvailability}
                          disabled={!syncAvailabilityFrom}
                          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Sync
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Availability Slots - USING FIXED GETTER */}
              {currentAvailabilityService && (
                <div className="space-y-3">
                  {getCurrentAvailability().map((slot, idx) => {
                    const dayName = dayNames[slot.day];
                    
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border-2 transition ${
                          slot.enabled
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={slot.enabled}
                                onChange={(e) => updateCurrentAvailability(idx, 'enabled', e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="ml-3 font-semibold text-gray-900 min-w-[80px]">
                                {dayName}
                              </span>
                            </label>

                            {slot.enabled && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) => updateCurrentAvailability(idx, 'start', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) => updateCurrentAvailability(idx, 'end', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Progress Indicator */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Configuration Progress:</p>
                <div className="flex gap-2 flex-wrap">
                  {services.map((service) => (
                    <span
                      key={service.id}
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        serviceAvailability[service.id]
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {serviceAvailability[service.id] ? '✓' : '○'} {service.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStep5}
                  disabled={isLoading || !currentAvailabilityService}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg transition"
                >
                  {isLoading ? 'Saving...' : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Post-Booking Forms (PER SERVICE - FIXED VERSION) */}
          {currentStep === 6 && (
            <div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Post-Booking Forms Per Service</h2>
              <p className="text-gray-600 mb-8">Configure custom intake forms for each service type</p>

              {/* Service Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-700">Select Service to Configure</label>
                <select
                  value={currentFormService}
                  onChange={(e) => setCurrentFormService(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a service...</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sync Option */}
              {currentFormService && services.length > 1 && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-purple-900 mb-1">
                        Copy Form from Another Service
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={syncFormFrom}
                          onChange={(e) => setSyncFormFrom(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select source service...</option>
                          {services
                            .filter(s => s.id !== currentFormService && servicePostBookingForms[s.id])
                            .map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={syncPostBookingForm}
                          disabled={!syncFormFrom}
                          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Sync
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Configuration - USING FIXED GETTER */}
              {currentFormService && (
                <>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Form Name</label>
                      <input
                        type="text"
                        value={getCurrentForm().name}
                        onChange={(e) => updateCurrentForm('name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Description</label>
                      <textarea
                        value={getCurrentForm().description}
                        onChange={(e) => updateCurrentForm('description', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Form Fields</h3>
                    <div className="space-y-3">
                      {getCurrentForm().fields.map((field: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 text-sm bg-white p-3 rounded border border-gray-200">
                          <span className="font-medium text-gray-900">{field.label}</span>
                          <span className="text-gray-500">({field.type})</span>
                          {field.required && <span className="text-red-500 text-xs font-semibold">Required</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Progress Indicator */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Configuration Progress:</p>
                <div className="flex gap-2 flex-wrap">
                  {services.map((service) => (
                    <span
                      key={service.id}
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        servicePostBookingForms[service.id]
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {servicePostBookingForms[service.id] ? '✓' : '○'} {service.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStep6}
                  disabled={isLoading || !currentFormService}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg transition"
                >
                  {isLoading ? 'Saving...' : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 7: Inventory - Same as before with multi-service assignment */}
          {currentStep === 7 && (
            <div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Inventory Management</h2>
              <p className="text-gray-600 mb-8">Track supplies per service or share across all services</p>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-700">Manage Inventory For</label>
                <select
                  value={currentInventoryService}
                  onChange={(e) => setCurrentInventoryService(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Services (Shared Inventory)</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - Specific Inventory
                    </option>
                  ))}
                </select>
              </div>

              {currentInventoryService !== 'all' && services.length > 1 && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-purple-900 mb-1">
                        Copy Inventory from Another Service
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={syncInventoryFrom}
                          onChange={(e) => setSyncInventoryFrom(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select source service...</option>
                          {services
                            .filter(s => s.id !== currentInventoryService && serviceInventory[s.id])
                            .map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={syncInventory}
                          disabled={!syncInventoryFrom}
                          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Sync
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentInventoryService !== 'all' && serviceInventory[currentInventoryService]?.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="font-semibold text-gray-900">Current Inventory Items</h3>
                  {serviceInventory[currentInventoryService].map((item: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Stock: {item.quantity} {item.unit} · Threshold: {item.low_stock_threshold} {item.unit}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-4">Add Inventory Item</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={newInventoryItem.name}
                    onChange={(e) => setNewInventoryItem({ ...newInventoryItem, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Item name (e.g., Gloves, Masks)"
                  />
                  <textarea
                    value={newInventoryItem.description}
                    onChange={(e) => setNewInventoryItem({ ...newInventoryItem, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Description (optional)"
                    rows={2}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={newInventoryItem.quantity}
                        onChange={(e) => setNewInventoryItem({ ...newInventoryItem, quantity: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                      <input
                        type="text"
                        value={newInventoryItem.unit}
                        onChange={(e) => setNewInventoryItem({ ...newInventoryItem, unit: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        placeholder="pieces"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Low Stock</label>
                      <input
                        type="number"
                        value={newInventoryItem.low_stock_threshold}
                        onChange={(e) => setNewInventoryItem({ ...newInventoryItem, low_stock_threshold: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        min="0"
                      />
                    </div>
                  </div>
                  <input
                    type="email"
                    value={newInventoryItem.vendor_email}
                    onChange={(e) => setNewInventoryItem({ ...newInventoryItem, vendor_email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Vendor email (optional)"
                  />
                  
                  {/* Service Assignment - FIXED VERSION */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <label className="block text-xs font-medium text-purple-900 mb-2">Assign to Services</label>
                    <div className="space-y-2">
                      {/* Radio-style selection */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 hover:bg-purple-100 rounded">
                          <input
                            type="radio"
                            name="inventoryServiceAssignment"
                            checked={newInventoryItem.service_ids.length === 0}
                            onChange={() => setNewInventoryItem({ ...newInventoryItem, service_ids: [] })}
                            className="w-3.5 h-3.5 text-purple-600"
                          />
                          <span className="text-slate-700 font-medium">📦 All Services (Shared)</span>
                        </label>
                        
                        <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 hover:bg-purple-100 rounded">
                          <input
                            type="radio"
                            name="inventoryServiceAssignment"
                            checked={newInventoryItem.service_ids.length > 0}
                            onChange={() => {
                              // When switching to specific services, select the first one by default
                              if (services.length > 0) {
                                setNewInventoryItem({ ...newInventoryItem, service_ids: [services[0].id] });
                              }
                            }}
                            className="w-3.5 h-3.5 text-purple-600"
                          />
                          <span className="text-slate-700 font-medium">🎯 Specific Services</span>
                        </label>
                      </div>
                      
                      {/* Service checkboxes - only show when "Specific Services" is selected */}
                      {newInventoryItem.service_ids.length > 0 && (
                        <div className="pl-5 pt-1.5 space-y-1.5 border-l-2 border-purple-300">
                          {services.map(service => (
                            <label key={service.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-purple-100 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={newInventoryItem.service_ids.includes(service.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewInventoryItem(prev => ({
                                      ...prev,
                                      service_ids: [...prev.service_ids, service.id]
                                    }));
                                  } else {
                                    // Don't allow unchecking if it's the last one
                                    if (newInventoryItem.service_ids.length > 1) {
                                      setNewInventoryItem(prev => ({
                                        ...prev,
                                        service_ids: prev.service_ids.filter(id => id !== service.id)
                                      }));
                                    }
                                  }
                                }}
                                className="w-3.5 h-3.5 text-purple-600 rounded"
                              />
                              <span className="text-slate-700">{service.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={addInventoryItem}
                    disabled={isLoading || !newInventoryItem.name}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition shadow-sm"
                  >
                    ➕ Add Item
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Inventory Status:</p>
                <div className="flex gap-2 flex-wrap">
                  {services.map((service) => (
                    <span
                      key={service.id}
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        serviceInventory[service.id]?.length > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {service.name} ({serviceInventory[service.id]?.length || 0} items)
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStep7}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg transition"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 8: Review & Activate */}
          {currentStep === 8 && (
            <div>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">You're All Set!</h2>
                <p className="text-gray-600">Review your setup and activate your workspace</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-3 text-lg">✅ Completed Steps</h3>
                  <ul className="space-y-2 text-sm text-green-800">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Workspace created: <strong>{workspace.business_name}</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Email integration configured
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Contact form ready
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> {services.length} service type(s) added
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Availability configured for {Object.keys(serviceAvailability).length} service(s)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Post-booking forms created for {Object.keys(servicePostBookingForms).length} service(s)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Inventory configured
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">🔗 Your Public Booking Page</h3>
                  <code className="text-sm text-blue-800 bg-white px-3 py-2 rounded border border-blue-200 block break-all">
                    {typeof window !== 'undefined' && window.location.origin}/book/{workspace.business_name.toLowerCase().replace(/\s+/g, '-')}
                  </code>
                  <p className="text-xs text-blue-700 mt-2">Share this link with your customers to start accepting bookings!</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg text-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 shadow-lg transition transform hover:scale-105"
                >
                  {isLoading ? 'Activating...' : '🚀 Activate Workspace & Go to Dashboard'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}