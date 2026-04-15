const { Op } = require('sequelize');
const { Product, ProductImage, Category, ProductVariant, sequelize } = require('../models');

/** @param {string|string[]|undefined} value */
function parseCommaList(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** MySQL JSON array: product matches if it contains any of the values (OR). */
function jsonArrayContainsAny(columnName, values) {
  const capped = values.slice(0, 40);
  if (!capped.length) return null;
  const col = sequelize.col(columnName);
  return {
    [Op.or]: capped.map((v) =>
      sequelize.where(
        sequelize.fn(
          'JSON_CONTAINS',
          col,
          sequelize.literal(`CAST(${sequelize.escape(JSON.stringify(v))} AS JSON)`)
        ),
        1
      )
    ),
  };
}
const { success, error, paginated } = require('../utils/apiResponse');
const { sumStockForProducts, sumStockForProduct } = require('../utils/inventory');
const { replaceProductVariants, buildVariantsFromOptions } = require('../services/productVariant.service');
const slugify = require('slug');

// GET /api/v1/products
async function getProducts(req, res, next) {
  try {
    const {
      page = 1,
      limit = 12,
      gender,
      category,
      search,
      sort = 'created_at',
      order = 'DESC',
      featured,
      minPrice,
      maxPrice,
      size,
      color,
    } = req.query;

    const where = { is_active: true };
    if (gender) where.gender = gender;
    if (featured === 'true') where.is_featured = true;
    if (search) where.name = { [Op.like]: `%${search.trim()}%` };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    const sizeFilters = parseCommaList(size);
    const colorFilters = parseCommaList(color);
    const jsonAnd = [];
    const sizeCond = jsonArrayContainsAny('sizes', sizeFilters);
    const colorCond = jsonArrayContainsAny('colors', colorFilters);
    if (sizeCond) jsonAnd.push(sizeCond);
    if (colorCond) jsonAnd.push(colorCond);
    if (jsonAnd.length) {
      where[Op.and] = jsonAnd;
    }

    const categoryWhere = {};
    if (category) categoryWhere.slug = category;

    const allowedSorts = ['price', 'created_at', 'name'];
    const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', where: Object.keys(categoryWhere).length ? categoryWhere : undefined, attributes: ['id', 'name', 'slug'] },
        { model: ProductImage, as: 'images', attributes: ['url', 'alt_text', 'sort_order'], limit: 2 },
      ],
      order: [[sortField, sortOrder]],
      limit: limitNum,
      offset,
      distinct: true,
    });

    const ids = rows.map((r) => r.id);
    const stockMap = await sumStockForProducts(ids, { ProductVariant, sequelize });
    const enriched = rows.map((row) => {
      const plain = row.get ? row.get({ plain: true }) : row;
      plain.totalStock = stockMap[plain.id] ?? 0;
      return plain;
    });

    return paginated(res, enriched, {
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/products/filter-options — distinct sizes & colors (for shop filters)
async function getFilterOptions(req, res, next) {
  try {
    const { category, gender } = req.query;
    const where = { is_active: true };
    if (gender) where.gender = gender;

    const categoryWhere = {};
    if (category) categoryWhere.slug = category;

    const rows = await Product.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          where: Object.keys(categoryWhere).length ? categoryWhere : undefined,
          attributes: [],
        },
      ],
      attributes: ['sizes', 'colors'],
      raw: true,
    });

    const sizeSet = new Set();
    const colorSet = new Set();
    for (const r of rows) {
      (r.sizes || []).forEach((s) => sizeSet.add(String(s)));
      (r.colors || []).forEach((c) => colorSet.add(String(c)));
    }

    const sortSizes = (a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

    return success(res, {
      sizes: [...sizeSet].sort(sortSizes),
      colors: [...colorSet].sort((a, b) => a.localeCompare(b)),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/products/:id — full product + gallery + variants
async function getProductByIdAdmin(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        {
          model: ProductImage,
          as: 'images',
          separate: true,
          order: [
            ['sort_order', 'ASC'],
            ['created_at', 'ASC'],
          ],
        },
        {
          model: ProductVariant,
          as: 'variants',
          separate: true,
          order: [
            ['size', 'ASC'],
            ['color', 'ASC'],
          ],
        },
      ],
    });
    if (!product) return error(res, 'Product not found', 404);
    return success(res, product);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/products/:slug
async function getProductBySlug(req, res, next) {
  try {
    const product = await Product.findOne({
      where: { slug: req.params.slug, is_active: true },
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: ProductImage, as: 'images', attributes: ['id', 'url', 'public_id', 'alt_text', 'sort_order'], order: [['sort_order', 'ASC']] },
        {
          model: ProductVariant,
          as: 'variants',
          separate: true,
          order: [
            ['size', 'ASC'],
            ['color', 'ASC'],
          ],
        },
      ],
    });
    if (!product) return error(res, 'Product not found', 404);
    const plain = product.get({ plain: true });
    plain.totalStock = await sumStockForProduct(plain.id, { ProductVariant });
    return success(res, plain);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/admin/products
async function createProduct(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const {
      name,
      description,
      price,
      sale_price,
      gender,
      category_id,
      sizes,
      colors,
      is_featured,
      thumbnail_url,
      thumbnail_public_id,
      variants,
    } = req.body;

    const baseSlug = slugify(name, { lower: true });
    let slug = baseSlug;
    let suffix = 1;
    while (await Product.findOne({ where: { slug }, transaction: t })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const product = await Product.create(
      {
        name: name.trim(),
        slug,
        description,
        price,
        sale_price: sale_price || null,
        gender,
        category_id,
        sizes: sizes || [],
        colors: colors || [],
        is_featured: is_featured || false,
        thumbnail_url,
        thumbnail_public_id,
      },
      { transaction: t }
    );

    let variantRows = variants;
    if (!Array.isArray(variantRows) || variantRows.length === 0) {
      variantRows = buildVariantsFromOptions(sizes || [], colors || [], 0);
    }
    await replaceProductVariants(product.id, variantRows, { transaction: t });

    await t.commit();

    const full = await Product.findByPk(product.id, {
      include: [{ model: ProductVariant, as: 'variants' }],
    });
    return success(res, full, 'Product created', 201);
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

// PUT /api/v1/admin/products/:id
async function updateProduct(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { transaction: t, lock: true });
    if (!product) {
      await t.rollback();
      return error(res, 'Product not found', 404);
    }

    const updates = { ...req.body };
    delete updates.variants;

    if (updates.name && updates.name !== product.name) {
      const baseSlug = slugify(updates.name, { lower: true });
      let slug = baseSlug;
      let suf = 1;
      while (await Product.findOne({ where: { slug, id: { [Op.ne]: product.id } }, transaction: t })) {
        slug = `${baseSlug}-${suf++}`;
      }
      updates.slug = slug;
    }

    await product.update(updates, { transaction: t });

    if (req.body.variants !== undefined) {
      await replaceProductVariants(product.id, req.body.variants, { transaction: t });
    }

    await t.commit();

    const full = await Product.findByPk(product.id, {
      include: [{ model: ProductVariant, as: 'variants' }],
    });
    return success(res, full, 'Product updated');
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

// DELETE /api/v1/admin/products/:id
async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return error(res, 'Product not found', 404);
    await product.update({ is_active: false });
    return success(res, null, 'Product deactivated');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getFilterOptions,
  getProductByIdAdmin,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
};
