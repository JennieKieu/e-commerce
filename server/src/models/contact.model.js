const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contact = sequelize.define(
  'Contact',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('new', 'in_progress', 'resolved', 'closed'),
      defaultValue: 'new',
      allowNull: false,
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'contacts',
  }
);

module.exports = Contact;
