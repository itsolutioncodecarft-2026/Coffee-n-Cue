'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { menu, categories } from '@/lib/api'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'

function fmt(n) { return `₹${Number(n || 0).toFixed(2)}` }

const EMPTY_FORM = { name: '', category: '', price: '', costPrice: '', isAvailable: true }

export default function MenuPage() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [availFilter, setAvailFilter] = useState('')

  const [modal, setModal] = useState(null) // 'add'|'edit'|'delete'
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [mRes, cRes] = await Promise.all([menu.list(), categories.list()])
      setItems(mRes.data)
      setCats(cRes.data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter((i) => {
    const ms = !search || i.name.toLowerCase().includes(search.toLowerCase())
    const mc = !catFilter || i.category?._id === catFilter
    const ma = availFilter === '' ? true : availFilter === 'true' ? i.isAvailable : !i.isAvailable
    return ms && mc && ma
  })

  // Group by category
  const byCat = {}
  for (const item of filtered) {
    const cName = item.category?.name || 'Uncategorised'
    if (!byCat[cName]) byCat[cName] = []
    byCat[cName].push(item)
  }

  function openAdd() { setForm(EMPTY_FORM); setFormError(''); setModal('add') }
  function openEdit(item) {
    setEditItem(item)
    setForm({ name: item.name, category: item.category?._id || '', price: item.price, costPrice: item.costPrice ?? '', isAvailable: item.isAvailable })
    setFormError('')
    setModal('edit')
  }
  function openDelete(item) { setEditItem(item); setModal('delete') }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')
    if (!form.name || !form.category || !form.price) { setFormError('Name, category, and price are required'); return }
    setSaving(true)
    try {
      const payload = { name: form.name, category: form.category, price: parseFloat(form.price), isAvailable: form.isAvailable }
      if (form.costPrice !== '' && form.costPrice !== null) payload.costPrice = parseFloat(form.costPrice)
      else payload.costPrice = null
      if (modal === 'add') await menu.create(payload)
      else await menu.update(editItem._id, payload)
      toast(modal === 'add' ? 'Item added' : 'Item updated', 'success')
      setModal(null)
      load()
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      const res = await menu.delete(editItem._id)
      toast(res.message || 'Item deleted', 'success')
      setModal(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleToggle(item) {
    try {
      await menu.update(item._id, { isAvailable: !item.isAvailable })
      toast(item.isAvailable ? 'Item disabled' : 'Item enabled', 'success')
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Menu Items</h2>
        <Button icon={<Plus size={16} />} onClick={openAdd}>Add Item</Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-36"
            value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={availFilter} onChange={(e) => setAvailFilter(e.target.value)}>
            <option value="">All</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={load} /> : filtered.length === 0 ? (
        <EmptyState title="No menu items" description="Add your first menu item to get started." action={<Button onClick={openAdd} icon={<Plus size={16} />}>Add Item</Button>} />
      ) : (
        <div className="space-y-4">
          {Object.entries(byCat).map(([catName, catItems]) => (
            <div key={catName} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                <h3 className="text-sm font-semibold text-emerald-800">{catName} <span className="text-emerald-500 font-normal">({catItems.length})</span></h3>
              </div>
              <div className="divide-y divide-gray-50">
                {catItems.map((item) => (
                  <div key={item._id} className="flex items-center px-5 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${item.isAvailable ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{item.name}</p>
                        {!item.isAvailable && <Badge variant="error">Unavailable</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-700">{fmt(item.price)}</p>
                      {item.costPrice != null && (
                        <p className="text-xs text-gray-400">cost {fmt(item.costPrice)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggle(item)} title={item.isAvailable ? 'Disable' : 'Enable'}
                        className={`p-1.5 rounded-lg transition-colors ${item.isAvailable ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                        {item.isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => openDelete(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Menu Item' : 'Edit Menu Item'}>
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category…</option>
              {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
            <input type="number" step="0.01" min="0" required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Price (₹) <span className="text-gray-400 font-normal text-xs">optional — for profit estimates</span>
            </label>
            <input type="number" step="0.01" min="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Leave blank if unknown"
              value={form.costPrice ?? ''} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-emerald-700"
              checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
            <span className="text-sm text-gray-700">Available for ordering</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>{modal === 'add' ? 'Add Item' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Remove Item" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Remove <strong>{editItem?.name}</strong>? If this item has existing orders it will be disabled instead.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={saving} onClick={handleDelete}>Remove</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
