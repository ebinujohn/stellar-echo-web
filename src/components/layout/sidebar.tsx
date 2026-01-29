'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Phone,
  LayoutDashboard,
  PhoneCall,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Calls',
    href: '/calls',
    icon: Phone,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Agents',
    href: '/agents',
    icon: PhoneCall,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, isCollapsed, toggle, close, isMobile } = useSidebar();

  // Determine if sidebar should be collapsed
  const collapsed = !isMobile && isCollapsed;

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        data-sidebar
        className={cn(
          'z-50 flex h-full flex-col border-r bg-card transition-all duration-300',
          isMobile
            ? cn(
                'fixed inset-y-0 left-0',
                isOpen ? 'translate-x-0' : '-translate-x-full'
              )
            : 'relative',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo/Brand */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-2',
              collapsed && 'justify-center w-full'
            )}
            onClick={isMobile ? close : undefined}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            {!collapsed && <span className="text-lg font-semibold">Stellar Echo</span>}
          </Link>

          {/* Mobile close button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={close}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <nav className="flex-1 space-y-1 p-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const navLink = (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={isMobile ? close : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return navLink;
            })}
          </nav>
        </TooltipProvider>

        {/* Footer with collapse toggle */}
        <div className="border-t p-2">
          {/* Desktop collapse toggle */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full justify-start gap-2',
                collapsed && 'justify-center px-2'
              )}
              onClick={toggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          )}

          {/* Version info */}
          {!collapsed && (
            <div className="mt-2 px-2 text-xs text-muted-foreground">
              <p>Stellar Echo</p>
              <p className="mt-1">v1.0.0</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
