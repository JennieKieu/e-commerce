const { Op } = require('sequelize');

/**
 * Normalize size/color for DB (empty string instead of null/undefined).
 */
function normalizeVariant(size, color) {
  const s = size != null && String(size).trim() !== '' ? String(size).trim() : '';
  const c = color != null && String(color).trim() !== '' ? String(color).trim() : '';
  return { size: s, color: c };
}

function variantMapKey(productId, size, color) {
  const { size: s, color: c } = normalizeVariant(size, color);
  return `${productId}::${s}::${c}`;
}

/**
 * Total stock for a product (all variants).
 */
async function sumStockForProduct(productId, { ProductVariant, transaction } = {}) {
  const sum = await ProductVariant.sum('stock', {
    where: { product_id: productId },
    transaction,
  });
  return sum == null ? 0 : Number(sum);
}

/**
 * Batch: productId -> total stock.
 */
async function sumStockForProducts(productIds, { ProductVariant, sequelize, transaction } = {}) {
  if (!productIds.length) return {};
  const rows = await ProductVariant.findAll({
    attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('stock')), 'total']],
    where: { product_id: { [Op.in]: productIds } },
    group: ['product_id'],
    raw: true,
    transaction,
  });
  const map = {};
  for (const r of rows) {
    map[r.product_id] = parseInt(r.total, 10) || 0;
  }
  return map;
}

module.exports = {
  normalizeVariant,
  variantMapKey,
  sumStockForProduct,
  sumStockForProducts,
};
