# Print Bro – Xerox Shop Management & Online Printing Platform
## Technical Architecture & Design Document
**Date:** 2026-11-04  
**Status:** In Review (Brainstorming Phase)  
**Author:** DeepMind Antigravity Pair Programmer & Product Architect  

---

## 1. Intent & The "Why"
Traditional xerox and print shops suffer from significant operational friction:
- Customers wait in long queues at the counter, transfer files manually via WhatsApp, Bluetooth, or insecure USB drives (exposing shop PCs to malware).
- Shop owners manually check page counts, manually calculate variable prices (B&W vs color, single vs duplex, legal vs A4), and manually configure printer dialogs for each customer.
- Payment collection is disjointed, leading to reconciliation errors, dispute over page counts, and lost revenue.

**Print Bro** is a web-first, multi-tenant SaaS platform that modernizes local print shops. Customers scan a shop's QR code or visit its dedicated web URL (`printbro.online/shop/[slug]`), upload documents from their phones, see an immediate live visual preview with dynamic pricing, and pay online. The order is either routed to the shop counter dashboard for manual dispatch or automatically streamed to the shop's physical Windows printer via a lightweight background Windows Print Agent. Super Admins oversee platform health, shop commissions, and settlements.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Tenant Isolation**: Every shop has a dedicated URL slug (`/shop/:slug`), isolated orders, documents, pricing rules, and printers. A shop owner can never see or modify another shop's data.
- **Web-First Frictionless Customer UX**: Zero mandatory login for customers. Mobile-optimized drag-and-drop upload for PDF, DOCX, JPG, and PNG.
- **Accurate Live Document Preview**: Client-side PDF rendering (PDF.js) reflecting orientation, color mode (grayscale vs color), page ranges, duplex simulation, scaling, and multi-up sheets (pages-per-sheet).
- **Authoritative Server Pricing**: Real-time live client estimation backed by strict server-side recalculation before generating payment orders.
- **Seamless Order Tracking**: Persistent token/Job ID (`PB-YYYY-XXXXXX`) tracking page (`/track/:jobId`) with real-time status updates (SSE/polling) and downloadable receipts.
- **Shop POS Dashboard**: Real-time order queue, daily/monthly revenue metrics, printer health monitor, and one-click manual print or reprint.
- **Headless Windows Print Agent**: Standalone Node.js background worker for shop Windows workstations that registers local printers via PowerShell/Win32 Spooler, claims queued print jobs idempotently, applies page settings, and spools jobs directly to physical hardware without needing an open browser tab.
- **Super Admin SaaS Operations**: Comprehensive analytics, shop creation and credentialing, commission configuration (% or fixed), and settlement management.

### Non-Goals (Phase 1)
- Native mobile applications (iOS/Android app store binaries). The mobile web application is PWA-ready and responsive.
- Multi-shop aggregated marketplace / shopping cart. A customer interacts with one specific print shop at a time.
- Custom printer driver engineering. The platform leverages native Windows Print Spooler APIs and proven command-line spoolers (`pdf-to-printer`, PowerShell `Out-Printer`).

### Anti-Goals
- **No Browser-Dependent Printing in Automatic Mode**: Automatic printing must never fail because the shop owner closed their browser or switched tabs.
- **No Client Price Tampering**: Frontend calculations are strictly for user feedback; payment tokens are only generated against server-validated prices.
- **No Silent Print Failures**: If a printer is out of paper, offline, or spooling fails, the print agent reports the error back to the platform and updates customer/owner statuses immediately.
- **No Duplicate Printing**: Idempotency keys on all print jobs ensure a job is processed and physically printed exactly once.

---

## 3. Evaluated Approaches & Selected Architecture

### Approach 1 (Selected): Unified Next.js Full-Stack + Standalone Node.js Windows Agent
- **Web Platform**: Next.js 14/15 App Router with TypeScript and Tailwind CSS / Shadcn UI.
  - `/admin/*`: Super Admin SaaS portal
  - `/dashboard/*`: Shop Owner POS portal
  - `/shop/[slug]/*`: Dedicated Customer upload & configuration portal
  - `/track/[jobId]/*`: Public customer order tracking
  - `/api/*`: REST and Server-Sent Event (SSE) endpoints
- **Database**: PostgreSQL (Prisma ORM) with multi-tenant relational schema. SQLite supported for instant zero-dependency local verification.
- **Windows Agent**: Lightweight standalone Node.js service installed on the shop's Windows PC. It authenticates with the cloud backend using a cryptographically secure shop API key, detects Windows printers (`Get-Printer`), reports heartbeat, and executes print jobs using Windows Spooler tooling.
- **Why Selected**: Unified type definitions between client preview, pricing models, and backend print jobs; fastest development velocity; web-first design responsive across all devices; zero native C++ compile headaches on Windows.

### Approach 2 (Rejected): Decoupled Monorepo (Express API + Vite SPA + Python Win32 Agent)
- Rejected due to triplication of models, complex multi-server local orchestration, and requiring shop owners to have Python installed on their Windows billing PCs.

---

## 4. System Architecture & Component Design

```
+-----------------------------------------------------------------------------------+
|                                 PRINT BRO CLOUD                                   |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | Customer Portal    |   | Shop Owner POS Portal |   | Super Admin Dashboard  |  |
|  | /shop/:slug        |   | /dashboard            |   | /admin                 |  |
|  | /track/:jobId      |   |                       |   |                        |  |
|  +---------+----------+   +-----------+-----------+   +-----------+------------+  |
|            |                          |                           |               |
|            +--------------------+     |     +---------------------+               |
|                                 |     |     |                                     |
|                                 v     v     v                                     |
|                      +-------------------------------+                            |
|                      |   Next.js API & Server Layer  |                            |
|                      | - Auth & Session (JWT/Iron)   |                            |
|                      | - Tenant Isolation Middleware |                            |
|                      | - Cloud PDF Transformation    |                            |
|                      |   (N-up imposition, B&W       |                            |
|                      |    grayscale, page slicing)   |                            |
|                      | - Dynamic Pricing Engine      |                            |
|                      | - Payment Gateway Adapter     |                            |
|                      | - Smart Printer Matcher       |                            |
|                      | - Real-Time SSE Dispatcher    |                            |
|                      +---------------+---------------+                            |
|                                      |                                            |
|                                      v                                            |
|                        +---------------------------+                              |
|                        |  Prisma ORM & PostgreSQL  |                              |
|                        +---------------------------+                              |
+--------------------------------------|--------------------------------------------+
                                       | HTTPS / SSE / Long-Polling
                                       v
                    +-------------------------------------+
                    |     SHOP LOCAL WINDOWS ENVIRONMENT  |
                    |                                     |
                    |  +-------------------------------+  |
                    |  |   Print Bro Windows Agent     |  |
                    |  |   (Node.js Background Daemon) |  |
                    |  |   - Device Auth Token         |  |
                    |  |   - Job Poller / SSE Listener |  |
                    |  |   - Downloads Print-Ready PDF |  |
                    |  |   - Spools via pdf-to-printer |  |
                    |  |   - Monitors Get-PrintJob     |  |
                    |  +---------------+---------------+  |
                    |                  |                  |
                    |                  v                  |
                    |  +-------------------------------+  |
                    |  |     Windows Print Spooler     |  |
                    |  |     (winspool / Windows API)  |  |
                    |  +---------------+---------------+  |
                    |                  |                  |
                    +------------------|------------------+
                                       v
                         +---------------------------+
                         | Local Physical Printers   |
                         | (HP, Canon, Xerox, Epson) |
                         +---------------------------+
```

---

## 5. Detailed Component Specifications

### 5.1 Multi-Tenant Dedicated Shop Routing
- Every shop has a unique alphanumeric slug (e.g., `sri-ganesh-xerox`).
- Route: `/shop/[slug]`
- Middleware validates shop existence and active status.
- Injects `ShopContext` containing shop branding, accepted paper formats, custom price tiers, and printer capabilities into all child components.

### 5.2 Customer Document Upload & Preview Engine
- **Supported Formats**: PDF, DOCX, JPG, PNG.
- **Conversion Pipeline**:
  - PDFs are processed directly via PDF.js for preview.
  - Images (JPG/PNG) and DOCX files are transformed into standardized PDFs.
  - **Cloud Print-Ready Pre-Processing**: When an order is paid, the cloud backend uses `pdf-lib` to generate a single canonical, print-ready PDF per job. This process performs:
    1. Exact page slicing (extracting only the customer's specified page range).
    2. N-up grid imposition (2, 4, 6, 9, 16 pages per sheet layout with margins and cutlines).
    3. Color flattening: When Black & White is selected, color streams are desaturated/flattened into pure grayscale to guarantee zero color toner consumption on shop laser printers.
  - The Windows Agent simply downloads this ready-to-print PDF, ensuring 100% WYSIWYG fidelity without needing bulky PDF rendering binaries on the shop machine.

### 5.3 Dynamic Pricing Engine & Multi-Document Order Model
- A customer can upload **multiple documents** in a single checkout session.
- **Data Hierarchy**:
  - An **`Order`** represents the commercial transaction (holds `job_id` like `PB-2026-000001`, `shop_id`, `customer_name`, `customer_phone`, total order amount, payment status, and tracking token).
  - An Order contains one or more **`PrintJob`** items (each associated with an uploaded document, its individual page count, copies, color mode, duplex, paper size, and imposition settings).
- **Pricing Formula**:
  $$\text{Total Order Price} = \sum_{\text{jobs}} \Big( \text{Base Price}(\text{Paper}, \text{Color}, \text{Duplex}) \times \text{Printed Sheets} \times \text{Copies} \Big) + \text{Shop Service Fee}$$
- The client updates this price in real-time as configuration changes.
- The server independently validates page counts and recalculates the exact total before issuing payment orders.

### 5.4 Payment & Settlement Model (Centralized Merchant of Record)
- **Centralized Platform Gateway**: Print Bro operates as the Merchant of Record. All customer transactions (via UPI / Card / Netbanking / PhonePe / Razorpay) flow into Print Bro's centralized platform account.
- **Commission Split**: At payment capture, the system calculates the platform commission (configurable per-shop as a percentage or fixed flat fee per order) and credits the net amount to the shop's pending settlement ledger.
- **Settlement Lifecycle**:
  - Super Admin reviews pending shop balances, daily/monthly gross revenue, and platform earnings.
  - Super Admin executes or marks settlements as `SETTLED` with transaction references, UTR numbers, and receipt generation.
  - Shop Owners view their ledger, daily/monthly earnings, and payout history on their POS dashboard.

### 5.5 Smart Printer Selection & Routing
- In **Manual Mode**: The shopkeeper can dispatch the job to any registered printer from their dashboard.
- In **Automatic Mode**:
  1. The backend inspects the order's requirements (e.g., Color vs B&W, Paper Size A4/A3, Duplex capability).
  2. The system checks online `ShopPrinter` records matching these capabilities.
  3. If an exact match is online, the job is assigned directly to that printer.
  4. If no matching printer is online, the job safely falls back to the **Manual Counter Queue** with an audible notification to the shopkeeper, preventing failed or stuck jobs.

### 5.6 Windows Print Telemetry & Status Boundaries
- **Spooling Confirmation**: The Windows Agent dispatches the print-ready PDF using `pdf-to-printer` targeting the specific Windows printer name.
- **Queue Monitoring**: The agent monitors the Windows Print Spooler queue (`Get-PrintJob`) until the job dequeues.
- **Error Capture**: If Windows reports `PrinterStatus` as Offline, PaperJam, or OutOfPaper, the agent immediately transmits a `PRINT_FAILED` state with diagnostic details, enabling real-time alerting for both shop owner and customer.

### 5.7 Order Lifecycle & Status Progression
- **Statuses**: `UPLOADED` -> `CONFIGURED` -> `PAYMENT_PENDING` -> `PAID` -> `QUEUED` -> `PRINTING` -> `COMPLETED` (or `FAILED`, `CANCELLED`, `REFUNDED`).
- Unique Job ID format: `PB-YYYY-XXXXXX` (e.g., `PB-2026-000001`).
- Payment gateway abstraction supports PhonePe / Razorpay / Mock sandbox for development.
- Webhook and callback signatures verified before setting order state to `PAID`.

### 5.8 Order Tracking (`/track/[jobId]`)
- Customer lands on tracking view immediately after payment confirmation.
- Connects to `/api/orders/[jobId]/events` via Server-Sent Events (SSE) with automatic reconnection.
- Displays animated 6-stage timeline: Uploaded -> Configured -> Paid -> Received by Shop -> Printing -> Ready/Completed.
- Provides dynamic SVG/PDF digital invoice and receipt download.

### 5.9 Shop Owner POS Dashboard (`/dashboard`)
- Real-time order list with status filters, audio alert on new paid orders.
- Manual Mode: Shop owner inspects document thumbnail, verified payment ID, customer notes, and clicks **"Print Now"** to push to the local agent queue.
- Automatic Mode: The server automatically queues paid orders to the assigned printer agent without shopkeeper manual clicking.
- Printer Management: Lists registered physical printers, online/offline status, paper sizes supported, ink status, and active queue length.

### 5.10 Super Admin Portal (`/admin`)
- Platform Metrics: Total shops, gross transaction volume (GMV), platform commission earned, net shop payouts pending.
- Shop Onboarding: Add shop, set custom slug, assign owner credentials, set commission percentage (e.g., 5% or flat ₹1 per order).
- Settlements: View shop-wise revenue ledgers, approve payout transfers, export Excel/CSV reports.

### 5.11 Windows Local Print Agent (`agent/`)
- Packaged as a clean Node.js script / executable.
- Run on the shop counter PC: `node agent.js --key <SHOP_API_KEY>`.
- Detects available Windows printers using `powershell Get-Printer | Select-Object Name, PortName, PrinterStatus`.
- Registers detected printers with the Print Bro cloud.
- Establishes persistent heartbeat and listens for print jobs via long-polling or SSE.
- Downloads the print-ready PDF securely via one-time signed URLs.
- Executes printing using `pdf-to-printer` specifying target printer, copies, duplex, page range, and orientation.
- Reports job status updates (`PRINTING`, `COMPLETED`, `FAILED` with error diagnostics) back to the cloud.

---

## 6. Database Schema Design (Prisma)

Entities:
- `User`: Platform credentials (Super Admin, Shop Owner) with roles.
- `Shop`: Slug, name, address, phone, GST, status (ACTIVE, INACTIVE, SUSPENDED), print_mode (MANUAL, AUTO), commission_rate, api_key.
- `ShopPricing`: Per-shop rates for A4/A3/Letter, B&W vs Color, Single vs Duplex, and custom service fees.
- `ShopPrinter`: Registered hardware printer name, system driver, connection status (ONLINE, OFFLINE), default status, capabilities JSON (color, duplex, paperSizes).
- `Order`: Unique `job_id` (e.g. `PB-2026-000001`), `shop_id`, `customer_name`, `customer_phone`, `status`, total_amount, platform_commission, shop_earnings, payment_status, tracking_token, timestamps.
- `Document`: File key, original filename, mime type, page count, file size, storage URL.
- `PrintJob`: Order ID, document ID, target printer ID, copies, color_mode (BW/COLOR), sides (SINGLE/DUPLEX), orientation, paper_size, page_range, imposition (N-up), print_status, print_ready_url.
- `Payment`: Order ID, transaction ID, payment gateway, amount, currency, status (INITIATED, SUCCESS, FAILED), signature.
- `Settlement`: Shop ID, total orders, total amount, platform commission, shop payout, status (PENDING, SETTLED), settlement date.
- `AuditLog`: Action, actor, shop ID, metadata, timestamp.

---

## 7. Security & Tenant Isolation
1. **Tenant Guards**: All Prisma queries in shop dashboard handlers are scoped by `where: { shopId: session.shopId }`.
2. **Encrypted Documents**: Documents are stored in isolated per-shop buckets/folders (`uploads/[shopId]/[jobId]`).
3. **Signed Temporary URLs**: Print agents receive presigned URLs valid for 5 minutes only.
4. **Agent Mutual Auth**: Print agents authenticate via bearer tokens tied to specific shop hardware.
5. **Customer Privacy**: Documents can be automatically purged 24 hours after completion according to configurable retention settings.

---

## 8. Development Phases
- **Phase 1**: Core platform scaffold, Next.js App Router, Tailwind/Shadcn UI, Prisma schema, Super Admin shop management, dedicated URL routing.
- **Phase 2**: Customer upload portal, PDF.js preview engine, document settings, dynamic pricing calculator.
- **Phase 3**: Payment simulation & gateway adapter, order creation, unique Job ID generation, real-time live order tracking (`/track/[jobId]`).
- **Phase 4**: Shop Owner POS dashboard, printer registration, manual "Print Now" workflow, Windows Print Agent implementation.
- **Phase 5**: Automatic printing pipeline, live agent status heartbeats, error recovery, duplicate print prevention.
- **Phase 6**: Super Admin analytics, commission engine, settlement ledgers, exportable financial reports.
- **Phase 7**: End-to-end integration verification across customer, shop owner, and print agent workflows.

