import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { cartApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { PageSpinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { isHexColor, hexIsLight } from '../utils/colorDisplay';
import { getShippingQuote, FREE_SHIPPING_MIN_USD } from '../constants/shipping';

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

/** Show a color swatch for hex values; plain text for named colors (e.g. Navy). */
function CartColorLine({ value }) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (isHexColor(trimmed)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-ink-muted">Color</span>
        <span
          className={clsx(
            'inline-block w-4 h-4 rounded-full border flex-shrink-0',
            hexIsLight(trimmed) ? 'border-gray-300' : 'border-gray-600'
          )}
          style={{ backgroundColor: trimmed }}
          title={trimmed}
          aria-label={`Color ${trimmed}`}
        />
      </span>
    );
  }
  return (
    <span>
      <span className="text-ink-muted">Color: </span>
      {trimmed}
    </span>
  );
}

function AuthCartItem({ item, queryClient }) {
  const updateMutation = useMutation({
    mutationFn: ({ quantity }) => cartApi.updateItem(item.id, { quantity }),
    onSuccess: () => queryClient.invalidateQueries(['cart']),
    onError: () => toast.error('Failed to update item'),
  });

  const removeMutation = useMutation({
    mutationFn: () => cartApi.removeItem(item.id),
    onSuccess: () => queryClient.invalidateQueries(['cart']),
    onError: () => toast.error('Failed to remove item'),
  });

  const price = parseFloat(item.product?.sale_price || item.product?.price || 0);

  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
      <Link to={`/products/${item.product?.slug}`} className="flex-shrink-0">
        <img
          src={item.product?.thumbnail_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200'}
          alt={item.product?.name}
          className="w-20 h-24 object-cover rounded-xl"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/products/${item.product?.slug}`} className="font-semibold text-ink hover:text-brand line-clamp-1">
          {item.product?.name}
        </Link>
        <div className="text-xs text-ink-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.size && <span>Size: {item.size}</span>}
          {item.color && <CartColorLine value={item.color} />}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
            <button onClick={() => updateMutation.mutate({ quantity: item.quantity - 1 })} className="px-3 py-2 hover:bg-gray-100">
              <Minus size={12} />
            </button>
            <span className="px-3 text-sm font-semibold">{item.quantity}</span>
            <button onClick={() => updateMutation.mutate({ quantity: item.quantity + 1 })} className="px-3 py-2 hover:bg-gray-100">
              <Plus size={12} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold">{formatPrice(price * item.quantity)}</span>
            <button onClick={() => removeMutation.mutate()} className="text-red-400 hover:text-red-600 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuestCartItem({ item }) {
  const { updateGuestItem, removeGuestItem } = useCartStore();
  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
      <Link to={`/products/${item.slug}`} className="flex-shrink-0">
        <img
          src={item.thumbnail || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200'}
          alt={item.name}
          className="w-20 h-24 object-cover rounded-xl"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/products/${item.slug}`} className="font-semibold text-ink hover:text-brand line-clamp-1">
          {item.name}
        </Link>
        <div className="text-xs text-ink-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.size && <span>Size: {item.size}</span>}
          {item.color && <CartColorLine value={item.color} />}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
            <button onClick={() => updateGuestItem(item.productId, item.size, item.color, item.quantity - 1)} className="px-3 py-2 hover:bg-gray-100">
              <Minus size={12} />
            </button>
            <span className="px-3 text-sm font-semibold">{item.quantity}</span>
            <button onClick={() => updateGuestItem(item.productId, item.size, item.color, item.quantity + 1)} className="px-3 py-2 hover:bg-gray-100">
              <Plus size={12} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
            <button onClick={() => removeGuestItem(item.productId, item.size, item.color)} className="text-red-400 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const guestItems = useCartStore((s) => s.items);
  const guestTotal = useCartStore((s) => s.guestTotal());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: serverCart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get().then((r) => r.data.data),
    enabled: isAuthenticated,
    staleTime: 0,
  });

  if (isAuthenticated && isLoading) return <div className="container-app py-20"><PageSpinner /></div>;

  const items = isAuthenticated ? (serverCart?.items || []) : guestItems;
  const guestQuote = !isAuthenticated ? getShippingQuote(guestTotal) : null;
  const subtotal = isAuthenticated
    ? (serverCart?.subtotal ?? serverCart?.total ?? 0)
    : guestQuote.subtotal;
  const shippingFee = isAuthenticated ? (serverCart?.shipping ?? 0) : guestQuote.shipping;
  const qualifiesFree = isAuthenticated
    ? (serverCart?.qualifiesFreeShipping ?? shippingFee === 0)
    : guestQuote.qualifiesFree;
  const orderTotal = isAuthenticated ? (serverCart?.total ?? 0) : guestQuote.grandTotal;
  const freeShipMin = isAuthenticated
    ? (serverCart?.freeShippingMinimum ?? FREE_SHIPPING_MIN_USD)
    : FREE_SHIPPING_MIN_USD;
  const isEmpty = items.length === 0;

  return (
    <div className="container-app py-10">
      <h1 className="section-title mb-8">Shopping Cart</h1>

      {isEmpty ? (
        <div className="text-center py-20">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-xl font-semibold mb-2">Your cart is empty</p>
          <p className="text-ink-muted mb-6">Add items to get started</p>
          <Link to="/shop" className="btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {isAuthenticated
              ? serverCart?.items?.map((item) => <AuthCartItem key={item.id} item={item} queryClient={queryClient} />)
              : guestItems.map((item, i) => <GuestCartItem key={i} item={item} />)
            }
          </div>

          {/* Summary */}
          <div>
            <div className="card p-6 sticky top-24">
              <h2 className="font-bold text-lg mb-6">Order Summary</h2>
              {!qualifiesFree && subtotal > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
                  Add <strong>{formatPrice(Math.max(0, freeShipMin - subtotal))}</strong> more for{' '}
                  <strong>free shipping</strong> ({formatPrice(freeShipMin)}+ orders).
                </p>
              )}
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-ink-muted">Shipping</span>
                  {qualifiesFree ? (
                    <span className="text-green-600 font-medium">Free</span>
                  ) : (
                    <div className="text-right">
                      <span className="font-semibold">{formatPrice(shippingFee)}</span>
                      <p className="text-[11px] text-ink-muted mt-0.5 max-w-[14rem]">
                        Free shipping on orders {formatPrice(freeShipMin)}+
                      </p>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-bold text-base">Total</span>
                  <span className="font-bold text-base">{formatPrice(orderTotal)}</span>
                </div>
              </div>

              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full btn-primary justify-center gap-2"
                >
                  Checkout <ArrowRight size={16} />
                </button>
              ) : (
                <div className="space-y-2">
                  <Link to="/login?redirect=/checkout" className="w-full btn-primary justify-center block text-center">
                    Sign in to Checkout
                  </Link>
                  <p className="text-xs text-ink-muted text-center">Your cart will be saved</p>
                </div>
              )}
              <Link to="/shop" className="block text-center text-sm text-brand hover:underline mt-4">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
