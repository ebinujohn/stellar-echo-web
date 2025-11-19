import * as dotenv from 'dotenv';
import * as path from 'path';
import postgres from 'postgres';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

console.log('Connecting to:', `postgresql://${process.env.DB_USER}:***@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

const sql = postgres(connectionString);

async function inspectSchema() {
  console.log('\n=== Inspecting call_messages table ===');
  const callMessages = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'call_messages'
    ORDER BY ordinal_position
  `;
  console.log(callMessages);

  console.log('\n=== Inspecting call_metrics_summary table ===');
  const callMetrics = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'call_metrics_summary'
    ORDER BY ordinal_position
  `;
  console.log(callMetrics);

  console.log('\n=== Inspecting call_analysis table ===');
  const callAnalysis = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'call_analysis'
    ORDER BY ordinal_position
  `;
  console.log(callAnalysis);

  console.log('\n=== Inspecting call_transcripts table ===');
  const callTranscripts = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'call_transcripts'
    ORDER BY ordinal_position
  `;
  console.log(callTranscripts);

  console.log('\n=== Inspecting call_transitions table ===');
  const callTransitions = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'call_transitions'
    ORDER BY ordinal_position
  `;
  console.log(callTransitions);

  await sql.end();
}

inspectSchema().catch(console.error);
