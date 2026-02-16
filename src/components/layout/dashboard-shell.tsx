"use client";

import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { CommandPalette } from "@/components/ui/command-palette";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types";

interface DashboardShellProps {
  user: AuthUser;
  children: React.ReactNode;
}

function DashboardShellInner({ user, children }: DashboardShellProps) {
  const { isFocusMode } = useSidebar();

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        {!isFocusMode && <Sidebar />}

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Navbar */}
          {!isFocusMode && <Navbar user={user} />}

          {/* Page content */}
          <main
            className={cn(
              "flex-1 overflow-y-auto bg-muted/10",
              !isFocusMode && "p-4 md:p-6",
            )}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette />
    </>
  );
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardShellInner user={user}>{children}</DashboardShellInner>
    </SidebarProvider>
  );
}
