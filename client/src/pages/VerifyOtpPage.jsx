import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const OTP_LENGTH = 6;

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const userId = location.state?.userId;
  const email = location.state?.email;

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!userId) navigate('/register');
  }, [userId]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: (data) => authApi.verifyOtp(data),
    onSuccess: (res) => {
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      toast.success('Email verified! Welcome to LuxeMode!');
      const destination = user.role === 'admin' ? '/admin' : '/';
      navigate(destination, { replace: true });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.resendOtp({ userId }),
    onSuccess: () => {
      toast.success('New OTP sent to your email');
      setCooldown(60);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to resend OTP';
      toast.error(msg);
      const seconds = parseInt(msg.match(/\d+/)?.[0] || 0);
      if (seconds > 0) setCooldown(seconds);
    },
  });

  const handleInput = (value, index) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);
    if (char && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted) {
      const newOtp = [...Array(OTP_LENGTH).fill('')];
      pasted.split('').forEach((c, i) => { newOtp[i] = c; });
      setOtp(newOtp);
      inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error(`Please enter the ${OTP_LENGTH}-digit OTP`);
      return;
    }
    verifyMutation.mutate({ userId, otp: code });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="text-2xl font-bold tracking-widest uppercase text-ink block mb-12 text-center">
          LuxeMode
        </Link>

        <div className="bg-white rounded-3xl shadow-card p-8">
          {/* Email icon */}
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Check your email</h1>
          <p className="text-ink-muted text-center text-sm mb-8">
            We sent a {OTP_LENGTH}-digit verification code to{' '}
            {email && <strong className="text-ink">{email}</strong>}
          </p>

          <form onSubmit={handleSubmit}>
            {/* OTP inputs */}
            <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInput(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  style={{ borderColor: digit ? '#111' : undefined }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={verifyMutation.isPending || otp.join('').length < OTP_LENGTH}
              className="w-full btn-primary justify-center py-3.5 text-base"
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-ink-muted mb-2">Didn't receive the code?</p>
            <button
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending || cooldown > 0}
              className="text-sm font-medium text-brand hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : resendMutation.isPending
                ? 'Sending...'
                : 'Resend OTP'}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-ink-muted mt-6">
          <Link to="/register" className="hover:text-ink">← Back to registration</Link>
        </p>
      </div>
    </div>
  );
}
