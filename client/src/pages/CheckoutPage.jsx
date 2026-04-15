import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi, orderApi } from '../services/api';
import { FREE_SHIPPING_MIN_USD } from '../constants/shipping';
import { PageSpinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    shipping_name: '',
    shipping_phone: '',
    shipping_address: '',
    shipping_city: '',
    notes: '',
  });

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get().then((r) => r.data.data),
  });

  const checkoutMutation = useMutation({
    mutationFn: (data) => orderApi.checkout(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['cart']);
      const orderId = res.data.data.id;
      toast.success('Order placed successfully!');
      navigate(`/orders/${orderId}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Checkout failed');
    },
  });

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.shipping_name.trim() || !form.shipping_phone.trim() || !form.shipping_address.trim() || !form.shipping_city.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    checkoutMutation.mutate(form);
  };

  if (isLoading) return <div className="container-app py-20"><PageSpinner /></div>;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal ?? 0;
  const shipping = cart?.shipping ?? 0;
  const total = cart?.total ?? 0;
  const qualifiesFree = cart?.qualifiesFreeShipping ?? shipping === 0;
  const freeShipMin = cart?.freeShippingMinimum ?? FREE_SHIPPING_MIN_USD;

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container-app py-10">
      <h1 className="section-title mb-8">Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shipping form */}
          <div>
            <h2 className="font-bold text-xl mb-6">Shipping Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name *</label>
                <input name="shipping_name" value={form.shipping_name} onChange={handleChange} required className="input-base" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone Number *</label>
                <input name="shipping_phone" value={form.shipping_phone} onChange={handleChange} required className="input-base" placeholder="+84 900 000 000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Address *</label>
                <input name="shipping_address" value={form.shipping_address} onChange={handleChange} required className="input-base" placeholder="123 Street, District" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">City *</label>
                <input name="shipping_city" value={form.shipping_city} onChange={handleChange} required className="input-base" placeholder="Ho Chi Minh City" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="input-base resize-none" placeholder="Special delivery instructions..." />
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div>
            <h2 className="font-bold text-xl mb-6">Order Summary</h2>
            <div className="card p-6 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img
                    src={item.product?.thumbnail_url}
                    alt={item.product?.name}
                    className="w-14 h-16 object-cover rounded-xl"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold line-clamp-1">{item.product?.name}</p>
                    <p className="text-xs text-ink-muted">{item.size && `Size: ${item.size}`} {item.color && `· ${item.color}`}</p>
                    <p className="text-sm font-bold mt-1">{formatPrice((item.product?.sale_price || item.product?.price) * item.quantity)} ×{item.quantity}</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-ink-muted">Shipping</span>
                  {qualifiesFree ? (
                    <span className="text-green-600 font-medium">Free</span>
                  ) : (
                    <div className="text-right">
                      <span className="font-semibold">{formatPrice(shipping)}</span>
                      <p className="text-[11px] text-ink-muted mt-0.5">Free on orders {formatPrice(freeShipMin)}+</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={checkoutMutation.isPending}
                className="w-full btn-primary justify-center py-4 text-base"
              >
                {checkoutMutation.isPending ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
