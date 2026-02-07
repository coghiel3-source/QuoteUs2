# QuoteUs.ca - Ontario Insurance Quoting Platform

## Overview

QuoteUs.ca is a full-stack insurance lead generation and CRM platform designed for Ontario residents. The application allows users to request quotes for various insurance types (Auto, Home, Tenant, Travel, Life, Business, Pet) through dynamic forms, while providing brokers and administrators with a comprehensive CRM to manage leads, track activities, and process quotes.

The platform follows an admin-first lead flow where all incoming leads are visible to admins who can then assign them to brokers. It includes role-based access control with four user types: admin, manager, broker, and customer.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context API for auth and quotes state, TanStack Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Form Handling**: React Hook Form with Zod validation
- **Animation**: Framer Motion for UI transitions

The frontend is organized with pages under `client/src/pages/`, reusable components in `client/src/components/`, and shared logic in `client/src/lib/`. Path aliases are configured: `@/` for client source, `@shared/` for shared code, and `@assets/` for attached assets.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints under `/api/` prefix
- **Build**: Custom build script using esbuild for production bundling

The server handles API routes in `server/routes.ts`, database operations through `server/storage.ts`, and serves the built frontend in production via `server/static.ts`. Development uses Vite middleware for hot module replacement.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit manages schema migrations in `./migrations`

Core tables include:
- `users` - Staff and customer accounts with role-based permissions, includes balance for credit system, broker tier, preferred insurance types, preferred demographics
- `quotes` - Insurance quote requests/leads with status tracking
- `activities` - Activity log for each quote (status changes, notes, emails)
- `transactions` - All credit balance changes (purchases, deductions, adjustments)
- `systemSettings` - Platform configuration settings
- `brokerNotes` - Internal notes on brokers by admin/manager (NOT visible to brokers)
- `partnerRedirects` - Redirect URLs for partner sites after quote submission

The schema uses PostgreSQL enums for type safety on user roles, quote statuses, priorities, activity types, transaction types, and broker tiers.

### Authentication
- Simple email-based authentication (production would need password hashing)
- Role-based access control: admin, manager, broker, customer
- User status workflow: pending, active, denied, paused, cancelled
- Session state managed client-side via AuthContext

### Manager Permissions
Admins can configure what features managers can access via the Settings tab:
- **View Leads**: See and browse lead listings
- **Assign Leads**: Assign leads to brokers (requires credit deduction)
- **Manage Brokers**: Add, edit, approve, and manage broker accounts
- **View Credits**: View broker credit balances and transactions
- **Adjust Balances**: Manually add/deduct credits from broker accounts
- **View Settings**: View system settings (read-only)

Permissions are stored in `systemSettings` table as `manager_permissions` JSON. Both frontend (UI hiding) and backend (API authorization) enforce these permissions. Server-side checks are mandatory - actorId is required for all sensitive operations.

### Key Design Patterns
- **Context Providers**: AuthProvider and QuoteProvider wrap the app for global state
- **Storage Interface**: IStorage interface allows swapping database implementations
- **Form Validation**: Zod schemas shared between frontend validation and API
- **Component Composition**: shadcn/ui primitives composed into domain components

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Connection pooling through node-postgres (pg)
- Drizzle ORM for type-safe queries

### UI Component Library
- shadcn/ui with Radix UI primitives
- Lucide React for icons
- Tailwind CSS for styling

### Third-Party Integrations
- Travel insurance quotes redirect to TuGo partner site
- Vehicle data loaded from static JSON (`client/public/data/vehicles.json`)
- Stripe payment integration for credit purchases (via stripe-replit-sync)
- Email notifications via SMTP (configured in Admin Settings)

### Development Tools
- Replit-specific plugins for dev banner and cartographer
- Custom Vite plugin for OpenGraph image meta tags
- PostCSS with Autoprefixer

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string (required)
- `NODE_ENV` - development or production

### Email Notifications
The system includes automated email notifications for:
- New lead submissions (sent to info@quoteus.ca)
- Lead assignments (sent to assigned broker)
- Status changes (sent to assigned broker)

Email notifications use SMTP settings configured in the Admin Settings panel. Without SMTP configured, emails are logged to console but not sent. To enable:
1. Log in as admin and go to Admin Settings
2. Configure SMTP settings (host, port, username, password, from email/name)
3. Use your hosting provider's SMTP credentials

### Lead Credit System
Brokers must purchase credits to receive leads. The system includes:

**Credit Packages**: $25, $50, $100, $150, $200, $250
**Lead Costs by Type**:
- Auto: $10
- Home: $15  
- Tenant: $5
- Business: $20
- Life: $12
- Travel: $3
- Pet: $5
- General: $8

**Flow**:
1. Broker purchases credits via Stripe checkout
2. Admin/Manager assigns lead to broker
3. Lead cost is automatically deducted from broker's balance
4. Assignment blocked if insufficient balance
5. All transactions are logged for auditing

**Authorization**:
- Only brokers can purchase credits
- Only admin/manager can assign leads and adjust balances
- All credit operations require role verification

**Key Files**:
- `server/stripeClient.ts` - Stripe API integration
- `server/webhookHandlers.ts` - Stripe webhook processing  
- `client/src/pages/BrokerCredits.tsx` - Broker credit management page
- `/api/credits/*` - Credit-related API endpoints
- `/api/leads/assign` - Lead assignment with credit deduction

### Advertisement System
The platform includes an advertisement management system for displaying controlled ads on quote pages:

**Features**:
- Support for image and video media types
- External link support with optional popup display
- Page-specific targeting (can target individual pages or all pages)
- Scheduling with start/end dates
- Priority-based ad rotation
- Analytics tracking (impressions, clicks, CTR)
- Ad text overlays with customizable text, colors, and position (top/center/bottom)
- Multi-ad display: configure 1-3 ads per slot (displayed side-by-side)

**Admin Management**:
- Access via "Ads" tab in Admin panel (admin only)
- Create, edit, pause, and delete advertisements
- View analytics for each ad
- Set targeting to specific quote pages
- Configure "Ads Per Slot" setting (1-3) for multi-ad display
- Text position selector for ad text overlays (top, center, bottom)

**Key Components**:
- `client/src/components/AdvertisementManager.tsx` - Admin interface for managing ads
- `client/src/components/AdPlacement.tsx` - Display component for quote pages
- `advertisements` table in database schema
- `/api/admin/advertisements` - CRUD endpoints
- `/api/advertisements/active` - Fetch active ad(s) for a page (supports limit parameter)
- `/api/advertisements/:id/impression` - Track ad views
- `/api/advertisements/:id/click` - Track ad clicks
- `/api/settings/ads-per-slot` - Public endpoint to get ads per slot setting

### Broker Profile Management
Admin/Manager can view and manage internal broker profiles with features not visible to brokers:

**Features**:
- **Internal Notes**: Admin/Manager can add timestamped notes on individual brokers (yellow note cards, NOT visible to brokers)
- **Broker Tier**: Categorize brokers as Bronze, Silver, Gold, or Platinum (displayed as badge on staff table)
- **Win Rate & Performance Stats**: View total leads, win rate (bound/total %), leads by status breakdown, leads by type
- **Preferred Insurance Types**: Toggle which insurance types the broker wants to write
- **Preferred Demographics**: Free-text field for target demographics/areas the broker prefers

**Access**:
- Via "View Profile" in broker actions dropdown (staff/manager tab)
- Only admin/manager can access - completely hidden from brokers

**Key Endpoints**:
- `/api/admin/broker-profile` - Update tier, preferred types, demographics
- `/api/admin/broker-notes/:brokerId` - Get/add/delete internal notes
- `/api/admin/broker-stats/:brokerId` - Get performance stats and win rate

### Social Media Configuration
Admin can configure social media links displayed in the website footer:

**Supported Platforms**:
- Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok

**Admin Management**:
- Access via "Connections" tab in Admin panel
- Configure URLs for each social media platform
- Leave URL empty to hide that platform's icon

**Key Components**:
- `client/src/components/Layout.tsx` - Footer displays configured social icons
- `/api/settings/social-media` - Public endpoint returns configured URLs
- `/api/admin/settings/social_media` - Admin endpoint to save settings (JSON)