const { uploadImage, deleteImage, generateUploadSignature } = require('../services/cloudinary.service');
const { ProductImage, Product } = require('../models');
const { success, error } = require('../utils/apiResponse');

// POST /api/v1/upload/image
async function uploadSingleImage(req, res, next) {
  try {
    if (!req.file) return error(res, 'No file provided', 400);
    const folder = req.body.folder || 'fashion-shop';
    const result = await uploadImage(req.file.buffer, folder);
    return success(res, result, 'Image uploaded');
  } catch (err) {
    if (err.message === 'UPLOAD_FAILED') return error(res, 'Image upload failed', 500);
    next(err);
  }
}

// POST /api/v1/upload/product-images/:productId
async function uploadProductImages(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) return error(res, 'No files provided', 400);

    const product = await Product.findByPk(req.params.productId);
    if (!product) return error(res, 'Product not found', 404);

    const maxOrder = await ProductImage.max('sort_order', {
      where: { product_id: product.id },
    });
    const startOrder = maxOrder === null || maxOrder === undefined ? 0 : Number(maxOrder) + 1;

    const uploaded = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const result = await uploadImage(file.buffer, `fashion-shop/products/${product.id}`);
      const image = await ProductImage.create({
        product_id: product.id,
        url: result.url,
        public_id: result.public_id,
        alt_text: product.name,
        sort_order: startOrder + i,
      });
      uploaded.push(image);
    }

    // Set first uploaded image as thumbnail if product doesn't have one
    if (!product.thumbnail_url && uploaded.length > 0) {
      await product.update({ thumbnail_url: uploaded[0].url, thumbnail_public_id: uploaded[0].public_id });
    }

    return success(res, uploaded, 'Images uploaded', 201);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/upload/product-image/:imageId
async function deleteProductImage(req, res, next) {
  try {
    const image = await ProductImage.findByPk(req.params.imageId);
    if (!image) return error(res, 'Image not found', 404);

    const product = await Product.findByPk(image.product_id);
    if (!product) return error(res, 'Product not found', 404);

    try {
      await deleteImage(image.public_id);
    } catch (_) {
      // Cloudinary may already have removed; continue
    }

    const wasThumbnail = product.thumbnail_public_id === image.public_id;
    await image.destroy();

    if (wasThumbnail) {
      const nextImg = await ProductImage.findOne({
        where: { product_id: product.id },
        order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
      });
      await product.update({
        thumbnail_url: nextImg ? nextImg.url : null,
        thumbnail_public_id: nextImg ? nextImg.public_id : null,
      });
    }

    return success(res, null, 'Image removed');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/upload/image/:publicId
async function deleteUploadedImage(req, res, next) {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    await deleteImage(publicId);
    return success(res, null, 'Image deleted');
  } catch (err) {
    if (err.message === 'DELETE_FAILED') return error(res, 'Image deletion failed', 500);
    next(err);
  }
}

// GET /api/v1/upload/signature
async function getUploadSignature(req, res) {
  const folder = req.query.folder || 'fashion-shop';
  const signature = generateUploadSignature(folder);
  return success(res, signature);
}

module.exports = { uploadSingleImage, uploadProductImages, deleteProductImage, deleteUploadedImage, getUploadSignature };
