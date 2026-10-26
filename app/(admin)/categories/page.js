'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { categories } from '@/lib/api'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'

const EMPTY_FORM = { name: '', sortOrder: 0, isActive: true }

export default function CategoriesPage() {
  const toast = useToast()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [editCat, setEditCat] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await categories.list()
      setCats(res.data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm(EMPTY_FORM); setFormError(''); setModal('add') }
  function openEdit(cat) {
    setEditCat(cat)
    setForm({ name: cat.name, sortOrder: cat.sortOrder ?? 0, isActive: cat.isActive })
    setFormError('')
    setModal('edit')
  }
  function openDelete(cat) { setEditCat(cat); setModal('delete') }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')
    if (!form.name) { setFormError('Category name is required'); return }
    setSaving(true)
    try {
      if (modal === 'add') await categories.create({ name: form.name, sortOrder: Number(form.sortOrder), isActive: form.isActive })
      else await categories.update(editCat._id, { name: form.name, sortOrder: Number(form.sortOrder), isActive: form.isActive })
      toast(modal === 'add' ? 'Category added' : 'Category updated', 'success')
      setModal(null)
      load()
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      const res = await categories.delete(editCat._id)
      toast(res.message || 'Category deleted', 'success')
      setModal(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Categories</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage menu categories. Items inherit their category.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openAdd}>Add Category</Button>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={load} /> : cats.length === 0 ? (
        <EmptyState title="No categories" description="Add your first category." action={<Button onClick={openAdd} icon={<Plus size={16} />}>Add Category</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span className="flex-1">Name</span>
            <span className="w-20 text-center">Order</span>
            <span className="w-24 text-center">Status</span>
            <span className="w-20"></span>
          </div>
          <div className="divide-y divide-gray-50">
            {cats.map((cat) => (
              <div key={cat._id} className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 flex items-center gap-2">
                  <GripVertical size={14} className="text-gray-300" />
                  <p className="text-sm font-medium text-gray-800">{cat.name}</p>
                  <p className="text-xs text-gray-400">/{cat.slug}</p>
                </div>
                <div className="w-20 text-center text-sm text-gray-500">{cat.sortOrder}</div>
                <div className="w-24 flex justify-center">
                  <Badge variant={cat.isActive ? 'success' : 'error'}>{cat.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="w-20 flex items-center justify-end gap-1">
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => openDelete(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Category' : 'Edit Category'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <input type="number" min="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-emerald-700"
              checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>{modal === 'add' ? 'Add' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Delete Category" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete <strong>{editCat?.name}</strong>? If it has menu items, it will be archived instead.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={saving} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
