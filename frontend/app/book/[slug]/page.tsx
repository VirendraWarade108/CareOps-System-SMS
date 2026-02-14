//frontend\app\book\[slug]\page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { publicApi } from '@/lib/api';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [workspace, setWorkspace] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);

  useEffect(() => {
    loadWorkspaceData();
  }, [slug]);

  useEffect(() => {
    if (selectedService) {
      loadAvailability();
    }
  }, [selectedService]);

  const loadAvailability = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/public/workspaces/${slug}/services/${selectedService.id}/availability`
      );
      setAvailabilitySlots(response.data);
    } catch (error) {
      console.error('Failed to load availability:', error);
    }
  };

  const isTimeAvailable = (date: Date, time: string): boolean => {
    const dayOfWeek = date.getDay();
    const daySlots = availabilitySlots.filter(slot => slot.day_of_week === dayOfWeek);
    if (daySlots.length === 0) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    return daySlots.some(slot => {
      const [startHour, startMin] = slot.start_time.split(':').map(Number);
      const [endHour, endMin] = slot.end_time.split(':').map(Number);
      const startInMinutes = startHour * 60 + startMin;
      const endInMinutes = endHour * 60 + endMin;
      return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
    });
  };

  const getAvailableTimeSlots = () => {
    if (!selectedDate) return [];
    const date = new Date(selectedDate);
    const availableTimes: string[] = [];
    
    for (let hour = 8; hour < 20; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        if (isTimeAvailable(date, timeString)) {
          availableTimes.push(timeString);
        }
      }
    }
    return availableTimes;
  };

  const loadWorkspaceData = async () => {
    try {
      const [workspaceData, servicesData] = await Promise.all([
        publicApi.getWorkspace(slug),
        publicApi.getServices(slug)
      ]);
      setWorkspace(workspaceData);
      setServices(servicesData);
    } catch (error: any) {
      setError('Workspace not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime) {
      setError('Please select a service, date, and time');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}`);
      
      await publicApi.createBooking(slug, {
        service_type_id: selectedService.id,
        scheduled_at: scheduledAt.toISOString(),
        contact_name: contactInfo.name,
        contact_email: contactInfo.email,
        contact_phone: contactInfo.phone,
        notes: contactInfo.notes
      });

      setIsSuccess(true);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (error && !workspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Workspace Not Found</h1>
          <p className="text-gray-600">This booking page doesn't exist or is not active</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for booking with {workspace.business_name}. We've sent a confirmation email to {contactInfo.email}.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600 mb-1">Service</p>
            <p className="font-semibold">{selectedService.name}</p>
            <p className="text-sm text-gray-600 mt-2 mb-1">Date & Time</p>
            <p className="font-semibold">{new Date(`${selectedDate}T${selectedTime}`).toLocaleString()}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{workspace.business_name}</h1>
          <p className="text-gray-600 mt-1">Book your appointment online</p>
        </div>
      </div>

      {/* Booking Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Select Service */}
            <div>
              <h2 className="text-xl font-semibold mb-4">1. Select a Service</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedService(service)}
                    className={`p-4 rounded-lg border-2 text-left transition ${
                      selectedService?.id === service.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <h3 className="font-semibold text-lg">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span>⏱ {service.duration_minutes} min</span>
                      {service.location && <span>📍 {service.location}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Select Date & Time */}
            {selectedService && (
              <div>
                <h2 className="text-xl font-semibold mb-4">2. Choose Date & Time</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedTime(''); // Reset time when date changes
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Time</label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                      disabled={!selectedDate}
                    >
                      <option value="">
                        {!selectedDate 
                          ? 'Select a date first' 
                          : getAvailableTimeSlots().length === 0 
                            ? 'No times available for this date' 
                            : 'Select time'}
                      </option>
                      {getAvailableTimeSlots().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    
                    {/* Warning message when no slots available */}
                    {selectedDate && getAvailableTimeSlots().length === 0 && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-amber-800">No availability</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            This service is not available on {new Date(selectedDate).toLocaleDateString()}. Please select a different date.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Show available days hint */}
                {selectedService && availabilitySlots.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">📅 Available Days:</p>
                    <div className="flex flex-wrap gap-2">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                        const hasAvailability = availabilitySlots.some(slot => slot.day_of_week === index);
                        return hasAvailability ? (
                          <span key={day} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-300">
                            {day}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Contact Information */}
            {selectedService && selectedDate && selectedTime && getAvailableTimeSlots().length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">3. Your Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={contactInfo.name}
                      onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Email *</label>
                      <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone</label>
                      <input
                        type="tel"
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                    <textarea
                      value={contactInfo.notes}
                      onChange={(e) => setContactInfo({ ...contactInfo, notes: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Any special requests or information we should know?"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            {selectedService && selectedDate && selectedTime && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSubmitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by <span className="font-semibold text-blue-600">CareOps</span>
        </p>
      </div>
    </div>
  );
}