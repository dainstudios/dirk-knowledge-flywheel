import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from './Navigation';
import dainLogo from '@/assets/dain-logo.png';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <img src={dainLogo} alt="DAIN Studios" className="h-8 w-auto" />
          </div>
          <Navigation />
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline-block ml-2">Sign out</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
