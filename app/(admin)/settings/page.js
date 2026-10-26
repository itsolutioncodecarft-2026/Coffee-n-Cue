'use client'
import { useState } from 'react'
import { Settings, Coffee, Globe, Info } from 'lucide-react'

export default function SettingsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800">Settings</h2>

      {/* Cafe profile */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Coffee size={20} className="text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Cafe Profile</h3>
            <p className="text-xs text-gray-500">Business information</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            ['Cafe Name', 'Coffee N Cue'],
            ['Business Type', 'Cafe & Billiards'],
            ['Currency', 'INR (₹)'],
            ['Timezone', 'Asia/Kolkata (IST)'],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="font-medium text-gray-800">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* System info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Globe size={20} className="text-blue-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">System Configuration</h3>
            <p className="text-xs text-gray-500">Environment and API settings</p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">API URL</span>
            <span className="font-mono text-xs text-emerald-700">{apiUrl}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Frontend</span>
            <span className="font-mono text-xs text-emerald-700">Next.js 16 (App Router)</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Backend</span>
            <span className="font-mono text-xs text-emerald-700">Node.js + Express</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Database</span>
            <span className="font-mono text-xs text-emerald-700">MongoDB + Mongoose</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Reporting Timezone</span>
            <span className="font-mono text-xs text-emerald-700">Asia/Kolkata (UTC+5:30)</span>
          </div>
        </div>
      </div>

      {/* Admin info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Info size={20} className="text-amber-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Admin Management</h3>
            <p className="text-xs text-gray-500">Use these backend commands</p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="px-4 py-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-800 mb-1">Create / Reset Admin Password</p>
            <code className="text-xs text-emerald-700 font-mono">cd backend && npm run create-admin</code>
          </div>
          <div className="px-4 py-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-800 mb-1">Seed Initial Menu (first run)</p>
            <code className="text-xs text-emerald-700 font-mono">cd backend && npm run seed</code>
          </div>
          <div className="px-4 py-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-800 mb-1">Reset Menu Data (destructive)</p>
            <code className="text-xs text-emerald-700 font-mono">cd backend && npm run seed -- --reset</code>
          </div>
        </div>
      </div>
    </div>
  )
}
