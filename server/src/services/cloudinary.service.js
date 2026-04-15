const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

/**
 * Upload a file buffer or local path to Cloudinary.
 * @param {Buffer|string} fileData - Buffer (from multer) or file path
 * @param {string} folder - Cloudinary folder path
 * @param {object} options - Extra Cloudinary upload options
 */
async function uploadImage(fileData, folder = 'fashion-shop', options = {}) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
      ...options,
    };

    if (Buffer.isBuffer(fileData)) {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error', { error });
          reject(new Error('UPLOAD_FAILED'));
        } else {
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      });
      stream.end(fileData);
    } else {
      cloudinary.uploader.upload(fileData, uploadOptions, (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error', { error });
          reject(new Error('UPLOAD_FAILED'));
        } else {
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      });
    }
  });
}

/**
 * Delete an image from Cloudinary by its public_id.
 */
async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info('Cloudinary delete', { publicId, result });
    return result;
  } catch (err) {
    logger.error('Cloudinary delete error', { publicId, error: err.message });
    throw new Error('DELETE_FAILED');
  }
}

/**
 * Generate a signed upload signature for direct client-side upload.
 */
function generateUploadSignature(folder = 'fashion-shop') {
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
  };
}

module.exports = { uploadImage, deleteImage, generateUploadSignature };
