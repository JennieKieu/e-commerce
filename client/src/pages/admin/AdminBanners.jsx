import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, bannerApi } from '../../services/api';
import { PageSpinner } from '../../components/ui/Spinner';
import { Plus, Edit, Trash2, X, Upload, Eye, EyeOff, ChevronUp, ChevronDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function BannerModal({ banner, onClose, onSave }) {
  const [form, setForm] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    cta_text: banner?.cta_text || 'SHOP NOW',
    cta_link: banner?.cta_link || '/shop',
    image_url: banner?.image_url || '',
    sort_order: banner?.sort_order ?? 0,
  });
  const [imgFile, setImgFile] = useState(null);
  const [preview, setPreview] = useState(banner?.image_url || '');
  const [saving, setSaving] = useState(false);

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
      let imagePublicId = banner?.image_public_id || '';

      if (imgFile) {
        const fd = new FormData();
        fd.append('image', imgFile);
        fd.append('folder', 'fashion-shop/banners');
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
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold">{banner ? 'Edit Banner' : 'New Banner'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Banner Image</label>
            {preview && <img src={preview} alt="Preview" className="w-full h-32 object-cover rounded-xl mb-2" />}
            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl text-sm font-medium">
                <Upload size={14} /> Upload
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {!imgFile && (
                <input
                  type="url"
                  placeholder="Or paste image URL"
                  value={form.image_url}
                  onChange={(e) => { setForm((f) => ({ ...f, image_url: e.target.value })); setPreview(e.target.value); }}
                  className="flex-1 input-base text-xs"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Title *</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Subtitle</label>
            <input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">CTA Button Text</label>
              <input value={form.cta_text} onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">CTA Link</label>
              <input value={form.cta_link} onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))} className="input-base" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminBanners() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');

  const { data: banners, isLoading } = useQuery({
    queryKey: ['banners-admin'],
    queryFn: () => adminApi.getAllBanners().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createBanner(data),
    onSuccess: () => { queryClient.invalidateQueries(['banners-admin']); toast.success('Banner created'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateBanner(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['banners-admin']); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteBanner(id),
    onSuccess: () => { queryClient.invalidateQueries(['banners-admin']); toast.success('Banner deleted'); },
  });

  const handleToggleActive = (banner) => {
    const next = !banner.is_active;
    updateMutation.mutate(
      { id: banner.id, data: { is_active: next } },
      { onSuccess: () => toast.success(next ? 'Banner enabled' : 'Banner disabled') }
    );
  };

  const handleMove = (index, direction) => {
    if (!banners) return;
    const sorted = [...banners];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const aId = sorted[index].id;
    const bId = sorted[swapIdx].id;
    const aOrder = sorted[index].sort_order;
    const bOrder = sorted[swapIdx].sort_order;

    // If sort_orders are equal, assign incremental values to avoid collision
    const newA = aOrder === bOrder ? bOrder + direction : bOrder;
    const newB = aOrder === bOrder ? aOrder - direction : aOrder;

    Promise.all([
      adminApi.updateBanner(aId, { sort_order: newA }),
      adminApi.updateBanner(bId, { sort_order: newB }),
    ]).then(() => {
      queryClient.invalidateQueries(['banners-admin']);
      toast.success('Order updated');
    });
  };

  const filteredBanners = search
    ? (banners || []).filter(
        (b) =>
          b.title?.toLowerCase().includes(search.toLowerCase()) ||
          b.subtitle?.toLowerCase().includes(search.toLowerCase())
      )
    : banners || [];

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Banners</h1>
          <p className="text-sm text-ink-muted mt-1">
            Active banners appear in the hero carousel on the homepage, ordered top to bottom.
          </p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary gap-2">
          <Plus size={16} /> New Banner
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Search banners..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base pl-9 text-sm"
        />
      </div>

      <div className="space-y-3">
        {filteredBanners.map((banner) => {
          const idx = (banners || []).findIndex((b) => b.id === banner.id);
          return (
          <div
            key={banner.id}
            className={clsx(
              'card overflow-hidden flex flex-col sm:flex-row transition-opacity',
              !banner.is_active && 'opacity-50'
            )}
          >
            {/* Thumbnail */}
            <div className="relative w-full sm:w-48 h-32 flex-shrink-0 bg-gray-100">
              {banner.image_url ? (
                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink-muted text-xs">No image</div>
              )}
              {!banner.is_active && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs font-bold tracking-widest uppercase">
                  Hidden
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex items-center justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold truncate">{banner.title}</p>
                  <span className={clsx(
                    'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                    banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  )}>
                    {banner.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <p className="text-sm text-ink-muted truncate">{banner.subtitle}</p>
                <p className="text-xs text-brand mt-1">{banner.cta_text} → {banner.cta_link}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Move up/down */}
                <div className="flex flex-col">
                  <button
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    title="Move up"
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed text-ink-muted"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === banners.length - 1}
                    title="Move down"
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed text-ink-muted"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Toggle active */}
                <button
                  onClick={() => handleToggleActive(banner)}
                  title={banner.is_active ? 'Hide banner' : 'Show banner'}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    banner.is_active
                      ? 'hover:bg-yellow-50 text-yellow-600 hover:text-yellow-700'
                      : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                  )}
                >
                  {banner.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>

                {/* Edit */}
                <button
                  onClick={() => setModal(banner)}
                  title="Edit"
                  className="p-2 hover:bg-gray-100 rounded-lg text-ink-muted hover:text-ink"
                >
                  <Edit size={15} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => { if (confirm('Delete this banner?')) deleteMutation.mutate(banner.id); }}
                  title="Delete"
                  className="p-2 hover:bg-red-50 rounded-lg text-ink-muted hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
          );
        })}

        {filteredBanners.length === 0 && (
          <div className="text-center py-16 text-ink-muted">
            {search ? 'No banners match your search.' : 'No banners yet. Create one to set up your hero carousel.'}
          </div>
        )}
      </div>

      {modal && (
        <BannerModal
          banner={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            if (modal === 'create') {
              const maxOrder = banners?.length ? Math.max(...banners.map((b) => b.sort_order ?? 0)) + 1 : 0;
              await createMutation.mutateAsync({ ...data, sort_order: maxOrder, is_active: true });
            } else {
              await updateMutation.mutateAsync({ id: modal.id, data });
              toast.success('Banner updated');
            }
          }}
        />
      )}
    </div>
  );
}
