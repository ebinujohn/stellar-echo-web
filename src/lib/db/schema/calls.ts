import { pgTable, pgEnum, uuid, varchar, timestamp, integer, boolean, text, jsonb, index, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { agents, agentConfigVersions } from './agents';
import { relations } from 'drizzle-orm';

// Call direction enum - 'inbound' for calls received, 'outbound' for calls initiated
export const callDirectionEnum = pgEnum('call_direction_enum', ['inbound', 'outbound']);

export const calls = pgTable('calls', {
  callId: uuid('call_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  agentId: uuid('agent_id').references(() => agents.id),
  agentName: varchar('agent_name', { length: 255 }),
  agentVersionId: uuid('agent_version_id').references(() => agentConfigVersions.id),
  twilioCallSid: varchar('twilio_call_sid', { length: 100 }),
  twilioStreamSid: varchar('twilio_stream_sid', { length: 100 }),
  fromNumber: varchar('from_number', { length: 20 }),
  toNumber: varchar('to_number', { length: 20 }),
  status: varchar('status', { length: 50 }).notNull(),
  direction: callDirectionEnum('direction').default('inbound'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
  recordingEnabled: boolean('recording_enabled').default(false),
  recordingUrl: varchar('recording_url', { length: 500 }),
  initialNodeId: varchar('initial_node_id', { length: 100 }),
  finalNodeId: varchar('final_node_id', { length: 100 }),
  totalTurns: integer('total_turns').default(0),
  totalMessages: integer('total_messages').default(0),
  totalTransitions: integer('total_transitions').default(0),
  totalRagQueries: integer('total_rag_queries').default(0),
  totalUserInterruptions: integer('total_user_interruptions').default(0),
  totalVariablesExtracted: integer('total_variables_extracted').default(0),
  totalVariablesFailed: integer('total_variables_failed').default(0),
  analysisPending: boolean('analysis_pending').default(true),
}, (table) => ({
  tenantIdx: index('calls_tenant_idx').on(table.tenantId),
  agentIdx: index('calls_agent_idx').on(table.agentId),
  startedAtIdx: index('calls_started_at_idx').on(table.startedAt),
  statusIdx: index('calls_status_idx').on(table.status),
  directionIdx: index('calls_direction_idx').on(table.direction),
}));

export const callMessages = pgTable('call_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.callId, { onDelete: 'cascade' }),
  sequence: integer('sequence'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  content: text('content').notNull(),
  nodeId: varchar('node_id', { length: 100 }),
  turnNumber: integer('turn_number'),
  wasInterrupted: boolean('was_interrupted'),
}, (table) => ({
  callIdx: index('call_messages_call_idx').on(table.callId),
  timestampIdx: index('call_messages_timestamp_idx').on(table.timestamp),
}));

export const callTransitions = pgTable('call_transitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.callId, { onDelete: 'cascade' }),
  sequence: integer('sequence'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  fromNodeId: varchar('from_node_id', { length: 100 }),
  fromNodeName: varchar('from_node_name', { length: 255 }),
  toNodeId: varchar('to_node_id', { length: 100 }),
  toNodeName: varchar('to_node_name', { length: 255 }),
  reason: text('reason'),
  condition: varchar('condition', { length: 255 }),
  turnNumber: integer('turn_number'),
}, (table) => ({
  callIdx: index('call_transitions_call_idx').on(table.callId),
  timestampIdx: index('call_transitions_timestamp_idx').on(table.timestamp),
}));

export const callTranscripts = pgTable('call_transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.callId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  transcriptText: text('transcript_text'),
  transcriptData: jsonb('transcript_data'),
});

export const callMetricsSummary = pgTable('call_metrics_summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.callId, { onDelete: 'cascade' }),
  metricsData: jsonb('metrics_data'),
  avgSttDelayMs: decimal('avg_stt_delay_ms'),
  minSttDelayMs: decimal('min_stt_delay_ms'),
  maxSttDelayMs: decimal('max_stt_delay_ms'),
  avgUserToBotLatencyMs: decimal('avg_user_to_bot_latency_ms'),
  minUserToBotLatencyMs: decimal('min_user_to_bot_latency_ms'),
  maxUserToBotLatencyMs: decimal('max_user_to_bot_latency_ms'),
  avgTranscriptLlmGapMs: decimal('avg_transcript_llm_gap_ms'),
  minTranscriptLlmGapMs: decimal('min_transcript_llm_gap_ms'),
  maxTranscriptLlmGapMs: decimal('max_transcript_llm_gap_ms'),
  avgLlmProcessingMs: decimal('avg_llm_processing_ms'),
  minLlmProcessingMs: decimal('min_llm_processing_ms'),
  maxLlmProcessingMs: decimal('max_llm_processing_ms'),
  avgLlmToTtsGapMs: decimal('avg_llm_to_tts_gap_ms'),
  minLlmToTtsGapMs: decimal('min_llm_to_tts_gap_ms'),
  maxLlmToTtsGapMs: decimal('max_llm_to_tts_gap_ms'),
  avgPipelineTotalMs: decimal('avg_pipeline_total_ms'),
  minPipelineTotalMs: decimal('min_pipeline_total_ms'),
  maxPipelineTotalMs: decimal('max_pipeline_total_ms'),
  avgRagProcessingMs: decimal('avg_rag_processing_ms'),
  minRagProcessingMs: decimal('min_rag_processing_ms'),
  maxRagProcessingMs: decimal('max_rag_processing_ms'),
  avgVariableExtractionMs: decimal('avg_variable_extraction_ms'),
  minVariableExtractionMs: decimal('min_variable_extraction_ms'),
  maxVariableExtractionMs: decimal('max_variable_extraction_ms'),
  avgLlmTtfbMs: decimal('avg_llm_ttfb_ms'),
  minLlmTtfbMs: decimal('min_llm_ttfb_ms'),
  maxLlmTtfbMs: decimal('max_llm_ttfb_ms'),
  avgSttTtfbMs: decimal('avg_stt_ttfb_ms'),
  minSttTtfbMs: decimal('min_stt_ttfb_ms'),
  maxSttTtfbMs: decimal('max_stt_ttfb_ms'),
  avgSttProcessingMs: decimal('avg_stt_processing_ms'),
  minSttProcessingMs: decimal('min_stt_processing_ms'),
  maxSttProcessingMs: decimal('max_stt_processing_ms'),
  avgTtsTtfbMs: decimal('avg_tts_ttfb_ms'),
  minTtsTtfbMs: decimal('min_tts_ttfb_ms'),
  maxTtsTtfbMs: decimal('max_tts_ttfb_ms'),
  totalLlmTokens: integer('total_llm_tokens'),
  totalTtsCharacters: integer('total_tts_characters'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const callAnalysis = pgTable('call_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.callId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  sentiment: varchar('sentiment', { length: 50 }),
  sentimentScore: decimal('sentiment_score', { precision: 5, scale: 2 }),
  summary: text('summary'),
  callSuccessful: boolean('call_successful'),
  successConfidence: decimal('success_confidence', { precision: 5, scale: 2 }),
  keywordsDetected: text('keywords_detected').array(),
  topicsDiscussed: text('topics_discussed').array(),
  analysisMetadata: jsonb('analysis_metadata'),
  status: varchar('status', { length: 50 }),
  processingTimeMs: decimal('processing_time_ms'),
  errorMessage: text('error_message'),
});

export const callRagRetrievals = pgTable('call_rag_retrievals', {
  retrievalId: uuid('retrieval_id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.callId, { onDelete: 'cascade' }),
  queryText: text('query_text'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  turnNumber: integer('turn_number'),
  numResults: integer('num_results'),
  queryLatencyMs: integer('query_latency_ms'),
  metadata: jsonb('metadata'),
  partitionKey: timestamp('partition_key', { mode: 'date' }).notNull(),
}, (table) => ({
  callIdx: index('call_rag_retrievals_call_idx').on(table.callId),
}));

export const callExtractedVariables = pgTable('call_extracted_variables', {
  extractionId: uuid('extraction_id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.callId, { onDelete: 'cascade' }),
  variableName: varchar('variable_name', { length: 255 }),
  extractedValue: text('extracted_value'),
  extractionStatus: varchar('extraction_status', { length: 50 }),
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 2 }),
  extractedAt: timestamp('extracted_at', { withTimezone: true }).notNull(),
  turnNumber: integer('turn_number'),
  extractionMetadata: jsonb('extraction_metadata'),
}, (table) => ({
  callIdx: index('call_extracted_variables_call_idx').on(table.callId),
}));

export const callUserInterruptions = pgTable('call_user_interruptions', {
  interruptionId: uuid('interruption_id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.callId, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  turnNumber: integer('turn_number'),
  interruptionText: text('interruption_text'),
  wasHandled: boolean('was_handled'),
  recoveryStrategy: varchar('recovery_strategy', { length: 100 }),
  delayMs: integer('delay_ms'),
}, (table) => ({
  callIdx: index('call_user_interruptions_call_idx').on(table.callId),
}));

// Relations
export const callsRelations = relations(calls, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [calls.tenantId],
    references: [tenants.id],
  }),
  agent: one(agents, {
    fields: [calls.agentId],
    references: [agents.id],
  }),
  agentVersion: one(agentConfigVersions, {
    fields: [calls.agentVersionId],
    references: [agentConfigVersions.id],
  }),
  messages: many(callMessages),
  transitions: many(callTransitions),
  transcript: one(callTranscripts),
  metrics: one(callMetricsSummary),
  analysis: one(callAnalysis),
  ragRetrievals: many(callRagRetrievals),
  extractedVariables: many(callExtractedVariables),
  interruptions: many(callUserInterruptions),
}));

export const callMessagesRelations = relations(callMessages, ({ one }) => ({
  call: one(calls, {
    fields: [callMessages.callId],
    references: [calls.callId],
  }),
}));

export const callTransitionsRelations = relations(callTransitions, ({ one }) => ({
  call: one(calls, {
    fields: [callTransitions.callId],
    references: [calls.callId],
  }),
}));

export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type CallMessage = typeof callMessages.$inferSelect;
export type NewCallMessage = typeof callMessages.$inferInsert;
export type CallTransition = typeof callTransitions.$inferSelect;
export type CallTranscript = typeof callTranscripts.$inferSelect;
export type CallMetricsSummary = typeof callMetricsSummary.$inferSelect;
export type CallAnalysis = typeof callAnalysis.$inferSelect;
export type CallRagRetrieval = typeof callRagRetrievals.$inferSelect;
export type CallExtractedVariable = typeof callExtractedVariables.$inferSelect;
export type CallUserInterruption = typeof callUserInterruptions.$inferSelect;
export type CallDirection = (typeof callDirectionEnum.enumValues)[number];
