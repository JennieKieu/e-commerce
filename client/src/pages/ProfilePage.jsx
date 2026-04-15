import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, Save, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();

  const [info, setInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const infoMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: (res) => {
      updateUser(res.data.data);
      toast.success('Profile updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const pwdMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPwd({ current_password: '', new_password: '', confirm: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const handleInfoSave = (e) => {
    e.preventDefault();
    infoMutation.mutate({ name: info.name, phone: info.phone });
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    pwdMutation.mutate({ current_password: pwd.current_password, new_password: pwd.new_password });
  };

  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container-app max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">My Profile</h1>

        {/* Personal Information */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <User size={18} className="text-ink-muted" />
            <h2 className="font-semibold text-lg">Personal Information</h2>
          </div>

          <form onSubmit={handleInfoSave} className="space-y-5">
            {/* Avatar placeholder (initials only) */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-ink flex-shrink-0">
                {initials}
              </div>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-ink-muted">{user?.email}</p>
                <span className={clsx(
                  'inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium',
                  user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                )}>
                  {user?.role}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5">Full Name *</label>
                <input
                  value={info.name}
                  onChange={(e) => setInfo((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="input-base"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <div className="flex items-center gap-2">
                  <input
                    value={user?.email || ''}
                    readOnly
                    className="input-base bg-gray-50 text-ink-muted cursor-not-allowed flex-1"
                  />
                  {user?.is_verified && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium flex-shrink-0">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-1">Email cannot be changed.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={info.phone}
                  onChange={(e) => setInfo((f) => ({ ...f, phone: e.target.value }))}
                  className="input-base"
                  placeholder="+1 234 567 890"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={infoMutation.isPending} className="btn-primary gap-2">
                <Save size={15} />
                {infoMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={18} className="text-ink-muted" />
            <h2 className="font-semibold text-lg">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showPwd.current ? 'text' : 'password'}
                  value={pwd.current_password}
                  onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))}
                  required
                  placeholder="Enter current password"
                  className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowPwd((s) => ({ ...s, current: !s.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                  {showPwd.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPwd.new ? 'text' : 'password'}
                    value={pwd.new_password}
                    onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))}
                    required
                    placeholder="Min 8 characters"
                    className="input-base pr-10"
                  />
                  <button type="button" onClick={() => setShowPwd((s) => ({ ...s, new: !s.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                    {showPwd.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPwd.confirm ? 'text' : 'password'}
                    value={pwd.confirm}
                    onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                    required
                    placeholder="Repeat new password"
                    className={clsx(
                      'input-base pr-10',
                      pwd.confirm && pwd.confirm !== pwd.new_password && 'border-red-300 ring-1 ring-red-300'
                    )}
                  />
                  <button type="button" onClick={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                    {showPwd.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwd.confirm && pwd.confirm !== pwd.new_password && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={pwdMutation.isPending} className="btn-primary gap-2">
                <Lock size={15} />
                {pwdMutation.isPending ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
