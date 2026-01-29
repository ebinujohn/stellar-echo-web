'use client';

import { Menu } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { useSidebar } from './sidebar-context';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/types';

interface NavbarProps {
  user: AuthUser;
}

export function Navbar({ user }: NavbarProps) {
  const { toggle, isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={toggle}
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-base md:text-lg font-semibold truncate">
          Welcome back, {user.name || user.email}
        </h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
