const router = require('express').Router();
const ctrl = require('../controllers/product.controller');

router.get('/', ctrl.getProducts);
router.get('/filter-options', ctrl.getFilterOptions);
router.get('/:slug', ctrl.getProductBySlug);

module.exports = router;
