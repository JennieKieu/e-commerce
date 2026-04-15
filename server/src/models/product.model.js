const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(300),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    sale_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      validate: { min: 0 },
    },
    gender: {
      type: DataTypes.ENUM('men', 'women', 'kids', 'unisex'),
      allowNull: false,
    },
    sizes: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of available sizes, e.g. ["XS","S","M","L","XL"]',
    },
    colors: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of hex color codes or color names',
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    thumbnail_public_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'products',
  }
);

module.exports = Product;
