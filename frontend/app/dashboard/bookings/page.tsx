'use client';

import { useState, useEffect } from 'react';
import { workspaces, bookings } from '@/lib/api';

interface Booking {
  id: string;
  workspace_id: string;
  contact_id?: string;
  service_type_id?: string;
  scheduled_at: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
  location?: string;
  notes?: string;
  created_at: string;
  contact?: { name: string; email: string; phone?: string };
  service_type?: { name: string; color: string; duration_minutes: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: 'Pending',   color: 'text-amber-700',  bg: 'bg-amber-50  border-amber-200',  dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', color: 'text-blue-700',   bg: 'bg-blue-50   border-blue-200',   dot: 'bg-blue-500' },
  completed: { label: 'Completed', color: 'text-green-700',  bg: 'bg-green-50  border-green-200',  dot: 'bg-green-500' },
  no_show:   { label: 'No Show',   color: 'text-slate-600',  bg: 'bg-slate-50  border-slate-200',  dot: 'bg-slate-400' },
  cancelled: { label: 'Cancelled', color: 'text-red-700',    bg: 'bg-red-50    border-red-200',    dot: 'bg-red-400' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export default function BookingsPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let result = allBookings;
    if (statusFilter !== 'all') result = result.filter(b => b.status === statusFilter);
    setFiltered(result);
  }, [allBookings, statusFilter]);

  const loadData = async () => {
    try {
      const wsList = await workspaces.list();
      if (!wsList.length) return;
      const ws = wsList[0];
      setWorkspace(ws);
      const data = await bookings.list(ws.id);
      setAllBookings(data);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await bookings.updateStatus(bookingId, newStatus);
      setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus as Booking['status'] } : b));
      if (selectedBooking?.id === bookingId) setSelectedBooking(prev => prev ? { ...prev, status: newStatus as Booking['status'] } : null);
    } catch {
      setError('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const calDays = getCalendarDays(calYear, calMonth);

  const bookingsForDay = (day: number) =>
    filtered.filter(b => {
      const d = new Date(b.scheduled_at);
      return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day;
    });

  const selectedDayBookings = selectedDay ? bookingsForDay(selectedDay) : [];
  const today = new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bookings</h2>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} total · {allBookings.filter(b => b.status === 'pending').length} pending</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Calendar nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button
              onClick={() => { setCalDate(new Date(calYear, calMonth - 1, 1)); setSelectedDay(null); }}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-base font-semibold text-slate-800">{MONTHS[calMonth]} {calYear}</h3>
            <button
              onClick={() => { setCalDate(new Date(calYear, calMonth + 1, 1)); setSelectedDay(null); }}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-slate-50" />;
              const dayBookings = bookingsForDay(day);
              const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
              const isSelected = day === selectedDay;
              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[80px] p-2 border-b border-r border-slate-50 cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <span className={`inline-flex w-7 h-7 items-center justify-center text-sm rounded-full font-medium mb-1
                    ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 2).map(b => {
                      const cfg = STATUS_CONFIG[b.status];
                      return (
                        <div key={b.id} className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 truncate ${cfg.bg} ${cfg.color} border`}
                          onClick={e => { e.stopPropagation(); setSelectedBooking(b); }}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <span className="truncate">{new Date(b.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      );
                    })}
                    {dayBookings.length > 2 && (
                      <p className="text-xs text-slate-400 pl-1">+{dayBookings.length - 2} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected day bookings */}
          {selectedDay && selectedDayBookings.length > 0 && (
            <div className="border-t border-slate-100 p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">
                {MONTHS[calMonth]} {selectedDay} — {selectedDayBookings.length} booking{selectedDayBookings.length !== 1 ? 's' : ''}
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedDayBookings.map(b => (
                  <BookingCard key={b.id} booking={b} onSelect={setSelectedBooking} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">No bookings found</p>
              <p className="text-xs text-slate-400 mt-1">Try changing your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Customer', 'Service', 'Date & Time', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(b => {
                  const cfg = STATUS_CONFIG[b.status];
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{b.contact?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{b.contact?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{b.service_type?.name || '—'}</p>
                        {b.service_type?.duration_minutes && (
                          <p className="text-xs text-slate-400">{b.service_type.duration_minutes} min</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{new Date(b.scheduled_at).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-400">{new Date(b.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Booking detail modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Customer */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                  {(selectedBooking.contact?.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedBooking.contact?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-400">{selectedBooking.contact?.email || '—'}</p>
                  {selectedBooking.contact?.phone && (
                    <p className="text-xs text-slate-400">{selectedBooking.contact.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Service</p>
                  <p className="text-sm font-medium text-slate-700">{selectedBooking.service_type?.name || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Duration</p>
                  <p className="text-sm font-medium text-slate-700">{selectedBooking.service_type?.duration_minutes || '—'} min</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Date</p>
                  <p className="text-sm font-medium text-slate-700">{new Date(selectedBooking.scheduled_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Time</p>
                  <p className="text-sm font-medium text-slate-700">{new Date(selectedBooking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {selectedBooking.location && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Location</p>
                  <p className="text-sm font-medium text-slate-700">{selectedBooking.location}</p>
                </div>
              )}

              {selectedBooking.notes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Status update */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Update Status</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <button
                      key={val}
                      onClick={() => handleStatusUpdate(selectedBooking.id, val)}
                      disabled={updatingStatus || selectedBooking.status === val}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all disabled:cursor-not-allowed
                        ${selectedBooking.status === val
                          ? `${cfg.bg} ${cfg.color} border-current ring-2 ring-offset-1 ring-current`
                          : `border-slate-200 text-slate-600 hover:${cfg.bg} hover:${cfg.color}`
                        }`}
                    >
                      {updatingStatus && selectedBooking.status !== val ? '...' : cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, onSelect }: { booking: Booking; onSelect: (b: Booking) => void }) {
  const cfg = STATUS_CONFIG[booking.status];
  return (
    <button
      onClick={() => onSelect(booking)}
      className="w-full text-left p-3 rounded-lg border border-slate-100 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-800 truncate">{booking.contact?.name || 'Unknown'}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} flex-shrink-0 ml-1`}>{cfg.label}</span>
      </div>
      <p className="text-xs text-slate-500 truncate">{booking.service_type?.name || '—'}</p>
      <p className="text-xs text-slate-400 mt-1">{new Date(booking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    </button>
  );
}