'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { PlusCircle, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { expenses, expenseCategories } from '@/lib/api'
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
  return new Date(d).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric'
  })
}

const METHOD_LABEL = { cash: '💵 Cash', upi: '📱 UPI', bank_transfer: '🏦 Bank', other: '🤝 Credit', credit: '🤝 Credit' }
const METHOD_COLOR = { cash: 'text-green-700 bg-green-50', upi: 'text-blue-700 bg-blue-50', bank_transfer: 'text-indigo-700 bg-indigo-50', other: 'text-amber-700 bg-amber-50' }

export default function ExpensesPage() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)

  const load = useCallback(async (pg = 1) => {
    setLoading(true); setError('')
    try {
      const params = { page: pg, limit: 20 }
      if (search) params.search = search
      if (catFilter) params.category = catFilter
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      const res = await expenses.list(params)
      setData(res); setPage(pg)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [search, catFilter, fromDate, toDate])

  useEffect(() => { load(1) }, [load])
  useEffect(() => {
    expenseCategories.list({ active: 'true' }).then(r => setCats(r.data)).catch(() => {})
  }, [])

  async function handleArchive() {
    setArchiving(true)
    try {
      await expenses.archive(archiveTarget._id)
      toast('Expense deleted', 'success')
      setArchiveTarget(null)
      load(page)
    } catch (err) { toast(err.message, 'error') }
    finally { setArchiving(false) }
  }

  function clearFilters() {
    setSearch(''); setCatFilter(''); setFromDate(''); setToDate('')
  }

  const total = data?.data?.reduce((s, e) => s + e.amount, 0) || 0
  const totalPaid = data?.data?.filter(e => e.paymentStatus === 'paid').reduce((s, e) => s + e.amount, 0) || 0
  const totalUdhaar = data?.data?.filter(e => e.paymentStatus === 'unpaid').reduce((s, e) => s + e.amount, 0) || 0

  return (
    <div className="space-y-4 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Expenses</h2>
          <p className="text-xs text-gray-400 mt-0.5">Record daily operating expenses</p>
        </div>
        <Link href="/expenses/new">
          <Button icon={<PlusCircle size={16} />}>Add Expense</Button>
        </Link>
      </div>

      {/* Filters row */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {cats.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          value={toDate} onChange={e => setToDate(e.target.value)} />
        {(search || catFilter || fromDate || toDate) && (
          <button onClick={clearFilters} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
            Clear
          </button>
        )}
      </div>

      {/* Main content */}
      {loading ? <LoadingSpinner message="Loading expenses..." /> :
        error ? <ErrorMessage message={error} onRetry={() => load(page)} /> :
        !data?.data?.length ? (
          <EmptyState
            title="No expenses found"
            description="Start recording your daily operating expenses."
            action={
              <Link href="/expenses/new">
                <Button icon={<PlusCircle size={16} />}>Add Expense</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Total Expenses</p>
                <p className="text-xl font-bold text-gray-900">{fmt(total)}</p>
              </div>
              <div className="bg-white rounded-xl border border-green-100 p-4 text-center shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Paid</p>
                <p className="text-xl font-bold text-green-700">{fmt(totalPaid)}</p>
              </div>
              <div className="bg-white rounded-xl border border-amber-100 p-4 text-center shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Credit (Unpaid)</p>
                <p className="text-xl font-bold text-amber-700">{fmt(totalUdhaar)}</p>
              </div>
            </div>

            {/* Expense cards */}
            <div className="space-y-2">
              {data.data.map(e => (
                <div key={e._id}
                  className={`bg-white rounded-xl border shadow-sm px-4 py-3 flex items-center gap-3
                    ${e.paymentStatus === 'unpaid' ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>

                  {/* Left: amount badge */}
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold
                    ${e.paymentStatus === 'unpaid' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800'}`}>
                    {fmt(e.amount).replace('₹', '')}<br />
                    <span className="text-xs font-normal">₹</span>
                  </div>

                  {/* Middle: details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{e.title}</p>
                      {e.paymentStatus === 'unpaid' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Credit</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400">{e.categoryName || e.category?.name || '—'}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{fmtDate(e.expenseDate)}</span>
                      {e.vendor && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{e.vendor}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: method + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${METHOD_COLOR[e.paymentMethod] || 'text-gray-600 bg-gray-100'}`}>
                      {METHOD_LABEL[e.paymentMethod] || e.paymentMethod}
                    </span>
                    <Link href={`/expenses/${e._id}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
                      <Pencil size={14} />
                    </Link>
                    <button onClick={() => setArchiveTarget(e)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.pagination?.pages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">
                  {data.pagination.total} expenses · Page {page}/{data.pagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1}
                    onClick={() => load(page - 1)} icon={<ChevronLeft size={14} />}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.pagination.pages}
                    onClick={() => load(page + 1)} icon={<ChevronRight size={14} />}>Next</Button>
                </div>
              </div>
            )}
          </>
        )
      }

      {/* Delete confirm */}
      <Modal open={!!archiveTarget} onClose={() => setArchiveTarget(null)} title="Delete Expense?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete <strong>{archiveTarget?.title}</strong> ({fmt(archiveTarget?.amount || 0)})?
            <br />
            <span className="text-xs text-gray-400">The record will be preserved for historical reports.</span>
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={archiving} onClick={handleArchive}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
