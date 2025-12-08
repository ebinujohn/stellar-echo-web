import { eq, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { QueryContext } from './types';

/**
 * Returns tenant filter condition, or undefined for global users.
 * Use this to conditionally apply tenant isolation in queries.
 *
 * @example
 * const conditions = [];
 * const tenantCondition = tenantFilter(calls.tenantId, ctx);
 * if (tenantCondition) conditions.push(tenantCondition);
 */
export function tenantFilter(
  column: PgColumn,
  ctx: QueryContext
): SQL | undefined {
  if (ctx.isGlobalUser) {
    return undefined; // No filter for global users - they see all tenants
  }
  return eq(column, ctx.tenantId);
}

// Re-export types for convenience
export type { QueryContext } from './types';
