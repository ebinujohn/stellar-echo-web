import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function testConnection() {
  try {
    console.log('Testing database connection...');

    // Test basic connection
    const result = await db.execute(sql`SELECT NOW() as current_time, current_database() as database`);
    console.log('✅ Database connection successful!');
    console.log('Current time:', result[0]);

    // Test if tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Tables in database:');
    tablesResult.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    // Count records in key tables (if they exist)
    try {
      const callsCount = await db.execute(sql`SELECT COUNT(*) as count FROM calls`);
      console.log(`\n📞 Total calls: ${callsCount[0].count}`);

      const agentsCount = await db.execute(sql`SELECT COUNT(*) as count FROM agents`);
      console.log(`🤖 Total agents: ${agentsCount[0].count}`);

      const tenantsCount = await db.execute(sql`SELECT COUNT(*) as count FROM tenants`);
      console.log(`🏢 Total tenants: ${tenantsCount[0].count}`);
    } catch (error) {
      console.log('\nℹ️  Some tables might not have data yet, which is normal.');
    }

    console.log('\n✨ Database test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testConnection();
