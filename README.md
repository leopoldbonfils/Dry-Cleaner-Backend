# CleanPro Backend API

A Node.js/Express REST API for the CleanPro dry cleaning business management system, backed by PostgreSQL.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (via `pg` connection pool)
- **Authentication:** JWT (`jsonwebtoken`) + OTP via email
- **Email:** Brevo Transactional API (SMTP relay)
- **Password Hashing:** `bcryptjs`
- **Environment:** `dotenv`

---

## Project Structure

```
backend/
├── server.js                        # Entry point — boots DB, tables, email, server
├── .env                             # Environment variables (never commit)
│
├── src/
│   ├── config/
│   │   └── database.js              # Pool init, DB auto-creation
│   │
│   ├── controllers/
│   │   ├── authController.js        # Register, login, OTP, password reset, profile
│   │   └── ordersController.js      # CRUD orders, search, stats, email notifications
│   │
│   ├── database/
│   │   ├── initTables.js            # Creates orders + order_items tables (idempotent)
│   │   ├── initUsers.js             # Creates users table + updated_at trigger
│   │   └── addClientEmail.js        # Migration guard — adds client_email column
│   │
│   ├── middleware/
│   │   └── authenticate.js          # JWT Bearer token verification
│   │
│   ├── models/
│   │   ├── User.js                  # User CRUD, OTP, password hashing
│   │   └── Order.js                 # Order CRUD, search, stats, item aggregation
│   │
│   ├── routes/
│   │   ├── auth.js                  # /api/auth/*
│   │   └── orders.js                # /api/orders/* (all protected)
│   │
│   ├── services/
│   │   └── emailService.js          # Brevo API — OTP, reset, order confirmation, order ready
│   │
│   └── utils/
│       └── helpers.js               # Order code gen, currency, validation, case conversion
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the root:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=cleanpro_db

# Email (Brevo)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=your_brevo_smtp_user
EMAIL_PASSWORD=your_brevo_api_key
EMAIL_FROM=your_verified_sender@example.com

# JWT
JWT_SECRET=your_super_secret_jwt_key
```

> **Note:** `EMAIL_FROM` must be a verified sender in your Brevo dashboard, otherwise email delivery will silently fail.

### 3. Start the server

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

On first run the server will automatically:
1. Create the `cleanpro_db` PostgreSQL database if it doesn't exist
2. Create all required tables (`users`, `orders`, `order_items`)
3. Run migration guards to add any missing columns
4. Verify the email service connection

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: `5000`) |
| `NODE_ENV` | No | `development` prints OTPs to console |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | Yes | PostgreSQL port (default: `5432`) |
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `DB_NAME` | Yes | Database name (auto-created if missing) |
| `EMAIL_USER` | Yes | Brevo SMTP username |
| `EMAIL_PASSWORD` | Yes | Brevo API key |
| `EMAIL_FROM` | Yes | Verified sender email address |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |

---

## API Reference

### Base URL
```
http://localhost:5000/api
```

---

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register a new user |
| POST | `/login` | ❌ | Login — sends OTP to email |
| POST | `/verify-otp` | ❌ | Verify OTP — returns JWT token |
| POST | `/resend-otp` | ❌ | Resend login OTP |
| POST | `/forgot-password` | ❌ | Send password reset OTP |
| POST | `/verify-reset-otp` | ❌ | Verify reset OTP (does not clear it) |
| POST | `/reset-password` | ❌ | Reset password using email + OTP |
| GET | `/profile` | ❌ | Get user profile by email |
| PUT | `/profile` | ❌ | Update profile (name, phone, business) |
| PUT | `/change-password` | ❌ | Change password (requires current password) |

#### Register `POST /api/auth/register`
```json
{
  "fullName": "Jean Marie",
  "email": "jean@example.com",
  "phone": "0781234567",
  "businessName": "Fresh Clean",
  "password": "secret123"
}
```

#### Login `POST /api/auth/login`
```json
{
  "email": "jean@example.com",
  "password": "secret123"
}
```
Response includes `requiresVerification: true` — proceed to `/verify-otp`.

#### Verify OTP `POST /api/auth/verify-otp`
```json
{
  "email": "jean@example.com",
  "otp": "123456"
}
```
Response includes `token` (JWT) — store in `localStorage` as `token`.

---

### Orders Routes — `/api/orders`

All routes require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get all orders for the authenticated user |
| GET | `/stats` | Get dashboard stats (today's orders, income, unpaid) |
| GET | `/search?query=` | Search by order code, client name, or phone |
| GET | `/:id` | Get single order by ID |
| POST | `/` | Create a new order |
| PUT | `/:id` | Update order status or payment |
| DELETE | `/:id` | Delete an order |

#### Create Order `POST /api/orders`
```json
{
  "client_name": "Alice Uwase",
  "client_phone": "0789876543",
  "client_email": "alice@example.com",
  "items": [
    { "type": "Shirt", "quantity": 3, "price": 1500 },
    { "type": "Suit", "quantity": 1, "price": 5000 }
  ],
  "payment_method": "Mobile Money",
  "payment_status": "Unpaid",
  "total_amount": 9500
}
```

#### Update Order `PUT /api/orders/:id`
```json
{
  "status": "Ready",
  "payment_status": "Paid"
}
```
> Setting `status` to `"Ready"` triggers an automatic **order ready** email to the client (if email was provided).

#### Stats Response
```json
{
  "todayOrders": 5,
  "pendingOrders": 12,
  "todayIncome": 45000,
  "unpaidAmount": 78000
}
```

---

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server + DB status check |

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `full_name` | VARCHAR(100) | |
| `email` | VARCHAR(255) UNIQUE | |
| `phone` | VARCHAR(20) | |
| `business_name` | VARCHAR(100) | |
| `password_hash` | VARCHAR(255) | bcrypt |
| `is_verified` | BOOLEAN | Set `true` after OTP |
| `otp_code` | VARCHAR(6) | Cleared after use |
| `otp_expires_at` | TIMESTAMP | 10-minute window |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | Auto-updated via trigger |

### `orders`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `user_id` | INT FK → users | Owner of the order |
| `order_code` | VARCHAR(50) UNIQUE | Auto-generated (e.g. `DC7318042`) |
| `client_name` | VARCHAR(100) | |
| `client_phone` | VARCHAR(20) | |
| `client_email` | VARCHAR(255) | Optional — enables email notifications |
| `status` | VARCHAR(20) | `Pending` \| `Washing` \| `Ironing` \| `Ready` \| `Picked Up` |
| `payment_method` | VARCHAR(20) | `Cash` \| `Mobile Money` \| `Bank Card` |
| `payment_status` | VARCHAR(10) | `Paid` \| `Unpaid` \| `Partial` |
| `total_amount` | NUMERIC(10,2) | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | Auto-updated via trigger |

### `order_items`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `order_id` | INT FK → orders | Cascade delete |
| `type` | VARCHAR(50) | Clothing type label |
| `quantity` | INT | |
| `price` | NUMERIC(10,2) | Price per unit |

---

## Email Notifications

The following emails are sent automatically via Brevo:

| Trigger | Recipient | Template |
|---|---|---|
| Successful login | Business owner | OTP verification code |
| Forgot password | Business owner | Password reset code |
| New order created | Client (if email provided) | Order confirmation with item breakdown |
| Order status → `Ready` | Client (if email provided) | Order ready for pickup |

In `NODE_ENV=development`, OTPs are also printed to the console as a fallback.

---

## Authentication Flow

```
1. POST /api/auth/login
   └─ Validates password
   └─ Generates 6-digit OTP (expires in 10 min)
   └─ Sends OTP to registered email
   └─ Returns { requiresVerification: true }

2. POST /api/auth/verify-otp
   └─ Validates OTP against DB
   └─ Clears OTP, sets is_verified = true
   └─ Returns signed JWT (7-day expiry)

3. All /api/orders/* requests
   └─ Middleware reads Authorization: Bearer <token>
   └─ Verifies JWT, attaches req.user = { id, email }
```

---

## Development Notes

- **OTP console output:** When `NODE_ENV=development`, OTPs are logged to the console in a styled box so you can test without a working email setup.
- **Email failures are non-blocking:** If Brevo fails to send, the login/order creation still succeeds — the error is logged as a warning only.
- **Database auto-creation:** The server connects to the `postgres` maintenance database first, creates `cleanpro_db` if absent, then reconnects to it.
- **Idempotent migrations:** All `CREATE TABLE` and `ALTER TABLE` calls use `IF NOT EXISTS` / column existence checks, so restarting the server never breaks an existing database.
