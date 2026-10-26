'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, PlusCircle, UtensilsCrossed,
  Tag, BarChart2, Settings, LogOut, Coffee, Menu, X,
  Receipt, FolderOpen
} from 'lucide-react'
import { useState } from 'react'
import { auth } from '@/lib/api'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/orders/new', label: 'New Order', icon: PlusCircle },
  { href: '/menu', label: 'Menu Items', icon: UtensilsCrossed },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try { await auth.logout() } catch {}
    router.push('/login')
  }

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-emerald-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Coffee size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Coffee N Cue</p>
            <p className="text-emerald-300 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-100 hover:bg-emerald-700/60 hover:text-white'
                }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-emerald-700/50">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-emerald-100 hover:bg-emerald-700/60 hover:text-white transition-colors
            disabled:opacity-50"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {loggingOut ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-emerald-800 text-white rounded-lg flex items-center justify-center shadow"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-emerald-800 z-40 transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {navContent}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-emerald-800 flex-shrink-0 min-h-screen">
        {navContent}
      </aside>
    </>
  )
}
