const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    order_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
      defaultValue: 'pending',
    },
    total_amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    /** Delivery fee charged for this order (0 when free shipping applies). */
    shipping_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    shipping_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    shipping_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    shipping_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'orders',
  }
);

module.exports = Order;
