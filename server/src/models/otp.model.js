const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OTP = sequelize.define(
  'OTP',
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
    otp_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    purpose: {
      type: DataTypes.ENUM('register', 'password_reset'),
      defaultValue: 'register',
    },
    sends_today: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    last_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    send_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: 'otps',
  }
);

module.exports = OTP;
