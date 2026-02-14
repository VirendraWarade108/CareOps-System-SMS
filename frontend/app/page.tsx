'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const features = [
    {
      icon: '📅',
      title: 'Smart Booking',
      description: 'Beautiful booking pages that customers love',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '💬',
      title: 'Unified Inbox',
      description: 'All conversations in one place - email, SMS, chat',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: '📋',
      title: 'Auto Forms',
      description: 'Collect information automatically after bookings',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: '📦',
      title: 'Smart Inventory',
      description: 'Track supplies with automatic low-stock alerts',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: '📱',
      title: 'FREE SMS',
      description: 'Unlimited SMS notifications via Telegram - $0/month',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: '🤖',
      title: 'Full Automation',
      description: 'Reminders, alerts, follow-ups - all automatic',
      color: 'from-pink-500 to-rose-500'
    }
  ]

  const stats = [
    { number: '100%', label: 'Automated', icon: '⚡' },
    { number: '$0', label: 'SMS Cost', icon: '💰' },
    { number: '< 2min', label: 'Setup Time', icon: '⏱️' },
    { number: '6+', label: 'Tools Replaced', icon: '🔧' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
      {/* Animated Background Gradient */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.15), transparent 40%)`
        }}
      />

      {/* Floating Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            y: [0, -30, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        />
        <motion.div
          animate={{ 
            y: [0, 30, 0],
            rotate: [360, 180, 0]
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute top-40 right-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        />
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            x: [0, 30, 0]
          }}
          transition={{ duration: 22, repeat: Infinity }}
          className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
          >
            CareOps
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-4"
          >
            <Link href="/auth/login">
              <button className="px-6 py-2 rounded-lg text-white hover:text-purple-300 transition-all">
                Sign In
              </button>
            </Link>
            <Link href="/auth/register">
              <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-0.5 transition-all">
                Get Started Free
              </button>
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-block mb-6 px-4 py-2 bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 rounded-full">
            <span className="text-purple-300 text-sm font-medium">
              🚀 One Platform. Zero Complexity.
            </span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Unified Operations
            </span>
            <br />
            <span className="text-white">for Service Business</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Replace 6 different tools with one beautiful platform. 
            Bookings, inbox, forms, inventory, SMS - all automated.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/auth/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-semibold shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transition-all"
              >
                Start Free in 2 Minutes →
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-lg font-semibold hover:bg-white/20 transition-all"
            >
              Watch Demo (2 min)
            </motion.button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-20"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05, y: -5 }}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-all"
            >
              <div className="text-4xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
                {stat.number}
              </div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need.
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {' '}Nothing You Don't.
            </span>
          </h2>
          <p className="text-xl text-gray-400">
            Six powerful features that work together seamlessly
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              onHoverStart={() => setActiveFeature(i)}
              className={`p-8 rounded-2xl bg-white/5 backdrop-blur-sm border transition-all cursor-pointer ${
                activeFeature === i 
                  ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className={`text-5xl mb-4 inline-block p-4 rounded-2xl bg-gradient-to-br ${feature.color}`}>
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Setup in <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">2 Minutes</span>
          </h2>
          <p className="text-xl text-gray-400">
            Seriously. We timed it.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {[
            { step: '1', title: 'Create Account', desc: 'Sign up with email - no credit card needed', time: '30s' },
            { step: '2', title: 'Quick Setup', desc: 'Add your business info and services', time: '60s' },
            { step: '3', title: 'Go Live', desc: 'Share your booking page. Start taking bookings!', time: '30s' }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="flex items-start gap-6 mb-8 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-all"
            >
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold">
                {item.step}
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
              <div className="flex-shrink-0 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-semibold">
                {item.time}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto p-12 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 relative overflow-hidden"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready to Simplify Your Operations?
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Join hundreds of service businesses running on CareOps
            </p>
            <Link href="/auth/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 rounded-xl bg-white text-purple-600 text-lg font-bold shadow-2xl hover:shadow-white/50 transition-all"
              >
                Get Started Free - No Credit Card →
              </motion.button>
            </Link>
            <p className="text-purple-200 text-sm mt-4">
              ✨ Free forever. No hidden fees. Cancel anytime.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-white/10">
        <div className="text-center text-gray-400">
          <p className="mb-2">© 2026 CareOps. Built for service businesses.</p>
          <p className="text-sm">Made with 💜 for hackathons</p>
        </div>
      </footer>
    </div>
  )
}
