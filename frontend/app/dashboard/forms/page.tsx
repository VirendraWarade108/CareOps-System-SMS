'use client';

import { useState, useEffect } from 'react';
import { workspaces, forms } from '@/lib/api';

interface FormSubmission {
  id: string;
  form_id: string;
  booking_id: string;
  contact_id?: string;
  data: Record<string, any>;
  status: 'pending' | 'completed' | 'overdue';
  submitted_at?: string;
  created_at: string;
  booking?: {
    scheduled_at: string;
    contact?: { name: string; email: string };
    service_type?: { name: string };
  };
  form?: { name: string };
}

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200', dot: 'bg-amber-500',  icon: '⏳' },
  completed: { label: 'Completed', color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200', dot: 'bg-green-500',  icon: '✓' },
  overdue:   { label: 'Overdue',   color: 'text-red-700',    bg: 'bg-red-50',      border: 'border-red-200',   dot: 'bg-red-500',    icon: '!' },
};

const FILTERS = [
  { label: 'All',       value: 'all' },
  { label: 'Pending',   value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Overdue',   value: 'overdue' },
];

export default function FormsPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [filtered, setFiltered] = useState<FormSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFiltered(submissions);
    } else {
      setFiltered(submissions.filter(s => s.status === statusFilter));
    }
  }, [submissions, statusFilter]);

  const loadData = async () => {
    try {
      const wsList = await workspaces.list();
      if (!wsList.length) return;
      const ws = wsList[0];
      setWorkspace(ws);
      const data = await forms.getSubmissions(ws.id);
      setSubmissions(data);
    } catch {
      setError('Failed to load form submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (submissionId: string, newStatus: string) => {
    setUpdating(submissionId);
    setError('');
    try {
      await forms.updateSubmission(submissionId, newStatus);
      setSubmissions(prev =>
        prev.map(s => s.id === submissionId
          ? { ...s, status: newStatus as FormSubmission['status'], submitted_at: newStatus === 'completed' ? new Date().toISOString() : s.submitted_at }
          : s
        )
      );
      setSuccessMsg('Status updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to update submission status');
    } finally {
      setUpdating(null);
    }
  };

  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    completed: submissions.filter(s => s.status === 'completed').length,
    overdue: submissions.filter(s => s.status === 'overdue').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Notifications */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Form Submissions</h2>
        <p className="text-sm text-slate-500 mt-0.5">Track and manage post-booking form responses</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: counts.all, color: 'text-slate-700', bg: 'bg-slate-100' },
          { label: 'Pending', value: counts.pending, color: 'text-amber-700', bg: 'bg-amber-100' },
          { label: 'Completed', value: counts.completed, color: 'text-green-700', bg: 'bg-green-100' },
          { label: 'Overdue', value: counts.overdue, color: 'text-red-700', bg: 'bg-red-100' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.bg} ${stat.color}`}>forms</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 bg-white rounded-xl border border-slate-100 p-1 shadow-sm w-fit">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all
              ${statusFilter === f.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            {f.label}
            {counts[f.value as keyof typeof counts] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                ${statusFilter === f.value ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {counts[f.value as keyof typeof counts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">No submissions found</p>
            <p className="text-xs text-slate-400 mt-1">
              {statusFilter === 'all' ? 'Form submissions will appear here after bookings' : `No ${statusFilter} submissions`}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Customer & Service', 'Form', 'Submitted', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(sub => {
                  const cfg = STATUS_CONFIG[sub.status];
                  const isExpanded = expandedId === sub.id;
                  const isUpdating = updating === sub.id;
                  return (
                    <>
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        {/* Customer */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">
                            {sub.booking?.contact?.name || '—'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {sub.booking?.service_type?.name || '—'}
                          </p>
                          {sub.booking?.scheduled_at && (
                            <p className="text-xs text-slate-300 mt-0.5">
                              {new Date(sub.booking.scheduled_at).toLocaleDateString()}
                            </p>
                          )}
                        </td>

                        {/* Form name */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {sub.form?.name || 'Intake Form'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          {sub.submitted_at ? (
                            <div>
                              <p className="text-sm text-slate-700">{new Date(sub.submitted_at).toLocaleDateString()}</p>
                              <p className="text-xs text-slate-400">{new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not submitted</span>
                          )}
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Mark complete */}
                            {sub.status !== 'completed' && (
                              <button
                                onClick={() => handleStatusUpdate(sub.id, 'completed')}
                                disabled={isUpdating}
                                className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50"
                              >
                                {isUpdating ? (
                                  <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                Complete
                              </button>
                            )}

                            {/* Send reminder */}
                            {sub.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setSuccessMsg('Reminder sent!');
                                  setTimeout(() => setSuccessMsg(''), 3000);
                                }}
                                className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg font-medium transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                Remind
                              </button>
                            )}

                            {/* View data */}
                            {Object.keys(sub.data || {}).length > 0 && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                                className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-medium transition-colors"
                              >
                                <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                Data
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded data row */}
                      {isExpanded && sub.data && Object.keys(sub.data).length > 0 && (
                        <tr key={`${sub.id}-expanded`} className="bg-slate-50">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="bg-white rounded-lg border border-slate-100 p-4">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Submission Data</p>
                              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(sub.data).map(([key, val]) => (
                                  <div key={key} className="bg-slate-50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-400 mb-0.5 capitalize">{key.replace(/_/g, ' ')}</p>
                                    <p className="text-sm text-slate-700 break-words">
                                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || '—')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-400 mt-3 text-right">
          Showing {filtered.length} of {submissions.length} submissions
        </p>
      )}
    </div>
  );
}