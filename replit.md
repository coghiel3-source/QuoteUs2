# QuoteUs.ca - Ontario Insurance Quoting Platform

## Overview
QuoteUs.ca is a comprehensive full-stack insurance lead generation and CRM platform designed for the Ontario market. It enables users to easily request quotes for various insurance types through dynamic forms and provides insurance brokers and administrators with a robust CRM to manage leads, track activities, and streamline the quoting process. The platform supports an admin-first lead flow, granular role-based access control (admin, manager, broker, customer, rep, partner), and a credit system for brokers to acquire leads. It covers a wide range of insurance products including Auto, Home, Tenant, Business, Life, Travel, Pet, Mortgage, and Rent Guarantee. The core vision is to modernize insurance lead management and provide a powerful, integrated solution for all stakeholders in Ontario's insurance ecosystem.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, and Vite. It leverages Wouter for routing, React Context API and TanStack Query for state management, and Tailwind CSS with shadcn/ui for a consistent and modern UI. Form handling is managed by React Hook Form with Zod for validation, and animations are handled by Framer Motion.

### Backend
The backend utilizes Node.js with Express and TypeScript (ESM modules), implementing a RESTful API. A custom esbuild script handles production bundling, and the server is responsible for API routes, database interactions, and serving the static frontend assets.

### Data Storage
PostgreSQL serves as the primary database, integrated with Drizzle ORM for type-safe queries and schema migrations. The database schema defines core entities such as users (with detailed role-based permissions), quotes, activities, transactions, system settings, broker notes, and partner redirects, utilizing PostgreSQL enums for strict type control.

### Authentication and Authorization
The system uses email-based authentication and a robust role-based access control (RBAC) system with roles like admin, manager, partner, broker, customer, and rep. Permissions are granular and configurable by admins, governing access to features like lead management, broker management, credit adjustments, and system settings.

### Key Features and Design Patterns
- **Lead Credit System**: Brokers use a credit system to acquire leads, with Stripe integration for purchases and automatic deduction upon assignment.
- **Advertisement System**: Admins can manage and target advertisements on quote pages, with analytics for impressions and clicks.
- **Reference ID System**: Allows customers to link leads directly to specific brokers using a 6-character reference code.
- **Broker Profile Management**: Internal profiles for brokers include reference IDs, notes, tier categorization, performance stats, and preferences.
- **Lead Response Timer**: Configurable timers for lead actioning by brokers, with automatic expiry and re-assignment.
- **Digital Agreement/Signature System**: Allows reps to send customizable, e-signable agreements (e.g., landlord agreements, document signing) with public signing pages and email notifications.
- **Rent Guarantee (RG) System**: A dedicated workflow for reps to manage RG leads, locations, tenants, and document requests. Includes an RG Payment System with Stripe integration for collecting premiums (annual/monthly) and an RG Invoice Generator for PDF quote invoices.
- **Binder / Confirmation of Insurance**: Admins/managers can require brokers to upload insurance binders for leads.
- **Billing Central**: A dedicated section for admins/managers to oversee all financial activities, including Rent Secure payments, lead transactions, and ad analytics.
- **Update System**: In-app update mechanism for admins/managers to deploy application updates via ZIP files.
- **Social Media Configuration**: Admins can manage social media links displayed on the website.
- **Shared Schemas**: Zod schemas are used for consistent validation across both frontend and backend.
- **Component-based UI**: Emphasizes building domain-specific components from shadcn/ui primitives.
- **Storage Interface**: Provides flexibility for future database implementations.

## External Dependencies

### Database
- PostgreSQL
- Drizzle ORM

### UI/Styling
- shadcn/ui (based on Radix UI)
- Lucide React (icons)
- Tailwind CSS

### Third-Party Integrations
- Stripe (for payments and credit purchases)
- TuGo (for travel insurance quote redirects)
- SMTP (for email notifications)