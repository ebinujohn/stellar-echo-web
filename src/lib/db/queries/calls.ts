import { db } from '../index';
import { calls, callMessages, callTransitions, callMetricsSummary, callAnalysis, agents, agentConfigVersions } from '../schema';
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

export async function getAgentsList(tenantId: string) {
  const agentData = await db.query.agents.findMany({
    where: eq(agents.tenantId, tenantId),
    orderBy: [agents.name],
  });

  // Get call counts for each agent
  const agentsWithStats = await Promise.all(
    agentData.map(async (agent) => {
      const callCount = await db
        .select({ count: count() })
        .from(calls)
        .where(
          and(
            eq(calls.agentId, agent.id),
            eq(calls.tenantId, tenantId)
          )
        )
        .then(result => result[0]?.count || 0);

      // Get active version
      const activeVersion = await db.query.agentConfigVersions.findFirst({
        where: and(
          eq(agentConfigVersions.agentId, agent.id),
          eq(agentConfigVersions.isActive, true)
        ),
      });

      return {
        ...agent,
        callCount: Number(callCount),
        activeVersion: activeVersion?.version || null,
      };
    })
  );

  return agentsWithStats;
}

/**
 * Get call volume grouped by date for the last N days
 */
export async function getCallVolumeTimeSeries(tenantId: string, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const results = await db
    .select({
      date: sql<string>`DATE(${calls.startedAt})`,
      count: count(),
    })
    .from(calls)
    .where(
      and(
        eq(calls.tenantId, tenantId),
        gte(calls.startedAt, startDate)
      )
    )
    .groupBy(sql`DATE(${calls.startedAt})`)
    .orderBy(sql`DATE(${calls.startedAt})`);

  return results;
}

/**
 * Get sentiment distribution across all calls
 */
export async function getSentimentDistribution(tenantId: string) {
  const results = await db
    .select({
      sentiment: callAnalysis.sentiment,
      count: count(),
    })
    .from(callAnalysis)
    .innerJoin(calls, eq(calls.callId, callAnalysis.callId))
    .where(eq(calls.tenantId, tenantId))
    .groupBy(callAnalysis.sentiment)
    .orderBy(count());

  return results;
}

/**
 * Get average latency grouped by agent (using User→Bot Latency - most important UX metric)
 */
export async function getLatencyByAgent(tenantId: string) {
  const results = await db
    .select({
      agentId: calls.agentId,
      agentName: calls.agentName,
      avgLatency: sql<number>`AVG(${callMetricsSummary.avgUserToBotLatencyMs})`,
      callCount: count(),
    })
    .from(calls)
    .innerJoin(callMetricsSummary, eq(calls.callId, callMetricsSummary.callId))
    .where(eq(calls.tenantId, tenantId))
    .groupBy(calls.agentId, calls.agentName)
    .having(sql`COUNT(*) > 0`)
    .orderBy(desc(count()));

  return results;
}

/**
 * Get token usage time series (aggregated by date)
 */
export async function getTokenUsageTimeSeries(tenantId: string, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const results = await db
    .select({
      date: sql<string>`DATE(${calls.startedAt})`,
      totalTokens: sql<number>`SUM(${callMetricsSummary.totalLlmTokens})`,
      totalTtsChars: sql<number>`SUM(${callMetricsSummary.totalTtsCharacters})`,
      callCount: count(),
    })
    .from(calls)
    .innerJoin(callMetricsSummary, eq(calls.callId, callMetricsSummary.callId))
    .where(
      and(
        eq(calls.tenantId, tenantId),
        gte(calls.startedAt, startDate)
      )
    )
    .groupBy(sql`DATE(${calls.startedAt})`)
    .orderBy(sql`DATE(${calls.startedAt})`);

  return results;
}
