import { useState, useEffect, useDeferredValue, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X } from 'lucide-react';
import { productApi, categoryApi } from '../services/api';
import ProductCard from '../components/ui/ProductCard';
import Pagination from '../components/ui/Pagination';
import { PageSpinner } from '../components/ui/Spinner';
import ShopFilterFields from '../components/shop/ShopFilterFields';
import clsx from 'clsx';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'created_at-DESC' },
  { label: 'Price: Low to High', value: 'price-ASC' },
  { label: 'Price: High to Low', value: 'price-DESC' },
  { label: 'Name A-Z', value: 'name-ASC' },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category') || '';
  const genderParam = searchParams.get('gender') || '';

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_at-DESC');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filterOpen, setFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  /** Keep search state in sync with ?search= when navigating from the header (same /shop route, no remount). */
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const handleCategoryFilterChange = useCallback(
    (slug) => {
      const next = new URLSearchParams(searchParams);
      if (slug) next.set('category', slug);
      else next.delete('category');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const deferredMinPrice = useDeferredValue(minPrice);
  const deferredMaxPrice = useDeferredValue(maxPrice);

  const [sortField, sortOrder] = sort.split('-');

  const parsePrice = (v) => {
    const n = parseFloat(String(v).trim());
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const minPriceNum = parsePrice(deferredMinPrice);
  const maxPriceNum = parsePrice(deferredMaxPrice);

  const sizeFilterParam = useMemo(
    () =>
      [...selectedSizes]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .join(','),
    [selectedSizes]
  );
  const colorFilterParam = useMemo(
    () => [...selectedColors].sort((a, b) => a.localeCompare(b)).join(','),
    [selectedColors]
  );

  useEffect(() => {
    setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    categorySlug,
    genderParam,
    sort,
    search,
    deferredMinPrice,
    deferredMaxPrice,
    featuredOnly,
    sizeFilterParam,
    colorFilterParam,
  ]);

  useEffect(() => {
    if (!filterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterOpen]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then((r) => r.data.data),
    staleTime: 60_000,
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['product-filter-options', categorySlug || 'all', genderParam || 'all'],
    queryFn: () =>
      productApi
        .getFilterOptions({
          category: categorySlug || undefined,
          gender: genderParam || undefined,
        })
        .then((r) => r.data.data),
    staleTime: 60_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'products',
      {
        page,
        search,
        sortField,
        sortOrder,
        categorySlug,
        genderParam,
        minPriceNum,
        maxPriceNum,
        featuredOnly,
        sizeFilterParam,
        colorFilterParam,
      },
    ],
    queryFn: () =>
      productApi
        .getAll({
          page,
          limit: 12,
          search: search || undefined,
          sort: sortField,
          order: sortOrder,
          category: categorySlug || undefined,
          gender: genderParam || undefined,
          minPrice: minPriceNum,
          maxPrice: maxPriceNum,
          featured: featuredOnly ? 'true' : undefined,
          size: sizeFilterParam || undefined,
          color: colorFilterParam || undefined,
        })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const products = data?.data || [];
  const pagination = data?.pagination;

  const toggleSize = useCallback((s) => {
    setSelectedSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }, []);

  const toggleColor = useCallback((c) => {
    setSelectedColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }, []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (genderParam) n += 1;
    if (categorySlug) n += 1;
    if (minPrice.trim()) n += 1;
    if (maxPrice.trim()) n += 1;
    if (featuredOnly) n += 1;
    n += selectedSizes.length;
    n += selectedColors.length;
    return n;
  }, [genderParam, categorySlug, minPrice, maxPrice, featuredOnly, selectedSizes.length, selectedColors.length]);

  const filterFieldProps = {
    categories,
    sizes: filterOptions?.sizes ?? [],
    colors: filterOptions?.colors ?? [],
    categorySlug,
    onCategoryChange: handleCategoryFilterChange,
    minPrice,
    maxPrice,
    onMinPriceChange: setMinPrice,
    onMaxPriceChange: setMaxPrice,
    featuredOnly,
    onFeaturedChange: setFeaturedOnly,
    selectedSizes,
    onToggleSize: toggleSize,
    selectedColors,
    onToggleColor: toggleColor,
  };

  const clearSearch = () => {
    setSearch('');
    const next = new URLSearchParams(searchParams);
    next.delete('search');
    setSearchParams(next);
  };

  const clearPanelFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setFeaturedOnly(false);
    setSelectedSizes([]);
    setSelectedColors([]);
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.delete('gender');
    setSearchParams(next);
  };

  return (
    <div className="container-app py-10">
      <div className="lg:flex lg:items-start lg:gap-10 xl:gap-12">
        {/* Desktop: sticky filter sidebar */}
        <aside className="hidden lg:block w-full max-w-[280px] shrink-0 sticky top-24 space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold text-ink mb-4">Filters</h2>
            <ShopFilterFields {...filterFieldProps} />
            <button
              type="button"
              onClick={clearPanelFilters}
              className="mt-8 w-full text-sm font-medium py-2.5 rounded-xl border border-gray-200 text-ink-muted hover:bg-gray-50 hover:text-ink transition-colors"
            >
              Reset filters
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="section-title">
                {categories.find((c) => c.slug === categorySlug)?.name ||
                  (genderParam
                    ? genderParam.charAt(0).toUpperCase() + genderParam.slice(1)
                    : null) ||
                  'All Products'}
              </h1>
              {pagination && (
                <p className="text-sm text-ink-muted mt-1">{pagination.total} products</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 min-w-[160px]"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className={clsx(
                  'lg:hidden relative flex items-center gap-2 text-sm border rounded-xl px-3 py-2.5 transition-colors min-h-[44px]',
                  activeFilterCount > 0 ? 'border-ink bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                )}
                aria-expanded={filterOpen}
              >
                <SlidersHorizontal size={15} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-ink text-white text-[10px] font-bold">
                    {activeFilterCount > 99 ? '99+' : activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active search tag */}
          {search && (
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-ink-muted">Results for:</span>
              <span className="inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-pill text-sm font-medium">
                &quot;{search}&quot;
                <button type="button" onClick={clearSearch} className="text-ink-muted hover:text-ink" aria-label="Clear search">
                  <X size={13} />
                </button>
              </span>
            </div>
          )}

          {/* Products grid */}
          {isLoading ? (
            <PageSpinner />
          ) : products.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
              <p className="text-2xl font-bold mb-2">No products found</p>
              <p className="text-ink-muted max-w-md mx-auto">Try adjusting filters or clear selections to see more items.</p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearPanelFilters}
                  className="mt-6 text-sm font-medium text-brand hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div
              className={clsx(
                'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6',
                isFetching && 'opacity-60 transition-opacity'
              )}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {pagination && (
            <div className="mt-10">
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile / tablet drawer */}
      {filterOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Close filters"
            onClick={() => setFilterOpen(false)}
          />
          <div
            className="fixed z-50 inset-x-0 bottom-0 max-h-[90vh] lg:hidden flex flex-col rounded-t-2xl bg-white shadow-2xl border-t border-gray-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-filter-drawer-title"
          >
            <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-2 border-b border-gray-100">
              <div className="mx-auto h-1 w-10 rounded-full bg-gray-200" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 id="shop-filter-drawer-title" className="text-lg font-semibold text-ink">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 text-ink-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <ShopFilterFields {...filterFieldProps} />
            </div>
            <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-gray-100 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={clearPanelFilters}
                className="flex-1 text-sm font-medium py-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors min-h-[48px]"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex-1 text-sm font-medium py-3.5 rounded-xl bg-ink text-white hover:bg-gray-800 transition-colors min-h-[48px]"
              >
                View results
                {pagination != null ? ` (${pagination.total})` : ''}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
