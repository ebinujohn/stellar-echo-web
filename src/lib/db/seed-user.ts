import { db } from './index';
import { users, tenants } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { loggers } from '@/lib/logger';

const log = loggers.db;

async function seedTestUser() {
  try {
    log.info('Seeding test user...');

    // Check if we have any tenants
    const existingTenants = await db.query.tenants.findMany({ limit: 1 });

    let tenantId: string;

    if (existingTenants.length === 0) {
      log.info('No tenants found, creating a test tenant...');
      const [newTenant] = await db.insert(tenants).values({
        name: 'Test Organization',
        metadata: {},
      }).returning();
      tenantId = newTenant.id;
      log.info({ tenantId: newTenant.id, name: newTenant.name }, 'Created tenant');
    } else {
      tenantId = existingTenants[0].id;
      log.info({ tenantId, name: existingTenants[0].name }, 'Using existing tenant');
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, 'admin@example.com'),
    });

    if (existingUser) {
      log.warn('User admin@example.com already exists! If you want to reset the password, delete the user first.');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin User',
      role: 'admin',
      tenantId,
    }).returning();

    log.info({
      email: 'admin@example.com',
      password: 'password123',
      name: newUser.name,
      role: newUser.role,
      tenantId: newUser.tenantId,
    }, 'Test user created successfully! You can now login at http://localhost:3000/login');

  } catch (error) {
    log.error({ err: error }, 'Error seeding user');
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedTestUser();
