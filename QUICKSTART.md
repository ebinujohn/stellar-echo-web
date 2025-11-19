# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Update Database Password

Edit `.env.local` file:

```bash
DB_PASSWORD=your_actual_password_here
```

### Step 2: Test Connection

```bash
npm run db:test
```

Expected output:
```
✅ Database connection successful!
📊 Tables in database:
  - tenants
  - users
  - agents
  - calls
  ... etc
```

### Step 3: Create a Test User (if needed)

If you don't have a user in the database, connect to PostgreSQL and run:

```sql
INSERT INTO users (id, email, password_hash, name, role, tenant_id)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5IsKBz.nG9OdW', -- password: password123
  'Admin User',
  'admin',
  (SELECT id FROM tenants LIMIT 1) -- Use your first tenant
);
```

### Step 4: Run the App

```bash
npm run dev
```

### Step 5: Login

Open http://localhost:3000

- Email: `admin@example.com`
- Password: `password123`

## 📋 What You'll See

After logging in, you'll have access to:

1. **Dashboard** - Overview with KPI cards (placeholder data)
2. **Calls** - List of all calls (ready for implementation)
3. **Analytics** - Charts and metrics (ready for implementation)
4. **Agents** - Agent configuration (Phase 2 feature)

## 🎨 Features to Try

- **Dark Mode**: Click the sun/moon icon in the navbar
- **Navigation**: Use the sidebar to switch between pages
- **User Menu**: Click your avatar to see profile and logout
- **Logout**: Test the authentication flow by logging out

## ⚠️ Important Notes

1. **Database Connection**: Make sure your PostgreSQL server is running
2. **Test User**: You need at least one user in the `users` table to login
3. **Tenant**: Users must be associated with a tenant
4. **Password**: The test password above is hashed with bcrypt (password123)

## 🐛 Troubleshooting

### "Invalid URL" Error
- Check that all DB_ variables are set in `.env.local`
- Make sure there are no trailing spaces

### "Password authentication failed"
- Verify DB_PASSWORD is correct
- Check PostgreSQL pg_hba.conf allows md5/scram authentication

### "Table doesn't exist"
- Your database might not have the schema yet
- Check that you're connecting to the right database

### "No users found"
- Create a test user using the SQL above
- Or import your existing users data

## 📚 Next Steps

Ready to build more features? Check out:

- `README.md` - Full documentation
- `src/lib/db/schema/` - Database schema definitions
- `src/app/(dashboard)/` - Page components to enhance
