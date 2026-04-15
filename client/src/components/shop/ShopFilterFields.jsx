import clsx from 'clsx';
import { hexIsLight } from '../../utils/colorDisplay';

function SectionLabel({ id, children }) {
  return (
    <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </label>
  );
}

/**
 * Shared filter controls for shop (desktop sidebar + mobile drawer).
 */
export default function ShopFilterFields({
  genderOptions = [],
  gender,
  onGenderChange,
  categories,
  sizes = [],
  colors = [],
  categorySlug,
  onCategoryChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  featuredOnly,
  onFeaturedChange,
  selectedSizes,
  onToggleSize,
  selectedColors,
  onToggleColor,
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-1">Gender</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Gender">
          {genderOptions.map((g) => {
            const active = gender === g.value;
            return (
              <button
                key={g.value === '' ? 'all' : g.value}
                type="button"
                onClick={() => onGenderChange(g.value)}
                aria-pressed={active}
                className={clsx(
                  'min-h-[40px] px-3 text-sm font-medium rounded-xl border transition-all',
                  active
                    ? 'border-ink bg-ink text-white shadow-sm'
                    : 'border-gray-200 bg-white text-ink hover:border-gray-400'
                )}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel id="filter-category">Product category</SectionLabel>
        <select
          id="filter-category"
          value={categorySlug}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-shadow"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <SectionLabel id="filter-price-range">Price range (USD)</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted pointer-events-none">$</span>
            <input
              id="filter-min"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted pointer-events-none">$</span>
            <input
              id="filter-max"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-3">Size</p>
        {sizes.length === 0 ? (
          <p className="text-sm text-ink-muted">No sizes available.</p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by size">
            {sizes.map((s) => {
              const active = selectedSizes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onToggleSize(s)}
                  aria-pressed={active}
                  className={clsx(
                    'min-h-[40px] min-w-[40px] px-3 text-sm font-medium rounded-xl border transition-all',
                    active
                      ? 'border-ink bg-ink text-white shadow-sm'
                      : 'border-gray-200 bg-white text-ink hover:border-gray-400'
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-3">Color</p>
        {colors.length === 0 ? (
          <p className="text-sm text-ink-muted">No colors available.</p>
        ) : (
          <div className="flex flex-wrap gap-3" role="group" aria-label="Filter by color">
            {colors.map((hex) => {
              const active = selectedColors.includes(hex);
              const isLight = hexIsLight(hex);
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => onToggleColor(hex)}
                  aria-pressed={active}
                  title={hex}
                  aria-label={`Color ${hex}`}
                  style={{ backgroundColor: hex }}
                  className={clsx(
                    'h-10 w-10 rounded-full border-2 transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                    isLight ? 'border-gray-300' : 'border-white/80',
                    active ? 'ring-2 ring-ink ring-offset-2 scale-105' : 'hover:ring-1 hover:ring-gray-300 hover:ring-offset-1'
                  )}
                />
              );
            })}
          </div>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={featuredOnly}
          onChange={(e) => onFeaturedChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-ink focus:ring-brand/30"
        />
        <span className="text-sm font-medium text-ink group-hover:text-ink/90">Featured only</span>
      </label>
    </div>
  );
}
