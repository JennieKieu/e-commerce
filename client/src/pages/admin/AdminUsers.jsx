import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { PageSpinner } from '../../components/ui/Spinner';
import { Search, X, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role: user?.role || 'customer',
    is_verified: user?.is_verified ?? false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.password) {
      toast.error('Password is required for new users');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      await onSave(payload);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-lg">{isEdit ? 'Edit Customer' : 'New Customer'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="John Doe"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="john@example.com"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+1 234 567 890"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Password {isEdit && <span className="text-ink-muted font-normal">(leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="input-base"
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setForm((f) => ({ ...f, is_verified: !f.is_verified }))}
                  className={clsx(
                    'w-10 h-5 rounded-full transition-colors relative cursor-pointer',
                    form.is_verified ? 'bg-green-500' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={clsx(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      form.is_verified ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </div>
                <span className="text-sm font-medium">Email verified</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'create' | user object
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const {
    data: result,
    isLoading,
  } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () =>
      adminApi
        .getUsers({ limit: 200, search: search || undefined, role: roleFilter || undefined })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('Customer created');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('Customer updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('Customer deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const users = result?.data || [];
  const pagination = result?.pagination;
  const hasFilters = search || roleFilter;

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          {pagination && (
            <p className="text-sm text-ink-muted mt-1">
              {pagination.total} total customer{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => setModal('create')}
          className="btn-primary gap-2"
        >
          <Plus size={16} /> New Customer
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-base text-sm py-2 min-w-36"
        >
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setRoleFilter(''); }}
            className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 underline"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted">
          {hasFilters ? 'No customers match your search.' : 'No customers yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Verified</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.full_name || u.name || '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3 text-ink-muted">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'inline-block px-2 py-0.5 rounded text-xs font-medium',
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'inline-block px-2 py-0.5 rounded text-xs font-medium',
                      u.is_verified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    )}>
                      {u.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setModal(u)}
                        title="Edit"
                        className="p-2 hover:bg-gray-100 rounded-lg text-ink-muted hover:text-ink transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${u.name}? This cannot be undone.`)) {
                            deleteMutation.mutate(u.id);
                          }
                        }}
                        title="Delete"
                        className="p-2 hover:bg-red-50 rounded-lg text-ink-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            if (modal === 'create') await createMutation.mutateAsync(data);
            else await updateMutation.mutateAsync({ id: modal.id, data });
          }}
        />
      )}
    </div>
  );
}
