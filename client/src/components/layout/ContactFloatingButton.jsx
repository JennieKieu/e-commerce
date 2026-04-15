import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { contactApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function ContactFloatingButton() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const initialForm = useMemo(
    () => ({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      subject: '',
      message: '',
    }),
    [user]
  );
  const [form, setForm] = useState(initialForm);

  const submitMutation = useMutation({
    mutationFn: (payload) => contactApi.submit(payload),
    onSuccess: () => {
      toast.success('Your message has been sent');
      setForm(initialForm);
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send message');
    },
  });

  const handleOpen = () => {
    setForm(initialForm);
    setOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      subject: form.subject.trim() || undefined,
      message: form.message.trim(),
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Contact support"
        className="fixed right-5 bottom-5 z-40 w-12 h-12 rounded-full bg-ink text-white shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
      >
        <Mail size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-4 bottom-20 w-[min(92vw,420px)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold">Contact Us</h3>
                <p className="text-xs text-ink-muted mt-0.5">Leave your information and message</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-ink-muted"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Full name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    maxLength={120}
                    className="input-base text-sm py-2.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    className="input-base text-sm py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="input-base text-sm py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Subject</label>
                  <input
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="input-base text-sm py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  required
                  rows={4}
                  className="input-base text-sm resize-none"
                  placeholder="How can we help you?"
                />
              </div>

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full btn-primary justify-center gap-2"
              >
                <Send size={15} />
                {submitMutation.isPending ? 'Sending...' : 'Send message'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
