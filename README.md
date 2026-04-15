# LuxeMode — Premium Fashion E-Commerce

A full-stack fashion e-commerce platform with luxury minimal design, built with Node.js + Express + MySQL + React + Vite.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js, Sequelize ORM |
| Database | MySQL 8 |
| Frontend | React 18, Vite, Tailwind CSS |
| Auth | JWT (access + refresh), bcrypt |
| Email OTP | Mailjet Transactional API v3.1 |
| Images | Cloudinary |
| State | Zustand + TanStack Query |

---

## Project Structure

```
e-commerce/
├── server/
│   ├── src/
│   │   ├── config/        # DB, Cloudinary, JWT config
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Auth, validate, upload, rate-limit
│   │   ├── models/        # Sequelize models
│   │   ├── routes/        # Express routes
│   │   ├── services/      # mailjet, otp, auth, cloudinary
│   │   └── utils/         # logger, apiResponse
│   ├── seeders/           # DB seed data
│   ├── .env.example
│   └── package.json
└── client/
    ├── src/
    │   ├── components/    # layout/, ui/
    │   ├── hooks/
    │   ├── pages/         # admin/
    │   ├── services/      # api.js (axios)
    │   └── store/         # Zustand stores
    ├── tailwind.config.js
    └── package.json
```

---

## Installation

### Prerequisites
- Node.js 20+
- MySQL 8 running locally
- Cloudinary account (free tier works)
- Mailjet account (free tier: 200 emails/day)

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

```bash
# Copy template
cp server/.env.example server/.env
```

Edit `server/.env` with your credentials:

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=fashion_ecommerce
DB_USER=root
DB_PASSWORD=your_mysql_password

JWT_ACCESS_SECRET=your_32_char_secret_here_minimum
JWT_REFRESH_SECRET=another_32_char_secret_here_min
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
MAILJET_FROM_EMAIL=verified@yourdomain.com
MAILJET_FROM_NAME=LuxeMode

OTP_LENGTH=6
OTP_TTL_MINUTES=10
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_SENDS_PER_DAY_PER_EMAIL=5

CLIENT_URL=http://localhost:5173
```

### 3. Create MySQL Database

```sql
CREATE DATABASE fashion_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Seed the Database

```bash
cd server
npm run seed
```

This creates:
- **Admin account**: `admin@luxemode.com` / `Admin@123456`
- **Demo customer**: `customer@demo.com` / `Customer@123`
- 3 categories: Men, Women, Kids
- 16 sample products with Unsplash images
- 1 hero banner

### 5. Run Development

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api/v1

### 6. Deploy (Render)

Production build: `npm install && npm run build` từ thư mục gốc (build client + cài server), sau đó `npm start` chạy Express và phục vụ `client/dist` cùng API.

Hướng dẫn chi tiết: MySQL bên ngoài, biến môi trường trên Render và kiểm tra sau deploy — xem [docs/DEPLOY-RENDER.md](docs/DEPLOY-RENDER.md). File [render.yaml](render.yaml) có thể dùng làm Blueprint.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register + send OTP email |
| POST | `/api/v1/auth/verify-otp` | Verify OTP → issue tokens |
| POST | `/api/v1/auth/resend-otp` | Resend OTP (cooldown + daily limit) |
| POST | `/api/v1/auth/login` | Login (requires verified email) |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET  | `/api/v1/auth/profile` | Get current user |
| PUT  | `/api/v1/auth/profile` | Update profile |

### Catalog
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/products` | List products (filter, sort, paginate) |
| GET | `/api/v1/products/:slug` | Product detail |
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/banners` | List active banners |

### Cart (authenticated)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/cart` | Get cart |
| POST | `/api/v1/cart/items` | Add item |
| PUT | `/api/v1/cart/items/:id` | Update quantity |
| DELETE | `/api/v1/cart/items/:id` | Remove item |
| POST | `/api/v1/cart/merge` | Merge guest cart on login |

### Orders (authenticated)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/orders/checkout` | Create order from cart |
| GET | `/api/v1/orders` | My orders |
| GET | `/api/v1/orders/:id` | Order detail |

### Admin (admin role required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | KPI stats |
| CRUD | `/api/v1/admin/products` | Manage products |
| CRUD | `/api/v1/admin/categories` | Manage categories |
| CRUD | `/api/v1/admin/orders` | Manage orders |
| CRUD | `/api/v1/admin/banners` | Manage banners |
| POST | `/api/v1/upload/image` | Upload image to Cloudinary |

---

## OTP Email Flow (Mailjet)

1. **Register** → creates user with `is_verified=false`, generates OTP, hashes with bcrypt, stores with 10-min TTL, sends email via Mailjet REST API
2. **Verify OTP** → compares hash, marks user `is_verified=true`, issues JWT tokens
3. **Resend OTP** → enforces 60s cooldown + max 5 sends/day/email; new OTP invalidates previous
4. **Login** → rejected if `is_verified=false`

All OTP codes are **never returned in API responses**. Mailjet credentials are in environment variables only.

---

## Manual Test Checklist

### Customer Flow
- [ ] Visit home page — hero banner, category cards, featured products load
- [ ] Navigate Men/Women/Kids via header
- [ ] Search for a product
- [ ] Open product detail — gallery, sizes, colors, add to cart
- [ ] Cart shows correct item count badge
- [ ] As guest: cart persists in localStorage
- [ ] Register with email → OTP email received → verify → logged in
- [ ] After login: guest cart merged with server cart
- [ ] Checkout with shipping address → order created
- [ ] View order in "My Orders"

### Admin Flow
- [ ] Login as admin@luxemode.com
- [ ] Admin panel → Dashboard shows KPIs
- [ ] Create a new product with Cloudinary image upload
- [ ] Update product price, toggle featured
- [ ] Change order status (pending → confirmed → shipped)
- [ ] Create a new category with image
- [ ] Update hero banner

---

## Design System

| Token | Value |
|---|---|
| Font | Inter |
| Background | `#FFFFFF` |
| Text primary | `#111111` |
| Text muted | `#6B7280` |
| Brand accent | `#2563EB` (blue-600) |
| Button radius | `9999px` (pill) |
| Input radius | `12px` |
| Card shadow | `0 2px 12px rgba(0,0,0,.06)` |

---

## Security

- Helmet for HTTP headers
- CORS restricted to client origin
- Rate limiting: auth (20/15min), OTP (5/min), global (300/15min)
- Passwords hashed with bcrypt (rounds: 12)
- OTP hashed with bcrypt (rounds: 10)
- JWT refresh tokens hashed with SHA-256 before DB storage
- HTTP-only cookie for refresh token
- Input validation on all endpoints (express-validator)
- No OTP/secrets in API responses or logs
