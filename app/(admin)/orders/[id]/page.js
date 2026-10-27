'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, IndianRupee, Clock, CheckCircle, Banknote,
  CreditCard, AlertTriangle, XCircle, Plus, Search,
  Minus, Trash2, ShoppingBag
} from 'lucide-react'
import { orders, payments, menu as menuApi, categories as categoriesApi } from '@/lib/api'
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

const NEXT_STATUS = { new: 'preparing', preparing: 'ready', ready: 'served' }

export default function OrderDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()

  const [order, setOrder] = useState(null)
  const [orderPayments, setOrderPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [payModal, setPayModal] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [addItemsModal, setAddItemsModal] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', transactionRef: '', notes: '' })
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [payError, setPayError] = useState('')

  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Add items state
  const [allMenuItems, setAllMenuItems] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [itemCatFilter, setItemCatFilter] = useState('')
  const [addCart, setAddCart] = useState([])
  const [addingItems, setAddingItems] = useState(false)

  // Custom price prompt state (for snooker/pool tables in add-items modal)
  const [customPricePrompt, setCustomPricePrompt] = useState(null) // the menu item
  const [customPriceInput, setCustomPriceInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await orders.get(id)
      setOrder(res.data)
      setOrderPayments(res.data.payments || [])
      setPayForm(prev => ({ ...prev, amount: res.data.outstandingAmount?.toFixed(2) || '' }))
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function openAddItems() {
    setAddCart([]); setItemSearch(''); setItemCatFilter('')
    setAddItemsModal(true)
    if (allMenuItems.length === 0) {
      setMenuLoading(true)
      try {
        const [mRes, cRes] = await Promise.all([
          menuApi.list({ available: 'true' }),
          categoriesApi.list({ active: 'true' }),
        ])
        setAllMenuItems(mRes.data)
        setAllCategories(cRes.data)
      } catch (err) { toast(err.message, 'error') }
      finally { setMenuLoading(false) }
    }
  }

  const filteredMenu = allMenuItems.filter(item => {
    const matchSearch = !itemSearch || item.name.toLowerCase().includes(itemSearch.toLowerCase())
    const matchCat = !itemCatFilter || item.category?._id === itemCatFilter
    return matchSearch && matchCat
  })

  // Click handler — custom price items open a prompt first
  function handleItemClick(item) {
    if (item.customPrice) {
      setCustomPricePrompt(item)
      setCustomPriceInput('')
    } else {
      addNormalToCart(item)
    }
  }

  function addNormalToCart(item) {
    setAddCart(prev => {
      const existing = prev.find(c => c._id === item._id && !c.customPrice)
      if (existing) return prev.map(c => (c._id === item._id && !c.customPrice) ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { _id: item._id, name: item.name, price: item.price, qty: 1, customPrice: false }]
    })
  }

  function confirmCustomPrice() {
    const amount = parseFloat(customPriceInput)
    if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return }
    // Each table session is a separate line
    setAddCart(prev => [
      ...prev,
      {
        _id: customPricePrompt._id,
        name: customPricePrompt.name,
        price: amount,
        qty: 1,
        customPrice: true,
        customAmount: amount,
      }
    ])
    setCustomPricePrompt(null)
    setCustomPriceInput('')
    toast(`${customPricePrompt.name} — ₹${amount} added`, 'success')
  }

  function updateCartQty(idx, delta) {
    setAddCart(prev =>
      prev.map((c, i) => i === idx ? { ...c, qty: Math.max(1, c.qty + delta) } : c)
    )
  }

  function removeFromCart(idx) {
    setAddCart(prev => prev.filter((_, i) => i !== idx))
  }

  const cartTotal = addCart.reduce((s, c) => s + c.price * c.qty, 0)

  async function handleAddItems() {
    if (addCart.length === 0) { toast('Select at least one item', 'error'); return }
    setAddingItems(true)
    try {
      const res = await orders.addItems(id, addCart.map(c => ({
        menuItemId: c._id,
        quantity: c.qty,
        customAmount: c.customPrice ? c.customAmount : undefined,
      })))
      toast(res.message, 'success')
      setAddItemsModal(false); setAddCart([]); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setAddingItems(false) }
  }

  async function handleStatusUpdate(newStatus) {
    setStatusUpdating(true)
    try {
      await orders.updateStatus(id, newStatus)
      toast(`Status updated to ${newStatus}`, 'success'); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setStatusUpdating(false) }
  }

  async function handlePayment(e) {
    e.preventDefault(); setPayError('')
    const amount = parseFloat(payForm.amount)
    if (!amount || amount <= 0) { setPayError('Enter a valid amount'); return }
    // For credit, don't validate against outstanding (it just notes the credit)
    if (payForm.method !== 'credit' && amount > order.outstandingAmount + 0.01) {
      setPayError(`Amount exceeds outstanding balance of ₹${order.outstandingAmount.toFixed(2)}`)
      return
    }
    setPaySubmitting(true)
    try {
      await payments.record(id, { amount, method: payForm.method, transactionRef: payForm.transactionRef, notes: payForm.notes })
      const msg = payForm.method === 'credit'
        ? `₹${amount} noted as credit (khata)`
        : `₹${amount} recorded (${payForm.method.toUpperCase()})`
      toast(msg, 'success')
      setPayModal(false); load()
    } catch (err) { setPayError(err.message) }
    finally { setPaySubmitting(false) }
  }

  async function handleCancel(e) {
    e.preventDefault()
    if (!cancelReason.trim()) return
    setCancelling(true)
    try {
      await orders.cancel(id, cancelReason)
      toast('Order cancelled', 'success'); setCancelModal(false); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setCancelling(false) }
  }

  if (loading) return <LoadingSpinner message="Loading order…" />
  if (error) return <ErrorMessage message={error} onRetry={load} />
  if (!order) return null

  const nextStatus = NEXT_STATUS[order.orderStatus]
  const canAddItems = !['cancelled', 'served'].includes(order.orderStatus)
  const canPay = order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded' && order.orderStatus !== 'cancelled'
  const canCancel = !['cancelled', 'served'].includes(order.orderStatus)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
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
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Order Details</h3>
              {canAddItems && (
                <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={openAddItems}>
                  Add Items
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-5">
              <div><p className="text-gray-400 text-xs mb-0.5">Customer</p><p className="font-medium">{order.customerName || '—'}</p></div>
              <div><p className="text-gray-400 text-xs mb-0.5">Table</p><p className="font-medium">{order.tableNumber || '—'}</p></div>
              <div><p className="text-gray-400 text-xs mb-0.5">Type</p><p className="font-medium capitalize">{order.orderType}</p></div>
              <div><p className="text-gray-400 text-xs mb-0.5">Items</p><p className="font-medium">{order.items?.length || 0}</p></div>
            </div>
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

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Payment History</h3>
            {orderPayments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {orderPayments.map(p => (
                  <div key={p._id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    p.isRefund ? 'bg-red-50 border-red-100' :
                    p.method === 'credit' ? 'bg-amber-50 border-amber-100' :
                    'bg-green-50 border-green-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      {p.method === 'cash' ? <Banknote size={16} className="text-green-600" /> :
                       p.method === 'upi' ? <CreditCard size={16} className="text-blue-600" /> :
                       p.method === 'credit' ? <Clock size={16} className="text-amber-600" /> :
                       <Banknote size={16} className="text-gray-400" />}
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {p.isRefund ? 'Refund — ' : ''}
                          {p.method === 'credit' ? 'Credit (Khata)' : p.method.toUpperCase()}
                          {p.transactionRef && <span className="text-gray-400 ml-2 text-xs">#{p.transactionRef}</span>}
                        </p>
                        <p className="text-xs text-gray-400">{istDate(p.paidAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${
                        p.isRefund ? 'text-red-600' :
                        p.method === 'credit' ? 'text-amber-600' :
                        'text-green-700'
                      }`}>
                        {p.isRefund ? '−' : p.method === 'credit' ? '' : '+'}{fmt(p.amount)}
                      </p>
                      {p.method === 'credit' && <p className="text-xs text-amber-500">not collected</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Order Total</span><span className="font-semibold">{fmt(order.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount Paid</span><span className="font-semibold text-green-700">{fmt(order.totalPaid)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-bold">Outstanding</span>
                <span className={`font-bold text-base ${order.outstandingAmount > 0 ? 'text-red-600' : 'text-green-700'}`}>{fmt(order.outstandingAmount)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-gray-800">Actions</h3>
            {canAddItems && <Button className="w-full" variant="outline" onClick={openAddItems} icon={<Plus size={16} />}>Add More Items</Button>}
            {nextStatus && <Button className="w-full" loading={statusUpdating} onClick={() => handleStatusUpdate(nextStatus)} icon={<CheckCircle size={16} />}>Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}</Button>}
            {canPay && <Button className="w-full" variant="secondary" onClick={() => setPayModal(true)} icon={<IndianRupee size={16} />}>Record Payment</Button>}
            {canCancel && <Button className="w-full" variant="danger" onClick={() => setCancelModal(true)} icon={<AlertTriangle size={16} />}>Cancel Order</Button>}
            {order.paymentStatus === 'paid' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-sm text-green-700 font-medium">Fully Paid</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ADD MORE ITEMS MODAL ─────────────────────────────────────── */}
      <Modal open={addItemsModal} onClose={() => { setAddItemsModal(false); setCustomPricePrompt(null) }} title="Add Items to Order" size="xl">
        <div className="flex flex-col gap-4">

          {/* Custom price prompt — shown inline when a table is clicked */}
          {customPricePrompt && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-sm font-semibold text-purple-800 mb-1">
                {customPricePrompt.name}
                <span className="text-xs font-normal text-purple-500 ml-2">— enter time charge</span>
              </p>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm pointer-events-none">₹</span>
                  <input
                    type="number" step="1" min="1" autoFocus
                    className="w-full pl-7 pr-3 py-2 border border-purple-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                    value={customPriceInput}
                    onChange={e => setCustomPriceInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmCustomPrice() } }}
                  />
                </div>
                <Button onClick={confirmCustomPrice} size="sm">Add</Button>
                <Button variant="outline" size="sm" onClick={() => { setCustomPricePrompt(null); setCustomPriceInput('') }}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Search items…"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                autoFocus={!customPricePrompt}
              />
            </div>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              value={itemCatFilter} onChange={e => setItemCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {allCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex gap-4">
            {/* Menu grid */}
            <div className="flex-1 overflow-y-auto max-h-72">
              {menuLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading menu…</div>
              ) : filteredMenu.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No items found</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredMenu.map(item => {
                    const inCart = addCart.filter(c => c._id === item._id).length
                    const isActive = customPricePrompt?._id === item._id
                    return (
                      <button key={item._id} type="button" onClick={() => handleItemClick(item)}
                        className={`text-left p-3 rounded-xl border transition-all hover:shadow-md active:scale-95
                          ${isActive ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300' :
                            inCart ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300' :
                            'border-gray-100 bg-white hover:border-emerald-200'}`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-xs font-semibold text-gray-800 leading-tight">{item.name}</p>
                          {inCart > 0 && !item.customPrice && (
                            <span className="flex-shrink-0 w-5 h-5 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{inCart}</span>
                          )}
                          {inCart > 0 && item.customPrice && (
                            <span className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{inCart}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{item.category?.name}</p>
                        {item.customPrice ? (
                          <p className="text-xs font-bold text-purple-600">Custom ₹ — tap to enter</p>
                        ) : (
                          <p className="text-sm font-bold text-emerald-700">₹{item.price}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Cart panel */}
            {addCart.length > 0 && (
              <div className="w-52 flex-shrink-0 border border-gray-100 rounded-xl p-3 bg-gray-50 flex flex-col">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <ShoppingBag size={12} /> Adding ({addCart.length})
                </p>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-52">
                  {addCart.map((item, idx) => (
                    <div key={idx} className={`bg-white rounded-lg p-2 border ${item.customPrice ? 'border-purple-100' : 'border-gray-100'}`}>
                      <p className="text-xs font-medium text-gray-800 mb-0.5 leading-tight">{item.name}</p>
                      {item.customPrice && <p className="text-xs text-purple-500 mb-1">₹{item.price} (custom)</p>}
                      <div className="flex items-center justify-between">
                        {!item.customPrice ? (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateCartQty(idx, -1)} className="w-5 h-5 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100"><Minus size={9} /></button>
                            <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                            <button type="button" onClick={() => updateCartQty(idx, 1)} className="w-5 h-5 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100"><Plus size={9} /></button>
                          </div>
                        ) : <span className="text-xs text-gray-400">1 session</span>}
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-emerald-700">₹{item.price * item.qty}</span>
                          <button type="button" onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm font-bold mb-1"><span>Adding</span><span className="text-emerald-700">₹{cartTotal}</span></div>
                  <p className="text-xs text-gray-400 mb-2 text-center">New total: ₹{(order.total + cartTotal).toFixed(0)}</p>
                  <Button className="w-full" size="sm" loading={addingItems} onClick={handleAddItems}>Add to Order</Button>
                </div>
              </div>
            )}
          </div>

          {addCart.length === 0 && !customPricePrompt && (
            <p className="text-xs text-gray-400 text-center">Click any item to add. For tables, enter the time charge.</p>
          )}
        </div>
      </Modal>

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
            <input type="number" step="0.01" min="0.01" max={order.outstandingAmount} required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'cash', icon: Banknote, label: 'Cash' },
                { val: 'upi', icon: CreditCard, label: 'UPI' },
                { val: 'credit', icon: Clock, label: 'Credit' },
              ].map(({ val, icon: Icon, label }) => (
                <button key={val} type="button"
                  onClick={() => setPayForm({ ...payForm, method: val })}
                  className={`flex flex-col items-center py-2.5 rounded-xl border-2 text-xs font-medium transition-all
                    ${payForm.method === val
                      ? val === 'credit'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <Icon size={16} className="mb-1" />
                  {label}
                </button>
              ))}
            </div>
            {payForm.method === 'credit' && (
              <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                ⚠️ Credit — No money collected now. Amount stays outstanding and is added to customer's khata.
              </div>
            )}
          </div>
          {payForm.method === 'upi' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="UPI transaction ID (optional)"
                value={payForm.transactionRef} onChange={e => setPayForm({ ...payForm, transactionRef: e.target.value })} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Optional note"
              value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
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
            <p className="text-sm text-red-700">This cannot be undone. The order will be preserved as cancelled.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Reason *</label>
            <textarea required rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Why is this order being cancelled?"
              value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
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
