import { LayoutDashboard, PlusCircle, Layers, BookOpen } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useRoles, type AppRole } from '@/hooks/useRoles';

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  minRole?: AppRole;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/capture', icon: PlusCircle, label: 'Capture', minRole: 'contributor' },
  { to: '/pool', icon: Layers, label: 'Pool', minRole: 'contributor' },
  { to: '/knowledge', icon: BookOpen, label: 'Knowledge' },
];

export function MobileNav() {
  const { hasRole, roleLoading } = useRoles();

  if (roleLoading) {
    return <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden h-16" />;
  }

  const visibleItems = navItems.filter((item) => {
    if (!item.minRole) return true;
    return hasRole(item.minRole);
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around h-16">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
