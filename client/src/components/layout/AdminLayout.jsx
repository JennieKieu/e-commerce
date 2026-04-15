import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Image,
  Users,
  Mail,
  BarChart3,
  LogOut,
  ChevronRight,
  UserCircle,
  Store,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import clsx from 'clsx';
import { LOGO_HEADER_URL } from '../../constants/brand';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
      { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Products', to: '/admin/products', icon: Package },
      { label: 'Categories', to: '/admin/categories', icon: Tag },
      { label: 'Banners', to: '/admin/banners', icon: Image },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
      { label: 'Customers', to: '/admin/users', icon: Users },
      { label: 'Contacts', to: '/admin/contacts', icon: Mail },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function NavItem({ label, to, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
          isActive
            ? 'bg-ink text-white'
            : 'text-ink-muted hover:text-ink hover:bg-gray-100'
        )
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const currentPage =
    ALL_NAV_ITEMS.find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to)
    )?.label ?? 'Admin';

  const avatarUrl = user?.avatar_url;
  const initials = (user?.name?.[0] || 'A').toUpperCase();

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0 h-full">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <Link to="/admin" className="flex items-center gap-2 py-0.5">
            <img
              src={LOGO_HEADER_URL}
              alt="Logo"
              className="h-7 w-auto max-w-[140px] object-contain object-left"
              width={140}
              height={28}
              loading="eager"
              decoding="async"
            />
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mt-1.5 block">
            Admin Panel
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted/60 px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 pt-3 border-t border-gray-100 space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.name}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full shrink-0 bg-ink text-white flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
              <p className="text-xs text-ink-muted truncate">{user?.email}</p>
            </div>
          </div>

          <Link
            to="/profile"
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-gray-100 rounded-xl transition-colors"
          >
            <UserCircle size={15} />
            My Profile
          </Link>

          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Store size={15} />
            View store
          </Link>

          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-2 text-sm text-ink-muted shrink-0">
          <span>Admin</span>
          <ChevronRight size={13} className="opacity-50" />
          <span className="text-ink font-medium">{currentPage}</span>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
