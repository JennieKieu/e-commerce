const { Op } = require('sequelize');
const { Cart, CartItem, Product, ProductVariant } = require('../models');
const { success, error } = require('../utils/apiResponse');
const { getShippingQuote, FREE_SHIPPING_MIN } = require('../config/shipping');
const { normalizeVariant, variantMapKey } = require('../utils/inventory');

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ where: { user_id: userId } });
  if (!cart) cart = await Cart.create({ user_id: userId });
  return cart;
}

async function attachAvailableStockToItems(items) {
  if (!items || items.length === 0) return;
  const productIds = [...new Set(items.map((i) => i.product_id))];
  const variants = await ProductVariant.findAll({
    where: { product_id: { [Op.in]: productIds } },
  });
  const map = new Map();
  for (const v of variants) {
    map.set(variantMapKey(v.product_id, v.size, v.color), v.stock);
  }
  for (const item of items) {
    const key = variantMapKey(item.product_id, item.size, item.color);
    const avail = map.get(key) ?? 0;
    if (item.product?.dataValues) {
      item.product.dataValues.availableStock = avail;
    }
    if (item.dataValues) {
      item.dataValues.availableStock = avail;
    }
  }
}

// GET /api/v1/cart
async function getCart(req, res, next) {
  try {
    const cart = await Cart.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'slug', 'price', 'sale_price', 'thumbnail_url', 'sizes', 'colors'],
            },
          ],
        },
      ],
    });

    if (!cart) {
      return success(res, {
        items: [],
        subtotal: 0,
        shipping: 0,
        freeShippingMinimum: FREE_SHIPPING_MIN,
        qualifiesFreeShipping: true,
        total: 0,
      });
    }

    const items = cart.items || [];
    await attachAvailableStockToItems(items);

    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.product.sale_price || item.product.price);
      return sum + price * item.quantity;
    }, 0);

    if (items.length === 0) {
      return success(res, {
        id: cart.id,
        items: [],
        subtotal: 0,
        shipping: 0,
        freeShippingMinimum: FREE_SHIPPING_MIN,
        qualifiesFreeShipping: true,
        total: 0,
      });
    }

    const quote = getShippingQuote(subtotal);

    return success(res, {
      id: cart.id,
      items,
      subtotal: quote.subtotal,
      shipping: quote.shipping,
      freeShippingMinimum: quote.freeShippingMinimum,
      qualifiesFreeShipping: quote.qualifiesFree,
      total: quote.grandTotal,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/cart/items
async function addToCart(req, res, next) {
  try {
    const { productId, quantity = 1, size, color } = req.body;

    const product = await Product.findByPk(productId);
    if (!product || !product.is_active) return error(res, 'Product not found', 404);

    const sizes = product.sizes || [];
    const colors = product.colors || [];
    if (sizes.length > 0 && (size == null || String(size).trim() === '')) {
      return error(res, 'Please select a size', 400);
    }
    if (colors.length > 0 && (color == null || String(color).trim() === '')) {
      return error(res, 'Please select a color', 400);
    }

    const { size: sNorm, color: cNorm } = normalizeVariant(size, color);
    const variant = await ProductVariant.findOne({
      where: { product_id: productId, size: sNorm, color: cNorm },
    });
    if (!variant) return error(res, 'Invalid size/color combination', 400);
    if (variant.stock < 1) return error(res, 'This variant is out of stock', 400);

    const cart = await getOrCreateCart(req.user.id);

    const existing = await CartItem.findOne({
      where: { cart_id: cart.id, product_id: productId, size: sNorm || null, color: cNorm || null },
    });

    if (existing) {
      const newQty = existing.quantity + parseInt(quantity, 10);
      if (newQty > variant.stock) return error(res, 'Not enough stock available', 400);
      await existing.update({ quantity: newQty });
    } else {
      if (parseInt(quantity, 10) > variant.stock) return error(res, 'Not enough stock available', 400);
      await CartItem.create({
        cart_id: cart.id,
        product_id: productId,
        quantity: parseInt(quantity, 10),
        size: sNorm || null,
        color: cNorm || null,
      });
    }

    return success(res, null, 'Item added to cart');
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/cart/items/:itemId
async function updateCartItem(req, res, next) {
  try {
    const { quantity } = req.body;
    const cart = await getOrCreateCart(req.user.id);
    const item = await CartItem.findOne({ where: { id: req.params.itemId, cart_id: cart.id } });
    if (!item) return error(res, 'Cart item not found', 404);

    if (parseInt(quantity, 10) < 1) {
      await item.destroy();
      return success(res, null, 'Item removed from cart');
    }

    const variant = await ProductVariant.findOne({
      where: {
        product_id: item.product_id,
        ...normalizeVariant(item.size, item.color),
      },
    });
    if (!variant) return error(res, 'Variant not found', 400);
    if (parseInt(quantity, 10) > variant.stock) return error(res, 'Not enough stock', 400);

    await item.update({ quantity: parseInt(quantity, 10) });
    return success(res, null, 'Cart item updated');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/cart/items/:itemId
async function removeCartItem(req, res, next) {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const item = await CartItem.findOne({ where: { id: req.params.itemId, cart_id: cart.id } });
    if (!item) return error(res, 'Cart item not found', 404);
    await item.destroy();
    return success(res, null, 'Item removed from cart');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/cart
async function clearCart(req, res, next) {
  try {
    const cart = await Cart.findOne({ where: { user_id: req.user.id } });
    if (cart) await CartItem.destroy({ where: { cart_id: cart.id } });
    return success(res, null, 'Cart cleared');
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/cart/merge
async function mergeCart(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return success(res, null, 'Nothing to merge');

    const cart = await getOrCreateCart(req.user.id);

    for (const guestItem of items) {
      const product = await Product.findByPk(guestItem.productId);
      if (!product || !product.is_active) continue;

      const { size: sNorm, color: cNorm } = normalizeVariant(guestItem.size, guestItem.color);
      const sizes = product.sizes || [];
      const colors = product.colors || [];
      if (sizes.length > 0 && !sNorm) continue;
      if (colors.length > 0 && !cNorm) continue;

      const variant = await ProductVariant.findOne({
        where: { product_id: guestItem.productId, size: sNorm, color: cNorm },
      });
      if (!variant || variant.stock < 1) continue;

      const existing = await CartItem.findOne({
        where: {
          cart_id: cart.id,
          product_id: guestItem.productId,
          size: sNorm || null,
          color: cNorm || null,
        },
      });

      const wantQty = (existing ? existing.quantity : 0) + parseInt(guestItem.quantity || 1, 10);
      const newQty = Math.min(wantQty, variant.stock);

      if (newQty < 1) continue;

      if (existing) {
        await existing.update({ quantity: newQty });
      } else {
        await CartItem.create({
          cart_id: cart.id,
          product_id: guestItem.productId,
          quantity: newQty,
          size: sNorm || null,
          color: cNorm || null,
        });
      }
    }

    return success(res, null, 'Cart merged successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart, mergeCart };
