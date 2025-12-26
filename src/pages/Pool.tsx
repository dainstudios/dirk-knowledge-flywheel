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
  Quote
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
  { action: 'post2team', icon: Users, label: 'Team', color: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950', tooltip: 'Share to Slack' },
  { action: 'post2linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950' },
  { action: 'post2newsletter', icon: Mail, label: 'Newsletter', color: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950' },
  { action: 'knowledge', icon: Archive, label: 'Keep', color: 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950', tooltip: 'Save to Knowledge Base' },
];

function PoolSkeleton() {
  return (
    <Card className="max-w-2xl mx-auto border-border/50">
      <CardContent className="p-0">
        <div className="p-5 border-b border-border/50">
          <Skeleton className="h-7 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="p-5 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="p-5 border-t border-border/50">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-18" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
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

// Tag badge component with category colors
function TagBadge({ label, category }: { label: string; category: 'industry' | 'technology' | 'service' }) {
  const colorMap = {
    industry: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    technology: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
    service: 'bg-primary/15 text-primary border-primary/30',
  };
  
  return (
    <Badge variant="outline" className={`${colorMap[category]} text-xs font-medium`}>
      {label}
    </Badge>
  );
}

// Metadata pill
function MetadataPill({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
      <span className="font-medium">{label}:</span> {value}
    </span>
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
            toast({ description: actionLabels[action] });
            setExitingId(null);
            // Keep index in bounds
            if (currentIndex >= items.length - 1 && currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
            }
          },
          onError: () => {
            toast({ 
              description: 'Action failed. Please try again.',
              variant: 'destructive' 
            });
            setExitingId(null);
          },
        }
      );
    }, 200);
  };

  const hasTags = currentItem?.industries?.length || currentItem?.technologies?.length || currentItem?.service_lines?.length;
  const hasMetadata = currentItem?.source_credibility || currentItem?.actionability || currentItem?.timeliness;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 py-6 md:py-8">
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
          <div className="space-y-4">
            {/* Pool Card */}
            <Card 
              className={cn(
                'transition-all duration-200 border-border/50 overflow-hidden',
                exitingId === currentItem.id && 'opacity-0 translate-x-4'
              )}
            >
              <CardContent className="p-0">
                {/* Title Section */}
                <div className="p-5 border-b border-border/50">
                  <h2 className="text-xl font-bold text-foreground leading-tight mb-2">
                    {currentItem.title}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {currentItem.url && <span>{extractDomain(currentItem.url)}</span>}
                    {currentItem.url && <span>•</span>}
                    <span>{formatDistanceToNow(new Date(currentItem.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="p-5 border-b border-border/50">
                  {currentItem.summary ? (
                    <p className="text-foreground/90 leading-relaxed">
                      {currentItem.summary}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      Processing... Summary will appear once ready.
                    </p>
                  )}
                </div>

                {/* User Notes */}
                {currentItem.user_notes && (
                  <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
                    <p className="text-sm text-muted-foreground italic">
                      Your note: "{currentItem.user_notes}"
                    </p>
                  </div>
                )}

                {/* DAIN Context Section */}
                {currentItem.dain_context && (
                  <div className="p-5 border-b border-border/50 bg-primary/5">
                    <h3 className="text-sm font-semibold text-primary mb-2">
                      Why it matters for DAIN
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {currentItem.dain_context}
                    </p>
                  </div>
                )}

                {/* Quotables Section */}
                {currentItem.quotables && currentItem.quotables.length > 0 && (
                  <div className="p-5 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Quote className="h-4 w-4" />
                      Key Quotes
                    </h3>
                    <div className="space-y-3">
                      {currentItem.quotables.slice(0, 3).map((quote, i) => (
                        <blockquote 
                          key={i} 
                          className="pl-4 border-l-2 border-muted-foreground/30 text-sm text-foreground/80 italic"
                        >
                          "{quote}"
                        </blockquote>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags Section */}
                {hasTags && (
                  <div className="p-5 border-b border-border/50">
                    <div className="flex flex-wrap gap-2">
                      {currentItem.industries?.slice(0, 3).map((tag) => (
                        <TagBadge key={`ind-${tag}`} label={tag} category="industry" />
                      ))}
                      {currentItem.technologies?.slice(0, 3).map((tag) => (
                        <TagBadge key={`tech-${tag}`} label={tag} category="technology" />
                      ))}
                      {currentItem.service_lines?.slice(0, 3).map((tag) => (
                        <TagBadge key={`svc-${tag}`} label={tag} category="service" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata Footer */}
                <div className="px-5 py-3 bg-muted/20 flex flex-wrap items-center gap-2">
                  <MetadataPill label="Credibility" value={currentItem.source_credibility} />
                  <MetadataPill label="Actionability" value={currentItem.actionability} />
                  <MetadataPill label="Timeliness" value={currentItem.timeliness} />
                  
                  {currentItem.url && (
                    <a 
                      href={currentItem.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-auto text-sm text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      View Original <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden md:flex items-center justify-between p-4 border-t border-border/50 bg-background">
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
          </div>
        ) : null}
      </main>

      {/* Mobile Action Buttons */}
      {!isLoading && totalItems > 0 && currentItem && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3">
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
      )}

      <MobileNav />
    </div>
  );
}
