import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const STATUS_COLORS_PIE = {
  pending: '#FCD34D',
  confirmed: '#60A5FA',
  shipped: '#A78BFA',
  delivered: '#34D399',
  cancelled: '#F87171',
};

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics().then((r) => r.data.data),
  });

  if (isLoading) return <PageSpinner />;
  if (!data) return <div className="p-6">No data available.</div>;

  const { users, orders, revenue, topProducts } = data;
  const ordersByStatusData = (orders.byStatus || []).map((s) => ({
    name: s.status,
    value: parseInt(s.count, 10),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Analytics & Reports</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink-muted mb-1">Total Customers</p>
          <p className="text-3xl font-bold">{users.total.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">+{users.newLast30Days} last 30 days</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink-muted mb-1">Total Orders</p>
          <p className="text-3xl font-bold">{orders.total.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">+{orders.last30Days} last 30 days</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink-muted mb-1">Total Revenue</p>
          <p className="text-3xl font-bold">${revenue.total.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">
            +${revenue.last30Days.toLocaleString()} last 30 days
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink-muted mb-1">Avg Order Value</p>
          <p className="text-3xl font-bold">
            ${orders.total > 0 ? (revenue.total / orders.total).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Revenue last 12 months */}
      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4">Revenue (Last 12 Months)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenue.last12Months}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} name="Revenue ($)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status (pie) */}
        {ordersByStatusData.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Orders by Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ordersByStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ordersByStatusData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS_PIE[entry.name] || '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top products */}
        {topProducts && topProducts.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Top Products (by units sold)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_sold" fill="#3B82F6" name="Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
