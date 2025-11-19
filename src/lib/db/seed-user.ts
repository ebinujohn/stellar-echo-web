import 'dotenv/config';
import { db } from './index';
import { users, tenants } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seedTestUser() {
  try {
    console.log('🌱 Seeding test user...\n');

    // Check if we have any tenants
    const existingTenants = await db.query.tenants.findMany({ limit: 1 });

    let tenantId: string;

    if (existingTenants.length === 0) {
      console.log('📝 No tenants found, creating a test tenant...');
      const [newTenant] = await db.insert(tenants).values({
        name: 'Test Organization',
        metadata: {},
      }).returning();
      tenantId = newTenant.id;
      console.log(`✅ Created tenant: ${newTenant.name} (${newTenant.id})\n`);
    } else {
      tenantId = existingTenants[0].id;
      console.log(`✅ Using existing tenant: ${existingTenants[0].name} (${tenantId})\n`);
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, 'admin@example.com'),
    });

    if (existingUser) {
      console.log('⚠️  User admin@example.com already exists!');
      console.log('   If you want to reset the password, delete the user first.\n');
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

    console.log('✅ Test user created successfully!\n');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: password123');
    console.log('👤 Name:', newUser.name);
    console.log('🎭 Role:', newUser.role);
    console.log('🏢 Tenant ID:', newUser.tenantId);
    console.log('\n🎉 You can now login at http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error seeding user:');
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedTestUser();
