import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, categoryApi, productApi } from '../../services/api';
import { PageSpinner } from '../../components/ui/Spinner';
import { Plus, Edit, Trash2, X, Upload, ImageIcon, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const GENDERS = ['men', 'women', 'kids', 'unisex'];
const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36'];
const MAX_GALLERY_IMAGES = 20;

function ProductModal({ product, categories, onClose, onSave }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    sale_price: product?.sale_price || '',
    gender: product?.gender || 'men',
    category_id: product?.category_id || categories[0]?.id || '',
    sizes: product?.sizes || [],
    colors: product?.colors || [],
    is_featured: product?.is_featured || false,
    is_active: product?.is_active !== undefined ? product.is_active : true,
    thumbnail_url: product?.thumbnail_url || '',
    thumbnail_public_id: product?.thumbnail_public_id || '',
  });
  const [colorInput, setColorInput] = useState('#000000');
  const [colorNameInput, setColorNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  /** New files to upload after save (append to product gallery) */
  const [galleryFiles, setGalleryFiles] = useState([]);
  /** Stock per size + color pair */
  const [variantRows, setVariantRows] = useState([]);

  const isEdit = !!product?.id;

  const { data: productDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-product', product?.id],
    queryFn: () => adminApi.getProduct(product.id).then((r) => r.data.data),
    enabled: isEdit && !!product?.id,
  });

  const existingImages = productDetail?.images || [];

  useEffect(() => {
    if (productDetail?.variants?.length) {
      setVariantRows(
        productDetail.variants.map((v) => ({
          size: v.size ?? '',
          color: v.color ?? '',
          stock: v.stock ?? 0,
        }))
      );
    }
  }, [productDetail]);

  const generateVariantsFromForm = () => {
    const sz = form.sizes?.length ? form.sizes : [''];
    const cl = form.colors?.length ? form.colors : [''];
    const rows = [];
    for (const s of sz) {
      for (const c of cl) {
        rows.push({ size: s, color: c, stock: 0 });
      }
    }
    if (rows.length === 0) rows.push({ size: '', color: '', stock: 0 });
    setVariantRows(rows);
    toast.success(`Created ${rows.length} stock rows (enter quantities below)`);
  };

  const updateVariantStock = (index, field, value) => {
    setVariantRows((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: field === 'stock' ? Math.max(0, parseInt(value, 10) || 0) : value };
      return next;
    });
  };

  const removeVariantRow = (index) => {
    setVariantRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariantRow = () => {
    setVariantRows((prev) => [...prev, { size: '', color: '', stock: 0 }]);
  };

  const handleGalleryFilesChange = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    e.target.value = '';

    const remainingSlots = MAX_GALLERY_IMAGES - existingImages.length - galleryFiles.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_GALLERY_IMAGES} images (already have ${existingImages.length + galleryFiles.length})`);
      return;
    }

    const toAdd = picked.slice(0, remainingSlots).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (picked.length > remainingSlots) {
      toast(`Only ${toAdd.length} image(s) added (limit ${MAX_GALLERY_IMAGES})`, { icon: 'ℹ️' });
    }

    setGalleryFiles((prev) => [...prev, ...toAdd]);
  };

  const removePendingFile = (index) => {
    setGalleryFiles((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const handleSizeToggle = (size) => {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(size) ? f.sizes.filter((s) => s !== size) : [...f.sizes, size],
    }));
  };

  const addColor = () => {
    const c = (colorNameInput.trim() || colorInput).trim();
    if (c && !form.colors.includes(c)) {
      setForm((f) => ({ ...f, colors: [...f.colors, c] }));
      setColorNameInput('');
      setColorInput('#000000');
    }
  };

  const handleDeleteExistingImage = async (imageId) => {
    if (!confirm('Remove this image from the product?')) return;
    try {
      await adminApi.deleteProductImage(imageId);
      queryClient.invalidateQueries({ queryKey: ['admin-product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Image removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const rawFiles = galleryFiles.map((x) => x.file);

      const data = {
        ...form,
        price: parseFloat(form.price),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        thumbnail_url: form.thumbnail_url?.trim() || null,
        thumbnail_public_id: form.thumbnail_public_id?.trim() || null,
      };

      let rowsToSave = variantRows;
      if (rowsToSave.length === 0) {
        const sz = form.sizes?.length ? form.sizes : [''];
        const cl = form.colors?.length ? form.colors : [''];
        rowsToSave = [];
        for (const s of sz) {
          for (const c of cl) {
            rowsToSave.push({ size: s, color: c, stock: 0 });
          }
        }
        if (rowsToSave.length === 0) rowsToSave = [{ size: '', color: '', stock: 0 }];
      }

      const variantsPayload = rowsToSave.map((r) => ({
        size: r.size,
        color: r.color,
        stock: Math.max(0, parseInt(r.stock, 10) || 0),
      }));

      await onSave(data, { galleryFiles: rawFiles, variants: variantsPayload });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-lg">{isEdit ? 'Edit Product' : 'New Product'}</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ── 1. Basic Info ───────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted border-b border-gray-100 pb-2">
              Basic information
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1.5">Product name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. Classic White Tee"
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Short product description…"
                className="input-base resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    required
                    placeholder="0.00"
                    className="input-base pl-7"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sale price <span className="text-ink-muted font-normal">(optional)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.sale_price}
                    onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))}
                    placeholder="0.00"
                    className="input-base pl-7"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Gender *</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="input-base"
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Category *</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="input-base"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                  className="rounded accent-brand"
                />
                <span className="text-sm font-medium">Featured product</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded accent-brand"
                />
                <span className="text-sm font-medium">Active (visible in shop)</span>
              </label>
            </div>
          </section>

          {/* ── 2. Sizes & Colors ───────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted border-b border-gray-100 pb-2">
              Sizes &amp; colors
            </h3>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sizes
                {form.sizes.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-ink-muted">({form.sizes.length} selected)</span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSizeToggle(s)}
                    className={clsx(
                      'px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium',
                      form.sizes.includes(s)
                        ? 'bg-ink text-white border-ink'
                        : 'border-gray-200 hover:border-gray-400 text-ink'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Colors</label>
              {form.colors.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {form.colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 rounded-lg text-xs font-medium">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: c }}
                      />
                      {c}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, colors: f.colors.filter((_, j) => j !== i) }))}
                        className="ml-0.5 text-ink-muted hover:text-red-500 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={colorInput}
                  onChange={(e) => {
                    setColorInput(e.target.value);
                    setColorNameInput(e.target.value);
                  }}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-gray-200 p-0.5 shrink-0"
                  title="Pick a color"
                />
                <input
                  value={colorNameInput}
                  onChange={(e) => setColorNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                  placeholder="#hex or color name (e.g. Navy)"
                  className="input-base flex-1 text-sm"
                />
                <button type="button" onClick={addColor} className="btn-secondary px-4 shrink-0">
                  Add
                </button>
              </div>
              <p className="text-xs text-ink-muted mt-1.5">
                Pick with the color swatch or type a hex / name, then click Add.
              </p>
            </div>
          </section>

          {/* ── 3. Variant stock ────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted border-b border-gray-100 pb-2 mb-4">
              Stock per variant (size × color)
            </h3>
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/80">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-xs text-ink-muted">
                  Select sizes &amp; colors above, then click <strong>Generate rows</strong>, or add rows manually.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={generateVariantsFromForm} className="btn-secondary text-xs py-2 px-3">
                    Generate rows from size/color
                  </button>
                  <button type="button" onClick={addVariantRow} className="btn-secondary text-xs py-2 px-3">
                    + Add row
                  </button>
                </div>
              </div>
              {variantRows.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  No stock rows yet. On first save, the server creates variants with 0 stock from Size/Color if left empty — use &quot;Generate rows&quot; and enter quantities.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-3 py-2 font-medium">Size</th>
                        <th className="text-left px-3 py-2 font-medium">Color</th>
                        <th className="text-left px-3 py-2 font-medium w-28">Stock</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {variantRows.map((row, idx) => (
                        <tr key={`${row.size}-${row.color}-${idx}`} className="border-b border-gray-50 last:border-0">
                          <td className="px-3 py-1.5">
                            <input
                              className="input-base py-1.5 text-xs"
                              value={row.size}
                              onChange={(e) => updateVariantStock(idx, 'size', e.target.value)}
                              placeholder="—"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1.5">
                              {row.color && (
                                <div
                                  className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                                  style={{ backgroundColor: row.color }}
                                />
                              )}
                              <input
                                className="input-base py-1.5 text-xs flex-1"
                                value={row.color}
                                onChange={(e) => updateVariantStock(idx, 'color', e.target.value)}
                                placeholder="—"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min="0"
                              className="input-base py-1.5 text-xs"
                              value={row.stock}
                              onChange={(e) => updateVariantStock(idx, 'stock', e.target.value)}
                            />
                          </td>
                          <td className="px-1">
                            <button
                              type="button"
                              onClick={() => removeVariantRow(idx)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* ── 4. Images ───────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted border-b border-gray-100 pb-2">
              Images
            </h3>

            {/* Thumbnail URL */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Thumbnail URL <span className="text-ink-muted font-normal">(optional)</span>
              </label>
              <input
                type="url"
                placeholder="https://… — leave empty if using file uploads below"
                value={form.thumbnail_url || ''}
                onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                className="input-base text-sm"
              />
              {form.thumbnail_url && (
                <div className="mt-2 flex items-start gap-3">
                  <img
                    src={form.thumbnail_url}
                    alt="Thumbnail preview"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-16 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <p className="text-xs text-ink-muted mt-1">Thumbnail preview (if URL is valid)</p>
                </div>
              )}
              <p className="text-xs text-ink-muted mt-1.5">
                If set, this URL is used as the thumbnail. Uploaded gallery images are still added alongside it.
              </p>
            </div>

            {/* Gallery */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <ImageIcon size={16} />
                Gallery images <span className="text-ink-muted font-normal">(max {MAX_GALLERY_IMAGES})</span>
              </label>

              {isEdit && detailLoading && (
                <p className="text-sm text-ink-muted animate-pulse py-2">Loading existing gallery…</p>
              )}

              {isEdit && existingImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50"
                    >
                      <img src={img.url} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImage(img.id)}
                        className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {galleryFiles.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                  {galleryFiles.map((item, idx) => (
                    <div
                      key={`${item.file.name}-${idx}`}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-dashed border-brand/40 bg-brand/5"
                    >
                      <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                        New
                      </span>
                      <button
                        type="button"
                        onClick={() => removePendingFile(idx)}
                        className="absolute top-1 right-1 p-1.5 bg-ink text-white rounded-lg opacity-90 hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-gray-200">
                  <Upload size={15} />
                  Choose files
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleGalleryFilesChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-ink-muted">
                  {existingImages.length + galleryFiles.length} / {MAX_GALLERY_IMAGES} images selected
                </p>
              </div>
            </div>
          </section>

          {/* ── Actions ─────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving || (isEdit && detailLoading)} className="btn-primary">
              {saving ? 'Saving…' : isEdit ? 'Update product' : 'Create product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterFeatured, setFilterFeatured] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin-products', search, filterCategory, filterGender, filterFeatured],
    queryFn: () =>
      productApi
        .getAll({
          limit: 100,
          search: search || undefined,
          category: filterCategory || undefined,
          gender: filterGender || undefined,
          featured: filterFeatured || undefined,
        })
        .then((r) => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      toast.success('Product deactivated');
    },
  });

  const handleSaveProduct = async (data, { galleryFiles = [], variants = [] }) => {
    const payload = { ...data, variants };
    if (modal === 'create') {
      const res = await adminApi.createProduct(payload);
      const created = res.data.data;
      if (galleryFiles.length > 0) {
        const fd = new FormData();
        galleryFiles.forEach((f) => fd.append('images', f));
        await adminApi.uploadProductImages(created.id, fd);
      }
      queryClient.invalidateQueries(['admin-products']);
      toast.success('Product created');
      return;
    }

    await adminApi.updateProduct(modal.id, payload);
    if (galleryFiles.length > 0) {
      const fd = new FormData();
      galleryFiles.forEach((f) => fd.append('images', f));
      await adminApi.uploadProductImages(modal.id, fd);
    }
    queryClient.invalidateQueries(['admin-products']);
    queryClient.invalidateQueries(['admin-product', modal.id]);
    toast.success('Product updated');
  };

  const products = productsData || [];

  const hasFilters = search || filterCategory || filterGender || filterFeatured;

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-ink-muted mt-0.5">{products.length} result{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={() => setModal('create')} className="btn-primary gap-2">
          <Plus size={16} /> New Product
        </button>
      </div>

      {/* Filter card */}
      <div className="card p-4 mb-6 space-y-3">
        {/* Row 1 — search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 text-sm w-full"
          />
        </div>

        {/* Row 2 — dropdowns + clear */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={clsx('input-base text-sm py-2 flex-1 min-w-32', filterCategory && 'ring-2 ring-brand/30 border-brand')}
          >
            <option value="">All categories</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className={clsx('input-base text-sm py-2 flex-1 min-w-28', filterGender && 'ring-2 ring-brand/30 border-brand')}
          >
            <option value="">All audiences</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
            ))}
          </select>

          <select
            value={filterFeatured}
            onChange={(e) => setFilterFeatured(e.target.value)}
            className={clsx('input-base text-sm py-2 flex-1 min-w-32', filterFeatured && 'ring-2 ring-brand/30 border-brand')}
          >
            <option value="">All statuses</option>
            <option value="true">Featured only</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterCategory(''); setFilterGender(''); setFilterFeatured(''); }}
              className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors"
            >
              <X size={13} /> Clear all
            </button>
          )}
        </div>

        {/* Active filter badges */}
        {hasFilters && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {search && (
              <span className="inline-flex items-center gap-1 bg-ink/5 text-ink text-xs px-2.5 py-1 rounded-full">
                Name: <strong>{search}</strong>
                <button type="button" onClick={() => setSearch('')} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
            {filterCategory && (
              <span className="inline-flex items-center gap-1 bg-ink/5 text-ink text-xs px-2.5 py-1 rounded-full">
                Category: <strong>{(categories || []).find((c) => c.slug === filterCategory)?.name || filterCategory}</strong>
                <button type="button" onClick={() => setFilterCategory('')} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
            {filterGender && (
              <span className="inline-flex items-center gap-1 bg-ink/5 text-ink text-xs px-2.5 py-1 rounded-full">
                Audience: <strong>{filterGender}</strong>
                <button type="button" onClick={() => setFilterGender('')} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
            {filterFeatured && (
              <span className="inline-flex items-center gap-1 bg-brand/10 text-brand text-xs px-2.5 py-1 rounded-full">
                Featured only
                <button type="button" onClick={() => setFilterFeatured('')} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-6 py-4">Product</th>
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-4 py-4">Category</th>
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-4 py-4">Price</th>
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-4 py-4">Stock</th>
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-4 py-4">Status</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={product.thumbnail_url} alt={product.name} className="w-10 h-12 object-cover rounded-lg" />
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                      <p className="text-xs text-ink-muted">{product.gender}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-ink-muted">{product.category?.name}</td>
                <td className="px-4 py-4 text-sm">
                  <span className="font-semibold">${product.sale_price || product.price}</span>
                  {product.sale_price && <span className="text-xs text-ink-muted ml-1 line-through">${product.price}</span>}
                </td>
                <td className="px-4 py-4 text-sm">
                  <span className={clsx('font-medium', (product.totalStock ?? 0) < 5 ? 'text-red-500' : 'text-green-600')}>{product.totalStock ?? 0}</span>
                </td>
                <td className="px-4 py-4">
                  <span className={clsx('badge', product.is_featured ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                    {product.is_featured ? 'Featured' : 'Standard'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setModal(product)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-ink-muted hover:text-ink"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Deactivate this product?')) deleteMutation.mutate(product.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-ink-muted hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="text-center py-12 text-ink-muted text-sm">
            {hasFilters ? 'No products match your filters.' : 'No products yet.'}
          </div>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal === 'create' ? null : modal}
          categories={categories || []}
          onClose={() => setModal(null)}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
}
