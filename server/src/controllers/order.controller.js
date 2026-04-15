const { Op } = require('sequelize');
const { sequelize, Order, OrderItem, Cart, CartItem, Product, ProductVariant } = require('../models');
const { success, error, paginated } = require('../utils/apiResponse');
const { normalizeVariant } = require('../utils/inventory');
const { getShippingQuote } = require('../config/shipping');

function generateOrderNumber() {
  return `LM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// POST /api/v1/orders/checkout
async function checkout(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { shipping_name, shipping_phone, shipping_address, shipping_city, notes } = req.body;

    const cart = await Cart.findOne({
      where: { user_id: req.user.id },
      include: [{ model: CartItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
      transaction: t,
      lock: true,
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      await t.rollback();
      return error(res, 'Cart is empty', 400);
    }

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      const product = item.product;
      if (!product || !product.is_active) {
        await t.rollback();
        return error(res, `Product "${item.product_id}" is no longer available`, 400);
      }

      const { size: s, color: c } = normalizeVariant(item.size, item.color);
      const variant = await ProductVariant.findOne({
        where: { product_id: product.id, size: s, color: c },
        transaction: t,
        lock: true,
      });

      if (!variant || variant.stock < item.quantity) {
        await t.rollback();
        return error(res, `Insufficient stock for "${product.name}" (${s || '—'} / ${c || '—'})`, 400);
      }

      const unitPrice = parseFloat(product.sale_price || product.price);
      subtotal += unitPrice * item.quantity;

      orderItemsData.push({
        product_id: product.id,
        product_name: product.name,
        product_thumbnail: product.thumbnail_url,
        price: unitPrice,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      });

      await variant.update({ stock: variant.stock - item.quantity }, { transaction: t });
    }

    const quote = getShippingQuote(subtotal);
    const totalAmount = quote.grandTotal;

    const order = await Order.create(
      {
        user_id: req.user.id,
        order_number: generateOrderNumber(),
        total_amount: totalAmount,
        shipping_fee: quote.shipping,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        notes: notes || null,
      },
      { transaction: t }
    );

    const orderItems = orderItemsData.map((item) => ({ ...item, order_id: order.id }));
    await OrderItem.bulkCreate(orderItems, { transaction: t });

    await CartItem.destroy({ where: { cart_id: cart.id }, transaction: t });

    await t.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    return success(res, fullOrder, 'Order placed successfully', 201);
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

// GET /api/v1/orders
async function getMyOrders(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Order.findAndCountAll({
      where: { user_id: req.user.id },
      include: [{ model: OrderItem, as: 'items' }],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    return paginated(res, rows, {
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/orders/:id
async function getOrderById(req, res, next) {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) return error(res, 'Order not found', 404);
    return success(res, order);
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/orders/:id/cancel
async function cancelMyOrder(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
      lock: true,
    });
    if (!order) {
      await t.rollback();
      return error(res, 'Order not found', 404);
    }

    if (order.status !== 'pending') {
      await t.rollback();
      return error(res, 'Only pending orders can be cancelled', 400);
    }

    for (const item of order.items || []) {
      const { size: s, color: c } = normalizeVariant(item.size, item.color);
      const variant = await ProductVariant.findOne({
        where: { product_id: item.product_id, size: s, color: c },
        transaction: t,
        lock: true,
      });
      if (!variant) continue;
      await variant.update({ stock: variant.stock + item.quantity }, { transaction: t });
    }

    await order.update({ status: 'cancelled' }, { transaction: t });
    await t.commit();

    const updated = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });
    return success(res, updated, 'Order cancelled');
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

// GET /api/v1/admin/orders/:id — any order (admin)
async function getOrderByIdAdmin(req, res, next) {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { association: 'user', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!order) return error(res, 'Order not found', 404);
    return success(res, order);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/orders
async function getAllOrders(req, res, next) {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { order_number: { [Op.like]: q } },
        { '$user.name$': { [Op.like]: q } },
        { '$user.email$': { [Op.like]: q } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Order.findAndCountAll({
      where,
      subQuery: false,
      include: [
        { model: OrderItem, as: 'items' },
        { association: 'user', attributes: ['id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    return paginated(res, rows, {
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/admin/orders/:id/status
async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return error(res, 'Order not found', 404);
    await order.update({ status });
    return success(res, order, 'Order status updated');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkout,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  getOrderByIdAdmin,
  getAllOrders,
  updateOrderStatus,
};
