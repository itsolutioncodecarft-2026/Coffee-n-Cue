'use client'
import { usePathname } from 'next/navigation'

const TITLES = {
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/orders/new': 'New Order',
  '/menu': 'Menu Management',
  '/categories': 'Categories',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

function getTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/orders/')) return 'Order Details'
  return 'Coffee N Cue'
}

export default function Header() {
  const pathname = usePathname()
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
      <div className="lg:ml-0 ml-10">
        <h1 className="text-base font-semibold text-gray-900">{getTitle(pathname)}</h1>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-gray-400 hidden sm:block">
          {new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </header>
  )
}
