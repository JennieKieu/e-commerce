import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { PageSpinner } from '../../components/ui/Spinner';
import { Link } from 'react-router-dom';
import { Search, Eye, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
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

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter, search],
    queryFn: () =>
      adminApi
        .getOrders({ status: statusFilter || undefined, search: search || undefined, limit: 100 })
        .then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateOrderStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries(['admin-orders']); toast.success('Order updated'); },
  });

  const orders = data?.data || [];
  const totalCount = data?.pagination?.total ?? orders.length;
  const hasFilters = Boolean(search.trim() || statusFilter);

  const statusLabel = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {totalCount} result{totalCount !== 1 ? 's' : ''}
            {hasFilters && ' (filtered)'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
          <Filter size={14} className="opacity-70" />
          Filters
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Search by order number, customer name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 text-sm w-full"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="order-status-filter">
            Order status
          </label>
          <select
            id="order-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={clsx(
              'input-base text-sm py-2 flex-1 min-w-[11rem] max-w-xs',
              statusFilter && 'ring-2 ring-brand/30 border-brand'
            )}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors shrink-0"
            >
              <X size={13} /> Clear all
            </button>
          )}
        </div>

        {hasFilters && (
          <div className="flex flex-wrap gap-1.5 pt-0.5 border-t border-gray-100">
            {search.trim() && (
              <span className="inline-flex items-center gap-1 bg-ink/5 text-ink text-xs px-2.5 py-1 rounded-full">
                Search: <strong className="font-semibold max-w-[12rem] truncate">{search.trim()}</strong>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="ml-0.5 hover:text-red-500 p-0.5 rounded"
                  aria-label="Remove search filter"
                >
                  <X size={10} />
                </button>
              </span>
            )}
            {statusFilter && (
              <span
                className={clsx(
                  'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full',
                  STATUS_COLORS[statusFilter] ?? 'bg-gray-100 text-gray-700'
                )}
              >
                {statusLabel(statusFilter)}
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  className="ml-0.5 hover:opacity-70 p-0.5 rounded"
                  aria-label="Remove status filter"
                >
                  <X size={10} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-6 py-4">Order</th>
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-4 py-4">Customer</th>
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-4 py-4">Total</th>
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-4 py-4">Status</th>
              <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-4 py-4">Date</th>
              <th className="text-right text-xs font-semibold text-ink-muted uppercase tracking-wider px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-semibold text-sm">{order.order_number}</p>
                  <p className="text-xs text-ink-muted">{order.items?.length} item(s)</p>
                </td>
                <td className="px-4 py-4 text-sm">
                  <p className="font-medium">{order.user?.name}</p>
                  <p className="text-xs text-ink-muted">{order.user?.email}</p>
                </td>
                <td className="px-4 py-4 font-bold text-sm">{formatPrice(order.total_amount)}</td>
                <td className="px-4 py-4">
                  <span className={clsx('badge', STATUS_COLORS[order.status])}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-ink-muted">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                    >
                      <Eye size={14} />
                      View details
                    </Link>
                    <select
                      value={order.status}
                      onChange={(e) => updateMutation.mutate({ id: order.id, status: e.target.value })}
                      className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
                      title="Change status"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="text-center py-12 text-ink-muted text-sm">
            {hasFilters ? 'No orders match your filters.' : 'No orders yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
