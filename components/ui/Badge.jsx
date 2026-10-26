'use client'

const variantMap = {
  // Order status
  new: 'bg-blue-100 text-blue-800',
  preparing: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-purple-100 text-purple-800',
  served: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  // Payment status
  pending: 'bg-orange-100 text-orange-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-gray-100 text-gray-800',
  // Generic
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  cash: 'bg-green-100 text-green-800',
  upi: 'bg-indigo-100 text-indigo-800',
}

export default function Badge({ variant = 'info', children, className = '' }) {
  const cls = variantMap[variant] || variantMap.info
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls} ${className}`}>
      {children}
    </span>
  )
}
