const { User, Order, Product, Contact, sequelize } = require('../models');
const { success, error, paginated } = require('../utils/apiResponse');
const { Op } = require('sequelize');
const authService = require('../services/auth.service');

// GET /api/v1/admin/dashboard
async function getDashboardStats(req, res, next) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, totalProducts, totalOrders, revenueResult, pendingOrders, newContacts] = await Promise.all([
      User.count({ where: { role: 'customer' } }),
      Product.count({ where: { is_active: true } }),
      Order.count(),
      Order.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'total']],
        where: { status: { [Op.in]: ['confirmed', 'shipped', 'delivered'] } },
        raw: true,
      }),
      Order.count({ where: { status: 'pending' } }),
      Contact.count({ where: { status: 'new' } }),
    ]);

    const monthlyRevenue = await Order.findOne({
      attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'total']],
      where: {
        status: { [Op.in]: ['confirmed', 'shipped', 'delivered'] },
        created_at: { [Op.gte]: startOfMonth },
      },
      raw: true,
    });

    return success(res, {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: parseFloat(revenueResult?.total || 0),
      monthlyRevenue: parseFloat(monthlyRevenue?.total || 0),
      pendingOrders,
      newContacts,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/users
async function getUsers(req, res, next) {
  try {
    const { page = 1, limit = 50, role, search } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { phone: { [Op.like]: q } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
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

async function getAnalytics(req, res, next) {
  try {
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);

    const [
      totalUsers,
      newUsersLast30,
      totalOrders,
      ordersLast30,
      totalRevenue,
      revenueLast30,
      topProducts,
      ordersByStatus,
    ] = await Promise.all([
      User.count({ where: { role: 'customer' } }),
      User.count({ where: { role: 'customer', created_at: { [Op.gte]: last30Days } } }),
      Order.count(),
      Order.count({ where: { created_at: { [Op.gte]: last30Days } } }),
      Order.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'total']],
        where: { status: { [Op.in]: ['confirmed', 'shipped', 'delivered'] } },
        raw: true,
      }),
      Order.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'total']],
        where: {
          status: { [Op.in]: ['confirmed', 'shipped', 'delivered'] },
          created_at: { [Op.gte]: last30Days },
        },
        raw: true,
      }),
      sequelize.query(
        `SELECT p.name, p.id, SUM(oi.quantity) as total_sold
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.status IN ('confirmed','shipped','delivered')
         GROUP BY p.id, p.name
         ORDER BY total_sold DESC
         LIMIT 10`,
        { type: sequelize.QueryTypes.SELECT }
      ),
      Order.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
    ]);

    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const result = await Order.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'total']],
        where: {
          status: { [Op.in]: ['confirmed', 'shipped', 'delivered'] },
          created_at: { [Op.gte]: d, [Op.lt]: nextMonth },
        },
        raw: true,
      });
      last12Months.push({
        month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        revenue: parseFloat(result?.total || 0),
      });
    }

    return success(res, {
      users: { total: totalUsers, newLast30Days: newUsersLast30 },
      orders: { total: totalOrders, last30Days: ordersLast30, byStatus: ordersByStatus },
      revenue: {
        total: parseFloat(totalRevenue?.total || 0),
        last30Days: parseFloat(revenueLast30?.total || 0),
        last12Months,
      },
      topProducts,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/admin/users
async function createUser(req, res, next) {
  try {
    const { name, email, password, phone, role = 'customer', is_verified = false } = req.body;
    if (!name || !email || !password) return error(res, 'name, email and password are required', 400);

    const exists = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (exists) return error(res, 'Email already in use', 409);

    const hashed = await authService.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      phone: phone?.trim() || null,
      role,
      is_verified,
    });

    const { password: _, ...userOut } = user.toJSON();
    return success(res, userOut, 'User created', 201);
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/admin/users/:id
async function updateUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'User not found', 404);

    const { name, email, password, phone, role, is_verified } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) {
      const dup = await User.findOne({ where: { email: email.trim().toLowerCase(), id: { [Op.ne]: user.id } } });
      if (dup) return error(res, 'Email already in use', 409);
      updates.email = email.trim().toLowerCase();
    }
    if (password) updates.password = await authService.hashPassword(password);
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (role !== undefined) updates.role = role;
    if (is_verified !== undefined) updates.is_verified = is_verified;

    await user.update(updates);
    const { password: _, ...userOut } = user.toJSON();
    return success(res, userOut, 'User updated');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/admin/users/:id
async function deleteUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'User not found', 404);
    if (user.id === req.user.id) return error(res, 'Cannot delete your own account', 400);
    await user.destroy();
    return success(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardStats, getUsers, createUser, updateUser, deleteUser, getAnalytics };
