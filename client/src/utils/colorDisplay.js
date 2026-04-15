/**
 * Whether a string looks like a CSS hex color (#rgb or #rrggbb).
 */
export function isHexColor(value) {
  if (!value || typeof value !== 'string') return false;
  const t = value.trim();
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(t);
}

/** Relative luminance — for choosing border on swatches */
export function hexIsLight(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return false;
  const h = hex.slice(1);
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  return r * 0.299 + g * 0.587 + b * 0.114 > 186;
}
