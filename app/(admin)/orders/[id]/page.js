'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, IndianRupee, Clock, CheckCircle, Banknote,
  CreditCard, AlertTriangle, XCircle, ChevronDown
} from 'lucide-react'
import { orders, payments } from '@/lib/api'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { useToast } from '@/components/ui/Toast'

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function istDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const STATUS_FLOW = ['new', 'preparing', 'ready', 'served']
const NEXT_STATUS = { new: 'preparing', preparing: 'ready', ready: 'served' }

export default function OrderDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()

  const [order, setOrder] = useState(null)
  const [orderPayments, setOrderPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals
  const [payModal, setPayModal] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  // Payment form
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', transactionRef: '', notes: '' })
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [payError, setPayError] = useState('')

  // Cancel form
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await orders.get(id)
      setOrder(res.data)
      setOrderPayments(res.data.payments || [])
      setPayForm((prev) => ({ ...prev, amount: res.data.outstandingAmount?.toFixed(2) || '' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleStatusUpdate(newStatus) {
    setStatusUpdating(true)
    try {
      await orders.updateStatus(id, newStatus)
      toast(`Status updated to ${newStatus}`, 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handlePayment(e) {
    e.preventDefault()
    setPayError('')
    const amount = parseFloat(payForm.amount)
    if (!amount || amount <= 0) { setPayError('Enter a valid amount'); return }
    setPaySubmitting(true)
    try {
      await payments.record(id, {
        amount,
        method: payForm.method,
        transactionRef: payForm.transactionRef,
        notes: payForm.notes,
      })
      toast(`₹${amount} recorded (${payForm.method.toUpperCase()})`, 'success')
      setPayModal(false)
      load()
    } catch (err) {
      setPayError(err.message)
    } finally {
      setPaySubmitting(false)
    }
  }

  async function handleCancel(e) {
    e.preventDefault()
    if (!cancelReason.trim()) return
    setCancelling(true)
    try {
      await orders.cancel(id, cancelReason)
      toast('Order cancelled', 'success')
      setCancelModal(false)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading order…" />
  if (error) return <ErrorMessage message={error} onRetry={load} />
  if (!order) return null

  const nextStatus = NEXT_STATUS[order.orderStatus]
  const canPay = order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded' && order.orderStatus !== 'cancelled'
  const canCancel = !['cancelled', 'served'].includes(order.orderStatus)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 font-mono">{order.orderNumber}</h2>
          <p className="text-xs text-gray-500">{istDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
          <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: Order details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Order Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-5">
              <div><p className="text-gray-400 text-xs mb-0.5">Customer</p><p className="font-medium">{order.customerName || '—'}</p></div>
              <div><p className="text-gray-400 text-xs mb-0.5">Table</p><p className="font-medium">{order.tableNumber || '—'}</p></div>
              <div><p className="text-gray-400 text-xs mb-0.5">Type</p><p className="font-medium capitalize">{order.orderType}</p></div>
              <div><p className="text-gray-400 text-xs mb-0.5">Items</p><p className="font-medium">{order.items?.length || 0}</p></div>
            </div>

            {/* Items table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-400 border-b border-gray-100">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items?.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      {item.categoryName && <p className="text-xs text-gray-400">{item.categoryName}</p>}
                    </td>
                    <td className="py-2 text-center text-gray-700">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-700">{fmt(item.unitPrice)}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{fmt(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="pt-3 text-right font-bold text-gray-800">Total</td>
                  <td className="pt-3 text-right font-bold text-lg text-emerald-800">{fmt(order.total)}</td>
                </tr>
              </tfoot>
            </table>

            {order.notes && (
              <div className="mt-4 px-3 py-2 bg-amber-50 rounded-lg text-sm text-amber-800">
                <span className="font-medium">Note: </span>{order.notes}
              </div>
            )}
            {order.orderStatus === 'cancelled' && order.cancellationReason && (
              <div className="mt-4 px-3 py-2 bg-red-50 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                <div><span className="font-medium">Cancelled: </span>{order.cancellationReason}</div>
              </div>
            )}
          </div>

          {/* Payment history */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Payment History</h3>
            {orderPayments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {orderPayments.map((p) => (
                  <div key={p._id} className={`flex items-center justify-between p-3 rounded-lg border
                    ${p.isRefund ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex items-center gap-3">
                      {p.method === 'cash'
                        ? <Banknote size={16} className={p.isRefund ? 'text-red-500' : 'text-green-600'} />
                        : <CreditCard size={16} className={p.isRefund ? 'text-red-500' : 'text-blue-600'} />
                      }
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {p.isRefund ? 'Refund — ' : ''}{p.method.toUpperCase()}
                          {p.transactionRef && <span className="text-gray-400 ml-2 text-xs">#{p.transactionRef}</span>}
                        </p>
                        <p className="text-xs text-gray-400">{istDate(p.paidAt)}</p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm ${p.isRefund ? 'text-red-600' : 'text-green-700'}`}>
                      {p.isRefund ? '−' : '+'}{fmt(p.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions & summary */}
        <div className="space-y-5">
          {/* Payment summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Order Total</span><span className="font-semibold">{fmt(order.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount Paid</span><span className="font-semibold text-green-700">{fmt(order.totalPaid)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-bold">Outstanding</span>
                <span className={`font-bold text-base ${order.outstandingAmount > 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {fmt(order.outstandingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-gray-800">Actions</h3>

            {nextStatus && (
              <Button
                className="w-full"
                loading={statusUpdating}
                onClick={() => handleStatusUpdate(nextStatus)}
                icon={<CheckCircle size={16} />}
              >
                Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
              </Button>
            )}

            {canPay && (
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => setPayModal(true)}
                icon={<IndianRupee size={16} />}
              >
                Record Payment
              </Button>
            )}

            {canCancel && (
              <Button
                className="w-full"
                variant="danger"
                onClick={() => setCancelModal(true)}
                icon={<AlertTriangle size={16} />}
              >
                Cancel Order
              </Button>
            )}

            {order.paymentStatus === 'paid' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-sm text-green-700 font-medium">Fully Paid</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment">
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="px-4 py-3 bg-gray-50 rounded-lg text-sm flex justify-between">
            <span className="text-gray-600">Outstanding</span>
            <span className="font-bold text-red-600">{fmt(order.outstandingAmount)}</span>
          </div>
          {payError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{payError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number" step="0.01" min="0.01" max={order.outstandingAmount}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {['cash', 'upi'].map((m) => (
                <button key={m} type="button"
                  onClick={() => setPayForm({ ...payForm, method: m })}
                  className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                    ${payForm.method === m ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {m === 'cash' ? <Banknote size={16} /> : <CreditCard size={16} />}
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {payForm.method === 'upi' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="UPI transaction ID (optional)"
                value={payForm.transactionRef}
                onChange={(e) => setPayForm({ ...payForm, transactionRef: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Optional note"
              value={payForm.notes}
              onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setPayModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={paySubmitting}>Confirm Payment</Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Order">
        <form onSubmit={handleCancel} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">This action cannot be undone. The order will be preserved in the system as cancelled.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Reason *</label>
            <textarea
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Why is this order being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setCancelModal(false)}>Keep Order</Button>
            <Button type="submit" variant="danger" className="flex-1" loading={cancelling}>Cancel Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
