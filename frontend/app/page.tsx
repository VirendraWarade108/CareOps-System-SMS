// frontend/app/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">CareOps</span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/auth/login"
                className="text-gray-700 hover:text-gray-900 px-4 py-2"
              >
                Log in
              </Link>
              <Link 
                href="/auth/register"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            One Platform for Your
            <span className="text-blue-600"> Entire Business</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Replace the chaos of disconnected tools. Manage leads, bookings, communication, 
            forms, and inventory from one unified dashboard.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/auth/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </Link>
            <Link 
              href="#features"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need in One Place</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to streamline your operations?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join hundreds of service businesses already using CareOps
          </p>
          <Link 
            href="/auth/register"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 CareOps. Built for service businesses.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: '📅',
    title: 'Smart Booking System',
    description: 'Public booking pages, automated confirmations, and Google Calendar sync'
  },
  {
    icon: '💬',
    title: 'Unified Inbox',
    description: 'All customer communication (email & SMS) in one place'
  },
  {
    icon: '📋',
    title: 'Dynamic Forms',
    description: 'Create intake forms, track completion, send automated reminders'
  },
  {
    icon: '👥',
    title: 'Lead Management',
    description: 'Capture leads automatically and never miss a follow-up'
  },
  {
    icon: '📦',
    title: 'Inventory Tracking',
    description: 'Monitor stock levels and get alerts before you run out'
  },
  {
    icon: '⚡',
    title: 'Automation',
    description: 'Welcome emails, booking confirmations, and reminders on autopilot'
  }
];