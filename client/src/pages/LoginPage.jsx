import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { authApi, cartApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const setAuth = useAuthStore((s) => s.setAuth);
  const guestItems = useCartStore((s) => s.items);
  const clearGuestCart = useCartStore((s) => s.clearGuestCart);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: (data) => authApi.login(data),
    onSuccess: async (res) => {
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);

      // Merge guest cart
      if (guestItems.length > 0) {
        try {
          await cartApi.merge(guestItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            size: i.size,
            color: i.color,
          })));
          clearGuestCart();
        } catch (_) {}
      }

      toast.success(`Welcome back, ${user.name}!`);
      // Redirect admins to the admin panel by default
      const destination = user.role === 'admin' ? '/admin' : redirect;
      navigate(destination, { replace: true });
    },
    onError: (err) => {
      const errData = err.response?.data;
      if (errData?.errors?.[0]?.userId) {
        // Not verified
        toast.error('Please verify your email first');
        navigate('/verify-otp', { state: { userId: errData.errors[0].userId } });
        return;
      }
      toast.error(errData?.message || 'Login failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    loginMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left visual */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80"
          alt="Fashion"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex items-end p-12">
          <div className="text-white">
            <h2 className="text-4xl font-bold mb-2">LuxeMode</h2>
            <p className="text-white/70">Premium fashion for the modern lifestyle</p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="text-2xl font-bold tracking-widest uppercase text-ink block mb-8 lg:hidden">
            LuxeMode
          </Link>
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-ink-muted mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input-base"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input-base pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full btn-primary justify-center py-3.5 text-base"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand font-medium hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
