/** Must match server defaults (see server .env FREE_SHIPPING_MIN / STANDARD_SHIPPING_FEE). */
export const FREE_SHIPPING_MIN_USD = 20;
export const STANDARD_SHIPPING_FEE_USD = 5.99;

export function getShippingQuote(subtotal) {
  const s = Math.max(0, Number(subtotal) || 0);
  const qualifiesFree = s >= FREE_SHIPPING_MIN_USD;
  const shipping = qualifiesFree ? 0 : STANDARD_SHIPPING_FEE_USD;
  return {
    subtotal: parseFloat(s.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    freeShippingMinimum: FREE_SHIPPING_MIN_USD,
    qualifiesFree,
    grandTotal: parseFloat((s + shipping).toFixed(2)),
  };
}
