# RMS Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database

First, ensure you have a PostgreSQL database running and set your `DATABASE_URL` in `.env.local`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/rms"
```

### 3. Push Schema to Database
```bash
npm run db:push
```

### 4. Seed Initial Data
```bash
npm run db:seed
```

This will populate your database with:
- **4 Roles**: Admin, Manager, User, Viewer
- **3 Test Users**: Ready to login with predefined credentials
- **2 Buildings** with complete location hierarchy (Floors, Departments, Racks, Shelves)
- **3 Sample Files** for testing

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Credentials

Use any of these accounts to login:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@rms.local` | `Admin@123` |
| **Manager** | `manager@rms.local` | `Manager@123` |
| **User** | `user@rms.local` | `User@123` |

---

## Permissions by Role

### Admin
- Full system access
- All permissions granted

### Manager
- Create, read, update, delete files
- Checkout and return files
- Manage locations (buildings, floors, departments, racks, shelves)

### User
- View files
- Checkout and return files (basic user operations)

### Viewer
- View files only (read-only access)

---

## Database Management

### View Database in Studio
```bash
npm run db:studio
```

This opens Prisma Studio at `http://localhost:5555` where you can:
- Browse all tables
- Create, update, delete records
- View relationships visually

### Reset Database (Development Only)
If you need to reset everything:

1. Delete all migrations (optional):
   ```bash
   rm -rf prisma/migrations
   ```

2. Push schema again:
   ```bash
   npm run db:push
   ```

3. Reseed:
   ```bash
   npm run db:seed
   ```

---

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rms"

# JWT Secret (for production)
JWT_SECRET="your-secret-key-here"

# Node Environment
NODE_ENV="development"
```

---

## Project Structure

```
rms/
├── app/
│   ├── (auth)/           # Authentication pages
│   ├── (dashboard)/      # Protected dashboard routes
│   ├── api/             # API endpoints
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home redirect
│   └── globals.css      # Global styles
├── lib/
│   ├── auth.ts          # JWT utilities
│   ├── prisma.ts        # Prisma client
│   ├── validations/     # Zod schemas
│   └── middleware/      # Auth middleware
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seeder
└── package.json
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Buildings
- `GET /api/buildings` - List all buildings
- `POST /api/buildings` - Create building
- `GET /api/buildings/[id]` - Get building details
- `PUT /api/buildings/[id]` - Update building
- `DELETE /api/buildings/[id]` - Delete building

### Files
- `GET /api/files` - List files (supports search, filter by status)
- `POST /api/files` - Create file
- `GET /api/files/[id]` - Get file details
- `PUT /api/files/[id]` - Update file
- `DELETE /api/files/[id]` - Delete file

### File Checkout
- `POST /api/files/[id]/checkout` - Checkout a file
- `PUT /api/files/[id]/checkout` - Return a file

---

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env.local`
- Ensure database exists: `createdb rms`

### Seed Script Fails
- Run `npm run db:push` first to create tables
- Check that all migrations are applied
- Verify Prisma client is generated: `npx prisma generate`

### Login Fails
- Run `npm run db:seed` to create test users
- Check that the database is seeded with users
- View data in Prisma Studio: `npm run db:studio`

---

## Next Steps

After setup, you can:
1. Login with test credentials
2. Explore the dashboard
3. Create and manage files
4. Test checkout/return functionality
5. Customize the application to your needs

For more details, see `PROJECT_GUIDE.md` and `IMPLEMENTATION_STATUS.md`.
