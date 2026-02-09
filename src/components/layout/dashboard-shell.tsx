'use client';

import { SidebarProvider } from './sidebar-context';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { CommandPalette } from '@/components/ui/command-palette';
import type { AuthUser } from '@/types';

interface DashboardShellProps {
  user: AuthUser;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Navbar */}
          <Navbar user={user} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette />
    </SidebarProvider>
  );
}
