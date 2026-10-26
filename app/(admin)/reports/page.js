'use client'
import { useState } from 'react'
import {
  BarChart2, Download, Calendar, TrendingUp, Wallet, Banknote,
  CreditCard, Clock, Receipt, TrendingDown, Info
} from 'lucide-react'
import { reports } from '@/lib/api'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { useToast } from '@/components/ui/Toast'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

function fmt(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatCard({ label, value, icon: Icon, color = 'emerald', tooltip }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
            {label}
            {tooltip && <span title={tooltip} className="text-gray-300 cursor-help"><Info size={12} /></span>}
          </p>
          <p className="mt-1.5 text-xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color] || colors.emerald}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const toast = useToast()
  const [period, setPeriod] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [singleDate, setSingleDate] = useState('')
  const [summaryData, setSummaryData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState('')

  function getParams() {
    if (period === 'today') return { period: 'today' }
    if (period === 'month') return { period: 'month' }
    if (period === 'custom' && customFrom && customTo) return { period: 'custom', from: customFrom, to: customTo }
    return { period: 'today' }
  }

  function getPeriodLabel() {
    if (period === 'today') return 'Today'
    if (period === 'month') return 'This Month'
    if (period === 'custom' && customFrom && customTo) return `${customFrom} to ${customTo}`
    return ''
  }

  async function loadSummary() {
    const params = getParams()
    if (period === 'custom' && (!customFrom || !customTo)) {
      toast('Select from and to dates', 'error'); return
    }
    setLoading(true); setError('')
    try {
      const res = await reports.summary(params)
      setSummaryData(res.data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  function handleExport(type) {
    let url = ''
    if (type === 'daily') {
      if (!singleDate) { toast('Select a date for daily export', 'error'); return }
      url = `${BASE_URL}/reports/export/daily?date=${singleDate}`
    } else if (type === 'orders') {
      url = `${BASE_URL}/reports/export/orders?${new URLSearchParams(getParams())}`
    } else if (type === 'monthly') {
      url = `${BASE_URL}/reports/export/monthly?${new URLSearchParams(getParams())}`
    } else if (type === 'custom') {
      if (!customFrom || !customTo) { toast('Select date range for custom export', 'error'); return }
      url = `${BASE_URL}/reports/export/custom?startDate=${customFrom}&endDate=${customTo}`
    }
    window.open(url, '_blank')
  }

  const summary = summaryData?.summary
  const daily = summaryData?.daily || []
  const catBreakdown = summaryData?.expenseCategoryBreakdown || []

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800">Reports & Financial Summary</h2>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-emerald-600" /> Select Reporting Period
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {[['today', 'Today'], ['month', 'This Month'], ['custom', 'Custom Range']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setPeriod(val)}
                className={`px-4 py-2 font-medium transition-colors ${period === val ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
          <Button onClick={loadSummary} loading={loading} icon={<BarChart2 size={16} />}>
            Load Summary
          </Button>
        </div>
      </div>

      {loading && <LoadingSpinner message="Calculating report…" />}
      {error && <ErrorMessage message={error} onRetry={loadSummary} />}

      {summary && !loading && (
        <>
          <div className="px-1">
            <p className="text-sm font-semibold text-gray-600">
              Period: <span className="text-gray-900">{getPeriodLabel()}</span>
            </p>
          </div>

          {/* Sales */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sales & Collections</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Valid Orders" value={summary.orderCount} icon={TrendingUp} color="blue" />
              <StatCard label="Net Sales (₹)" value={fmt(summary.orderValue)} icon={BarChart2} color="amber"
                tooltip="Total of non-cancelled orders" />
              <StatCard label="Net Collected (₹)" value={fmt(summary.netCollected)} icon={Wallet} color="green"
                tooltip="Payments received minus refunds (by payment date)" />
              <StatCard label="Outstanding (₹)" value={fmt(summary.outstandingBalance)} icon={Clock} color="red"
                tooltip="Pending customer balances" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Cash Collected" value={fmt(summary.cashCollected)} icon={Banknote} color="emerald" />
            <StatCard label="UPI Collected" value={fmt(summary.upiCollected)} icon={CreditCard} color="purple" />
            <StatCard label="Refunds" value={fmt(summary.refundTotal)} icon={TrendingDown} color="orange" />
            <StatCard label="Cancelled Orders" value={summary.cancelledCount} icon={BarChart2} color="red" />
          </div>

          {/* Expenses */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expenses</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Expenses Incurred" value={fmt(summary.totalExpensesIncurred)} icon={Receipt} color="red"
                tooltip="Expenses by expense date" />
              <StatCard label="Expenses Paid" value={fmt(summary.totalExpensesPaidFromIncurred)} icon={Banknote} color="orange"
                tooltip="Amount paid against incurred expenses" />
              <StatCard label="Unpaid Expenses" value={fmt(summary.totalExpensesUnpaid)} icon={Clock} color="amber"
                tooltip="Outstanding payables to vendors" />
              <StatCard label="Cash Outflow" value={fmt(summary.totalExpenseOutflow)} icon={TrendingDown} color="red"
                tooltip="Money actually paid (by payment date)" />
            </div>
          </div>

          {/* P&L */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Financial Summary</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {[
                  ['Valid Orders', summary.orderCount, false, null],
                  ['Net Sales (₹)', fmt(summary.orderValue), false, 'Non-cancelled order totals'],
                  ['Cash Collected (₹)', fmt(summary.cashCollected), false, null],
                  ['UPI Collected (₹)', fmt(summary.upiCollected), false, null],
                  ['Total Gross Collected (₹)', fmt(summary.totalCollected), false, null],
                  ['Refunds (₹)', fmt(summary.refundTotal), false, null],
                  ['Net Collected (₹)', fmt(summary.netCollected), true, 'Gross collections minus refunds'],
                  ['Outstanding Customer Payments (₹)', fmt(summary.outstandingBalance), false, null],
                  ['Total Expenses Incurred (₹)', fmt(summary.totalExpensesIncurred), false, 'By expense date'],
                  ['Total Expense Cash Outflow (₹)', fmt(summary.totalExpenseOutflow), false, 'By payment date'],
                  ['Unpaid Supplier Expenses (₹)', fmt(summary.totalExpensesUnpaid), false, null],
                  [summary.hasCostData
                    ? `Est. Gross Profit (₹) — ${summary.costCoveragePercent}% items have cost`
                    : 'Est. Gross Profit (₹)',
                    summary.hasCostData ? fmt(summary.estimatedGrossProfit) : 'N/A — set cost prices',
                    false,
                    summary.hasCostData ? 'Net sales minus COGS' : 'Add costPrice to menu items'],
                  ['Est. Operating Result (₹)', fmt(summary.estimatedOperatingResult), true, 'Net Sales minus Recorded Expenses. NOT guaranteed profit.'],
                  ['Net Recorded Cash Movement (₹)', fmt(summary.netCashMovement), false, 'Net collections minus expense outflow'],
                  ['Cancelled Orders', summary.cancelledCount, false, null],
                  ['Pending Payment Orders', summary.pendingPaymentCount, false, null],
                ].map(([label, value, bold, hint]) => (
                  <tr key={label} className={bold ? 'bg-emerald-50' : ''}>
                    <td className={`py-2.5 pr-4 ${bold ? 'font-bold text-emerald-800' : 'text-gray-600'}`}>
                      {label}
                      {hint && <span className="ml-1 text-xs text-gray-400">({hint})</span>}
                    </td>
                    <td className={`py-2.5 text-right ${bold ? 'font-bold text-emerald-800 text-base' : 'font-medium text-gray-900'}`}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expense category breakdown */}
          {catBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Expenses by Category</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100">
                      <th className="pb-2">Category</th>
                      <th className="pb-2 text-center">Entries</th>
                      <th className="pb-2 text-right">Incurred (₹)</th>
                      <th className="pb-2 text-right">Paid (₹)</th>
                      <th className="pb-2 text-right">Unpaid (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {catBreakdown.map(cat => (
                      <tr key={cat._id || cat.categoryName}>
                        <td className="py-2 font-medium text-gray-800">{cat.categoryName || 'Uncategorised'}</td>
                        <td className="py-2 text-center text-gray-600">{cat.count}</td>
                        <td className="py-2 text-right font-semibold text-gray-900">{fmt(cat.totalIncurred)}</td>
                        <td className="py-2 text-right text-green-700">{fmt(cat.totalPaid)}</td>
                        <td className="py-2 text-right text-red-600">{fmt(cat.totalIncurred - cat.totalPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily breakdown */}
          {daily.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Daily Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 font-medium">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2 text-center">Orders</th>
                      <th className="px-4 py-2 text-right">Net Sales</th>
                      <th className="px-4 py-2 text-right">Cash</th>
                      <th className="px-4 py-2 text-right">UPI</th>
                      <th className="px-4 py-2 text-right">Collected</th>
                      <th className="px-4 py-2 text-right">Expenses</th>
                      <th className="px-4 py-2 text-right">Est. Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {daily.map(d => (
                      <tr key={d.date} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{d.date}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{d.orderCount}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{fmt(d.orderValue)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{fmt(d.cashCollected)}</td>
                        <td className="px-4 py-2 text-right text-purple-700">{fmt(d.upiCollected)}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">{fmt(d.totalCollected)}</td>
                        <td className="px-4 py-2 text-right text-red-600">{fmt(d.expensesIncurred)}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${d.estimatedOperatingResult >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {fmt(d.estimatedOperatingResult)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Excel export section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Download size={16} className="text-emerald-600" /> Export to Excel
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          All exports include expenses, order details, payment transactions, and financial summaries.
          The backend session must be active for downloads to work.
        </p>

        {/* Daily export */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">Daily Report (single date)</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                value={singleDate} onChange={e => setSingleDate(e.target.value)} />
            </div>
            <Button variant="outline" icon={<Download size={16} />} onClick={() => handleExport('daily')}>
              Daily Report
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Includes: Daily Summary, Order Items, Payment Transactions, Expense Details</p>
        </div>

        {/* Period exports */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" icon={<Download size={16} />} onClick={() => handleExport('orders')}>
            Order Details ({getPeriodLabel() || 'Selected Period'})
          </Button>
          <Button variant="outline" icon={<Download size={16} />} onClick={() => handleExport('monthly')}>
            Monthly Report ({getPeriodLabel() || 'Selected Period'})
          </Button>
          {period === 'custom' && customFrom && customTo && (
            <Button variant="outline" icon={<Download size={16} />} onClick={() => handleExport('custom')}>
              Custom Range Report
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Files are generated from live database records and respect the selected date range.
        </p>
      </div>
    </div>
  )
}
