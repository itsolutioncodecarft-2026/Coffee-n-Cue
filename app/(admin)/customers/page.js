'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Users, Search, IndianRupee, Banknote, CreditCard, UserPlus, X
} from 'lucide-react'
import { customers as customerApi } from '@/lib/api'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })
}

export default function CustomersPage() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [outstandingOnly, setOutstandingOnly] = useState(true)

  // Modals
  const [payModal, setPayModal] = useState(null)  // customer object
  const [addModal, setAddModal] = useState(false)
  const [detailModal, setDetailModal] = useState(null)

  // Forms
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash' })
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [payError, setPayError] = useState('')
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {}
      if (search) params.search = search
      if (outstandingOnly) params.outstandingOnly = 'true'
      const res = await customerApi.list(params)
      setData(res)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [search, outstandingOnly])

  useEffect(() => { load() }, [load])

  function openPayModal(customer) {
    setPayForm({ amount: customer.outstandingBalance.toFixed(2), method: 'cash' })
    setPayError('')
    setPayModal(customer)
  }

  async function handlePayment(e) {
    e.preventDefault()
    setPayError('')
    const amount = parseFloat(payForm.amount)
    if (!amount || amount <= 0) { setPayError('Enter a valid amount'); return }
    setPaySubmitting(true)
    try {
      const res = await customerApi.recordPayment(payModal._id, {
        amount,
        method: payForm.method,
      })
      toast(res.message, 'success')
      setPayModal(null)
      load()
    } catch (err) { setPayError(err.message) }
    finally { setPaySubmitting(false) }
  }

  async function handleAddCustomer(e) {
    e.preventDefault()
    if (!newCustomer.name.trim()) return
    setAdding(true)
    try {
      await customerApi.create({ name: newCustomer.name.trim(), phone: newCustomer.phone })
      toast('Customer added', 'success')
      setAddModal(false)
      setNewCustomer({ name: '', phone: '' })
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setAdding(false) }
  }

  const totalOutstanding = data?.data?.reduce((s, c) => s + c.outstandingBalance, 0) || 0
  const customerCount = data?.data?.length || 0

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Customers</h2>
          <p className="text-xs text-gray-400 mt-0.5">Credit / Khata management</p>
        </div>
        <Button icon={<UserPlus size={16} />} onClick={() => setAddModal(true)}>Add Customer</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600">{fmt(totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Customers with Credit</p>
          <p className="text-2xl font-bold text-gray-900">{customerCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setOutstandingOnly(!outstandingOnly)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
            ${outstandingOnly
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          {outstandingOnly ? '⚠️ Showing Credit Only' : 'Show All Customers'}
        </button>
      </div>

      {/* List */}
      {loading ? <LoadingSpinner message="Loading customers..." /> :
        error ? <ErrorMessage message={error} onRetry={load} /> :
        !data?.data?.length ? (
          <EmptyState
            title="No customers found"
            description={outstandingOnly ? "No customers with outstanding credit." : "Add a customer to start tracking credit."}
            action={<Button icon={<UserPlus size={16} />} onClick={() => setAddModal(true)}>Add Customer</Button>}
          />
        ) : (
          <div className="space-y-2">
            {data.data.map(c => (
              <div key={c._id}
                className={`bg-white rounded-xl border shadow-sm px-4 py-3 flex items-center gap-3
                  ${c.outstandingBalance > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>

                {/* Avatar circle */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm
                  ${c.outstandingBalance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {c.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    {c.outstandingBalance > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        Credit: {fmt(c.outstandingBalance)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                    <span className="text-xs text-gray-400">· Total spent: {fmt(c.totalSpent)}</span>
                  </div>
                </div>

                {/* Action */}
                {c.outstandingBalance > 0 && (
                  <Button size="sm" variant="secondary" icon={<IndianRupee size={14} />} onClick={() => openPayModal(c)}>
                    Collect Payment
                  </Button>
                )}
                {c.outstandingBalance === 0 && (
                  <Badge variant="paid">Clear</Badge>
                )}
              </div>
            ))}
          </div>
        )
      }

      {/* ── Payment Modal ──────────────────────────────────────────── */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Collect Payment">
        {payModal && (
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="px-4 py-3 bg-amber-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{payModal.name}</p>
                <p className="text-xs text-gray-400">Outstanding balance</p>
              </div>
              <span className="text-xl font-bold text-red-600">{fmt(payModal.outstandingBalance)}</span>
            </div>

            {payError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{payError}</p>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">₹</span>
                <input
                  type="number" step="1" min="1" max={payModal.outstandingAmount}
                  required
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-semibold"
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'cash', icon: Banknote, label: 'Cash' },
                  { val: 'upi', icon: CreditCard, label: 'UPI' },
                ].map(({ val, icon: Icon, label }) => (
                  <button key={val} type="button"
                    onClick={() => setPayForm({ ...payForm, method: val })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all
                      ${payForm.method === val
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPayModal(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={paySubmitting}>Record Payment</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Add Customer Modal ────────────────────────────────────── */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Customer" size="sm">
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Customer name"
              value={newCustomer.name}
              onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Phone number"
              value={newCustomer.phone}
              onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={adding}>Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
