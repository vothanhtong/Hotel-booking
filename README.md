# Hotel Booking System

A full-stack hotel booking platform with a customer-facing website, an admin dashboard, and a REST API backed by MongoDB.

## Features

**Customer site**
- Browse hotels by city and property type
- Search with date range, guest count, room count, price and rating filters
- Hotel detail page with available-room calculation per date range
- Booking flow, profile editing, password change, transaction history and cancellation
- Dark / light theme

**Admin dashboard**
- KPI dashboard (users, orders, earnings, monthly average revenue)
- Monthly revenue chart
- Hotel and room management (create, update, delete)
- User management (create, edit, delete, promote to admin)
- Transaction management with status changes and edit history

**API**
- JWT authentication (`Authorization: Bearer <token>`)
- Password hashing with bcrypt
- Availability checks that ignore cancelled bookings
- ObjectId and date-range validation with proper `400` / `404` responses

## Tech stack

| Layer | Technology |
|---|---|
| API | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB |
| Auth | JSON Web Token, bcryptjs |
| Customer site | React 18, React Router 6, Bootstrap 5, react-date-range |
| Admin dashboard | React 18, React Router 6, Bootstrap 5 |
| Tooling | react-scripts 5, nodemon |

## Repository layout

```
hotel-booking-node-app/           # Express REST API (this repository)
hotel-booking-react-client-app/   # customer website  -> http://localhost:3000
hotel-booking-react-admin-app/    # admin dashboard   -> http://localhost:3003
```

The two React apps are maintained as separate repositories. Both call the API at
`http://localhost:8080`.

## Requirements

- **Node.js 24 LTS** (recommended via nvm)
- MongoDB running on `127.0.0.1:27017`

> **Node 25 is not supported.** Node 25 removed `SlowBuffer`, which
> `jsonwebtoken` uses indirectly through `buffer-equal-constant-time`. The API
> crashes on startup with:
> `TypeError: Cannot read properties of undefined (reading 'prototype')`.
> Use Node 24 for every app.

## Getting started

### 1. Start MongoDB

```bash
brew services start mongodb-community
# or run mongod manually
```

### 2. API

```bash
nvm use 24
cd hotel-booking-node-app
npm install
npm start        # node app.js
# or: npm run dev  (nodemon)
```

Create `.env` in `hotel-booking-node-app/`:

```env
MONGODB_URI=mongodb://localhost:27017/booking
PORT=8080
SECRET_KEY=replace-with-a-long-random-secret
```

`.env` is git-ignored. Never commit real secrets.

API runs at **http://localhost:8080**.

### 3. Customer site

```bash
nvm use 24
cd hotel-booking-react-client-app
npm install
npm start        # http://localhost:3000
```

### 4. Admin dashboard

```bash
nvm use 24
cd hotel-booking-react-admin-app
npm install
npm start        # http://localhost:3003
```

## Ports

| Service | URL |
|---|---|
| REST API | http://localhost:8080 |
| Customer site | http://localhost:3000 |
| Admin dashboard | http://localhost:3003 |
| MongoDB | mongodb://localhost:27017/booking |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | — | MongoDB connection string |
| `PORT` | `8080` | API port |
| `SECRET_KEY` | insecure fallback | JWT signing secret; must be set in production |

## First run

The database starts empty. To populate it:

1. Create an admin account:

   ```bash
   curl -X POST http://localhost:8080/admin-signup \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"secret123","fullname":"Admin"}'
   ```

2. Log in at http://localhost:3003 to receive `adminToken`.
3. Add rooms and hotels from the dashboard.

## API reference

### Auth (public)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/signup` | Register a customer |
| POST | `/login` | Customer login |
| POST | `/admin-signup` | Register an admin |
| POST | `/admin-login` | Admin login |

### Public

| Method | Endpoint | Description |
|---|---|---|
| GET | `/properties-count` | Hotel count per city |
| GET | `/types-count` | Hotel count per property type |
| GET | `/top-rated-hotels` | Top 3 hotels by rating |
| POST | `/search-hotels` | Search by city, dates, guests, price, rating |
| POST | `/fetch-hotel` | Hotel detail |
| POST | `/fetch-available-rooms` | Available rooms for a date range |

### Customer (Bearer token)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/transaction` | Create a booking |
| POST | `/cancel-transaction` | Cancel own booking |
| POST | `/all-transactions` | List own transactions |
| GET | `/profile` | Get own profile |
| PUT | `/profile` | Update own profile |
| POST | `/change-password` | Change password |

### Admin (Bearer token)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/get-board-info` | Dashboard KPIs |
| GET | `/revenue-stats?year=YYYY` | Monthly revenue |
| GET | `/hotel-list` | All hotels |
| GET | `/room-list` | All rooms |
| GET | `/users` | All users |
| GET | `/transaction-history/:id` | Status edit history |
| POST/PUT | `/add-hotel` | Create or update a hotel |
| POST/PUT | `/add-room` | Create or update a room |
| POST | `/delete-hotel` | Delete a hotel |
| POST | `/delete-room` | Delete a room |
| POST | `/fetch-hotel` | Hotel detail |
| POST | `/fetch-room` | Room detail |
| POST | `/create-user` | Create a user |
| POST | `/edit-user` | Update a user |
| POST | `/delete-user` | Delete a user |
| GET | `/all-transactions` | All transactions |
| POST | `/update-transaction-status` | Change status and record history |

## Business rules

- **Availability:** bookings with status `Booked` or `Pending` occupy rooms;
  `Cancelled` bookings do not.
- **Revenue:** earnings and the revenue chart count only `Booked` transactions.
  The order count includes every non-cancelled transaction.
- **Validation:** malformed ids return `400`; valid but missing resources return
  `404`; invalid date ranges return `400`.
- **Status history:** changing a transaction to its current status does not add
  an `editHistory` entry.
- Hotels and rooms referenced by a transaction cannot be deleted (`403`).

## Data model

| Model | Key fields |
|---|---|
| `User` | `email`, `password` (bcrypt), `username`, `fullname`, `phone`, `isAdmin` |
| `Hotel` | `name`, `type`, `city`, `address`, `photos[]`, `rooms[]`, `cheapestPrice`, `rating` |
| `Room` | `title`, `price`, `maxPeople`, `roomNumbers[]` |
| `Transaction` | `user`, `hotel`, `room[]`, `dateStart`, `dateEnd`, `price`, `payment`, `status`, `editHistory[]` |

## Known limitations

- Admin endpoints authenticate the token but do not yet verify `isAdmin`.
- `/admin-signup` is publicly reachable.
- `GET /users` includes password hashes.
- `/all-transactions` (customer) trusts the user id from the request body.
- JWTs have no expiration and fall back to a default secret when `SECRET_KEY` is unset.
- The React apps hardcode `http://localhost:8080` as the API base URL.
- No automated test suite; API was verified with smoke tests.

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the API |
| `npm run dev` | Start with nodemon |
| `npm test` | Placeholder (no tests yet) |
