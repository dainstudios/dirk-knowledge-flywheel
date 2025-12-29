import { Navigation } from './Navigation';
import { ProfileDropdown } from './ProfileDropdown';
import dainLogo from '@/assets/dain-logo.png';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <img src={dainLogo} alt="DAIN Studios" className="h-9 w-auto" />
            <span className="font-bold text-lg tracking-tight text-foreground hidden sm:block">
              Knowledge Flywheel
            </span>
          </div>
          <Navigation />
        </div>
        
        <ProfileDropdown />
      </div>
    </header>
  );
}
