# QuoteUs.ca - Ontario Insurance Quoting Platform

## Overview

QuoteUs.ca is a full-stack insurance lead generation and CRM platform for Ontario residents. It enables users to request quotes for various insurance types through dynamic forms and provides brokers and administrators with a comprehensive CRM to manage leads, track activities, and process quotes. The platform supports an admin-first lead flow, role-based access control (admin, manager, broker, customer), and features a credit system for lead acquisition by brokers. Insurance products include Auto, Home, Tenant, Business, Life, Travel, Pet, Mortgage, and Rent Guarantee. The business vision is to streamline insurance lead management and provide a robust platform for brokers and customers in Ontario.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18, TypeScript, and Vite. It uses Wouter for routing, React Context API and TanStack Query for state management, and Tailwind CSS with shadcn/ui for styling. Form handling is managed by React Hook Form with Zod validation, and UI animations are powered by Framer Motion. The structure separates pages, components, and shared logic, utilizing path aliases for organization.

### Backend Architecture
The backend is developed using Node.js with Express and TypeScript (ESM modules). It follows a RESTful API design, with a custom esbuild script for production bundling. The server manages API routes, database operations, and serves the built frontend.

### Data Storage
PostgreSQL is used as the database, integrated with Drizzle ORM for type-safe queries and migrations. The database schema defines core entities like users (with role-based permissions and broker-specific attributes), quotes (with status tracking and assignment details), activities, transactions, system settings, broker notes, and partner redirects. It leverages PostgreSQL enums for strict type control across various system states.

### Authentication and Authorization
The system employs email-based authentication and a robust role-based access control mechanism supporting admin, manager, broker, and customer roles. User statuses include pending, active, denied, paused, and cancelled. Session state is managed client-side via an AuthContext. Manager permissions are configurable by admins, controlling access to features like lead viewing, assignment, broker management, credit adjustments, and settings.

### Key Design Patterns
The architecture utilizes React Context Providers for global state management (e.g., AuthProvider, QuoteProvider). A Storage Interface allows for flexible database implementations. Zod schemas are shared for consistent frontend and backend form validation. Component composition is emphasized, building domain-specific components from shadcn/ui primitives.

### Manager Permissions
Admins can configure manager access rights for features such as viewing/assigning leads, managing brokers, viewing/adjusting credits, and viewing system settings. These permissions are enforced both on the UI and API levels, with server-side checks being mandatory for sensitive operations.

### Lead Credit System
Brokers must purchase credits to acquire leads. The system defines credit packages and variable lead costs per insurance type. It includes Stripe integration for credit purchases, automatic credit deduction upon lead assignment, and transaction logging. Authorization ensures only brokers can purchase credits and only admins/managers can assign leads and adjust balances.

### Advertisement System
An advertisement management system allows admins to display targeted ads on quote pages. Features include support for image/video, external links, page-specific targeting, scheduling, priority-based rotation, analytics (impressions, clicks), and customizable text overlays. Admins can manage ads, configure multi-ad display per slot, and track performance.

### Reference ID System
Admins/Managers can assign a 6-character reference code to brokers. Customers can use these codes on quote forms to automatically link leads to a specific broker, bypassing the credit deduction process. This system is integrated across all quote forms and lead details.

### Broker Profile Management
Admin/Manager users have access to internal broker profiles, which include a unique Reference ID, internal notes (not visible to brokers), broker tier categorization (Bronze, Silver, Gold, Platinum), performance statistics (win rate, lead breakdown), and preferences for insurance types and demographics.

### Lead Response Timer / Expiry System
A configurable lead response timer allows admins/managers to set a deadline for brokers to action assigned leads. If a lead isn't updated within the set time, it expires, becomes hidden from the broker, and can be reassigned by an admin/manager (with credit deduction). The system includes real-time countdowns and an auto-check for overdue leads.

### Social Media Configuration
Admins can configure social media links (Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok) displayed in the website footer through a dedicated "Connections" tab.

### Update System
An in-app update system enables admins/managers to upload ZIP files for application updates without direct server access. It automatically extracts, replaces files in allowed directories, and protects critical system files like database schema and environment variables, providing a detailed summary of changes.

### Referral Partner System
This system allows admins/managers to create referral partner accounts. Each partner is assigned an auto-generated, province-based Reference ID (e.g., ON0000001). This ID can be used by clients on quote forms to tag leads to specific partners, facilitating lead tracking and partner management.

### DocuSign-like Agreement / Signature System
A digital agreement signing system allows reps to send customizable agreements to landlords for e-signature. The system includes:
- `signatureTemplates` table (singleton agreement template with title, content, placeholder support, and updatedBy tracking)
- `signatureRequests` table (per-location requests with unique token, landlord email, status pending/signed, captured signature image, signer name, and timestamp)
- Admin/manager template editor in CRM Settings tab (title + full body with placeholders: `{{landlord_name}}`, `{{property_address}}`, `{{date}}`, `{{landlord_email}}`)
- Rep Dashboard: "Send Agreement" button on every location's detail view; displays live status (pending/signed) with signature date and signer name
- Public signing page at `/sign/:token` — no login required, canvas-based signature pad, placeholders replaced with real location data, submit records signature to database
- Email notification sent to landlord via configured SMTP; if SMTP not configured, a shareable link is shown to the rep
- API routes: `GET/PUT /api/admin/signature-template`, `POST /api/rep/locations/:id/send-signature`, `GET /api/rep/locations/:id/signature-status`, `GET/POST /api/sign/:token`

### Binder / Confirmation of Insurance
The system allows admins/managers to require brokers to upload a binder (confirmation of insurance) for specific leads. Brokers can upload PDF, Word, or image files, which are then visible in the lead detail view. The activity log tracks all binder-related actions.

### Rep Role & Rent Guarantee Lead System
A dedicated "rep" user role supports a Rent Guarantee (RG) lead workflow. Reps manage their own RG leads via a Location → Tenant hierarchy. Admins and managers can access the full RG portal embedded directly inside the AdminCRM under the "RG Leads" tab (via `<RepDashboard embedded={true} />`). The system includes:
- `rgLocations` table (property + landlord details: address, unit, landlord info, monthly rent, move-in date)
- `rgLeads` table (tenant applications: tenant info, employment, co-applicant, status tracking; linked to rgLocations via `locationId`)
- `repReminders` table (reminders linked to reps and optionally to leads, with due dates)
- `documentRequests` table (tokenized links for tenant/landlord document uploads, with expiry)
- `repDocuments` table (uploaded files linked to leads and requests)
- `/rep` dashboard page (role-gated for rep/admin/manager) with tabs: Overview, Locations, All Leads, Reminders
- `/doc-upload/:token` public upload portal (no login required, token-based)
- AdminCRM shows "RG Portal" link in nav; Login page supports "Rep" role selection
- File uploads stored at `client/public/uploads/rep-docs/`
- Location → Tenant workflow: rep creates a Location (property/landlord), then adds Tenants; if a tenant is Declined, a "Add New Tenant" prompt appears to quickly replace without re-entering property info

## External Dependencies

### Database
- PostgreSQL (via `DATABASE_URL`)
- `node-postgres` (for connection pooling)
- Drizzle ORM

### UI Component Library
- shadcn/ui (with Radix UI primitives)
- Lucide React (for icons)
- Tailwind CSS

### Third-Party Integrations
- TuGo partner site (for travel insurance quote redirects)
- Stripe (for credit purchases, via `stripe-replit-sync`)
- SMTP (for email notifications)

### Development Tools
- Replit-specific plugins (dev banner, cartographer)
- Custom Vite plugin (OpenGraph image meta tags)
- PostCSS with Autoprefixer

## PHP/MySQL Version

A complete PHP port of the backend exists in `php-version/` for third-party PHP hosting. It includes:
- **Database**: MySQL (converted from PostgreSQL), with web-based installer (`install.php`)
- **Backend**: Pure PHP API with PDO/prepared statements, matching all Node.js Express routes
- **Frontend**: Pre-built React static files served by PHP/Apache
- **Files**: config.php, database.php, storage.php, email.php, api/*.php, .htaccess
- **Download**: Available at `/download/QuoteUs_PHP.zip` (4MB)