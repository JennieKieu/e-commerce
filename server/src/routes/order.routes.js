const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/order.controller');
const { authenticate, requireVerified } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate, requireVerified);

router.get('/', ctrl.getMyOrders);
router.get('/:id', ctrl.getOrderById);
router.put('/:id/cancel', ctrl.cancelMyOrder);
router.post(
  '/checkout',
  [
    body('shipping_name').trim().notEmpty().withMessage('Shipping name required'),
    body('shipping_phone').trim().notEmpty().withMessage('Phone required'),
    body('shipping_address').trim().notEmpty().withMessage('Address required'),
    body('shipping_city').trim().notEmpty().withMessage('City required'),
  ],
  validate,
  ctrl.checkout
);

module.exports = router;
