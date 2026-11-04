# Print Bro – Xerox Shop Management & Online Printing Platform

[![Platform](https://img.shields.io/badge/Platform-Next.js%2014%20App%20Router-blue)](https://nextjs.org)
[![Database](https://img.shields.io/badge/Database-Prisma%20ORM%20(Postgres%20%2F%20SQLite)-emerald)](https://prisma.io)
[![Windows Print Agent](https://img.shields.io/badge/Agent-Windows%20Spooler%20Daemon-purple)](https://microsoft.com)
[![Tests](https://img.shields.io/badge/Tests-37%20Passed%20(13%20Suites)-green)](https://vitest.dev)

**Print Bro** is a production-grade, multi-tenant SaaS platform that modernizes local Xerox and print shops. Customers upload documents from mobile, preview live with instant WYSIWYG rendering, calculate dynamic prices, pay online, and track orders in real time. Shop owners manage counter queues and dispatch prints either manually or automatically via a headless **Windows Local Print Agent**.

---

## 🚀 Key Features

### 1. Super Admin Dashboard (`/admin`)
- **Platform Analytics**: Gross GMV, platform commission, shop earnings, active/inactive shops, and order volume.
- **Shop Onboarding**: Auto-generates unique dedicated shop URLs (`/shop/:slug`), assigns login credentials, configures commission rates (% or flat fee), and toggles Manual vs. Auto printing modes.
- **Revenue Settlements**: Ledger tracking gross customer payments, platform commission withholdings, shop payouts, UTR confirmation, and CSV financial report export.

### 2. Xerox Shop Owner POS Dashboard (`/dashboard`)
- **Live Counter Queue**: Displays incoming orders with customer details, document thumbnails, copies, paper size, and duplex modes.
- **Audio Alerts**: Real-time sound notification on newly verified customer payments.
- **Counter Actions**: One-click **"Print Now"**, "Mark Printing", "Mark Completed", "Reprint", and "Report Failed".
- **Dual Printing Modes**:
  - **Manual Mode**: Owner reviews orders and dispatches to printer with one click.
  - **Automatic Mode**: Cloud automatically matches and spools orders directly to the counter printer without requiring an open browser tab.
- **Hardware Telemetry**: Displays connected physical Windows printers, driver status, online heartbeat, and supported paper sizes.

### 3. Customer Printing Portal (`/shop/[slug]`)
- **Dedicated Tenant URL**: Permanent shop association with strict tenant isolation.
- **3-Step Frictionless Workflow**: Zero mandatory login.
  - **Step 1 – Upload**: Drag-and-drop support for PDF, DOCX, JPG, and PNG files.
  - **Step 2 – Live Preview & Settings**: Real-time visual canvas adjusting immediately to orientation (Portrait/Landscape), Black & White simulation (grayscale filter), Duplex layout (Front & Back sheet indicators), and N-up multi-page imposition (1, 2, 4, 6 per sheet).
  - **Step 3 – Dynamic Price & Pay**: Server-authoritative price breakdown per sheet, side, and paper format. Integrated instant payment checkout.

### 4. Real-Time Order Tracking (`/track/[jobId]`)
- **Unique Job ID**: e.g. `PB-2026-000001`.
- **Server-Sent Events (SSE)**: Live 6-stage animated timeline:
  1. Document Uploaded
  2. Printing Configured
  3. Payment Successful
  4. Order Received by Shop
  5. Printing in Progress
  6. Printing Completed
- **Digital Tax Invoice**: Formatted receipt with shop address, contact number, document itemization, and one-click print receipt.

### 5. Headless Windows Local Print Agent (`agent/`)
- Lightweight standalone Node.js service for shop Windows PCs.
- Auto-discovers local Windows printers via PowerShell (`Get-Printer`).
- Establishes authenticated cloud sync via shop API key.
- Claims queued print jobs idempotently.
- Spools print-ready PDFs directly to the Windows Print Spooler (`winspool` / `pdf-to-printer`).
- Monitors spooler queue and streams error telemetry (e.g. paper out, offline, jam) back to the cloud.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React
- **Backend**: Next.js Server Route Handlers, Server-Sent Events (SSE)
- **Database & ORM**: Prisma ORM with SQLite (local zero-config) & PostgreSQL dual-mode
- **Document Processing**: `pdf-lib` for cloud imposition, page slicing, and grayscale flattening
- **Local Agent**: Node.js Windows service daemon, PowerShell printer bridge, `pdf-to-printer`
- **Testing**: Vitest (37 automated tests across 13 test suites)

---

## 🏁 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup & Seeding
```bash
npx prisma db push
node prisma/seed.js
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Access & Default Portals

| Portal | URL | Demo Credentials |
|---|---|---|
| **Platform Landing Page** | [http://localhost:3000](http://localhost:3000) | Public |
| **Super Admin SaaS** | [http://localhost:3000/admin](http://localhost:3000/admin) | `admin@printbro.online` / `admin123` |
| **Admin Settlements** | [http://localhost:3000/admin/settlements](http://localhost:3000/admin/settlements) | Super Admin |
| **Shop Owner POS (Ganesh Xerox)** | [http://localhost:3000/dashboard](http://localhost:3000/dashboard) | `owner@ganeshxerox.com` / `shop123` |
| **Customer Portal (Ganesh Xerox)** | [http://localhost:3000/shop/sri-ganesh-xerox](http://localhost:3000/shop/sri-ganesh-xerox) | No login required |
| **Customer Portal (Quick Print)** | [http://localhost:3000/shop/quick-print-hub](http://localhost:3000/shop/quick-print-hub) | No login required |
| **Order Tracking** | [http://localhost:3000/track/PB-2026-000001](http://localhost:3000/track/PB-2026-000001) | Public tracking token |

---

## 🖨️ Running the Windows Print Agent

On the shop owner's Windows counter PC:

```bash
# 1. Run the agent with the shop's API key
node agent/agent.js --key pb_live_ganesh_xerox_secret_key_2026 --server http://localhost:3000
```

The agent will:
1. Detect all installed physical Windows printers using PowerShell `Get-Printer`.
2. Sync printer models and capabilities to the shop owner's cloud dashboard.
3. Start the background heartbeat loop.
4. Listen for paid orders and spool them to the physical printer.

---

## 🧪 Running the Test Suite

```bash
npm test
```

### Verified Test Suites (37 tests across 13 suites):
- `tests/scaffold.test.ts`: Framework & environment verification
- `tests/schema.test.ts`: Multi-tenant relational schema verification
- `tests/pricing.test.ts`: Pricing engine (B&W vs color, single vs duplex, N-up sheets, copies, min floor)
- `tests/pdf-processor.test.ts`: Cloud PDF imposition & page range slicing
- `tests/admin.test.ts`: Super Admin shop onboarding and platform metrics
- `tests/customer-portal.test.ts`: Dedicated tenant routing and shop isolation
- `tests/checkout.test.ts`: Job ID format (`PB-YYYY-XXXXXX`) and transactional checkout
- `tests/tracking.test.ts`: Live tracking data and order resolution
- `tests/shop-dashboard.test.ts`: POS dashboard queue, metrics, and manual print dispatch
- `tests/agent.test.ts`: Windows Print Agent authentication, printer registration, and job claiming
- `tests/auto-print.test.ts`: Smart capability-based printer matching
- `tests/settlements.test.ts`: Commission withholding, payout computation, and CSV export
- `tests/e2e-workflow.test.ts`: Complete end-to-end customer-to-printer lifecycle

