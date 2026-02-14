'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, workspaces } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Get current user
      const userData = await auth.getMe();
      setUser(userData);

      // Get workspaces
      const workspacesList = await workspaces.list();
      if (workspacesList.length === 0) {
        router.push('/onboarding');
        return;
      }

      const currentWorkspace = workspacesList[0];
      setWorkspace(currentWorkspace);

      // Get dashboard stats
      const statsData = await workspaces.getDashboardStats(currentWorkspace.id);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">CareOps</h1>
              <span className="ml-4 text-gray-400">|</span>
              <span className="ml-4 text-gray-700">{workspace.business_name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.full_name || user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Today's Bookings */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Bookings</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.total_bookings_today || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.upcoming_bookings || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* New Leads */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Leads (7d)</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.new_leads || 0}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Forms */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Forms</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.pending_forms || 0}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${stats?.low_stock_items > 0 ? 'border-red-600' : 'border-gray-300'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className={`text-3xl font-bold mt-2 ${stats?.low_stock_items > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {stats?.low_stock_items || 0}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stats?.low_stock_items > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <svg className={`w-6 h-6 ${stats?.low_stock_items > 0 ? 'text-red-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Unread Alerts */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-indigo-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread Alerts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.unread_alerts || 0}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
              <div className="text-center">
                <div className="text-2xl mb-2">📅</div>
                <p className="text-sm font-medium">View Bookings</p>
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
              <div className="text-center">
                <div className="text-2xl mb-2">💬</div>
                <p className="text-sm font-medium">Open Inbox</p>
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
              <div className="text-center">
                <div className="text-2xl mb-2">📋</div>
                <p className="text-sm font-medium">Review Forms</p>
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
              <div className="text-center">
                <div className="text-2xl mb-2">⚙️</div>
                <p className="text-sm font-medium">Settings</p>
              </div>
            </button>
          </div>
        </div>

        {/* Public Booking Link */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Your Public Booking Page</h3>
          <p className="text-blue-100 text-sm mb-4">Share this link with your customers to accept bookings 24/7</p>
          <div className="bg-white bg-opacity-20 rounded-lg p-3 flex items-center justify-between">
            <code className="text-sm font-mono">
              {typeof window !== 'undefined' && window.location.origin}/book/{workspace.slug}
            </code>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(`${window.location.origin}/book/${workspace.slug}`);
                  alert('Link copied to clipboard!');
                }
              }}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}