import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, PlusCircle, Layers, BookOpen, Newspaper } from 'lucide-react';
import { useRoles, type AppRole } from '@/hooks/useRoles';
import { useNewsletterQueueCount } from '@/hooks/useNewsletterQueue';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole?: AppRole;
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/capture', label: 'Capture', icon: PlusCircle, minRole: 'contributor' },
  { to: '/pool', label: 'Pool', icon: Layers, minRole: 'contributor' },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { to: '/newsletter', label: 'Newsletter', icon: Newspaper, minRole: 'contributor', showBadge: true },
];

export function Navigation() {
  const { hasRole, roleLoading } = useRoles();
  const newsletterCount = useNewsletterQueueCount();

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
          {item.showBadge && newsletterCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
              {newsletterCount}
            </Badge>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
