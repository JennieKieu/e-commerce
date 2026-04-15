const router = require('express').Router();
const { getBanners } = require('../controllers/banner.controller');

router.use('/auth', require('./auth.routes'));
router.use('/products', require('./product.routes'));
router.use('/categories', require('./category.routes'));
router.use('/cart', require('./cart.routes'));
router.use('/orders', require('./order.routes'));
router.use('/contact', require('./contact.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/upload', require('./upload.routes'));
router.get('/banners', getBanners);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
