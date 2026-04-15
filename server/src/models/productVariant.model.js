const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductVariant = sequelize.define(
  'ProductVariant',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    /** Empty string if the product has no size dimension */
    size: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '',
    },
    /** Empty string if the product has no color dimension */
    color: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
  },
  {
    tableName: 'product_variants',
    indexes: [
      {
        unique: true,
        fields: ['product_id', 'size', 'color'],
        name: 'uniq_product_variant_size_color',
      },
    ],
  }
);

module.exports = ProductVariant;
