'use client';

import { useState, useEffect } from 'react';
import { alerts } from '@/lib/api';
import Link from 'next/link';

interface Alert {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export function AlertsWidget({ workspaceId }: { workspaceId: string }) {
  const [alertsList, setAlertsList] = useState<Alert[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const loadAlerts = async () => {
    try {
      const data = await alerts.list(workspaceId, true); // unread only
      setAlertsList(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (alertId: string) => {
    try {
      await alerts.markRead(alertId);
      setAlertsList(alertsList.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const unreadCount = alertsList.length;

  const priorityConfig = {
    high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: '🔴' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: '🟡' },
    low: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', icon: '🔵' },
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-100 z-20 max-h-[32rem] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>

            {/* Alerts List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : alertsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">All caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {alertsList.map((alert) => {
                    const config = priorityConfig[alert.priority];
                    return (
                      <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0">{config.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                                {alert.title}
                              </p>
                              <button
                                onClick={() => handleMarkRead(alert.id)}
                                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                                title="Mark as read"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 mb-2">{alert.message}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">
                                {new Date(alert.created_at).toLocaleString()}
                              </span>
                              {alert.link && (
                                <Link
                                  href={alert.link}
                                  onClick={() => {
                                    handleMarkRead(alert.id);
                                    setShowDropdown(false);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  View →
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {alertsList.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100">
                <button
                  onClick={async () => {
                    for (const alert of alertsList) {
                      await handleMarkRead(alert.id);
                    }
                  }}
                  className="w-full text-xs text-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}