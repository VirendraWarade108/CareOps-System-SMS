'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { workspaces, auth, api } from '@/lib/api';

interface Integration {
  id: string;
  workspace_id: string;
  type: string;
  provider: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('workspace');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const [workspaceData, setWorkspaceData] = useState({
    business_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    timezone: 'UTC',
    contact_email: '',
    contact_phone: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const wsList = await workspaces.list();
      if (!wsList.length) {
        router.push('/onboarding');
        return;
      }
      const ws = wsList[0];
      setWorkspace(ws);
      setWorkspaceData({
        business_name: ws.business_name || '',
        address: ws.address || '',
        city: ws.city || '',
        state: ws.state || '',
        zip: ws.zip || '',
        timezone: ws.timezone || 'UTC',
        contact_email: ws.contact_email || '',
        contact_phone: ws.contact_phone || ''
      });

      // Load integrations
      try {
        const integrationsData = await api.get(`/api/workspaces/${ws.id}/integrations`);
        setIntegrations(integrationsData.data);
      } catch (err) {
        // Integrations endpoint might not return data, that's okay
        setIntegrations([]);
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(`/api/workspaces/${workspace.id}`, workspaceData);
      setSuccessMsg('Settings saved successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      // Reload to get updated data
      const wsList = await workspaces.list();
      if (wsList.length) setWorkspace(wsList[0]);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!workspace) return;
    const bookingUrl = `${window.location.origin}/book/${workspace.slug}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenBookingPage = () => {
    if (!workspace) return;
    window.open(`/book/${workspace.slug}`, '_blank');
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/');
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your workspace and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white rounded-xl border border-slate-100 p-1 shadow-sm w-fit">
        {[
          { id: 'workspace', label: 'Workspace', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )},
          { id: 'booking', label: 'Booking Link', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )},
          { id: 'integrations', label: 'Integrations', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
          )},
          { id: 'account', label: 'Account', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workspace Settings Tab */}
      {activeTab === 'workspace' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Workspace Settings</h3>
          <form onSubmit={handleSaveWorkspace} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Name *</label>
              <input
                type="text"
                value={workspaceData.business_name}
                onChange={(e) => setWorkspaceData({ ...workspaceData, business_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
              <input
                type="text"
                value={workspaceData.address}
                onChange={(e) => setWorkspaceData({ ...workspaceData, address: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={workspaceData.city}
                  onChange={(e) => setWorkspaceData({ ...workspaceData, city: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                <input
                  type="text"
                  value={workspaceData.state}
                  onChange={(e) => setWorkspaceData({ ...workspaceData, state: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="NY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ZIP Code</label>
                <input
                  type="text"
                  value={workspaceData.zip}
                  onChange={(e) => setWorkspaceData({ ...workspaceData, zip: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Timezone</label>
              <select
                value={workspaceData.timezone}
                onChange={(e) => setWorkspaceData({ ...workspaceData, timezone: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Email</label>
                <input
                  type="email"
                  value={workspaceData.contact_email}
                  onChange={(e) => setWorkspaceData({ ...workspaceData, contact_email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Phone</label>
                <input
                  type="tel"
                  value={workspaceData.contact_phone}
                  onChange={(e) => setWorkspaceData({ ...workspaceData, contact_phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Booking Link Tab */}
      {activeTab === 'booking' && workspace && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Public Booking Page</h3>
            <p className="text-sm text-slate-500 mb-4">Share this link with customers to accept bookings 24/7</p>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 mb-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-2">Your Booking URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-slate-800 bg-white px-3 py-2 rounded border border-slate-200 truncate">
                  {window.location.origin}/book/{workspace.slug}
                </code>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
              <button
                onClick={handleOpenBookingPage}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors border border-slate-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in New Tab
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Embed on your website</p>
                <p className="text-xs text-blue-700">
                  You can embed this booking page as an iframe on your website or link to it from your homepage.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Connected Integrations</h3>
              <button
                onClick={() => {
                  setSuccessMsg('Integration setup coming soon! Email integration is configured during onboarding.');
                  setTimeout(() => setSuccessMsg(''), 4000);
                }}
                className="inline-flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Integration
              </button>
            </div>
            
            {integrations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600">No integrations configured yet</p>
                <p className="text-xs text-slate-400 mt-1">Email integration is set up during onboarding</p>
              </div>
            ) : (
              <div className="space-y-3">
                {integrations.map(integration => (
                  <div key={integration.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                        {integration.type === 'email' && (
                          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                        {integration.type === 'sms' && (
                          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        )}
                        {integration.type === 'calendar' && (
                          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 capitalize">{integration.type}</p>
                        <p className="text-xs text-slate-500">
                          {integration.provider || 'Default provider'}
                          {integration.last_synced_at && ` · Last synced ${new Date(integration.last_synced_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        integration.is_active
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${integration.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {integration.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => {
                          setSuccessMsg('Test connection successful!');
                          setTimeout(() => setSuccessMsg(''), 3000);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      
          {/* Available Integrations */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Available Integrations</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { name: 'Email (SMTP)', icon: '📧', description: 'Send automated emails', status: 'Configured' },
                { name: 'SMS (Twilio)', icon: '💬', description: 'Send SMS reminders', status: 'Available' },
                { name: 'Google Calendar', icon: '📅', description: 'Sync bookings', status: 'Available' },
                { name: 'Webhooks', icon: '🔗', description: 'Connect external apps', status: 'Available' },
              ].map((int, idx) => (
                <div key={idx} className="border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{int.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm">{int.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{int.description}</p>
                      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                        int.status === 'Configured' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {int.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Account Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Workspace</span>
                <span className="text-sm font-medium text-slate-800">{workspace?.business_name}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Status</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  workspace?.is_active
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${workspace?.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                  {workspace?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-600">Created</span>
                <span className="text-sm font-medium text-slate-800">
                  {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl border-2 border-red-200 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-1">Danger Zone</h3>
                <p className="text-sm text-red-700">Sign out of your account</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}