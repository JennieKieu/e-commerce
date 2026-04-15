const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Banner = sequelize.define(
  'Banner',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    subtitle: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    cta_text: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    cta_link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    image_public_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'banners',
  }
);

module.exports = Banner;
