'use client';

import { useState, useEffect } from 'react';
import { workspaces, api } from '@/lib/api';

export default function SMSConfigurationPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [smsStatus, setSmsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [telegramChatId, setTelegramChatId] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from CareOps! This is a test message. 📱');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const wsList = await workspaces.list();
      if (!wsList.length) return;
      const ws = wsList[0];
      setWorkspace(ws);
      
      // Get SMS status
      const statusResponse = await api.get(`/api/sms/status?workspace_id=${ws.id}`);
      setSmsStatus(statusResponse.data);
    } catch (err) {
      setError('Failed to load SMS configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !telegramChatId) return;
    
    setSaving(true);
    setError('');
    
    try {
      await api.post(`/api/sms/configure/telegram?workspace_id=${workspace.id}`, {
        telegram_chat_id: telegramChatId
      });
      
      setSuccessMsg('Telegram configuration saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData(); // Reload status
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !testChatId || !testMessage) return;
    
    setTesting(true);
    setError('');
    
    try {
      const response = await api.post(`/api/sms/test?workspace_id=${workspace.id}`, {
        phone_or_chat_id: testChatId,
        message: testMessage
      });
      
      if (response.data.success) {
        setSuccessMsg('Test SMS sent successfully! Check your Telegram.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError('Failed to send test SMS');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send test SMS');
    } finally {
      setTesting(false);
    }
  };

  const handleGetChatIdHelper = async () => {
    try {
      const response = await api.get('/api/sms/chat-id-helper');
      alert(JSON.stringify(response.data.instructions, null, 2));
    } catch (err) {
      console.error('Failed to get chat ID helper', err);
    }
  };

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
        <h2 className="text-2xl font-bold text-slate-800">SMS Configuration</h2>
        <p className="text-sm text-slate-500 mt-0.5">Set up FREE SMS notifications via Telegram</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            smsStatus?.configured ? 'bg-green-100' : 'bg-amber-100'
          }`}>
            {smsStatus?.configured ? (
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              {smsStatus?.configured ? '✅ SMS Service Active' : '⚠️ SMS Service Not Configured'}
            </h3>
            <p className="text-sm text-slate-600 mb-2">
              Provider: <span className="font-medium capitalize">{smsStatus?.provider || 'None'}</span>
            </p>
            {smsStatus?.bot_info?.bot && (
              <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 inline-block">
                Bot: @{smsStatus.bot_info.bot.username}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📱 Quick Setup Guide</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className="font-semibold">Create Telegram Bot</p>
              <p className="text-blue-700 text-xs mt-1">
                Open Telegram → Search for <code className="bg-white px-1 rounded">@BotFather</code> → Send <code className="bg-white px-1 rounded">/newbot</code>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p className="font-semibold">Get Bot Token</p>
              <p className="text-blue-700 text-xs mt-1">Copy the token from BotFather → Add to <code className="bg-white px-1 rounded">.env</code> as <code className="bg-white px-1 rounded">TELEGRAM_BOT_TOKEN</code></p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <p className="font-semibold">Get Your Chat ID</p>
              <p className="text-blue-700 text-xs mt-1">
                Message your bot → Visit: <code className="bg-white px-1 rounded text-xs">api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>
              </p>
              <button
                onClick={handleGetChatIdHelper}
                className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Show Detailed Instructions
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <div>
              <p className="font-semibold">Configure Chat ID Below</p>
              <p className="text-blue-700 text-xs mt-1">Enter your Chat ID in the form below to receive notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Telegram Configuration</h3>
        <form onSubmit={handleSaveTelegram} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Your Telegram Chat ID *
            </label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123456789"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              This will be used for low stock alerts and admin notifications
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !telegramChatId}
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
                Save Configuration
              </>
            )}
          </button>
        </form>
      </div>

      {/* Test SMS */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Test SMS Delivery</h3>
        <form onSubmit={handleTestSMS} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Test Chat ID *
            </label>
            <input
              type="text"
              value={testChatId}
              onChange={(e) => setTestChatId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123456789"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Test Message *
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>

          <button
            type="submit"
            disabled={testing || !testChatId || !testMessage}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending Test...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Test SMS
              </>
            )}
          </button>
        </form>
      </div>

      {/* Features List */}
      <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">What You'll Receive via SMS</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: '📅', label: 'Booking confirmations' },
            { icon: '🔔', label: 'Appointment reminders' },
            { icon: '📋', label: 'Form completion reminders' },
            { icon: '📦', label: 'Low stock alerts' },
            { icon: '👥', label: 'Staff notifications' },
            { icon: '⚡', label: 'Real-time updates' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}