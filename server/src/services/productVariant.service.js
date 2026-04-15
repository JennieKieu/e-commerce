const { ProductVariant } = require('../models');
const { normalizeVariant } = require('../utils/inventory');

/**
 * Replace all variants for a product (create/update flows).
 * @param {string} productId
 * @param {Array<{ size?: string, color?: string, stock: number }>} variants
 */
async function replaceProductVariants(productId, variants, { transaction } = {}) {
  await ProductVariant.destroy({ where: { product_id: productId }, transaction });

  if (!Array.isArray(variants) || variants.length === 0) {
    return;
  }

  const seen = new Set();
  const rows = [];
  for (const v of variants) {
    const { size, color } = normalizeVariant(v.size, v.color);
    const key = `${size}::${color}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      product_id: productId,
      size,
      color,
      stock: Math.max(0, parseInt(v.stock, 10) || 0),
    });
  }

  if (rows.length) {
    await ProductVariant.bulkCreate(rows, { transaction });
  }
}

/**
 * Build variant rows from sizes × colors, splitting totalStock evenly.
 */
function buildVariantsFromOptions(sizes, colors, totalStock) {
  const sz = Array.isArray(sizes) && sizes.length ? sizes : [''];
  const cl = Array.isArray(colors) && colors.length ? colors : [''];
  const combos = [];
  for (const s of sz) {
    for (const c of cl) {
      combos.push({ size: s, color: c });
    }
  }
  if (combos.length === 0) {
    combos.push({ size: '', color: '' });
  }
  const n = combos.length;
  const total = Math.max(0, parseInt(totalStock, 10) || 0);
  const per = Math.floor(total / n);
  const remainder = total % n;
  return combos.map((combo, i) => ({
    size: combo.size,
    color: combo.color,
    stock: per + (i < remainder ? 1 : 0),
  }));
}

module.exports = { replaceProductVariants, buildVariantsFromOptions };
