import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { PageSpinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { X, Search } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export default function AdminContacts() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', admin_notes: '' });

  const {
    data: result,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-contacts', statusFilter, search],
    queryFn: () =>
      adminApi
        .getContacts({ limit: 100, status: statusFilter || undefined, search: search || undefined })
        .then((r) => r.data),
  });

  const contacts = result?.data || [];
  const pagination = result?.pagination;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-contacts']);
      toast.success('Contact updated');
      setSelectedContact(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-contacts']);
      toast.success('Contact deleted');
      setSelectedContact(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete');
    },
  });

  const handleView = (contact) => {
    setSelectedContact(contact);
    setEditForm({ status: contact.status, admin_notes: contact.admin_notes || '' });
  };

  const handleUpdate = () => {
    if (!selectedContact) return;
    updateMutation.mutate({ id: selectedContact.id, data: editForm });
  };

  const handleDelete = () => {
    if (!selectedContact) return;
    if (!confirm('Delete this contact message?')) return;
    deleteMutation.mutate(selectedContact.id);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contact Messages</h1>
            {pagination && (
              <p className="text-sm text-ink-muted mt-1">
                {pagination.total} total message{pagination.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button onClick={() => refetch()} className="btn-secondary text-sm">
            Refresh
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by name, email, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base text-sm py-2 min-w-36"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); }}
              className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 underline"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="card p-8 text-center text-ink-muted">
          No contact messages.
        </div>
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Subject</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-center px-4 py-3 font-semibold w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.email}</td>
                  <td className="px-4 py-3">{c.subject || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleView(c)}
                      className="text-brand hover:underline text-sm font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedContact && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelectedContact(null)} />
          <div className="fixed z-50 inset-x-4 top-20 bottom-20 max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold">Contact Details</h2>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                  Name
                </p>
                <p className="font-medium">{selectedContact.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                  Email
                </p>
                <p>{selectedContact.email}</p>
              </div>
              {selectedContact.phone && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                    Phone
                  </p>
                  <p>{selectedContact.phone}</p>
                </div>
              )}
              {selectedContact.subject && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                    Subject
                  </p>
                  <p>{selectedContact.subject}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                  Message
                </p>
                <p className="whitespace-pre-wrap">{selectedContact.message}</p>
              </div>
              <div>
                <label htmlFor="status-select" className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                  Status
                </label>
                <select
                  id="status-select"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input-base w-full"
                >
                  {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="admin-notes" className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                  Admin Notes
                </label>
                <textarea
                  id="admin-notes"
                  value={editForm.admin_notes}
                  onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                  rows={3}
                  className="input-base w-full"
                  placeholder="Internal notes..."
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isLoading}
                className="btn-secondary text-sm"
              >
                Delete
              </button>
              <button
                onClick={handleUpdate}
                disabled={updateMutation.isLoading}
                className="btn-primary text-sm flex-1"
              >
                {updateMutation.isLoading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
