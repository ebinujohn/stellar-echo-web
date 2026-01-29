import { requireAuth } from '@/lib/auth/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import type { AuthUser } from '@/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require authentication
  const session = await requireAuth();

  // Convert session to AuthUser type
  const user: AuthUser = {
    id: session.userId,
    email: session.email,
    name: null, // You can fetch this from database if needed
    role: session.role,
    tenantId: session.tenantId,
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
