'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, Eye, EyeOff } from 'lucide-react'
import { auth } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

// Set a readable cookie so proxy.js can detect login state
// (HTTP-only cnc_auth from backend is unreadable by JS/proxy on cross-domain)
function setPresenceCookie() {
  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  document.cookie = `cnc_auth_present=1; path=/; max-age=${maxAge}; SameSite=Lax`
}

function clearPresenceCookie() {
  document.cookie = 'cnc_auth_present=; path=/; max-age=0; SameSite=Lax'
}

export default function LoginPage() {
  const router = useRouter()
  const toast = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) {
      setError('Email and password are required')
      return
    }
    setLoading(true)
    try {
      await auth.login(form.email, form.password)
      // Set presence cookie so proxy.js knows user is authenticated
      setPresenceCookie()
      toast('Login successful', 'success')
      // Use window.location for hard navigation so proxy picks up the new cookie
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.message || 'Login failed')
      clearPresenceCookie()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Coffee size={32} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Coffee N Cue</h1>
            <p className="text-sm text-gray-500 mt-1">Admin Panel — Sign in to continue</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="admin@coffeencue.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg
                font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
        <p className="text-center text-emerald-200/60 text-xs mt-6">
          Coffee N Cue Cafe Management System
        </p>
      </div>
    </div>
  )
}
