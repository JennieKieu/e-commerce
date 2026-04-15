import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { cartApi } from '../../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

export default function ProductCard({ product }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addGuestItem = useCartStore((s) => s.addGuestItem);
  const navigate = useNavigate();

  const totalStock = product.totalStock ?? 0;
  const needsOptions = (product.sizes?.length > 0) || (product.colors?.length > 0);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (needsOptions) {
      navigate(`/products/${product.slug}`);
      return;
    }

    if (totalStock < 1) {
      toast.error('Out of stock');
      return;
    }

    if (isAuthenticated) {
      try {
        await cartApi.addItem({ productId: product.id, quantity: 1 });
        toast.success('Added to cart');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to add to cart');
      }
    } else {
      addGuestItem(product, 1);
      toast.success('Added to cart');
    }
  };

  const discount = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : null;

  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <div className="card overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
          <img
            src={product.thumbnail_url || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=60'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discount && (
              <span className="badge bg-red-500 text-white">-{discount}%</span>
            )}
            {totalStock > 0 && totalStock < 5 && (
              <span className="badge bg-orange-500 text-white">Low Stock</span>
            )}
            {totalStock === 0 && (
              <span className="badge bg-gray-500 text-white">Sold Out</span>
            )}
          </div>
          {/* Quick add */}
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={totalStock === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <ShoppingBag size={15} />
              {totalStock === 0
                ? 'Out of Stock'
                : needsOptions
                  ? 'Choose options'
                  : 'Quick Add'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-ink-muted mb-1 uppercase tracking-wider">{product.category?.name}</p>
          <h3 className="text-sm font-semibold text-ink line-clamp-1 group-hover:text-brand transition-colors">{product.name}</h3>
          <div className="flex items-center gap-2 mt-2">
            {product.sale_price ? (
              <>
                <span className="font-bold text-ink">{formatPrice(product.sale_price)}</span>
                <span className="text-sm text-ink-light line-through">{formatPrice(product.price)}</span>
              </>
            ) : (
              <span className="font-bold text-ink">{formatPrice(product.price)}</span>
            )}
          </div>
          {/* Colors */}
          {product.colors?.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {product.colors.slice(0, 4).map((color, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-full border border-gray-200"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              {product.colors.length > 4 && (
                <span className="text-xs text-ink-muted">+{product.colors.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
