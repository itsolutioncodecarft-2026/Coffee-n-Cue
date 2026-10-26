'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, PlusCircle } from 'lucide-react'
import { expenses, expenseCategories } from '@/lib/api'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const PAYMENT_METHODS = [
  { val: 'cash',   emoji: '💵', label: 'Cash',   sub: 'Paid in hand' },
  { val: 'upi',    emoji: '📱', label: 'UPI',    sub: 'PhonePe / GPay' },
  { val: 'credit', emoji: '🤝', label: 'Credit', sub: 'Pay later' },
]

function inp(hasError) {
  return `w-full px-3 py-2.5 border ${
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'
  } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition`
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function NewExpensePage() {
  const router = useRouter()
  const toast = useToast()

  const [cats, setCats] = useState([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(todayIST())
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [vendor, setVendor] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    expenseCategories.list({ active: 'true' }).then(r => setCats(r.data)).catch(() => {})
  }, [])

  function validate() {
    const e = {}
    if (!title.trim()) e.title = 'Expense title is required'
    if (!category) e.category = 'Please select a category'
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Enter a valid amount'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const isCredit = paymentMethod === 'credit'
      const res = await expenses.create({
        title: title.trim(),
        category,
        amount: parseFloat(amount),
        expenseDate,
        paymentStatus: isCredit ? 'unpaid' : 'paid',
        paymentMethod: isCredit ? 'other' : paymentMethod,
        amountPaid: isCredit ? 0 : parseFloat(amount),
        paymentDate: isCredit ? null : expenseDate,
        vendor: vendor.trim(),
        description: description.trim(),
      })
      setSuccess(res.data)
      setTitle(''); setAmount(''); setVendor(''); setDescription('')
      setExpenseDate(todayIST()); setPaymentMethod('cash'); setErrors({})
      toast('Expense saved!', 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="max-w-sm mx-auto mt-16 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Saved!</h2>
          <p className="text-base font-semibold text-emerald-700">{success.title}</p>
          <p className="text-2xl font-bold text-gray-900 my-3">₹{success.amount}</p>
          <p className="text-sm text-gray-500 mb-6">{success.categoryName}</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/expenses')}>
              View All
            </Button>
            <Button className="flex-1" icon={<PlusCircle size={15} />} onClick={() => setSuccess(null)}>
              Add Another
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button type="button" onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">Add Expense</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">

        <Field label="Expense Title *" error={errors.title}>
          <input
            className={inp(errors.title)}
            placeholder="e.g. Milk, Electricity Bill, Gas..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoComplete="off"
          />
        </Field>

        <Field label="Amount (₹) *" error={errors.amount}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm pointer-events-none">₹</span>
            <input
              type="number"
              step="1"
              min="1"
              className={`${inp(errors.amount)} pl-7 text-lg font-semibold`}
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </Field>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method *</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(({ val, emoji, label, sub }) => (
              <button key={val} type="button" onClick={() => setPaymentMethod(val)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all ${
                  paymentMethod === val
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                <span className="text-xl mb-0.5">{emoji}</span>
                <span className="font-semibold">{label}</span>
                <span className="text-gray-400 text-xs mt-0.5">{sub}</span>
              </button>
            ))}
          </div>
          {paymentMethod === 'credit' && (
            <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              Credit — this expense will appear in reports but won't count as cash outflow until paid.
            </div>
          )}
        </div>

        <Field label="Category *" error={errors.category}>
          <select className={inp(errors.category)} value={category}
            onChange={e => setCategory(e.target.value)}>
            <option value="">Select category...</option>
            {cats.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Date">
          <input type="date" className={inp(false)} value={expenseDate}
            onChange={e => setExpenseDate(e.target.value)} />
        </Field>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Optional</p>
          <input className={inp(false)} placeholder="Vendor / Shop name (optional)"
            value={vendor} onChange={e => setVendor(e.target.value)} autoComplete="off" />
          <textarea className={inp(false)} rows={2} placeholder="Notes (optional)"
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Saving...' : `Save Expense${amount ? ` — ₹${amount}` : ''}`}
        </button>

      </form>
    </div>
  )
}
