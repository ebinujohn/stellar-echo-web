import { db } from '../index';
import { calls, callMessages, callTransitions, callMetricsSummary, callAnalysis, agents } from '../schema';
import { eq, and, gte, lte, desc, count, sql, ilike, or } from 'drizzle-orm';
import type { CallFilters } from '@/types';

export async function getCallsList(
  filters: CallFilters,
  page = 1,
  pageSize = 20,
  tenantId: string
) {
  const offset = (page - 1) * pageSize;

  const conditions = [eq(calls.tenantId, tenantId)];

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

  const whereClause = and(...conditions);

  const [data, totalCount] = await Promise.all([
    db.select({
      callId: calls.callId,
      tenantId: calls.tenantId,
      agentId: calls.agentId,
      agentName: calls.agentName,
      fromNumber: calls.fromNumber,
      toNumber: calls.toNumber,
      status: calls.status,
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

export async function getCallDetail(callId: string, tenantId: string) {
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
    with: {
      agent: true,
      metrics: true,
      analysis: true,
      transcript: true,
    },
  });

  return call;
}

export async function getCallMessages(callId: string, tenantId: string) {
  // First verify the call belongs to this tenant
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
  });

  if (!call) {
    throw new Error('Call not found or access denied');
  }

  return db.query.callMessages.findMany({
    where: eq(callMessages.callId, callId),
    orderBy: [callMessages.timestamp],
  });
}

export async function getCallTransitions(callId: string, tenantId: string) {
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
  });

  if (!call) {
    throw new Error('Call not found or access denied');
  }

  return db.query.callTransitions.findMany({
    where: eq(callTransitions.callId, callId),
    orderBy: [callTransitions.timestamp],
  });
}

export async function getCallsStats(tenantId: string, filters?: CallFilters) {
  const conditions = [eq(calls.tenantId, tenantId)];

  if (filters?.startDate) {
    conditions.push(gte(calls.startedAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(calls.startedAt, filters.endDate));
  }

  const whereClause = and(...conditions);

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

  // Get average latency from metrics
  const latencyStats = await db
    .select({
      avgLatency: sql<number>`AVG(${callMetricsSummary.avgLlmTtfbMs})`,
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

export async function getAgentsList(tenantId: string) {
  return db.query.agents.findMany({
    where: eq(agents.tenantId, tenantId),
    orderBy: [agents.name],
  });
}
