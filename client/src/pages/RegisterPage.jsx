import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const registerMutation = useMutation({
    mutationFn: (data) => authApi.register(data),
    onSuccess: (res) => {
      const userId = res.data.data?.userId;
      toast.success('Account created! Check your email for the OTP.');
      navigate('/verify-otp', { state: { userId, email: form.email } });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Registration failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    registerMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left visual */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80"
          alt="Fashion"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex items-end p-12">
          <div className="text-white">
            <h2 className="text-4xl font-bold mb-2">Join LuxeMode</h2>
            <p className="text-white/70">Create your account and start shopping</p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="text-2xl font-bold tracking-widest uppercase text-ink block mb-8 lg:hidden">
            LuxeMode
          </Link>
          <h1 className="text-3xl font-bold mb-2">Create account</h1>
          <p className="text-ink-muted mb-8">Start your fashion journey today</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-base"
                placeholder="Your full name"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input-base"
                placeholder="you@example.com"
                required
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
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full btn-primary justify-center py-3.5 text-base"
            >
              {registerMutation.isPending ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-brand font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
