# LoadTrax - Freight Quote Calculator

## Overview

LoadTrax is a freight hauling quote calculator application designed for trucking and logistics operations. The system allows users to select shipping lanes (origin-destination routes) and calculate detailed quotes based on distance, time, rates, and various surcharges. The application supports saving quotes, viewing quote history, and managing lane data imported from CSV files.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite with hot module replacement

The frontend follows a page-based structure under `client/src/pages/` with reusable components in `client/src/components/`. Custom hooks in `client/src/hooks/` abstract API interactions for lanes and quotes.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions

The server uses a storage abstraction layer (`server/storage.ts`) implementing the `IStorage` interface, allowing database operations to be centralized and testable.

### Shared Code
- **Location**: `shared/` directory contains schema definitions and route contracts
- **Schema**: Drizzle schema in `shared/schema.ts` defines `lanes` and `quotes` tables
- **Type Safety**: Zod schemas derived from Drizzle schemas ensure end-to-end type safety

### Data Model
- **Lanes**: Master list of shipping routes with origin, destination, product type, distance, rates, and pay targets
- **Quotes**: Saved calculations referencing lanes with overridable parameters and computed totals

### Build System
- **Development**: Vite dev server with Express backend, HMR enabled
- **Production**: Custom build script using esbuild for server bundling, Vite for client

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle Kit**: Schema migrations via `db:push` command

### Key Libraries
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm / drizzle-zod**: Type-safe database operations with validation
- **csv-parse**: Lane data import from CSV files
- **date-fns**: Date formatting in quote history
- **jspdf**: Client-side PDF generation for quotes (per requirements)

### UI Components
- **shadcn/ui**: Pre-built accessible components (new-york style)
- **Radix UI primitives**: Underlying accessible component implementations
- **Lucide React**: Icon library