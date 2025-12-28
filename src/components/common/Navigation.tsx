import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, PlusCircle, Layers, BookOpen } from 'lucide-react';
import { useRoles, type AppRole } from '@/hooks/useRoles';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole?: AppRole;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/capture', label: 'Capture', icon: PlusCircle, minRole: 'contributor' },
  { to: '/pool', label: 'Pool', icon: Layers, minRole: 'contributor' },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
];

export function Navigation() {
  const { hasRole, roleLoading } = useRoles();

  if (roleLoading) {
    return <nav className="hidden md:flex items-center gap-1" />;
  }

  const visibleItems = navItems.filter((item) => {
    if (!item.minRole) return true;
    return hasRole(item.minRole);
  });

  return (
    <nav className="hidden md:flex items-center gap-1">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
