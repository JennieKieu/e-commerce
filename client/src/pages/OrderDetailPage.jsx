import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../services/api';
import { PageSpinner } from '../components/ui/Spinner';
import { ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatPrice(p) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p);
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getById(id).then((r) => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => orderApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast.success('Order cancelled');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not cancel order');
    },
  });

  const handleCancelOrder = () => {
    if (!order || order.status !== 'pending') return;
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    cancelMutation.mutate();
  };

  if (isLoading) return <div className="container-app py-20"><PageSpinner /></div>;
  if (isError || !order) return <div className="container-app py-20 text-center"><p>Order not found</p></div>;

  return (
    <div className="container-app py-10 max-w-3xl">
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-8">
        <ArrowLeft size={15} /> Back to orders
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">{order.order_number}</h1>
          <p className="text-sm text-ink-muted mt-1">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('badge text-sm px-3 py-1.5', STATUS_COLORS[order.status])}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
          {order.status === 'pending' && (
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={cancelMutation.isPending}
              className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-60"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel order'}
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold mb-5">Items</h2>
        <div className="space-y-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex gap-4">
              {item.product_thumbnail && (
                <img src={item.product_thumbnail} alt={item.product_name} className="w-16 h-20 object-cover rounded-xl" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{item.product_name}</p>
                <p className="text-xs text-ink-muted">{item.size && `Size: ${item.size}`} {item.color && `· ${item.color}`}</p>
                <p className="text-sm mt-1">{formatPrice(item.price)} × {item.quantity}</p>
              </div>
              <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-5 pt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Subtotal</span>
            <span className="font-semibold">
              {formatPrice(
                order.items?.reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0) ?? 0
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Shipping</span>
            {parseFloat(order.shipping_fee || 0) === 0 ? (
              <span className="text-green-600 font-medium">Free</span>
            ) : (
              <span className="font-semibold">{formatPrice(order.shipping_fee)}</span>
            )}
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-50">
            <span>Total</span>
            <span>{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div className="card p-6">
        <h2 className="font-bold mb-4">Shipping Information</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-4"><dt className="text-ink-muted w-24">Name</dt><dd className="font-medium">{order.shipping_name}</dd></div>
          <div className="flex gap-4"><dt className="text-ink-muted w-24">Phone</dt><dd className="font-medium">{order.shipping_phone}</dd></div>
          <div className="flex gap-4"><dt className="text-ink-muted w-24">Address</dt><dd className="font-medium">{order.shipping_address}</dd></div>
          <div className="flex gap-4"><dt className="text-ink-muted w-24">City</dt><dd className="font-medium">{order.shipping_city}</dd></div>
          {order.notes && <div className="flex gap-4"><dt className="text-ink-muted w-24">Notes</dt><dd className="font-medium">{order.notes}</dd></div>}
        </dl>
      </div>
    </div>
  );
}
