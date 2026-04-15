import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { PageSpinner } from '../../components/ui/Spinner';
import { Users, Package, ShoppingBag, DollarSign, Clock, Mail } from 'lucide-react';

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function KPICard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-muted mb-1">{label}</p>
          <p className="text-2xl font-bold text-ink">{value}</p>
          {sub && <p className="text-xs text-ink-muted mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KPICard icon={Users} label="Total Customers" value={stats?.totalUsers || 0} color="blue" />
        <KPICard icon={Package} label="Active Products" value={stats?.totalProducts || 0} color="purple" />
        <KPICard icon={ShoppingBag} label="Total Orders" value={stats?.totalOrders || 0} color="green" />
        <KPICard icon={DollarSign} label="Total Revenue" value={formatPrice(stats?.totalRevenue || 0)} sub="Confirmed orders" color="orange" />
        <KPICard icon={Clock} label="Pending Orders" value={stats?.pendingOrders || 0} color="red" />
        <KPICard icon={Mail} label="New Contacts" value={stats?.newContacts || 0} color="blue" />
      </div>

      <div className="card p-6">
        <h2 className="font-bold mb-4">Monthly Revenue</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{formatPrice(stats?.monthlyRevenue || 0)}</span>
          <span className="text-ink-muted text-sm">this month</span>
        </div>
      </div>
    </div>
  );
}
