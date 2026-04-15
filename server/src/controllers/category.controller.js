const { Category, Product } = require('../models');
const { success, error } = require('../utils/apiResponse');
const slugify = require('slug');

async function getCategories(req, res, next) {
  try {
    const categories = await Category.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']],
      attributes: ['id', 'name', 'slug', 'description', 'image_url', 'sort_order'],
    });
    return success(res, categories);
  } catch (err) {
    next(err);
  }
}

async function getCategoryBySlug(req, res, next) {
  try {
    const category = await Category.findOne({ where: { slug: req.params.slug, is_active: true } });
    if (!category) return error(res, 'Category not found', 404);
    return success(res, category);
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, description, image_url, image_public_id, sort_order } = req.body;
    const slug = slugify(name, { lower: true });

    const existing = await Category.findOne({ where: { slug } });
    if (existing) return error(res, 'Category with this name already exists', 409);

    const category = await Category.create({ name: name.trim(), slug, description, image_url, image_public_id, sort_order: sort_order || 0 });
    return success(res, category, 'Category created', 201);
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return error(res, 'Category not found', 404);

    const updates = req.body;
    if (updates.name) updates.slug = slugify(updates.name, { lower: true });

    await category.update(updates);
    return success(res, category, 'Category updated');
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return error(res, 'Category not found', 404);
    await category.update({ is_active: false });
    return success(res, null, 'Category deactivated');
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory };
