import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar user={user} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
