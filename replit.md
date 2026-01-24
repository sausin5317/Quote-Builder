# LoadTrax - Freight Quote Calculator

## Overview

LoadTrax is a freight logistics quote calculator application for managing shipping lanes, generating quotes, and tracking client-specific pricing. The system allows users to select shipping lanes, calculate costs based on distance, time, and various surcharges, then save and manage quotes through an approval workflow.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Build Tool**: Vite with React plugin

The frontend follows a page-based architecture with shared components. Key pages include:
- Home (Quote Calculator)
- Dashboard (Analytics)
- Clients management
- Quote History
- Lanes management
- Settings

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful endpoints defined in shared routes file with Zod validation
- **Session Management**: connect-pg-simple for PostgreSQL-backed sessions

The backend uses a storage abstraction layer (`server/storage.ts`) that interfaces with the database through Drizzle ORM. API routes are registered in `server/routes.ts` with input validation using Zod schemas.

### Data Models
Core entities defined in `shared/schema.ts`:
- **Clients**: Company information with contact details
- **Users**: User accounts with roles (admin, manager, viewer)
- **Products**: Available product categories
- **Lanes**: Shipping routes with pricing parameters (origin, destination, rates, distances)
- **Quotes**: Generated quotes with status workflow (Draft, Pending Review, Approved, Rejected)

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts`: Drizzle table definitions and Zod insert schemas
- `routes.ts`: API route definitions with type-safe request/response schemas

### Development vs Production
- Development: Vite dev server with HMR, proxied through Express
- Production: Vite builds static assets to `dist/public`, served by Express

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management
- **Drizzle Kit**: Database migrations (`npm run db:push`)

### Key Libraries
- **@tanstack/react-query**: Server state management and caching
- **zod**: Runtime type validation for API inputs/outputs
- **date-fns**: Date formatting and manipulation
- **csv-parse/csv-stringify**: CSV import/export for lane data
- **jspdf**: Client-side PDF generation for quotes
- **lucide-react**: Icon library

### UI Framework
- **shadcn/ui**: Component library with Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management