const router = require('express').Router();
const ctrl = require('../controllers/upload.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticate, requireAdmin);

router.get('/signature', ctrl.getUploadSignature);
router.post('/image', upload.single('image'), ctrl.uploadSingleImage);
router.post('/product-images/:productId', upload.array('images', 20), ctrl.uploadProductImages);
router.delete('/product-image/:imageId', ctrl.deleteProductImage);
router.delete('/image/:publicId', ctrl.deleteUploadedImage);

module.exports = router;
