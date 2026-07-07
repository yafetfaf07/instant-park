<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtoken" alt="JWT" />
</p>

<h1 align="center">Instant Park 🅿️</h1>

<p align="center">
  A comprehensive parking management platform for <strong>Addis Ababa</strong> — enabling drivers to find, reserve, and pay for parking while providing real-time oversight for owners, wardens, and administrators.
</p>

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [User Roles](#user-roles)
- [Core Business Flow](#core-business-flow)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Seed Data](#seed-data)
- [Known Issues](#known-issues)

---

## Overview

**Instant Park** is a backend platform that digitizes parking in Addis Ababa. It connects **Customers** (drivers), **Parking Avenue Owners** (lot operators), **Wardens** (on-site attendants), and **Administrators** (city-wide regulators) in a single system.

### Key Features

- **Search & Reserve** — Find nearby parking avenues by location (Haversine), filter by type, and reserve spots in advance
- **Check-In / Check-Out** — Walk-in or reservation-based check-in with automated billing (including overstay penalties)
- **Payments** — Integrated with **Chapa** (Ethiopian payment gateway) for online payments
- **Real-Time Monitoring** — Server-Sent Events (SSE) for live activity streams
- **AI Predictions** — Machine learning (RandomForest) predicts occupancy rates by hour/day
- **AI Insights** — Google Gemini generates business summaries and recommendations
- **Scheduled Tasks** — Hourly occupancy snapshots, 15-minute reservation reminders via SMS, temp cleanup
- **Role-Based Access** — Four distinct roles with granular permissions (JWT + OTP auth)
- **Incident Reporting** — Wardens and customers can file reports (accident, theft, etc.)
- **Reviews & Favorites** — Customers can rate and save favorite parking locations

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Instant Park API                             │
│                    (NestJS — Port 3000)                              │
│                                                                     │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────────┐   │
│  │  Auth    │ │  Parking     │ │  Check-In  │ │  Payment      │   │
│  │  Module  │ │  Avenue Mod  │ │  Module    │ │  Module       │   │
│  ├──────────┤ ├──────────────┤ ├────────────┤ ├───────────────┤   │
│  │  Admin   │ │  Warden      │ │  Customer  │ │  Incident     │   │
│  │  Module  │ │  Module      │ │  Module    │ │  Report Mod   │   │
│  ├──────────┤ ├──────────────┤ ├────────────┤ ├───────────────┤   │
│  │  Vehicle │ │  Email       │ │  SMS       │ │  Tasks        │   │
│  │  Module  │ │  Module      │ │  Module    │ │  Module       │   │
│  └──────────┘ └──────────────┘ └────────────┘ └───────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                DatabaseModule (Prisma Client)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
  ┌──────────────┐     ┌──────────────────────┐
  │  PostgreSQL  │     │  Python FastAPI      │
  │  (Prisma)    │     │  AI Microservice     │
  │              │     │  (Port 8000)         │
  │  - Customers │     │  - /predict          │
  │  - Parking   │     │  - RandomForest      │
  │  - Reservat. │     └──────────────────────┘
  │  - etc.      │
  └──────────────┘
```

### External Services

| Service | Usage |
|---|---|
| **Chapa** | Ethiopian payment gateway (initialize, confirm, webhook) |
| **AfroMessage** | SMS/OTP delivery for customer and warden authentication |
| **Resend** | Email delivery (verification, password reset, credentials) |
| **Google Gemini API** | AI-powered business insights (admin + owner dashboards) |

---

## User Roles

### 1. Customer (Driver)
- **Auth:** OTP via SMS (phone number)
- **Capabilities:**
  - Search for nearby parking avenues by location
  - Register and manage vehicles
  - Reserve parking spots in advance
  - Check in (walk-in or reservation), check out with automatic billing
  - Pay via Chapa
  - Save favorite parking avenues
  - Leave reviews and ratings
  - Report incidents

### 2. Parking Avenue Owner (Lot Operator)
- **Auth:** Username/password (bcrypt hashed)
- **Capabilities:**
  - Register and manage their parking avenues
  - Upload legal documents and images
  - View real-time occupancy dashboard
  - Revenue analytics and trends
  - AI-generated business insights
  - Manage wardens (create, reassign, delete)
  - View incident reports for their avenues
  - Forgot/reset password via email

### 3. Warden (On-Site Attendant)
- **Auth:** OTP via SMS (phone number), auto-set to ONDUTY on login
- **Capabilities:**
  - View check-ins and reservations for their assigned avenue
  - File incident reports
  - Log in/out (ONDUTY / OFFDUTY status tracking)

### 4. Admin (System Administrator)
- **Auth:** Username/password
- **Capabilities:**
  - Approve or reject parking avenue owners (with personal ID verification)
  - Approve or reject parking avenue registrations
  - Register owners and parking avenues directly
  - System-wide dashboard with KPIs
  - View weekly utilization, peak demand, revenue trends
  - AI-generated executive summaries
  - Live activity stream (SSE)
  - Warden overview across all avenues

---

## Core Business Flow

### Reservation Flow

```
Customer searches     →     Customer reserves     →     Initialize Chapa payment
  nearby avenues                a parking spot            via /payment/initialize
       │                            │                            │
       ▼                            ▼                            ▼
Payment confirmed           QR Code generated          Reservation marked
via /payment/confirm        (returned to client)       → CONFIRMED
or webhook                                          → Decrement currentSpots
       │
       ▼
Customer arrives           Reservation verified       → Check-in auto-created
→ /reservation/verify      via QR code                → Reservation → FULFILLED
```

### Check-In / Check-Out Flow

```
       Walk-In                               Reservation
         │                                       │
         ▼                                       ▼
  POST /check-in                         POST /check-in (with ref)
  (licensePlate + avenueId)              (automatic on verify)
  → Decrement currentSpots               → Decrement currentSpots
  → Status: ACTIVE                       → Status: ACTIVE
         │                                       │
         ▼                                       ▼
         └────────── Both flow to ───────────────┘
                              │
                              ▼
                     POST /check-in/exit
                     (licensePlate)
                              │
              ┌───────────────┼───────────────┐
              ▼                               ▼
      Within reservation                Overstay / Walk-in
      time (no charge)                  → Calculate amount
              │                         → Initiate walk-in payment
              ▼                         → Status: PAYMENT_PENDING
      Status: COMPLETED                 → On confirm: COMPLETED
      Increment currentSpots            → Increment currentSpots
```

### Pricing Rules

| Scenario | Charge |
|---|---|
| Reservation — checked out within time | Free (included in reservation) |
| Reservation — overstay | **2× hourly rate** for extra hours |
| Walk-in | Standard hourly rate for all hours |

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **NestJS** | ^11.0.1 | Application framework |
| **TypeScript** | ^5.7.3 | Language |
| **Prisma** | ^6.17.0 | ORM / database client |
| **PostgreSQL** | — | Database |
| **Passport + JWT** | — | Authentication |
| **bcrypt** | ^6.0.0 | Password hashing |
| **class-validator / class-transformer** | — | DTO validation |
| **Multer** | ^2.0.2 | File upload handling |
| **QRCode** | ^1.5.4 | QR code generation |
| **UUID** | ^13.0.0 | Unique ID generation |

### NestJS Modules / Integrations

| Package | Purpose |
|---|---|
| `@nestjs/config` | Environment configuration |
| `@nestjs/swagger` | API documentation (Swagger UI at `/api`) |
| `@nestjs/event-emitter` | Event-driven SSE streams |
| `@nestjs/schedule` | Cron jobs |
| `@nestjs/throttler` | Rate limiting (20 req/60s) |
| `@nestjs/passport` | Passport integration |
| `@nestjs/jwt` | JWT token management |
| `@nestjs/axios` | HTTP client (Chapa, AfroMessage APIs) |
| `@nestjs/platform-express` | Express platform |

### External API Integrations

| Service | Package | Purpose |
|---|---|---|
| **Chapa** | `axios` (custom) | Payment initialization, confirmation, webhooks |
| **AfroMessage** | `axios` (custom) | SMS/OTP delivery |
| **Resend** | `resend` ^6.9.4 | Email service |
| **Google Gemini** | `@google/generative-ai` ^0.24.1 | AI business insights |

### AI / ML Microservice

| Technology | Purpose |
|---|---|
| **Python + FastAPI** | Occupancy prediction API (port 8000) |
| **scikit-learn** | RandomForestRegressor (100 trees, max_depth=10) |

---

## Project Structure

```
instant-park/
├── ai/
│   └── predictive-model/        # Python FastAPI microservice
│       ├── main.py              # API server (POST /predict)
│       ├── train_model.py       # Model training script
│       └── generate_data.py     # Mock data generator
├── prisma/
│   ├── schema.prisma            # Database schema (14 models)
│   ├── seed.ts                  # Faker-based seed script
│   ├── seed2.ts                 # Additional seed data
│   └── migrations/              # Prisma migrations
├── src/
│   ├── main.ts                  # Bootstrap (Swagger, CORS, ValidationPipe)
│   ├── app.module.ts            # Root module
│   ├── app.controller.ts        # GET /
│   ├── admin/                   # Admin auth + dashboard + approvals
│   ├── ai-analytics/            # Google Gemini insight service
│   ├── auth/                    # Customer auth (register, OTP, JWT)
│   ├── check-in/                # Check-in/check-out logic
│   ├── customer/                # Favorites + reviews
│   ├── database/                # Prisma client wrapper
│   ├── email/                   # Resend email service
│   ├── event/                   # LiveActivityEvent for SSE
│   ├── incident-report/         # Incident reporting
│   ├── parking-avenue/          # Avenue CRUD, search, reservations
│   ├── parking-avenue-owner/    # Owner auth + dashboards + analytics
│   ├── payment/                 # Chapa integration
│   ├── sms/                     # AfroMessage SMS service
│   ├── tasks/                   # Cron jobs
│   ├── vehicle/                 # Customer vehicle management
│   └── warden/                  # Warden CRUD, auth, status
├── uploads/                     # File uploads destination
├── test/                        # E2E tests
├── todo.txt                     # Known issues / planned work
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## Database Schema

14 models — all stored in PostgreSQL via Prisma:

| Model | Key Fields | Relationships |
|---|---|---|
| **Customer** | `id` (uuid), `firstName`, `lastName`, `username`, `phoneNo`, `gender`, `location` | → Vehicle, Reservation, CheckIn, IncidentReport, Review, Favorite |
| **ParkingAvenueOwner** | `id`, `firstName`, `lastName`, `username` (unique), `password`, `phoneNo`, `email`, `isVerified`, `personalId` | → ParkingAvenue |
| **ParkingAvenue** | `id`, `name` (unique), `address`, `lat/lng`, `ownerId`, `hourlyRate`, `type` (ON_STREET/OFF_STREET), `totalSpots`, `currentSpots`, `status`, `subCity` | → ParkingAvenueOwner; ← Reservation, CheckIn, Warden, Image, OccupancyLog, IncidentReport, Review, Favorite |
| **Admin** | `id`, `username`, `password` | (standalone) |
| **Reservation** | `id`, `bookingRef`, `startTime`, `endTime`, `durationHours`, `totalPrice`, `status` (string), `qrCode`, `plateNumber` | → Customer, ParkingAvenue; → CheckIn |
| **Vehicle** | `id` (autoincrement), `licensePlate` | → Customer; unique per owner |
| **CheckIn** | `id`, `licensePlate`, `status` (ACTIVE/PAYMENT_PENDING/COMPLETED), `calculatedAmount` | → ParkingAvenue, Customer (opt), Reservation (opt) |
| **Temp** | `id`, `verificationId`, `code` | Temporary OTP storage |
| **Warden** | `id`, `firstName`, `username`, `phoneNo`, `wardenStatus` (ONDUTY/OFFDUTY) | → ParkingAvenue; → IncidentReport |
| **ParkingAvenueImage** | `id`, `photosUrl` | → ParkingAvenue |
| **OccupancyLog** | `id`, `timestamp`, `hour`, `dayOfWeek`, `isWeekend`, `totalSpots`, `currentSpots`, `occupancyRate` | → ParkingAvenue |
| **IncidentReport** | `id`, `category` (ACCIDENT/THEFT/etc.), `reason` | → ParkingAvenue, Customer (opt), Warden (opt) |
| **Review** | `id`, `rating`, `comment` | → Customer + ParkingAvenue; unique per customer+avenue |
| **Favorite** | `id` | → Customer + ParkingAvenue; unique per customer+avenue |

### Enums

- `Gender`: MALE, FEMALE
- `SUBCITY`: ADDISKETEMA, AKAKYKALITI, ARADA, BOLE, GULLELE, KIRKOS, KOLFEKERANIO, LIDETA, NIFASSILKLAFTO, YEKA, LEMIKURA
- `PARKINGSTATUS`: OPEN, CLOSED, MAINTENANCE
- `ParkingAvenueType`: ON_STREET, OFF_STREET
- `WardenStatus`: ONDUTY, OFFDUTY
- `ApprovalStatus`: UNDERREVIEW, APPROVED, REJECTED
- `ReportCategory`: ACCIDENT, THEFT, PARKINGSPACETAKEN, OTHER

---

## API Reference

**Base URL:** `http://localhost:3000`
**Swagger UI:** `http://localhost:3000/api`

### Auth (`/auth`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register customer (sends OTP via SMS) |
| POST | `/auth/verify` | — | Verify OTP, create customer, return JWT |
| POST | `/auth/sendlogin` | — | Send OTP for login |
| POST | `/auth/verifylogin` | — | Verify login OTP, return JWT |
| GET | `/auth/me` | JWT | Current customer profile |
| PATCH | `/auth/update-customer` | JWT | Update customer profile |
| GET | `/auth/validate-token` | JWT | Validate current token |

### Parking Avenue (`/parking-avenue`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/parking-avenue` | JWT | Register avenue (multipart: legal doc + images) |
| GET | `/parking-avenue/list` | JWT | Owner's avenues (cursor paginated) |
| GET | `/parking-avenue/search` | — | Find nearby avenues (lat, lng, radius) |
| GET | `/parking-avenue/:id` | — | Avenue detail (includes AI occupancy prediction) |
| POST | `/parking-avenue/reserve` | JWT | Create reservation |
| GET | `/parking-avenue/reservations/avenue/:id` | JWT | Reservations for an avenue (warden) |
| GET | `/parking-avenue/reservations/user/:id` | — | Reservations for a user |
| GET | `/parking-avenue/reservation/verify` | — | Verify payment & auto-check-in |
| PATCH | `/parking-avenue/:id` | JWT | Update avenue |
| DELETE | `/parking-avenue/:id` | JWT | Delete avenue |

### Check-In (`/check-in`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/check-in` | — | Check-in (walk-in or reservation) |
| GET | `/check-in/details` | — | Check-in details (hours stayed, amount) |
| DELETE | `/check-in/exit` | — | Check-out (triggers payment if needed) |

### Payment (`/payment`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/payment/initialize` | — | Initialize Chapa payment |
| POST | `/payment/confirm` | — | Confirm payment & generate QR code |
| POST | `/payment/webhook` | — | Chapa webhook listener |

### Warden (`/warden`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/warden` | JWT | Create warden (by owner) |
| POST | `/warden/sendlogin` | — | Send OTP for warden login |
| POST | `/warden/verifylogin` | — | Verify OTP, login, set ONDUTY |
| POST | `/warden/logout` | JWT | Logout, set OFFDUTY |
| PATCH | `/warden/reassign/warden` | JWT | Reassign warden to another avenue |

### Admin (`/admin`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/admin/register` | — | Register admin |
| POST | `/admin/login` | — | Admin login |
| GET | `/admin/dashboard` | — | Main dashboard stats |
| PATCH | `/admin/update-verification-status` | JWT | Approve/reject owner |
| PATCH | `/admin/update-approval-status` | JWT | Approve/reject avenue |
| SSE | `/admin/live-activity` | — | Real-time system events stream |

### Parking Avenue Owner (`/parking-avenue-owner`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/parking-avenue-owner/register` | — | Register with personal ID upload |
| POST | `/parking-avenue-owner/login` | — | Login |
| GET | `/parking-avenue-owner/dashboard/overview` | JWT | Dashboard KPIs |
| GET | `/parking-avenue-owner/kpis` | JWT | Analytics KPIs |
| GET | `/parking-avenue-owner/ai-insight` | JWT | AI business insights |

### Vehicle (`/vehicle`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/vehicle` | JWT | Add vehicle |
| GET | `/vehicle` | JWT | List user's vehicles |
| DELETE | `/vehicle/:license` | JWT | Remove vehicle |

### Customer (`/customer`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/customer/favorites/:avenueId` | JWT | Add favorite |
| DELETE | `/customer/favorites/:avenueId` | JWT | Remove favorite |
| GET | `/customer/favorites` | JWT | List favorites |
| POST | `/customer/reviews/:avenueId` | JWT | Submit/update review |

### Incident Report (`/incident-report`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/incident-report` | JWT | Create report (customer/warden) |
| GET | `/incident-report/owner/:parkingAvenueId` | JWT | Owner views reports |
| GET | `/incident-report/warden-view` | JWT | Warden views reports |

---

## Getting Started

### Prerequisites

- **Node.js** >= 22
- **npm** >= 10
- **PostgreSQL** (running)
- **Python** >= 3.8 (for AI microservice — optional)

### 1. Clone & Install

```bash
git clone <repository-url>
cd instant-park
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/instant-park"

# JWT
JWT_SECRET=your-jwt-secret

# Chapa (Payment)
CHAPA_SECRET_KEY=your-chapa-secret-key

# AfroMessage (SMS)
AFROMESSAGE_API_KEY=your-afromessage-api-key
AFROMESSAGE_SENDER_ID=your-sender-id

# Resend (Email)
RESEND_API_KEY=your-resend-api-key

# Google Gemini (AI Insights)
GEMINI_API_KEY=your-gemini-api-key

# App
PORT=3000
```

### 3. Database Setup

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Seed Data (Optional)

```bash
npx prisma db seed
```

### 5. Start the Server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 6. Start AI Microservice (Optional)

```bash
cd ai/predictive-model
pip install -r requirements.txt   # fastapi, uvicorn, scikit-learn, pandas, numpy
python train_model.py             # train and save model
uvicorn main:app --port 8000
```

### 7. Access API

- **API:** `http://localhost:3000`
- **Swagger UI:** `http://localhost:3000/api`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `CHAPA_SECRET_KEY` | Yes | Chapa payment gateway secret |
| `AFROMESSAGE_API_KEY` | Yes | AfroMessage SMS API key |
| `AFROMESSAGE_SENDER_ID` | Yes | SMS sender identifier |
| `RESEND_API_KEY` | No | Resend email API key |
| `GEMINI_API_KEY` | No | Google Gemini API key |
| `PORT` | No | Server port (default: 3000) |

---

## Seed Data

The seed script (`prisma/seed.ts`) generates:

- 1 test customer
- 1 parking avenue owner
- 1 parking avenue (Bole subcity, 100 spots)
- 10,000 occupancy logs (last 30 days)
- 10,000 reservations (spread across 2023–2026)
- 10,000 check-ins (50% reservation, 50% walk-in)

```bash
npx prisma db seed
```

---

## Cron Jobs (Scheduled Tasks)

| Task | Interval | Description |
|---|---|---|
| **Occupancy Log** | Every hour | Snapshots `currentSpots` and `totalSpots` for all avenues into `OccupancyLog` |
| **Reservation Reminder** | Every 1 minute | Checks for reservations ending in ~15 minutes, sends SMS reminder |
| **Temp Cleanup** | Every 1 minute | Deletes expired OTP records (older than 5 minutes) from `Temp` table |

---

## Known Issues

From `todo.txt` and code review:

1. **`isVerified` on wrong model** — Currently on `ParkingAvenueOwner`; should be on `ParkingAvenue`
2. **Reservation status as string** — Should be a Prisma enum instead of a plain `String`
3. **Customer missing `email` field** — No `email` field on the `Customer` model
4. **Cover image upload** — Need to handle cover image upload when creating a parking avenue
5. **Auth guard removed** — Several endpoints have `@UseGuards(JwtAuthGuard)` commented out due to 401 errors; needs investigation
6. **Hardcoded phone number** — `payment.service.ts` uses `"0900123456"` instead of the actual customer's phone
7. **Availability logic** — Reservation availability checks against `currentSpots` instead of `totalSpots - confirmedReservations`

---

## License

UNLICENSED — Private project.
