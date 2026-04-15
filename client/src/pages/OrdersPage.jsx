import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { orderApi } from '../services/api';
import { PageSpinner } from '../components/ui/Spinner';
import clsx from 'clsx';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => orderApi.getMyOrders().then((r) => r.data),
  });

  const orders = data?.data || [];

  if (isLoading) return <div className="container-app py-20"><PageSpinner /></div>;

  return (
    <div className="container-app py-10">
      <h1 className="section-title mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-xl font-semibold mb-2">No orders yet</p>
          <Link to="/shop" className="mt-4 btn-primary inline-flex">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="card p-5 flex items-center justify-between gap-4 hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Package size={18} className="text-ink-muted" />
                </div>
                <div>
                  <p className="font-semibold text-ink">{order.order_number}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={clsx('badge', STATUS_COLORS[order.status])}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <span className="font-bold">{formatPrice(order.total_amount)}</span>
                <ChevronRight size={16} className="text-ink-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
