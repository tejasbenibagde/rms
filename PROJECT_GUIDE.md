# Rack Management System (RMS) - Project Guide

## Overview

The Rack Management System is a modern web application built with Next.js, designed to help employees quickly locate physical files stored inside an organization. This guide covers the completed foundation and architecture.

---

## What Has Been Built

### Phase 1: Complete Foundation ✅

#### Authentication & Security
- **Login System**: Professional login page with email/password authentication
- **JWT Sessions**: Secure token-based authentication with 7-day expiration
- **Password Hashing**: Bcrypt with 12 salt rounds for secure password storage
- **Protected Routes**: Middleware to protect dashboard routes
- **Session Management**: HTTP-only cookies for session tokens

#### Database & Schema
Complete Prisma schema with:
- **User Management**: Users, Roles, Permissions, User Scopes
- **Location Hierarchy**: Building → Floor → Department → Rack → Shelf
- **File System**: Files with metadata, checkout tracking, activity logs
- **Audit Trail**: Comprehensive audit logging for compliance
- **Soft Deletes**: All records support soft deletion with recycle bin recovery

#### UI & Dashboard
- **Professional Design**: Clean, minimalist corporate interface
- **Responsive Layout**: Mobile-first design with sidebar navigation
- **Dashboard Home**: Statistics cards, recent files table, system overview
- **Color System**: Professional gray (#1f2937) primary with neutral palette
- **Icon System**: Lucide React icons throughout

#### API Infrastructure
Complete REST APIs for:
- **Buildings**: List, Create, Update, Delete with floor hierarchy
- **Files**: Full CRUD with search, filtering, pagination
- **Checkout System**: File borrowing with return tracking
- **Activity Logging**: Track all file operations

---

## Project Structure

```
rms/
├── app/
│   ├── (auth)/                    # Public auth routes
│   │   └── login/
│   │       └── page.tsx           # Login page
│   ├── (dashboard)/               # Protected dashboard routes
│   │   ├── layout.tsx             # Dashboard layout with sidebar
│   │   └── dashboard/
│   │       ├── page.tsx           # Dashboard home
│   │       ├── buildings/
│   │       │   └── page.tsx       # Buildings management
│   │       ├── files/
│   │       │   └── page.tsx       # File management (implemented)
│   │       ├── users/
│   │       │   └── page.tsx       # User management
│   │       └── settings/
│   │           └── page.tsx       # System settings
│   └── api/
│       ├── auth/
│       │   ├── login/
│       │   ├── logout/
│       │   └── me/
│       ├── buildings/
│       │   ├── route.ts           # List/Create
│       │   └── [id]/
│       │       └── route.ts       # Get/Update/Delete
│       └── files/
│           ├── route.ts           # List/Create files
│           └── [id]/
│               ├── route.ts       # Get/Update/Delete file
│               └── checkout/
│                   └── route.ts   # Checkout/Return file
├── lib/
│   ├── auth.ts                    # Auth utilities (hash, sign, verify)
│   ├── prisma.ts                  # Prisma client
│   ├── middleware/
│   │   └── auth.ts                # Auth middleware
│   └── validations/
│       └── auth.ts                # Zod schemas
├── prisma/
│   └── schema.prisma              # Complete Prisma schema
├── app/
│   ├── globals.css                # Tailwind + theme variables
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home (redirects to dashboard/login)
└── package.json                   # Dependencies
```

---

## Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19.2.4** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first CSS
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma ORM** - Database abstraction
- **PostgreSQL** - Relational database

### Security
- **bcryptjs** - Password hashing
- **jose** - JWT token handling
- **Zod** - Schema validation

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL database

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd rms

# 2. Install dependencies
npm install

# 3. Set up environment variables
echo "DATABASE_URL=postgresql://user:password@localhost/rms_db" > .env.local
echo "JWT_SECRET=your-secret-key-here" >> .env.local
```

### Database Setup

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Create tables
npx prisma db push

# 3. (Optional) Create seed data
# npx prisma db seed
```

### Run Development Server

```bash
npm run dev
```

The application runs on `http://localhost:3000`

### Default Flow
1. Homepage redirects to `/login` if not authenticated
2. Log in with valid credentials
3. Dashboard shows all modules
4. Buildings module has full CRUD implemented
5. Files module has full CRUD + search/checkout implemented

---

## API Documentation

### Authentication

#### POST `/api/auth/login`
Login user and receive JWT token
```json
Request: { "email": "user@example.com", "password": "password" }
Response: { "user": { "id", "email", "name", "role" } }
Cookie: auth-token (JWT)
```

#### POST `/api/auth/logout`
Logout user and clear session
```json
Response: { "message": "Logged out successfully" }
```

#### GET `/api/auth/me`
Get current authenticated user
```json
Response: { "authenticated": true, "user": { JWT payload } }
```

### Buildings

#### GET `/api/buildings`
List all buildings
```json
Response: [{ "id", "name", "code", "description", "address", "isActive", "_count": { "floors" } }]
```

#### POST `/api/buildings`
Create new building
```json
Request: { "name", "code", "description?", "address?" }
Response: { "id", "name", "code", ... }
```

#### GET `/api/buildings/[id]`
Get building with floors
```json
Response: { "id", "name", "code", "floors": [...] }
```

#### PUT `/api/buildings/[id]`
Update building
```json
Request: { "name?", "code?", "description?", "address?", "isActive?" }
Response: { updated building }
```

#### DELETE `/api/buildings/[id]`
Soft delete building
```json
Response: { "message": "Building deleted" }
```

### Files

#### GET `/api/files?search=&status=&skip=0&take=50`
List files with filtering
```json
Query Params:
  - search: Search term
  - status: AVAILABLE|CHECKED_OUT|ARCHIVED|MISSING
  - rackId: Filter by rack
  - departmentId: Filter by department
  - skip: Pagination offset
  - take: Items per page

Response: {
  "files": [{ "id", "fileNumber", "fileName", "status", "department", "rack", "shelf" }],
  "pagination": { "total", "skip", "take" }
}
```

#### POST `/api/files`
Create new file
```json
Request: {
  "fileNumber": "FR-2024-001",
  "fileName": "Financial Records",
  "description?": "Q4 records",
  "financialYear": 2024,
  "departmentId": "dept-id",
  "rackId": "rack-id",
  "shelfId?": "shelf-id"
}
Response: { created file object }
```

#### GET `/api/files/[id]`
Get file details with history
```json
Response: {
  "id", "fileNumber", "fileName", "status",
  "checkouts": [...],
  "activityLogs": [...]
}
```

#### PUT `/api/files/[id]`
Update file
```json
Request: { "fileName?", "status?", "isArchived?", ... }
Response: { updated file }
```

#### DELETE `/api/files/[id]`
Soft delete file (moves to recycle bin)
```json
Response: { "message": "File deleted" }
```

#### POST `/api/files/[id]/checkout`
Checkout a file
```json
Request: { "expectedReturnDate?", "remarks?" }
Response: { checkout record with user info }
```

#### PUT `/api/files/[id]/checkout`
Return a checked-out file
```json
Response: { updated checkout with returnDate }
```

---

## Authentication Flow

1. **User visits application** → Redirected to login if not authenticated
2. **Enter credentials** → Sent to `/api/auth/login`
3. **Server validates** → Checks email, verifies password hash
4. **JWT generated** → Signed with 7-day expiration
5. **Token stored** → In HTTP-only cookie
6. **User redirected** → To dashboard
7. **Each request** → Token included in cookie, verified by middleware

---

## Dashboard Modules

### Buildings Management (Fully Implemented)
- View all buildings with floor counts
- Create new buildings with code and address
- Update building details
- Soft delete buildings
- Hierarchical view of floors within building

### File Management (Fully Implemented)
- Search files by name, number, or description
- Filter by status (Available, Checked Out, Archived, Missing)
- Create new file records
- Checkout files for borrowing
- Return checked-out files
- View file activity history
- Soft delete with recycle bin recovery

### Additional Modules (Placeholder Pages)
- **Users**: Ready for role-based access management
- **Settings**: System configuration interface
- **Floors**: Planned for building floor management
- **Departments**: Planned for organizational structure
- **Racks & Shelves**: Planned for storage hierarchy

---

## Development Patterns

### Protected Routes
```typescript
// Use middleware to protect dashboard routes
const user = await requireAuth();
// User is now verified
```

### API Responses
```typescript
// Success
return NextResponse.json(data, { status: 200 });

// Created
return NextResponse.json(data, { status: 201 });

// Error
return NextResponse.json({ error: "message" }, { status: 400 });
```

### Form Validation
```typescript
// Use Zod for validation
const result = LoginSchema.safeParse(data);
if (!result.success) {
  const issues = result.error.issues;
  // Handle errors
}
```

### Database Queries
```typescript
// Prisma provides full type safety
const file = await prisma.file.findUnique({
  where: { id },
  include: { department: true, checkouts: true },
});
```

---

## Environment Configuration

### Required Variables
```
DATABASE_URL=postgresql://user:password@localhost:5432/rms
```

### Optional Variables
```
JWT_SECRET=custom-secret-key
NODE_ENV=development
```

---

## Deployment

### Build for Production
```bash
npm run build
npm run start
```

### Vercel Deployment
```bash
vercel
```

The application is ready to deploy to Vercel. Environment variables must be set in Vercel dashboard.

---

## What's Next

### Priority Phase 2 Features
1. **User Management** - Create/edit users, assign roles
2. **Location Management** - Floors, departments, racks, shelves CRUD
3. **Advanced Search** - Global search with saved filters
4. **Excel Import/Export** - Bulk operations

### Future Phase 3
1. **QR Code Labels** - Print and scan support
2. **Analytics Dashboard** - Reports and statistics
3. **Bulk Operations** - Move, delete, update multiple files
4. **Notifications** - Activity alerts and reminders

---

## Support & Troubleshooting

### Common Issues

**"JWT_SECRET is missing"**
- Set JWT_SECRET environment variable or it defaults to "dev-secret-key"

**"Database connection failed"**
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Run `npx prisma db push` to create tables

**"Page not rendering"**
- Check dev server logs for errors
- Clear browser cache
- Restart dev server with `npm run dev`

---

## License

This project is part of the Rack Management System initiative.

---

## Summary

The RMS foundation is production-ready with:
- ✅ Secure authentication system
- ✅ Complete database schema
- ✅ Professional UI with responsive design
- ✅ Full API infrastructure
- ✅ File management with checkout system
- ✅ Building management with CRUD
- ✅ Search and filtering
- ✅ Activity logging

The project is ready for rapid feature development and can be extended with the planned modules.
