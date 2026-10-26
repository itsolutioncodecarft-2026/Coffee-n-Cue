'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, IndianRupee, Wallet, Clock,
  CreditCard, Banknote, PlusCircle, ArrowRight,
  Receipt, TrendingDown, BarChart2, Calendar
} from 'lucide-react'
import { dashboard } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import Badge from '@/components/ui/Badge'

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function fmt(n) {
  if (n === null || n === undefined || n === '') return '₹0'
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })
}

const PRESETS = [
  { label: 'Today',     value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'This Month',  value: 'month' },
]

// Big card for primary numbers
function BigCard({ label, value, sub, color = 'emerald', icon: Icon }) {
  const bg = {
    emerald: 'bg-emerald-700',
    blue: 'bg-blue-600',
    red: 'bg-red-600',
    amber: 'bg-amber-500',
    purple: 'bg-purple-600',
    green: 'bg-green-600',
  }
  return (
    <div className={`${bg[color]} rounded-2xl p-5 text-white`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <Icon size={16} />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  )
}

// Small stat
function SmallCard({ label, value, color = 'gray' }) {
  const cls = {
    gray: 'bg-gray-50 text-gray-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className={`rounded-xl px-4 py-3 ${cls[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [preset, setPreset] = useState('today')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function getParams() {
    if (preset === 'today') return { date: todayIST() }
    if (preset === 'yesterday') {
      const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000)
      return { date: d.toISOString().slice(0, 10) }
    }
    if (preset === '7days') {
      const end = todayIST()
      const start = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      return { startDate: start, endDate: end }
    }
    if (preset === 'month') {
      const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
      const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
      return { startDate: start, endDate: todayIST() }
    }
    return { date: todayIST() }
  }

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await dashboard.summary(getParams())
      setData(res)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [preset])

  useEffect(() => { load() }, [load])

  // Normalise: single date returns data.summary, default returns data.today
  const s = data?.data?.summary || data?.data?.today
  const recentOrders = data?.data?.recentOrders || []
  const pendingOrders = data?.data?.pendingOrders || []

  // Operating result = sales - expenses
  const operatingResult = s ? (s.estimatedOperatingResult ?? (s.orderValue - (s.totalExpensesIncurred || 0))) : null

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Period tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {PRESETS.map(p => (
            <button key={p.value} onClick={() => setPreset(p.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                ${preset === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <Link href="/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm">
          <PlusCircle size={16} /> New Order
        </Link>
      </div>

      {loading && <LoadingSpinner message="Loading dashboard..." />}
      {error && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && s && (
        <>
          {/* ── TOP 3 BIG CARDS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BigCard
              label="Net Sales"
              value={fmt(s.orderValue)}
              sub={`${s.orderCount} order${s.orderCount !== 1 ? 's' : ''}`}
              icon={ShoppingBag}
              color="emerald"
            />
            <BigCard
              label="Money Collected"
              value={fmt(s.netCollected)}
              sub="Cash + UPI — actual received"
              icon={Wallet}
              color="blue"
            />
            <BigCard
              label="Expenses"
              value={fmt(s.totalExpensesIncurred || 0)}
              sub={s.totalExpensesUnpaid > 0 ? `₹${Math.round(s.totalExpensesUnpaid)} credit pending` : 'All paid'}
              icon={Receipt}
              color={s.totalExpensesIncurred > 0 ? 'red' : 'amber'}
            />
          </div>

          {/* ── OPERATING RESULT BANNER ── */}
          <div className={`rounded-2xl p-4 flex items-center justify-between
            ${operatingResult >= 0
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
            }`}>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Estimated Profit <span className="text-xs text-gray-400">(Sales − Expenses)</span>
              </p>
              <p className={`text-3xl font-bold mt-0.5 ${operatingResult >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {operatingResult >= 0 ? '+' : ''}{fmt(operatingResult)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Note: This is an estimate — all expenses must be recorded for an accurate result.
              </p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
              ${operatingResult >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
              <BarChart2 size={24} className={operatingResult >= 0 ? 'text-green-700' : 'text-red-700'} />
            </div>
          </div>

          {/* ── PAYMENT BREAKDOWN ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SmallCard label="💵 Cash Received" value={fmt(s.cashCollected)} color="green" />
            <SmallCard label="📱 UPI Received" value={fmt(s.upiCollected)} color="blue" />
            <SmallCard label="⏳ Pending Balance" value={fmt(s.outstandingBalance)} color="amber" />
            <SmallCard label="❌ Cancelled Orders" value={s.cancelledCount} color="red" />
          </div>

          {/* ── EXPENSE BREAKDOWN ── */}
          {(s.totalExpensesIncurred > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Receipt size={15} className="text-red-500" />
                  Today's Expenses
                </h3>
                <Link href="/expenses" className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
                  <p className="text-lg font-bold text-gray-900">{fmt(s.totalExpensesIncurred)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Paid</p>
                  <p className="text-lg font-bold text-green-700">{fmt(s.totalExpensesPaidFromIncurred || s.totalExpenseOutflow || 0)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Credit (Unpaid)</p>
                  <p className="text-lg font-bold text-amber-700">{fmt(s.totalExpensesUnpaid || 0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── QUICK ACTIONS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/orders/new" className="flex items-center gap-2.5 px-4 py-3 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors">
              <PlusCircle size={16} /> New Order
            </Link>
            <Link href="/expenses/new" className="flex items-center gap-2.5 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors border border-red-100">
              <Receipt size={16} /> Add Expense
            </Link>
            <Link href="/orders?paymentStatus=pending" className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors border border-amber-100">
              <Clock size={16} /> Pending
            </Link>
            <Link href="/reports" className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors border border-blue-100">
              <BarChart2 size={16} /> Reports
            </Link>
          </div>
        </>
      )}

      {/* ── RECENT ORDERS + PENDING PAYMENTS ── */}
      {!loading && !error && (
        <div className="grid lg:grid-cols-2 gap-5">

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Recent Orders</h3>
              <Link href="/orders" className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
            {recentOrders.length === 0
              ? <p className="py-8 text-center text-sm text-gray-400">No orders yet</p>
              : recentOrders.slice(0, 8).map(o => (
                <Link key={o._id} href={`/orders/${o._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{o.orderNumber}</p>
                    <p className="text-xs text-gray-400">{o.customerName || o.tableNumber || 'Walk-in'} · {fmtDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{fmt(o.total)}</p>
                    <div className="flex gap-1 justify-end mt-1">
                      <Badge variant={o.orderStatus}>{o.orderStatus}</Badge>
                      <Badge variant={o.paymentStatus}>{o.paymentStatus}</Badge>
                    </div>
                  </div>
                </Link>
              ))
            }
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Pending Payments</h3>
              <Link href="/orders?paymentStatus=pending" className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
            {pendingOrders.length === 0
              ? <p className="py-8 text-center text-sm text-gray-400">No pending payments 🎉</p>
              : pendingOrders.slice(0, 8).map(o => (
                <Link key={o._id} href={`/orders/${o._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{o.orderNumber}</p>
                    <p className="text-xs text-gray-400">{o.customerName || o.tableNumber || 'Walk-in'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{fmt(o.outstandingAmount)}</p>
                    <p className="text-xs text-gray-400">outstanding</p>
                  </div>
                </Link>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
