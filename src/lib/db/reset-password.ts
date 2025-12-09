import 'dotenv/config';
import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { loggers } from '@/lib/logger';

const log = loggers.db;

async function resetPassword() {
  try {
    const email = process.argv[2] || 'admin@example.com';
    const newPassword = process.argv[3] || 'password123';

    log.info({ email }, 'Resetting password');

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      log.error({ email }, 'User not found');
      process.exit(1);
    }

    log.info({ name: user.name, email: user.email, role: user.role, tenantId: user.tenantId }, 'Found user');

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.email, email));

    log.info({
      email,
      newPassword,
    }, 'Password updated successfully! You can now login at http://localhost:3000/login');

  } catch (error) {
    log.error({ err: error }, 'Error resetting password');
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

resetPassword();
