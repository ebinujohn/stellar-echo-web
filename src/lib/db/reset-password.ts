import 'dotenv/config';
import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function resetPassword() {
  try {
    const email = process.argv[2] || 'admin@example.com';
    const newPassword = process.argv[3] || 'password123';

    console.log(`🔑 Resetting password for: ${email}\n`);

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Tenant ID: ${user.tenantId}\n`);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.email, email));

    console.log('✅ Password updated successfully!\n');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}\n`);
    console.log('🎉 You can now login at http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error resetting password:');
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

resetPassword();
