'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { expenses, expenseCategories } from '@/lib/api'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { useToast } from '@/components/ui/Toast'

function dateToInput(d) {
  if (!d) return ''
  return new Date(new Date(d).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
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

export default function EditExpensePage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()

  const [cats, setCats] = useState([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [vendor, setVendor] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([expenses.get(id), expenseCategories.list({ active: 'true' })])
      .then(([expRes, catRes]) => {
        const e = expRes.data
        setCats(catRes.data)
        setTitle(e.title || '')
        setCategory(e.category?._id || e.category || '')
        setAmount(String(e.amount || ''))
        setExpenseDate(dateToInput(e.expenseDate))
        setPaymentMethod(e.paymentStatus === 'unpaid' ? 'credit' : (e.paymentMethod || 'cash'))
        setVendor(e.vendor || '')
        setDescription(e.description || '')
      })
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  function validate() {
    const e = {}
    if (!title.trim()) e.title = 'Title is required'
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
      await expenses.update(id, {
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
      toast('Expense updated!', 'success')
      router.push('/expenses')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading expense..." />
  if (loadError) return <ErrorMessage message={loadError} />

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button type="button" onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">Edit Expense</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">

        <Field label="Expense Title *" error={errors.title}>
          <input className={inp(errors.title)} value={title}
            onChange={e => setTitle(e.target.value)} autoComplete="off" />
        </Field>

        <Field label="Amount (₹) *" error={errors.amount}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm pointer-events-none">₹</span>
            <input type="number" step="1" min="1"
              className={`${inp(errors.amount)} pl-7 text-lg font-semibold`}
              value={amount} onChange={e => setAmount(e.target.value)} />
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

        <div className="border-t border-gray-100 pt-3 space-y-3">
          <input className={inp(false)} placeholder="Vendor / Shop name (optional)"
            value={vendor} onChange={e => setVendor(e.target.value)} autoComplete="off" />
          <textarea className={inp(false)} rows={2} placeholder="Notes (optional)"
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={saving}>Save Changes</Button>
        </div>

      </form>
    </div>
  )
}
