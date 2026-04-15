/**
 * Free shipping when cart subtotal meets or exceeds this amount (USD).
 */
const FREE_SHIPPING_MIN = parseFloat(process.env.FREE_SHIPPING_MIN || '20');

/**
 * Standard delivery fee when subtotal is below FREE_SHIPPING_MIN (USD).
 */
const STANDARD_SHIPPING_FEE = parseFloat(process.env.STANDARD_SHIPPING_FEE || '5.99');

function getShippingQuote(subtotal) {
  const s = Math.max(0, Number(subtotal) || 0);
  const qualifiesFree = s >= FREE_SHIPPING_MIN;
  const shipping = qualifiesFree ? 0 : STANDARD_SHIPPING_FEE;
  return {
    subtotal: parseFloat(s.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    freeShippingMinimum: FREE_SHIPPING_MIN,
    qualifiesFree,
    grandTotal: parseFloat((s + shipping).toFixed(2)),
  };
}

module.exports = {
  FREE_SHIPPING_MIN,
  STANDARD_SHIPPING_FEE,
  getShippingQuote,
};
