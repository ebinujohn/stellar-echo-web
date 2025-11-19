import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import type { AuthUser } from '@/types';

interface NavbarProps {
  user: AuthUser;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Welcome back, {user.name || user.email}</h2>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
