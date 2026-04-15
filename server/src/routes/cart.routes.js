const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/cart.controller');
const { authenticate, requireVerified } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate, requireVerified);

router.get('/', ctrl.getCart);
router.post(
  '/items',
  [
    body('productId').notEmpty(),
    body('quantity').optional().isInt({ min: 1 }),
  ],
  validate,
  ctrl.addToCart
);
router.put('/items/:itemId', [body('quantity').isInt({ min: 0 })], validate, ctrl.updateCartItem);
router.delete('/items/:itemId', ctrl.removeCartItem);
router.delete('/', ctrl.clearCart);
router.post('/merge', ctrl.mergeCart);

module.exports = router;
