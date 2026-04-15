import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - 1 && i <= page + 1)
    ) {
      pages.push(i);
    } else if (i === page - 2 || i === page + 2) {
      pages.push('...');
    }
  }

  const dedupedPages = pages.filter((p, i) => pages[i - 1] !== p);

  return (
    <div className="flex items-center gap-1.5 justify-center mt-10">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={18} />
      </button>

      {dedupedPages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-ink-muted text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={clsx(
              'w-9 h-9 rounded-xl text-sm font-medium transition-colors',
              p === page
                ? 'bg-ink text-white'
                : 'text-ink-muted hover:bg-gray-100'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
