import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, ArrowLeft, Minus, Plus } from 'lucide-react';
import { productApi, cartApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { PageSpinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function normVal(v) {
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

export default function ProductDetail() {
  const { slug } = useParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addGuestItem = useCartStore((s) => s.addGuestItem);
  const queryClient = useQueryClient();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productApi.getBySlug(slug).then((r) => r.data.data),
  });

  const selectedVariantStock = useMemo(() => {
    if (!product?.variants?.length) return 0;
    const s = normVal(selectedSize);
    const c = normVal(selectedColor);
    const row = product.variants.find((v) => normVal(v.size) === s && normVal(v.color) === c);
    return row ? Number(row.stock) : 0;
  }, [product, selectedSize, selectedColor]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedSize, selectedColor]);

  if (isLoading) return <div className="container-app py-20"><PageSpinner /></div>;
  if (isError || !product) return (
    <div className="container-app py-20 text-center">
      <p className="text-2xl font-bold">Product not found</p>
      <Link to="/shop" className="mt-4 inline-block text-brand hover:underline">← Back to shop</Link>
    </div>
  );

  const images = product.images?.length > 0
    ? product.images
    : [{ url: product.thumbnail_url, alt_text: product.name }];

  const totalStock = product.totalStock ?? 0;

  const handleAddToCart = async () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (product.colors?.length > 0 && !selectedColor) {
      toast.error('Please select a color');
      return;
    }
    if (selectedVariantStock < 1) {
      toast.error('This option is out of stock');
      return;
    }

    setAdding(true);
    try {
      if (isAuthenticated) {
        await cartApi.addItem({
          productId: product.id,
          quantity,
          size: selectedSize,
          color: selectedColor,
        });
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      } else {
        addGuestItem(product, quantity, selectedSize, selectedColor);
      }
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  const discount = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : null;

  const qtyMax = Math.max(0, selectedVariantStock);
  const needsSize = product.sizes?.length > 0;
  const needsColor = product.colors?.length > 0;
  const selectionOk = (!needsSize || selectedSize) && (!needsColor || selectedColor);
  const addDisabled =
    adding ||
    totalStock < 1 ||
    !selectionOk ||
    selectedVariantStock < 1 ||
    quantity > selectedVariantStock;

  return (
    <div className="container-app py-8">
      <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-8 transition-colors">
        <ArrowLeft size={15} /> Back to shop
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden">
            <img
              src={images[selectedImage]?.url || images[0]?.url}
              alt={images[selectedImage]?.alt_text || product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={clsx(
                    'aspect-square rounded-xl overflow-hidden border-2 transition-colors',
                    i === selectedImage ? 'border-ink' : 'border-transparent hover:border-gray-300'
                  )}
                >
                  <img src={img.url} alt={img.alt_text} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="lg:pt-4">
          <p className="text-sm text-ink-muted uppercase tracking-wider mb-2">
            {product.category?.name} · {product.gender}
          </p>
          <h1 className="text-3xl font-bold text-ink mb-4">{product.name}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            {product.sale_price ? (
              <>
                <span className="text-3xl font-bold text-ink">{formatPrice(product.sale_price)}</span>
                <span className="text-xl text-ink-light line-through">{formatPrice(product.price)}</span>
                <span className="badge bg-red-500 text-white">-{discount}%</span>
              </>
            ) : (
              <span className="text-3xl font-bold text-ink">{formatPrice(product.price)}</span>
            )}
          </div>

          {/* Colors */}
          {product.colors?.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold mb-3">
                Color: <span className="font-normal text-ink-muted">{selectedColor || 'Select color'}</span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {product.colors.map((color, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    title={color}
                    className={clsx(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      selectedColor === color ? 'border-ink scale-110' : 'border-transparent hover:border-gray-300'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes?.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold mb-3">
                Size: <span className="font-normal text-ink-muted">{selectedSize || 'Select size'}</span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={clsx(
                      'px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
                      selectedSize === size
                        ? 'border-ink bg-ink text-white'
                        : 'border-gray-200 text-ink hover:border-gray-400'
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-8">
            <p className="text-sm font-semibold mb-3">Quantity</p>
            <div className="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-3 hover:bg-gray-100 transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="px-5 py-3 font-semibold text-sm min-w-[48px] text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(qtyMax, q + 1))}
                disabled={quantity >= qtyMax || qtyMax < 1}
                className="px-4 py-3 hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              {product.sizes?.length || product.colors?.length ? (
                <>
                  {selectedVariantStock} in stock for this option
                  {qtyMax < 1 && ' · Select size/color to see availability'}
                </>
              ) : (
                <>{totalStock} in stock (total)</>
              )}
            </p>
          </div>

          {/* Add to cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={addDisabled}
            className="w-full flex items-center justify-center gap-3 py-4 bg-ink text-white font-bold rounded-2xl hover:bg-gray-800 active:scale-[0.99] transition-all disabled:opacity-50 text-sm uppercase tracking-wider"
          >
            <ShoppingBag size={18} />
            {totalStock === 0 ? 'Out of Stock' : adding ? 'Adding...' : 'Add to Cart'}
          </button>

          {/* Description */}
          {product.description && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="font-semibold mb-3">Description</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
