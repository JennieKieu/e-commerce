require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { sequelize } = require('./models');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler.middleware');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const logger = require('./utils/logger');
const { purgeExpiredTokens } = require('./services/auth.service');

const app = express();
const PORT = process.env.PORT || 5000;

// Security — mặc định Helmet chặn ảnh cross-origin (img-src chỉ 'self').
// Ảnh sản phẩm dùng Cloudinary, Unsplash, v.v. → cho phép https: cho img-src.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      },
    },
  })
);
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing & cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// Global rate limiter
app.use(generalLimiter);

// API Routes
app.use('/api/v1', routes);

// Unmatched /api/* → JSON 404 (tránh rơi vào SPA)
app.use('/api', (req, res) => {
  res.status(404).json({ code: 404, message: 'Route not found' });
});

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
const indexHtml = path.join(clientDist, 'index.html');
const serveSpa =
  process.env.NODE_ENV === 'production' && fs.existsSync(indexHtml);

if (serveSpa) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(indexHtml);
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ code: 404, message: 'Route not found' });
  });
}

// Global error handler
app.use(errorHandler);

// Sync DB & start server
async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database synchronized');

    // Periodic cleanup of expired tokens every 6h
    setInterval(purgeExpiredTokens, 6 * 60 * 60 * 1000);

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

startServer();

module.exports = app;
