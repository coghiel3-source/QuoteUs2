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
- `users` - Staff and customer accounts with role-based permissions
- `quotes` - Insurance quote requests/leads with status tracking
- `activities` - Activity log for each quote (status changes, notes, emails)

The schema uses PostgreSQL enums for type safety on user roles, quote statuses, priorities, and activity types.

### Authentication
- Simple email-based authentication (production would need password hashing)
- Role-based access control: admin, manager, broker, customer
- User status workflow: pending, active, denied, paused, cancelled
- Session state managed client-side via AuthContext

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
- Email notifications planned via SendGrid (not yet implemented)

### Development Tools
- Replit-specific plugins for dev banner and cartographer
- Custom Vite plugin for OpenGraph image meta tags
- PostCSS with Autoprefixer

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string (required)
- `NODE_ENV` - development or production
- `SENDGRID_API_KEY` - SendGrid API key for email notifications (optional - emails logged to console if not set)
- `EMAIL_FROM` - From email address (defaults to noreply@quoteus.ca)
- `EMAIL_FROM_NAME` - From name (defaults to QuoteUs.ca)

### Email Notifications
The system includes automated email notifications for:
- New lead submissions (sent to info@quoteus.ca)
- Lead assignments (sent to assigned broker)
- Status changes (sent to assigned broker)

Email notifications require a SendGrid API key. Without it, emails are logged to console but not sent. To enable:
1. Get a SendGrid API key from sendgrid.com
2. Add SENDGRID_API_KEY to environment secrets