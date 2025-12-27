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
  Quote,
  FileText,
  FlaskConical,
  Check
} from 'lucide-react';
import { Header, MobileNav } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePool, PoolAction } from '@/hooks/usePool';
import { cn } from '@/lib/utils';

type SelectableAction = 'trash' | 'post2team' | 'post2linkedin' | 'post2newsletter' | 'knowledge';

interface ActionOption {
  action: SelectableAction;
  icon: typeof Trash2;
  label: string;
  selectedColor: string;
  description: string;
}

const actionOptions: ActionOption[] = [
  { action: 'trash', icon: Trash2, label: 'Trash', selectedColor: 'bg-red-500 border-red-500 text-white', description: 'Discard' },
  { action: 'post2team', icon: Users, label: 'Team', selectedColor: 'bg-blue-500 border-blue-500 text-white', description: 'Share to Slack' },
  { action: 'post2linkedin', icon: Linkedin, label: 'LinkedIn', selectedColor: 'bg-sky-500 border-sky-500 text-white', description: 'Queue for LinkedIn' },
  { action: 'post2newsletter', icon: Mail, label: 'Newsletter', selectedColor: 'bg-purple-500 border-purple-500 text-white', description: 'Queue for newsletter' },
  { action: 'knowledge', icon: Archive, label: 'Keep', selectedColor: 'bg-green-500 border-green-500 text-white', description: 'Save to knowledge base' },
];

function extractDomain(url: string | null): string {
  if (!url) return '';
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return '';
  }
}

// Helper to get summary text for selected actions
function getActionSummary(selected: Set<SelectableAction>): string {
  if (selected.size === 0) return '';
  if (selected.has('trash')) return 'Move to trash';
  
  const parts: string[] = [];
  if (selected.has('post2team')) parts.push('Share to Team');
  if (selected.has('post2linkedin')) parts.push('Add to LinkedIn Queue');
  if (selected.has('post2newsletter')) parts.push('Add to Newsletter Queue');
  if (selected.has('knowledge') && parts.length === 0) parts.push('Save to Knowledge Base');
  
  if (parts.length === 0) return 'Save to Knowledge Base';
  return parts.join(' + ');
}

function PoolSkeleton() {
  return (
    <Card className="max-w-2xl mx-auto shadow-sm border-border/60">
      <CardContent className="p-0">
        <div className="p-5 border-b border-border/50">
          <Skeleton className="h-7 w-3/4 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
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

// Credibility tier badge with colors
function CredibilityBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  
  const tierLower = tier.toLowerCase();
  let colorClass = 'bg-muted text-muted-foreground border-muted';
  let label = tier;
  
  if (tierLower.includes('tier 1') || tierLower.includes('tier1') || tierLower === 'high') {
    colorClass = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800';
    label = 'Tier 1';
  } else if (tierLower.includes('tier 2') || tierLower.includes('tier2') || tierLower === 'medium') {
    colorClass = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';
    label = 'Tier 2';
  } else if (tierLower.includes('tier 3') || tierLower.includes('tier3') || tierLower === 'low') {
    colorClass = 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    label = 'Tier 3';
  }
  
  return (
    <Badge variant="outline" className={`${colorClass} text-xs font-medium`}>
      {label}
    </Badge>
  );
}

// Content type badge
function ContentTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return (
    <Badge variant="secondary" className="text-xs font-medium">
      {type}
    </Badge>
  );
}

// Tag badge component with category colors
function TagBadge({ label, category }: { label: string; category: 'industry' | 'technology' | 'service' | 'function' }) {
  const colorMap = {
    industry: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    technology: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
    service: 'bg-primary/15 text-primary border-primary/30',
    function: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  };
  
  return (
    <Badge variant="outline" className={`${colorMap[category]} text-xs font-medium`}>
      {label}
    </Badge>
  );
}

// Labeled metadata display
function MetadataItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-medium text-foreground/70">{label}:</span>
      <span>{value}</span>
    </span>
  );
}

// Parse summary text with bullet points
function parseSummaryBullets(summary: string): string[] | null {
  if (!summary.includes('•')) return null;
  
  return summary
    .split(/(?:^|\n)\s*•\s*/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export default function Pool() {
  const { items, isLoading, processAction, isProcessing, postToSlack, isPostingToSlack } = usePool();
  const { toast } = useToast();
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedActions, setSelectedActions] = useState<Set<SelectableAction>>(new Set());
  const [postingTeamItemId, setPostingTeamItemId] = useState<string | null>(null);

  const currentItem = items[currentIndex];
  const totalItems = items.length;

  // Handle Team button click - posts to Slack immediately
  const handleTeamClick = async () => {
    if (!currentItem || isPostingToSlack) return;

    setPostingTeamItemId(currentItem.id);
    setExitingId(currentItem.id);

    postToSlack(currentItem.id, {
      onSuccess: () => {
        toast({ description: 'Shared to Team!' });
        setPostingTeamItemId(null);
        setExitingId(null);
        setSelectedActions(new Set());
        if (currentIndex >= items.length - 1 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to share';
        toast({ description: message, variant: 'destructive' });
        setPostingTeamItemId(null);
        setExitingId(null);
      },
    });
  };

  // Toggle action selection with multi-select logic
  const toggleAction = (action: SelectableAction) => {
    // If clicking Team, handle separately
    if (action === 'post2team') {
      handleTeamClick();
      return;
    }

    setSelectedActions(prev => {
      const newSet = new Set(prev);
      
      if (action === 'trash') {
        // Trash is exclusive - selecting it deselects everything else
        if (newSet.has('trash')) {
          newSet.delete('trash');
        } else {
          newSet.clear();
          newSet.add('trash');
        }
      } else {
        // Any other action deselects Trash
        newSet.delete('trash');
        
        if (newSet.has(action)) {
          newSet.delete(action);
        } else {
          newSet.add(action);
        }
      }
      
      return newSet;
    });
  };

  const handleProcessItem = async () => {
    if (!currentItem || isProcessing || selectedActions.size === 0) return;

    setExitingId(currentItem.id);
    
    const actionsPayload = {
      trash: selectedActions.has('trash'),
      team: selectedActions.has('post2team'),
      linkedin: selectedActions.has('post2linkedin'),
      newsletter: selectedActions.has('post2newsletter'),
      keep: selectedActions.has('knowledge') || 
            (!selectedActions.has('trash') && 
             !selectedActions.has('post2team') && 
             !selectedActions.has('post2linkedin') && 
             !selectedActions.has('post2newsletter')),
    };
    
    setTimeout(() => {
      processAction(
        { item_id: currentItem.id, actions: actionsPayload },
        {
          onSuccess: (response) => {
            toast({ description: response.message || 'Action completed' });
            setExitingId(null);
            setSelectedActions(new Set());
            if (currentIndex >= items.length - 1 && currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
            }
          },
          onError: (error: Error) => {
            toast({ description: error.message || 'Action failed', variant: 'destructive' });
            setExitingId(null);
          },
        }
      );
    }, 200);
  };

  const hasTags = currentItem?.industries?.length || currentItem?.technologies?.length || currentItem?.service_lines?.length || currentItem?.business_functions?.length;
  const actionSummary = getActionSummary(selectedActions);

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
                'transition-all duration-200 shadow-sm border-border/60 overflow-hidden',
                exitingId === currentItem.id && 'opacity-0 translate-x-4'
              )}
            >
              <CardContent className="p-0">
                {/* Header Section */}
                <div className="p-5 border-b border-border/50">
                  {/* Title */}
                  <h2 className="text-xl font-bold text-foreground leading-tight mb-1">
                    {currentItem.title}
                  </h2>
                  
                  {/* Author/Organization line */}
                  {(currentItem.author || currentItem.author_organization) && (
                    <p className="text-sm text-muted-foreground mb-3">
                      By {currentItem.author && currentItem.author_organization
                        ? `${currentItem.author} • ${currentItem.author_organization}`
                        : currentItem.author_organization || currentItem.author}
                    </p>
                  )}
                  
                  {/* Source Links */}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {currentItem.google_drive_url && (
                      <a 
                        href={currentItem.google_drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        View PDF
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {currentItem.url && (
                      <a 
                        href={currentItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Source
                      </a>
                    )}
                  </div>
                  
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <ContentTypeBadge type={currentItem.content_type} />
                    <CredibilityBadge tier={currentItem.source_credibility} />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(currentItem.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="p-5 border-b border-border/50">
                  {currentItem.summary ? (
                    (() => {
                      const bullets = parseSummaryBullets(currentItem.summary);
                      if (bullets) {
                        return (
                          <ul className="space-y-2 text-foreground/90">
                            {bullets.map((bullet, i) => (
                              <li key={i} className="flex items-start gap-2 leading-relaxed">
                                <span className="text-primary mt-1.5 text-xs">•</span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      return (
                        <p className="text-foreground/90 leading-relaxed">
                          {currentItem.summary}
                        </p>
                      );
                    })()
                  ) : (
                    <p className="text-muted-foreground italic">
                      Processing... Summary will appear once ready.
                    </p>
                  )}
                </div>

                {/* Study Methodology Section (for Research Reports) */}
                {currentItem.methodology && (
                  <div className="px-5 py-4 border-b border-border/50 bg-blue-50/50 dark:bg-blue-950/20">
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Study Methodology
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {currentItem.methodology}
                    </p>
                  </div>
                )}

                {/* User Notes */}
                {currentItem.user_notes && (
                  <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
                    <p className="text-sm text-muted-foreground italic">
                      Your note: &ldquo;{currentItem.user_notes}&rdquo;
                    </p>
                  </div>
                )}

                {/* DAIN Context Section */}
                {currentItem.dain_context && (
                  <div className="p-5 border-b border-border/50 bg-primary/5 border-l-4 border-l-primary">
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
                      <Quote className="h-4 w-4 text-muted-foreground" />
                      Key Quotes
                    </h3>
                    <div className="space-y-3">
                      {currentItem.quotables.slice(0, 3).map((quote, i) => (
                        <blockquote 
                          key={i} 
                          className="pl-4 border-l-2 border-muted-foreground/30 text-sm text-foreground/80 italic"
                        >
                          &ldquo;{quote}&rdquo;
                        </blockquote>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags Section */}
                {hasTags && (
                  <div className="p-5 border-b border-border/50">
                    <div className="flex flex-wrap gap-2">
                      {currentItem.industries?.slice(0, 4).map((tag) => (
                        <TagBadge key={`ind-${tag}`} label={tag} category="industry" />
                      ))}
                      {currentItem.technologies?.slice(0, 4).map((tag) => (
                        <TagBadge key={`tech-${tag}`} label={tag} category="technology" />
                      ))}
                      {currentItem.service_lines?.slice(0, 4).map((tag) => (
                        <TagBadge key={`svc-${tag}`} label={tag} category="service" />
                      ))}
                      {currentItem.business_functions?.slice(0, 4).map((tag) => (
                        <TagBadge key={`func-${tag}`} label={tag} category="function" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata Footer */}
                <div className="px-5 py-3 bg-muted/20 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <MetadataItem label="Actionability" value={currentItem.actionability} />
                  <MetadataItem label="Timeliness" value={currentItem.timeliness} />
                  <MetadataItem label="Relevance" value={currentItem.dain_relevance} />
                </div>

                {/* Action Selection - Desktop */}
                <div className="hidden md:block p-4 border-t border-border/50 bg-background space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {actionOptions.map(({ action, icon: Icon, label, selectedColor }) => {
                      const isSelected = selectedActions.has(action);
                      const isTeamLoading = action === 'post2team' && postingTeamItemId === currentItem.id;
                      const isDisabled = isProcessing || isTeamLoading;
                      
                      return (
                        <button
                          key={action}
                          onClick={() => toggleAction(action)}
                          disabled={isDisabled}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium',
                            isSelected
                              ? selectedColor
                              : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/50',
                            isDisabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {isTeamLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Process Button */}
                  <Button
                    onClick={handleProcessItem}
                    disabled={isProcessing || selectedActions.size === 0}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {actionSummary || 'Select an action'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>

      {/* Mobile Action Buttons */}
      {!isLoading && totalItems > 0 && currentItem && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {actionOptions.map(({ action, icon: Icon, label, selectedColor }) => {
              const isSelected = selectedActions.has(action);
              const isTeamLoading = action === 'post2team' && postingTeamItemId === currentItem.id;
              const isDisabled = isProcessing || isTeamLoading;
              
              return (
                <button
                  key={action}
                  onClick={() => toggleAction(action)}
                  disabled={isDisabled}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 transition-all text-xs font-medium',
                    isSelected
                      ? selectedColor
                      : 'border-border bg-background text-muted-foreground',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isTeamLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isSelected ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
          
          <Button
            onClick={handleProcessItem}
            disabled={isProcessing || selectedActions.size === 0}
            className="w-full"
            size="sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              actionSummary || 'Select an action'
            )}
          </Button>
        </div>
      )}

      <MobileNav />
    </div>
  );
}
