const { Banner } = require('../models');
const { success, error } = require('../utils/apiResponse');

// Public: only active banners
async function getBanners(req, res, next) {
  try {
    const banners = await Banner.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']],
    });
    return success(res, banners);
  } catch (err) {
    next(err);
  }
}

// Admin: all banners regardless of active status
async function getAllBannersAdmin(req, res, next) {
  try {
    const banners = await Banner.findAll({
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
    });
    return success(res, banners);
  } catch (err) {
    next(err);
  }
}

async function createBanner(req, res, next) {
  try {
    const { title, subtitle, cta_text, cta_link, image_url, image_public_id, sort_order, is_active } = req.body;
    const banner = await Banner.create({
      title, subtitle, cta_text, cta_link, image_url, image_public_id,
      sort_order: sort_order ?? 0,
      is_active: is_active !== undefined ? is_active : true,
    });
    return success(res, banner, 'Banner created', 201);
  } catch (err) {
    next(err);
  }
}

async function updateBanner(req, res, next) {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return error(res, 'Banner not found', 404);
    await banner.update(req.body);
    return success(res, banner, 'Banner updated');
  } catch (err) {
    next(err);
  }
}

async function deleteBanner(req, res, next) {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return error(res, 'Banner not found', 404);
    await banner.destroy();
    return success(res, null, 'Banner deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = { getBanners, getAllBannersAdmin, createBanner, updateBanner, deleteBanner };
