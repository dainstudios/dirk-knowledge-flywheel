import { LayoutDashboard, PlusCircle, Layers, BookOpen, Newspaper } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useRoles, type AppRole } from '@/hooks/useRoles';
import { useNewsletterQueueCount } from '@/hooks/useNewsletterQueue';

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  minRole?: AppRole;
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/capture', icon: PlusCircle, label: 'Capture', minRole: 'contributor' },
  { to: '/pool', icon: Layers, label: 'Pool', minRole: 'contributor' },
  { to: '/knowledge', icon: BookOpen, label: 'Knowledge' },
  { to: '/newsletter', icon: Newspaper, label: 'Newsletter', minRole: 'contributor', showBadge: true },
];

export function MobileNav() {
  const { hasRole, roleLoading } = useRoles();
  const newsletterCount = useNewsletterQueueCount();

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
        {visibleItems.map(({ to, icon: Icon, label, showBadge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {showBadge && newsletterCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 text-[10px] font-medium bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  {newsletterCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
