const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const productCtrl = require('../controllers/product.controller');
const categoryCtrl = require('../controllers/category.controller');
const orderCtrl = require('../controllers/order.controller');
const bannerCtrl = require('../controllers/banner.controller');

const contactCtrl = require('../controllers/contact.controller');
const adminCtrl = require('../controllers/admin.controller');

router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', adminCtrl.getDashboardStats);
router.get('/analytics', adminCtrl.getAnalytics);

// Users (customers)
router.get('/users', adminCtrl.getUsers);
router.post('/users', adminCtrl.createUser);
router.put('/users/:id', adminCtrl.updateUser);
router.delete('/users/:id', adminCtrl.deleteUser);

// Contacts
router.get('/contacts', contactCtrl.getAllContacts);
router.get('/contacts/:id', contactCtrl.getContact);
router.put('/contacts/:id', contactCtrl.updateContact);
router.delete('/contacts/:id', contactCtrl.deleteContact);

// Products
router.get('/products/:id', productCtrl.getProductByIdAdmin);
router.post(
  '/products',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
    body('gender').isIn(['men', 'women', 'kids', 'unisex']).withMessage('Valid gender required'),
    body('category_id').notEmpty().withMessage('Category required'),
  ],
  validate,
  productCtrl.createProduct
);
router.put('/products/:id', productCtrl.updateProduct);
router.delete('/products/:id', productCtrl.deleteProduct);

// Categories
router.post(
  '/categories',
  [body('name').trim().notEmpty()],
  validate,
  categoryCtrl.createCategory
);
router.put('/categories/:id', categoryCtrl.updateCategory);
router.delete('/categories/:id', categoryCtrl.deleteCategory);

// Orders
router.get('/orders', orderCtrl.getAllOrders);
router.get('/orders/:id', orderCtrl.getOrderByIdAdmin);
router.put(
  '/orders/:id/status',
  [body('status').isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])],
  validate,
  orderCtrl.updateOrderStatus
);

// Banners
router.get('/banners', bannerCtrl.getAllBannersAdmin);
router.post('/banners', bannerCtrl.createBanner);
router.put('/banners/:id', bannerCtrl.updateBanner);
router.delete('/banners/:id', bannerCtrl.deleteBanner);

module.exports = router;
