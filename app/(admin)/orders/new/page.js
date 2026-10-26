'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Minus, Trash2, ShoppingBag, CheckCircle, X } from 'lucide-react'
import { menu, categories, orders } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function NewOrderPage() {
  const router = useRouter()
  const toast = useToast()

  const [cats, setCats] = useState([])
  const [allItems, setAllItems] = useState([])
  const [selectedCat, setSelectedCat] = useState('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [form, setForm] = useState({ customerName: '', tableNumber: '', orderType: 'dine-in', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [successOrder, setSuccessOrder] = useState(null)

  // Custom price modal (for snooker tables)
  const [customPriceItem, setCustomPriceItem] = useState(null)
  const [customAmount, setCustomAmount] = useState('')

  useEffect(() => {
    async function loadMenu() {
      try {
        const [catRes, itemRes] = await Promise.all([
          categories.list({ active: 'true' }),
          menu.list({ available: 'true' }),
        ])
        setCats(catRes.data)
        setAllItems(itemRes.data)
      } catch (err) {
        toast(err.message, 'error')
      } finally {
        setLoadingMenu(false)
      }
    }
    loadMenu()
  }, [])

  const filtered = allItems.filter((item) => {
    const matchCat = selectedCat === 'all' || item.category?._id === selectedCat
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function addToCart(item) {
    // If custom price item (snooker), open the price modal
    if (item.customPrice) {
      setCustomPriceItem(item)
      setCustomAmount('')
      return
    }

    // Normal item — add directly
    setCart((prev) => {
      const existing = prev.find((c) => c._id === item._id)
      if (existing) {
        return prev.map((c) => c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { _id: item._id, name: item.name, price: item.price, quantity: 1, customPrice: false }]
    })
  }

  function addCustomItem() {
    const amount = parseFloat(customAmount)
    if (!amount || amount <= 0) {
      toast('Enter a valid amount', 'error')
      return
    }
    // Each custom item is a separate cart entry (unique key)
    const cartEntry = {
      _id: customPriceItem._id,
      name: customPriceItem.name,
      price: amount,        // custom amount as the unit price
      quantity: 1,
      customPrice: true,
      customAmount: amount,
    }
    setCart((prev) => [...prev, cartEntry])
    setCustomPriceItem(null)
    setCustomAmount('')
    toast(`${customPriceItem.name} added at ${fmt(amount)}`, 'success')
  }

  function updateQty(id, delta) {
    setCart((prev) =>
      prev
        .map((c) => c._id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter((c) => c.quantity > 0)
    )
  }

  function removeFromCart(idx) {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (cart.length === 0) { toast('Add at least one item', 'error'); return }
    setSubmitting(true)
    try {
      const res = await orders.create({
        customerName: form.customerName,
        tableNumber: form.tableNumber,
        orderType: form.orderType,
        notes: form.notes,
        items: cart.map((c) => ({
          menuItemId: c._id,
          quantity: c.quantity,
          customAmount: c.customPrice ? c.customAmount : undefined,
        })),
      })
      setSuccessOrder(res.data)
      setCart([])
    } catch (err) {
      toast(err.message || 'Failed to create order', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (successOrder) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Order Created!</h2>
          <p className="text-sm text-gray-500 mb-2">Order number</p>
          <p className="text-2xl font-mono font-bold text-emerald-700 mb-4">{successOrder.orderNumber}</p>
          <p className="text-sm text-gray-600 mb-6">
            Total: <strong>{fmt(successOrder.total)}</strong> · Status: <strong>New</strong> · Payment: <strong>Pending</strong>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push(`/orders/${successOrder._id}`)}>
              View Order
            </Button>
            <Button onClick={() => { setSuccessOrder(null); setForm({ customerName: '', tableNumber: '', orderType: 'dine-in', notes: '' }) }}>
              New Order
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-5">Create New Order</h2>
      <div className="flex flex-col xl:flex-row gap-5">

        {/* Menu panel */}
        <div className="flex-1 min-w-0">
          {/* Search + category filter */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Search menu items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCat('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCat === 'all' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >All</button>
              {cats.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCat(c._id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCat === c._id ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Items grid */}
          {loadingMenu ? (
            <LoadingSpinner message="Loading menu…" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((item) => {
                const inCart = cart.filter((c) => c._id === item._id && !c.customPrice).length
                return (
                  <button
                    key={item._id}
                    onClick={() => addToCart(item)}
                    className={`bg-white rounded-xl border p-3 text-left transition-all hover:shadow-md hover:border-emerald-300 active:scale-95
                      ${inCart ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-gray-100 shadow-sm'}`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-medium text-gray-800 leading-tight">{item.name}</p>
                      {inCart > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {inCart}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{item.category?.name}</p>
                    {item.customPrice ? (
                      <p className="text-sm font-bold text-purple-700">Custom ₹</p>
                    ) : (
                      <p className="text-sm font-bold text-emerald-700">{fmt(item.price)}</p>
                    )}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-gray-400">
                  No items found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order summary panel */}
        <div className="xl:w-80 flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
              <div className="px-4 py-3 bg-emerald-800 text-white">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} />
                  <span className="font-semibold text-sm">Order Summary</span>
                  {cart.length > 0 && (
                    <span className="ml-auto bg-amber-400 text-emerald-900 text-xs rounded-full px-2 py-0.5 font-bold">
                      {cart.length} items
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Customer info */}
                <div>
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Customer name (optional — for credit/khata)"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Table number (optional)"
                    value={form.tableNumber}
                    onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
                  />
                </div>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  {['dine-in', 'takeaway'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, orderType: t })}
                      className={`flex-1 py-2 text-xs font-medium transition-colors
                        ${form.orderType === t ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {t === 'dine-in' ? 'Dine In' : 'Takeaway'}
                    </button>
                  ))}
                </div>

                {/* Cart items */}
                <div className="border-t border-gray-100 pt-3 space-y-2 max-h-60 overflow-y-auto">
                  {cart.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Click items to add them</p>
                  )}
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {fmt(item.price)} {item.quantity > 1 ? `× ${item.quantity}` : ''} = {fmt(item.price * item.quantity)}
                          {item.customPrice && <span className="ml-1 text-purple-500">(custom)</span>}
                        </p>
                      </div>
                      {!item.customPrice && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button type="button" onClick={() => updateQty(item._id, -1)}
                            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                            <Minus size={10} />
                          </button>
                          <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                          <button type="button" onClick={() => updateQty(item._id, 1)}
                            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                            <Plus size={10} />
                          </button>
                        </div>
                      )}
                      <button type="button" onClick={() => removeFromCart(idx)}
                        className="w-6 h-6 rounded border border-red-100 text-red-400 flex items-center justify-center hover:bg-red-50 ml-1">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Order notes (optional)"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />

                {/* Total */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="text-xl font-bold text-emerald-800">{fmt(cartTotal)}</span>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={submitting}
                    disabled={cart.length === 0 || submitting}
                  >
                    Place Order
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Custom Price Modal (for snooker tables) */}
      <Modal open={!!customPriceItem} onClose={() => setCustomPriceItem(null)} title="Enter Amount" size="sm">
        {customPriceItem && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">{customPriceItem.name}</p>
              <p className="text-xs text-gray-400">{customPriceItem.category?.name} — price based on time played</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm pointer-events-none">₹</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  autoFocus
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addCustomItem() }
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCustomPriceItem(null)}>Cancel</Button>
              <Button className="flex-1" onClick={addCustomItem}>Add to Order</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
