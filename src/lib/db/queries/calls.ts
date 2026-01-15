import { db } from '../index';
import { calls, callMessages, callTransitions, callMetricsSummary, callAnalysis, agents, agentConfigVersions } from '../schema';
import { eq, and, gte, lte, desc, count, sql, ilike, or, inArray } from 'drizzle-orm';
import type { CallFilters } from '@/types';
import { tenantFilter, type QueryContext } from './utils';

export async function getCallsList(
  filters: CallFilters,
  page = 1,
  pageSize = 20,
  ctx: QueryContext
) {
  const offset = (page - 1) * pageSize;

  const conditions = [];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  if (filters.agentId) {
    conditions.push(eq(calls.agentId, filters.agentId));
  }
  if (filters.status) {
    conditions.push(eq(calls.status, filters.status));
  }
  if (filters.startDate) {
    conditions.push(gte(calls.startedAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(calls.startedAt, filters.endDate));
  }
  if (filters.fromNumber) {
    conditions.push(ilike(calls.fromNumber, `%${filters.fromNumber}%`));
  }
  if (filters.toNumber) {
    conditions.push(ilike(calls.toNumber, `%${filters.toNumber}%`));
  }
  if (filters.direction) {
    conditions.push(eq(calls.direction, filters.direction));
  }
  if (filters.search) {
    const searchCondition = or(
      ilike(calls.callId, `%${filters.search}%`),
      ilike(calls.agentName, `%${filters.search}%`),
      ilike(calls.fromNumber, `%${filters.search}%`),
      ilike(calls.toNumber, `%${filters.search}%`)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalCount] = await Promise.all([
    db.select({
      callId: calls.callId,
      tenantId: calls.tenantId,
      agentId: calls.agentId,
      agentName: calls.agentName,
      fromNumber: calls.fromNumber,
      toNumber: calls.toNumber,
      status: calls.status,
      direction: calls.direction,
      startedAt: calls.startedAt,
      endedAt: calls.endedAt,
      durationSeconds: calls.durationSeconds,
      totalMessages: calls.totalMessages,
      totalTransitions: calls.totalTransitions,
      recordingUrl: calls.recordingUrl,
    })
      .from(calls)
      .where(whereClause)
      .orderBy(desc(calls.startedAt))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: count() })
      .from(calls)
      .where(whereClause)
      .then(result => result[0]?.count || 0),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

export async function getCallDetail(callId: string, ctx: QueryContext) {
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const call = await db.query.calls.findFirst({
    where: and(...conditions),
    with: {
      agent: true,
      metrics: true,
      analysis: true,
      transcript: true,
    },
  });

  return call;
}

export async function getCallMessages(callId: string, ctx: QueryContext) {
  // First verify the call belongs to this tenant (or is accessible by global user)
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const call = await db.query.calls.findFirst({
    where: and(...conditions),
  });

  if (!call) {
    throw new Error('Call not found or access denied');
  }

  return db.query.callMessages.findMany({
    where: eq(callMessages.callId, callId),
    orderBy: [callMessages.timestamp],
  });
}

export async function getCallTransitions(callId: string, ctx: QueryContext) {
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const call = await db.query.calls.findFirst({
    where: and(...conditions),
  });

  if (!call) {
    throw new Error('Call not found or access denied');
  }

  return db.query.callTransitions.findMany({
    where: eq(callTransitions.callId, callId),
    orderBy: [callTransitions.timestamp],
  });
}

export async function getCallsStats(ctx: QueryContext, filters?: CallFilters) {
  const conditions = [];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  if (filters?.startDate) {
    conditions.push(gte(calls.startedAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(calls.startedAt, filters.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const stats = await db
    .select({
      totalCalls: count(),
      avgDuration: sql<number>`AVG(${calls.durationSeconds})`,
      successRate: sql<number>`
        (COUNT(CASE WHEN ${calls.status} = 'ended' THEN 1 END)::float /
         NULLIF(COUNT(*), 0) * 100)
      `,
    })
    .from(calls)
    .where(whereClause)
    .then(result => result[0]);

  // Get average latency from metrics (using User→Bot Latency - most important UX metric)
  const latencyStats = await db
    .select({
      avgLatency: sql<number>`AVG(${callMetricsSummary.avgUserToBotLatencyMs})`,
    })
    .from(callMetricsSummary)
    .innerJoin(calls, eq(calls.callId, callMetricsSummary.callId))
    .where(whereClause)
    .then(result => result[0]);

  return {
    totalCalls: stats?.totalCalls || 0,
    averageDuration: Math.round(stats?.avgDuration || 0),
    successRate: Math.round((stats?.successRate || 0) * 10) / 10,
    averageLatency: Math.round(latencyStats?.avgLatency || 0),
  };
}

export async function getAgentsList(ctx: QueryContext) {
  const tenantCondition = tenantFilter(agents.tenantId, ctx);

  const agentData = await db.query.agents.findMany({
    where: tenantCondition,
    orderBy: [agents.name],
  });

  // Early return if no agents
  if (agentData.length === 0) {
    return [];
  }

  const agentIds = agentData.map((a) => a.id);

  // Batch query 1: Get all call counts in one query (grouped by agentId)
  const callCountConditions = [inArray(calls.agentId, agentIds)];
  const callTenantCondition = tenantFilter(calls.tenantId, ctx);
  if (callTenantCondition) callCountConditions.push(callTenantCondition);

  const callCounts = await db
    .select({ agentId: calls.agentId, count: count() })
    .from(calls)
    .where(and(...callCountConditions))
    .groupBy(calls.agentId);
  const callCountMap = new Map(callCounts.map((c) => [c.agentId, Number(c.count)]));

  // Batch query 2: Get all active versions in one query
  const activeVersions = await db.query.agentConfigVersions.findMany({
    where: and(
      inArray(agentConfigVersions.agentId, agentIds),
      eq(agentConfigVersions.isActive, true)
    ),
  });
  const versionMap = new Map(activeVersions.map((v) => [v.agentId, v.version]));

  // Map results without additional queries
  return agentData.map((agent) => ({
    ...agent,
    callCount: callCountMap.get(agent.id) || 0,
    activeVersion: versionMap.get(agent.id) || null,
  }));
}

/**
 * Get call volume grouped by date for the last N days
 */
export async function getCallVolumeTimeSeries(ctx: QueryContext, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const conditions = [gte(calls.startedAt, startDate)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const results = await db
    .select({
      date: sql<string>`DATE(${calls.startedAt})`,
      count: count(),
    })
    .from(calls)
    .where(and(...conditions))
    .groupBy(sql`DATE(${calls.startedAt})`)
    .orderBy(sql`DATE(${calls.startedAt})`);

  return results;
}

/**
 * Get sentiment distribution across all calls
 */
export async function getSentimentDistribution(ctx: QueryContext) {
  const tenantCondition = tenantFilter(calls.tenantId, ctx);

  const results = await db
    .select({
      sentiment: callAnalysis.sentiment,
      count: count(),
    })
    .from(callAnalysis)
    .innerJoin(calls, eq(calls.callId, callAnalysis.callId))
    .where(tenantCondition)
    .groupBy(callAnalysis.sentiment)
    .orderBy(count());

  return results;
}

/**
 * Get average latency grouped by agent (using User→Bot Latency - most important UX metric)
 */
export async function getLatencyByAgent(ctx: QueryContext) {
  const tenantCondition = tenantFilter(calls.tenantId, ctx);

  const results = await db
    .select({
      agentId: calls.agentId,
      agentName: calls.agentName,
      avgLatency: sql<number>`AVG(${callMetricsSummary.avgUserToBotLatencyMs})`,
      callCount: count(),
    })
    .from(calls)
    .innerJoin(callMetricsSummary, eq(calls.callId, callMetricsSummary.callId))
    .where(tenantCondition)
    .groupBy(calls.agentId, calls.agentName)
    .having(sql`COUNT(*) > 0`)
    .orderBy(desc(count()));

  return results;
}

/**
 * Get token usage time series (aggregated by date)
 */
export async function getTokenUsageTimeSeries(ctx: QueryContext, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const conditions = [gte(calls.startedAt, startDate)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const results = await db
    .select({
      date: sql<string>`DATE(${calls.startedAt})`,
      totalTokens: sql<number>`SUM(${callMetricsSummary.totalLlmTokens})`,
      totalTtsChars: sql<number>`SUM(${callMetricsSummary.totalTtsCharacters})`,
      callCount: count(),
    })
    .from(calls)
    .innerJoin(callMetricsSummary, eq(calls.callId, callMetricsSummary.callId))
    .where(and(...conditions))
    .groupBy(sql`DATE(${calls.startedAt})`)
    .orderBy(sql`DATE(${calls.startedAt})`);

  return results;
}
