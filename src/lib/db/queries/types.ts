/**
 * Context for database queries that require tenant isolation
 */
export interface QueryContext {
  tenantId: string;
  isGlobalUser: boolean;
}
