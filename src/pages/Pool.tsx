import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Trash2, 
  Users, 
  Linkedin, 
  Mail, 
  Archive, 
  CheckCircle, 
  PlusCircle,
  ExternalLink,
  Loader2,
  StickyNote
} from 'lucide-react';
import { Header, MobileNav } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePool, PoolAction } from '@/hooks/usePool';
import { cn } from '@/lib/utils';

function extractDomain(url: string | null): string {
  if (!url) return '';
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return '';
  }
}

const actions: { action: PoolAction; icon: typeof Trash2; label: string; color: string; tooltip?: string }[] = [
  { action: 'trash', icon: Trash2, label: 'Trash', color: 'text-muted-foreground hover:text-foreground hover:bg-muted' },
  { action: 'post2team', icon: Users, label: 'Team', color: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50', tooltip: 'Share to Slack' },
  { action: 'post2linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-sky-600 hover:text-sky-700 hover:bg-sky-50' },
  { action: 'post2newsletter', icon: Mail, label: 'Newsletter', color: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50' },
  { action: 'knowledge', icon: Archive, label: 'Keep', color: 'text-green-600 hover:text-green-700 hover:bg-green-50', tooltip: 'Save to Knowledge Base' },
];

function PoolSkeleton() {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Your pool is empty. Capture some content to get started.
      </p>
      <Button asChild>
        <Link to="/capture">
          <PlusCircle className="h-5 w-5 mr-2" />
          Capture Content
        </Link>
      </Button>
    </div>
  );
}

export default function Pool() {
  const { items, isLoading, curateItem, isCurating } = usePool();
  const { toast } = useToast();
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = items[currentIndex];
  const totalItems = items.length;

  const handleAction = (action: PoolAction) => {
    if (!currentItem || isCurating) return;

    setExitingId(currentItem.id);
    
    // Delay mutation to allow animation
    setTimeout(() => {
      curateItem(
        { id: currentItem.id, status: action },
        {
          onSuccess: () => {
            const actionLabels: Record<PoolAction, string> = {
              trash: 'Moved to trash',
              post2team: 'Queued for team',
              post2linkedin: 'Queued for LinkedIn',
              post2newsletter: 'Queued for newsletter',
              knowledge: 'Saved to knowledge base',
            };
            toast({ title: actionLabels[action] });
            setExitingId(null);
            // Keep index in bounds
            if (currentIndex >= items.length - 1 && currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
            }
          },
          onError: () => {
            toast({ 
              title: 'Action failed', 
              description: 'Please try again.',
              variant: 'destructive' 
            });
            setExitingId(null);
          },
        }
      );
    }, 200);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="container py-6 md:py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Review Pool</h1>
            {totalItems > 0 && (
              <Badge variant="secondary" className="text-sm">
                {totalItems}
              </Badge>
            )}
          </div>
          {totalItems > 0 && (
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {totalItems}
            </span>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <PoolSkeleton />
        ) : totalItems === 0 ? (
          <EmptyState />
        ) : currentItem ? (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Pool Card */}
            <Card 
              className={cn(
                'transition-all duration-200',
                exitingId === currentItem.id && 'opacity-0 translate-x-4'
              )}
            >
              <CardContent className="p-5 md:p-6 space-y-4">
                {/* Title & Domain */}
                <div>
                  {currentItem.url ? (
                    <a
                      href={currentItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-start gap-2"
                    >
                      <h2 className="text-lg md:text-xl font-semibold leading-tight group-hover:text-primary transition-colors">
                        {currentItem.title}
                      </h2>
                      <ExternalLink className="h-4 w-4 mt-1 text-muted-foreground group-hover:text-primary shrink-0" />
                    </a>
                  ) : (
                    <h2 className="text-lg md:text-xl font-semibold leading-tight">
                      {currentItem.title}
                    </h2>
                  )}
                  {currentItem.url && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {extractDomain(currentItem.url)}
                    </p>
                  )}
                </div>

                {/* User Notes */}
                {currentItem.user_notes && (
                  <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground italic">
                      {currentItem.user_notes}
                    </p>
                  </div>
                )}

                {/* Summary */}
                <div>
                  {currentItem.summary ? (
                    <p className="text-sm md:text-base text-foreground leading-relaxed">
                      {currentItem.summary}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Processing... Summary will appear once ready.
                    </p>
                  )}
                </div>

                {/* DAIN Context */}
                {currentItem.dain_context && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs font-medium text-primary mb-1">So What for DAIN</p>
                    <p className="text-sm text-foreground">
                      {currentItem.dain_context}
                    </p>
                  </div>
                )}

                {/* Tags & Time */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {currentItem.industries?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(currentItem.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden md:flex items-center justify-between pt-4 border-t border-border">
                  {actions.map(({ action, icon: Icon, label, color, tooltip }) => (
                    <Button
                      key={action}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(action)}
                      disabled={isCurating}
                      className={cn('gap-2', color)}
                      title={tooltip}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mobile Action Buttons */}
            <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background border-t border-border p-3">
              <div className="flex items-center justify-around">
                {actions.map(({ action, icon: Icon, label, color }) => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={isCurating}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[56px]',
                      color,
                      isCurating && 'opacity-50 pointer-events-none'
                    )}
                  >
                    {isCurating && exitingId ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <MobileNav />
    </div>
  );
}
