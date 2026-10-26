'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { PlusCircle, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { orders } from '@/lib/api'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function istDate(d) {
  return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const ORDER_STATUSES = ['', 'new', 'preparing', 'ready', 'served', 'cancelled']
const PAYMENT_STATUSES = ['', 'pending', 'partial', 'paid', 'refunded']

export default function OrdersPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '', paymentStatus: '', from: '', to: '' })
  const [page, setPage] = useState(1)

  const load = useCallback(async (pg = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = { page: pg, limit: 20 }
      if (filters.search) params.search = filters.search
      if (filters.status) params.status = filters.status
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const res = await orders.list(params)
      setData(res)
      setPage(pg)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load(1) }, [load])

  function handleFilterChange(key, val) {
    setFilters((prev) => ({ ...prev, [key]: val }))
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Orders</h2>
        <Link href="/orders/new">
          <Button icon={<PlusCircle size={16} />}>New Order</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Search by order # or customer name…"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-32"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {ORDER_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-36"
            value={filters.paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
          >
            <option value="">All Payments</option>
            {PAYMENT_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={filters.from} onChange={(e) => handleFilterChange('from', e.target.value)} />
          <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={filters.to} onChange={(e) => handleFilterChange('to', e.target.value)} />
          <Button variant="outline" onClick={() => setFilters({ search: '', status: '', paymentStatus: '', from: '', to: '' })} size="sm">
            Clear
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading orders…" />
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => load(page)} />
        ) : !data?.data?.length ? (
          <EmptyState title="No orders found" description="Try adjusting your filters, or create a new order." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map((o) => (
                    <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-emerald-700">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{istDate(o.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-700">{o.customerName || o.tableNumber || <span className="text-gray-400">Walk-in</span>}</td>
                      <td className="px-4 py-3"><span className="text-xs capitalize text-gray-600">{o.orderType}</span></td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(o.total)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{fmt(o.totalPaid)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{fmt(o.outstandingAmount)}</td>
                      <td className="px-4 py-3"><Badge variant={o.orderStatus}>{o.orderStatus}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={o.paymentStatus}>{o.paymentStatus}</Badge></td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${o._id}`} className="text-xs text-emerald-700 hover:underline font-medium">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination && data.pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {data.pagination.total} orders · Page {page} of {data.pagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}
                    icon={<ChevronLeft size={14} />}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => load(page + 1)}
                    icon={<ChevronRight size={14} />}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
