# LibCab Project Documentation

## Overview
LibCab is a comprehensive ride-booking platform tailored for the Liberian market. It typically consists of a web application for riders, drivers, and administrators, and a mobile application for end-users. The system manages rides, drivers, payments (including Mobile Money), and specialized features like "Guest Booking" for users without smartphones.

## Tech Stack

### Monorepo
- **Manager**: pnpm
- **Workspace**: 
  - `web`: Next.js Web Application
  - `mobile`: Expo / React Native Application

### Web Application (`/web`)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: Custom (JWT/bcrypt based) + Guest Sessions
- **Testing**: Vitest, React Testing Library

### Mobile Application (`/mobile`)
- **Framework**: Expo (React Native)
- **Router**: Expo Router
- **Language**: TypeScript / JavaScript
- **Maps**: Google Maps Integration (implied by `GOOGLE_MAPS_NOTE.md`)

## Project Structure

```
c:\Projects\LibCab
├── mobile/                 # Expo Mobile App
│   ├── app/                # Expo Router pages
│   │   ├── (app)/          # Authenticated routes (Driver/Rider flows)
│   │   ├── _layout.tsx     # Root layout
│   │   └── index.tsx       # Entry screen
│   ├── context/            # Global State (AuthContext)
│   └── package.json
├── web/                    # Next.js Web App
│   ├── prisma/             # Database Schema & Seeds
│   ├── src/
│   │   ├── app/            # App Router pages (admin, rider, driver, auth)
│   │   ├── api/            # Backend API routes
│   │   ├── components/     # Reusable UI Components
│   │   └── lib/            # Utilities (db, auth, etc.)
│   └── package.json
├── package.json            # Root scripts
└── pnpm-workspace.yaml     # Workspace definition
```

## Database Schema (Key Models)
- **User**: Core user entity (Rider, Driver, Admin).
- **DriverProfile**: Extended details for drivers (Vehicle info, License, Live Location).
- **Ride**: Central booking entity. Tracks origin, destination, status (`REQUESTED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), fare, and payment.
- **GuestSession**: Support for temporary guest users (e.g. booking via phone call/dispatch).
- **PaymentTransaction**: Logs payments (Cash, Mobile Money).
- **Zone**: Pricing zones for dynamic fare calculation.
- **Announcement**: System-wide notifications.

## API Reference (Web)

### Public
- **GET** `/api/announcements`: Global announcements.
- **POST** `/api/auth/login`: User and Admin login.
- **POST** `/api/auth/signup`: User registration.

### Rides
- **POST** `/api/rides/guest`: Book a ride for a guest (Dispatch/Admin).
- **GET** `/api/rides/[id]`: Get ride details.
- **PATCH** `/api/rides/[id]`: Update ride status or assign driver.

### Admin
- **GET/POST** `/api/admin/zones`: Manage pricing zones.
- **GET** `/api/admin/drivers`: List all drivers.
- **GET** `/api/admin/stats`: System statistics (Active rides, revenue, etc).

## Configuration & Setup

### Environment Variables (Web)
Create a `.env` or `.env.local` file in the `web/` directory:

```bash
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/libcab"

# Authentication (Optional, defaults to fallback in dev)
JWT_SECRET="your-secret-key"
```

### Mobile App Configuration
 The mobile app currently targets the Android Emulator loopback address (`http://10.0.2.2:3000`).
 **To run on a physical device**, you must update the API URL in `mobile/context/AuthContext.tsx` to your development machine's local IP address (e.g., `http://192.168.1.x:3000`).

## Running the Project

### Prerequisites
- Node.js (v18+)
- pnpm
- PostgreSQL Database

### Installation
```bash
# Install dependencies for all packages
pnpm install
```

### Database Setup
```bash
cd web
# Apply migrations to create tables
npx prisma migrate dev

# Seed database with initial users and zones
npx prisma db seed
```

### Running Development
```bash
# Run Web App (http://localhost:3000)
pnpm --filter web dev

# Run Mobile App
cd mobile
npx expo start
```
