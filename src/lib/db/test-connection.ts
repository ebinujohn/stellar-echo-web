import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';
import { loggers } from '@/lib/logger';

const log = loggers.db;

async function testConnection() {
  try {
    log.info('Testing database connection...');

    // Test basic connection
    const result = await db.execute(sql`SELECT NOW() as current_time, current_database() as database`);
    log.info({ result: result[0] }, 'Database connection successful!');

    // Test if tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.map((row: { table_name?: string }) => row.table_name);
    log.info({ tables }, 'Tables in database');

    // Count records in key tables (if they exist)
    try {
      const callsCount = await db.execute(sql`SELECT COUNT(*) as count FROM calls`) as { count: number }[];
      const agentsCount = await db.execute(sql`SELECT COUNT(*) as count FROM agents`) as { count: number }[];
      const tenantsCount = await db.execute(sql`SELECT COUNT(*) as count FROM tenants`) as { count: number }[];

      log.info({
        calls: callsCount[0].count,
        agents: agentsCount[0].count,
        tenants: tenantsCount[0].count,
      }, 'Record counts');
    } catch {
      log.debug('Some tables might not have data yet, which is normal.');
    }

    log.info('Database test completed successfully!');
  } catch (error) {
    log.error({ err: error }, 'Database connection failed');
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testConnection();
