import { db } from './index';
import { sql, count } from 'drizzle-orm';
import { loggers } from '@/lib/logger';
import { calls, agents, tenants } from './schema';

const log = loggers.db;

async function testConnection() {
  try {
    log.info('Testing database connection...');

    // Test basic connection - raw SQL required for system functions
    // nosemgrep: no-raw-sql-queries
    const result = await db.execute(sql`SELECT NOW() as current_time, current_database() as database`);
    log.info({ result: result[0] }, 'Database connection successful!');

    // Test if tables exist - raw SQL required for information_schema queries
    // nosemgrep: no-raw-sql-queries
    const tablesResult = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.map((row: { table_name?: string }) => row.table_name);
    log.info({ tables }, 'Tables in database');

    // Count records in key tables using Drizzle ORM
    try {
      const [callsResult] = await db.select({ count: count() }).from(calls);
      const [agentsResult] = await db.select({ count: count() }).from(agents);
      const [tenantsResult] = await db.select({ count: count() }).from(tenants);

      log.info({
        calls: callsResult.count,
        agents: agentsResult.count,
        tenants: tenantsResult.count,
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
