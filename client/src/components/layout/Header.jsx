import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, Menu, X, User, LogOut, Package, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useQuery } from '@tanstack/react-query';
import { cartApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import clsx from 'clsx';
import { LOGO_HEADER_URL } from '../../constants/brand';

const NAV_LINKS = [
  { label: 'All', to: '/shop' },
  { label: 'Men', to: '/shop?gender=men' },
  { label: 'Women', to: '/shop?gender=women' },
  { label: 'Kids', to: '/shop?gender=kids' },
];

function shopNavLinkActive(to, pathname, currentGender) {
  if (pathname !== '/shop') return false;
  if (to === '/shop') return !currentGender;
  const qs = to.includes('?') ? to.split('?')[1] : '';
  const g = new URLSearchParams(qs).get('gender') || '';
  return currentGender === g;
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const shopGender = searchParams.get('gender') || '';
  const { isAuthenticated, user, logout } = useAuth();
  const guestCount = useCartStore((s) => s.guestItemCount());
  const userMenuRef = useRef(null);

  const { data: serverCart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get().then((r) => r.data.data),
    enabled: isAuthenticated,
  });

  const cartCount = isAuthenticated
    ? (serverCart?.items?.reduce((s, i) => s + i.quantity, 0) || 0)
    : guestCount;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const next = new URLSearchParams(searchParams);
      next.set('search', searchQuery.trim());
      navigate({ pathname: '/shop', search: `?${next.toString()}` });
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="container-app">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center py-1">
            <img
              src={LOGO_HEADER_URL}
              alt="LuxMode Logo"
              className="h-7 w-auto max-h-8 max-w-[min(100vw-10rem,220px)] object-contain object-left sm:h-9"
              width={220}
              height={40}
              loading="eager"
              decoding="async"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = shopNavLinkActive(link.to, pathname, shopGender);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    active ? 'text-ink bg-gray-100' : 'text-ink-muted hover:text-ink hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Search — desktop */}
            <div className="hidden sm:flex items-center">
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-48 px-4 py-2 text-sm border border-gray-200 rounded-pill focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                  <button type="button" onClick={() => setSearchOpen(false)} className="p-2 text-ink-muted hover:text-ink">
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-ink-muted border border-gray-200 rounded-pill hover:border-gray-400 transition-colors"
                >
                  <Search size={15} />
                  <span>Search...</span>
                </button>
              )}
            </div>

            {/* Search icon — mobile */}
            <button
              className="sm:hidden btn-ghost p-2"
              onClick={() => navigate('/shop?focus=search')}
            >
              <Search size={20} />
            </button>

            {/* Cart */}
            <Link to="/cart" className="relative btn-primary px-4 py-2 gap-2">
              <ShoppingBag size={16} />
              <span className="hidden xs:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-ink">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
                      <p className="text-xs text-ink-muted truncate">{user?.email}</p>
                    </div>
                    {user?.role === 'admin' && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                        <User size={15} /> Admin Panel
                      </Link>
                    )}
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                      <Settings size={15} /> My Profile
                    </Link>
                    <Link to="/orders" className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                      <Package size={15} /> My Orders
                    </Link>
                    <button onClick={() => { logout(); setUserMenuOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="hidden sm:inline-flex btn-ghost">
                Sign in
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button className="md:hidden btn-ghost p-2" onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="container-app py-4 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = shopNavLinkActive(link.to, pathname, shopGender);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    'block px-4 py-3 text-sm font-medium rounded-xl transition-colors',
                    active ? 'bg-gray-100 text-ink' : 'text-ink-muted hover:bg-gray-50 hover:text-ink'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            {!isAuthenticated && (
              <Link to="/login" className="block px-4 py-3 text-sm font-medium text-brand" onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
