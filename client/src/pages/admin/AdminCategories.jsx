import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, categoryApi } from '../../services/api';
import { PageSpinner } from '../../components/ui/Spinner';
import { Plus, Edit, Trash2, X, Upload, Search } from 'lucide-react';
import toast from 'react-hot-toast';

function CategoryModal({ category, onClose, onSave }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image_url: category?.image_url || '',
    sort_order: category?.sort_order || 0,
  });
  const [saving, setSaving] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [preview, setPreview] = useState(category?.image_url || '');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrl = form.image_url;
      let imagePublicId = category?.image_public_id || '';

      if (imgFile) {
        const fd = new FormData();
        fd.append('image', imgFile);
        fd.append('folder', 'fashion-shop/categories');
        const res = await adminApi.uploadImage(fd);
        imageUrl = res.data.data.url;
        imagePublicId = res.data.data.public_id;
      }

      await onSave({ ...form, image_url: imageUrl, image_public_id: imagePublicId });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold">{category ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Image</label>
            <div className="flex items-center gap-3">
              {preview && <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded-xl" />}
              <label className="flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl text-sm font-medium">
                <Upload size={14} /> Upload
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {!imgFile && (
                <input
                  type="url"
                  placeholder="Or paste URL"
                  value={form.image_url}
                  onChange={(e) => { setForm((f) => ({ ...f, image_url: e.target.value })); setPreview(e.target.value); }}
                  className="flex-1 input-base text-xs"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="input-base resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) }))} className="input-base" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createCategory(data),
    onSuccess: () => { queryClient.invalidateQueries(['categories']); toast.success('Category created'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateCategory(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['categories']); toast.success('Category updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteCategory(id),
    onSuccess: () => { queryClient.invalidateQueries(['categories']); toast.success('Category deactivated'); },
  });

  const filteredCategories = search
    ? (categories || []).filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : categories || [];

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button onClick={() => setModal('create')} className="btn-primary gap-2">
          <Plus size={16} /> New Category
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base pl-9 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="card p-4 flex items-center gap-4">
            {cat.image_url && <img src={cat.image_url} alt={cat.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{cat.name}</p>
              <p className="text-xs text-ink-muted line-clamp-1">{cat.description}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setModal(cat)} className="p-2 hover:bg-gray-100 rounded-lg text-ink-muted hover:text-ink">
                <Edit size={14} />
              </button>
              <button onClick={() => { if (confirm('Deactivate?')) deleteMutation.mutate(cat.id); }} className="p-2 hover:bg-red-50 rounded-lg text-ink-muted hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="col-span-3 text-center py-10 text-ink-muted text-sm">
            {search ? 'No categories match your search.' : 'No categories yet.'}
          </div>
        )}
      </div>

      {modal && (
        <CategoryModal
          category={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            if (modal === 'create') await createMutation.mutateAsync(data);
            else await updateMutation.mutateAsync({ id: modal.id, data });
          }}
        />
      )}
    </div>
  );
}
