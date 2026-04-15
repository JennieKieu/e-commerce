const sequelize = require('../config/database');
const User = require('./user.model');
const OTP = require('./otp.model');
const Category = require('./category.model');
const Product = require('./product.model');
const ProductImage = require('./productImage.model');
const ProductVariant = require('./productVariant.model');
const Cart = require('./cart.model');
const CartItem = require('./cartItem.model');
const Order = require('./order.model');
const OrderItem = require('./orderItem.model');
const Banner = require('./banner.model');
const RefreshToken = require('./refreshToken.model');
const Contact = require('./contact.model');

// User ↔ OTP
User.hasMany(OTP, { foreignKey: 'user_id', as: 'otps', onDelete: 'CASCADE' });
OTP.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User ↔ RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category ↔ Product
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Product ↔ ProductImage
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product ↔ ProductVariant (stock per size + color)
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User ↔ Cart (1-1)
User.hasOne(Cart, { foreignKey: 'user_id', as: 'cart', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Cart ↔ CartItem
Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });

// CartItem ↔ Product
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cartItems' });

// User ↔ Order
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Order ↔ OrderItem
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// OrderItem ↔ Product (snapshot, no FK constraint enforcement on delete)
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product', constraints: false });

module.exports = {
  sequelize,
  User,
  OTP,
  Category,
  Product,
  ProductImage,
  ProductVariant,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Banner,
  RefreshToken,
  Contact,
};
