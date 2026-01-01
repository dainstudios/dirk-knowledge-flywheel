import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
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
  Info,
  Check,
  Lightbulb,
  Calendar
} from 'lucide-react';
import { Header, MobileNav, FormattedText, EditableTextArea } from '@/components/common';
import { TeamPostModal, EditableTitle, HighlightableQuote, NotesEditor } from '@/components/pool';
import { NewsletterNoteModal } from '@/components/newsletter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { usePool, PoolAction, PostOption, PoolItemUpdate } from '@/hooks/usePool';
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
  { action: 'trash', icon: Trash2, label: 'Trash', selectedColor: 'bg-grey-500 border-grey-500 text-white', description: 'Discard' },
  { action: 'post2team', icon: Users, label: 'Team', selectedColor: 'bg-grey-400 border-grey-400 text-white', description: 'Share to Slack' },
  { action: 'post2linkedin', icon: Linkedin, label: 'LinkedIn', selectedColor: 'bg-grey-400 border-grey-400 text-white', description: 'Queue for LinkedIn' },
  { action: 'post2newsletter', icon: Mail, label: 'Newsletter', selectedColor: 'bg-grey-400 border-grey-400 text-white', description: 'Queue for newsletter' },
  { action: 'knowledge', icon: Archive, label: 'Keep', selectedColor: 'bg-primary border-primary text-white', description: 'Save to knowledge base' },
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
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-0">
        <div className="p-6 border-b border-grey-200">
          <Skeleton className="h-7 w-3/4 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="p-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="p-6 border-t border-grey-200">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-18 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-grey-100 flex items-center justify-center mb-6">
        <CheckCircle className="h-8 w-8 text-grey-400" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-foreground">All caught up!</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Your pool is empty. Capture some content to get started.
      </p>
      <Button asChild variant="pill">
        <Link to="/capture">
          <PlusCircle className="h-5 w-5 mr-2" />
          Capture Content
        </Link>
      </Button>
    </div>
  );
}

// Tier explanations for tooltips
const tierExplanations: Record<string, string> = {
  'Tier 1': 'Highly credible: Academic journals, major publications, or industry leaders',
  'Tier 2': 'Credible: Established organizations or known experts',
  'Tier 3': 'General: Blogs, social media, or unverified sources',
};

// Credibility tier badge with tooltip
function CredibilityBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  
  const tierLower = tier.toLowerCase();
  let label = tier;
  
  if (tierLower.includes('tier 1') || tierLower.includes('tier1') || tierLower === 'high') {
    label = 'Tier 1';
  } else if (tierLower.includes('tier 2') || tierLower.includes('tier2') || tierLower === 'medium') {
    label = 'Tier 2';
  } else if (tierLower.includes('tier 3') || tierLower.includes('tier3') || tierLower === 'low') {
    label = 'Tier 3';
  }
  
  const explanation = tierExplanations[label] || tier;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="cursor-help">
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Content type badge
function ContentTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return (
    <Badge variant="default">
      {type}
    </Badge>
  );
}

// Editable tag badge component
function EditableTagBadge({ 
  label, 
  category, 
  isActive, 
  onToggle 
}: { 
  label: string; 
  category: 'industry' | 'technology' | 'service' | 'function';
  isActive: boolean;
  onToggle: () => void;
}) {
  const colorMap = {
    industry: 'bg-grey-100 text-grey-500 border-grey-200',
    technology: 'bg-grey-100 text-grey-500 border-grey-200',
    service: 'bg-primary/10 text-primary border-primary/20',
    function: 'bg-grey-100 text-grey-500 border-grey-200',
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        `${colorMap[category]} text-xs font-medium cursor-pointer transition-all`,
        !isActive && 'opacity-40 line-through'
      )}
      onClick={onToggle}
    >
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
  const { items, isLoading, processAction, isProcessing, updatePoolItem, isUpdating } = usePool();
  const { toast } = useToast();
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedActions, setSelectedActions] = useState<Set<SelectableAction>>(new Set());
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);

  const currentItem = items[currentIndex];
  const totalItems = items.length;

  // Handle Team button click - opens modal for posting options
  const handleTeamClick = () => {
    if (!currentItem || isProcessing) return;
    setIsTeamModalOpen(true);
  };

  // Handle Team post confirmation from modal
  const handleTeamPostConfirm = (option: PostOption) => {
    if (!currentItem) return;

    setIsTeamModalOpen(false);
    setExitingId(currentItem.id);

    // Pass the post_option to processAction so the backend knows what to include
    processAction(
      { 
        item_id: currentItem.id, 
        actions: { team: true, trash: false, linkedin: false, newsletter: false, keep: false },
        post_option: option,
      },
      {
        onSuccess: () => {
          toast({ description: 'Shared to Team!' });
          setExitingId(null);
          setSelectedActions(new Set());
          if (currentIndex >= items.length - 1 && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
        },
        onError: (err: Error) => {
          toast({ description: err.message || 'Failed to share', variant: 'destructive' });
          setExitingId(null);
        },
      }
    );
  };

  // Handle Newsletter button click - opens modal for adding note
  const handleNewsletterClick = () => {
    if (!currentItem || isProcessing) return;
    setIsNewsletterModalOpen(true);
  };

  // Handle Newsletter confirm from modal
  const handleNewsletterConfirm = async (note: string) => {
    if (!currentItem) return;

    setIsNewsletterModalOpen(false);
    setExitingId(currentItem.id);

    // First update curator_notes if note was provided
    if (note.trim()) {
      updatePoolItem({ 
        id: currentItem.id, 
        updates: { curator_notes: note.trim() } 
      });
    }

    // Then process the newsletter action
    processAction(
      { 
        item_id: currentItem.id, 
        actions: { newsletter: true, trash: false, team: false, linkedin: false, keep: false }
      },
      {
        onSuccess: () => {
          toast({ description: 'Added to Newsletter Queue!' });
          setExitingId(null);
          setSelectedActions(new Set());
          if (currentIndex >= items.length - 1 && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
        },
        onError: (err: Error) => {
          toast({ description: err.message || 'Failed to queue', variant: 'destructive' });
          setExitingId(null);
        },
      }
    );
  };

  // Toggle action selection with multi-select logic
  const toggleAction = (action: SelectableAction) => {
    // If clicking Team, handle separately
    if (action === 'post2team') {
      handleTeamClick();
      return;
    }

    // If clicking Newsletter, handle separately
    if (action === 'post2newsletter') {
      handleNewsletterClick();
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
            toast({ description: response.summary || 'Action completed' });
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

      <main className="container max-w-2xl mx-auto px-4 py-8 md:py-10">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="heading-section text-foreground">Review Pool</h1>
            {totalItems > 0 && (
              <Badge variant="secondary">
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
                'transition-all duration-200 overflow-hidden',
                exitingId === currentItem.id && 'opacity-0 translate-x-4'
              )}
            >
              <CardContent className="p-0">
                {/* Header Section */}
                <div className="p-6 border-b border-grey-200">
                  {/* Editable Title */}
                  <EditableTitle
                    title={currentItem.title}
                    onSave={(newTitle) => {
                      updatePoolItem({ id: currentItem.id, updates: { title: newTitle } });
                      toast({ description: 'Title updated' });
                    }}
                    isLoading={isUpdating}
                    className="mb-1"
                  />
                  
                  {/* Author/Organization line */}
                  {(currentItem.author || currentItem.author_organization) && (
                    <p className="text-sm text-muted-foreground mb-3">
                      By {currentItem.author}
                      {currentItem.author_organization && (
                        <span className="font-medium text-foreground"> • {currentItem.author_organization}</span>
                      )}
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
                    {currentItem.publication_date && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Published {format(parseISO(currentItem.publication_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Context Section (formerly Methodology) - MOVED UP */}
                {currentItem.methodology && (
                  <div className="px-6 py-4 border-b border-grey-200 bg-grey-50">
                    <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4 text-grey-400" strokeWidth={1.5} />
                      Context
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {currentItem.methodology}
                    </p>
                  </div>
                )}

                {/* Key Findings Section */}
                {currentItem.key_insights && currentItem.key_insights.length > 0 && (
                  <div className="p-6 border-b border-grey-200">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-grey-400" strokeWidth={1.5} />
                      Key Findings
                    </h3>
                    <div className="space-y-2">
                      {currentItem.key_insights.slice(0, 5).map((insight, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <FormattedText content={insight} as="span" className="text-foreground/90 leading-relaxed" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quotables Section with Highlighting */}
                {currentItem.quotables && currentItem.quotables.length > 0 && (
                  <div className="p-6 border-b border-grey-200">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Quote className="h-4 w-4 text-grey-400" strokeWidth={1.5} />
                      Key Quotes
                      <span className="text-xs font-normal text-muted-foreground">(⭐ on left to highlight)</span>
                    </h3>
                    <div className="space-y-2">
                      {currentItem.quotables.slice(0, 5).map((quote, i) => (
                        <HighlightableQuote
                          key={i}
                          quote={quote}
                          index={i}
                          isHighlighted={currentItem.highlighted_quotes?.includes(i) ?? false}
                          onToggle={(index) => {
                            const current = currentItem.highlighted_quotes || [];
                            const updated = current.includes(index)
                              ? current.filter((idx) => idx !== index)
                              : [...current, index];
                            updatePoolItem({ id: currentItem.id, updates: { highlighted_quotes: updated } });
                          }}
                          disabled={isUpdating}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* DAIN Context Section - Editable */}
                <div className="p-6 border-b border-grey-200 bg-primary/5 border-l-4 border-l-primary">
                  <h3 className="text-sm font-medium text-primary mb-2">
                    Why it matters for DAIN
                  </h3>
                  <EditableTextArea
                    value={currentItem.dain_context || ''}
                    placeholder="Add context about why this matters for DAIN..."
                    onSave={(newContext) => {
                      updatePoolItem({ id: currentItem.id, updates: { dain_context: newContext } });
                      toast({ description: 'DAIN context updated' });
                    }}
                    isLoading={isUpdating}
                    className="text-sm text-foreground/80"
                  />
                </div>

                {/* Tags Section - Editable */}
                {hasTags && (
                  <div className="p-6 border-b border-grey-200">
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">
                      Tags <span className="font-normal">(click to toggle)</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentItem.industries?.map((tag) => (
                        <EditableTagBadge 
                          key={`ind-${tag}`} 
                          label={tag} 
                          category="industry" 
                          isActive={true}
                          onToggle={() => {
                            const updated = currentItem.industries?.filter(t => t !== tag) || [];
                            updatePoolItem({ id: currentItem.id, updates: { industries: updated } });
                          }}
                        />
                      ))}
                      {currentItem.technologies?.map((tag) => (
                        <EditableTagBadge 
                          key={`tech-${tag}`} 
                          label={tag} 
                          category="technology"
                          isActive={true}
                          onToggle={() => {
                            const updated = currentItem.technologies?.filter(t => t !== tag) || [];
                            updatePoolItem({ id: currentItem.id, updates: { technologies: updated } });
                          }}
                        />
                      ))}
                      {currentItem.service_lines?.map((tag) => (
                        <EditableTagBadge 
                          key={`svc-${tag}`} 
                          label={tag} 
                          category="service"
                          isActive={true}
                          onToggle={() => {
                            const updated = currentItem.service_lines?.filter(t => t !== tag) || [];
                            updatePoolItem({ id: currentItem.id, updates: { service_lines: updated } });
                          }}
                        />
                      ))}
                      {currentItem.business_functions?.map((tag) => (
                        <EditableTagBadge 
                          key={`func-${tag}`} 
                          label={tag} 
                          category="function"
                          isActive={true}
                          onToggle={() => {
                            const updated = currentItem.business_functions?.filter(t => t !== tag) || [];
                            updatePoolItem({ id: currentItem.id, updates: { business_functions: updated } });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Curator Notes Section */}
                <NotesEditor
                  notes={currentItem.curator_notes}
                  onSave={(notes) => {
                    updatePoolItem({ id: currentItem.id, updates: { curator_notes: notes } });
                    toast({ description: notes ? 'Note saved' : 'Note removed' });
                  }}
                  isLoading={isUpdating}
                />

                {/* Action Selection - Desktop */}
                <div className="hidden md:block p-5 border-t border-grey-200 bg-background space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {actionOptions.map(({ action, icon: Icon, label, selectedColor }) => {
                      const isSelected = selectedActions.has(action);
                      const isTeamLoading = action === 'post2team' && isProcessing && exitingId === currentItem.id;
                      const isDisabled = isProcessing || isTeamLoading;
                      
                      return (
                        <button
                          key={action}
                          onClick={() => toggleAction(action)}
                          disabled={isDisabled}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm font-medium',
                            isSelected
                              ? selectedColor
                              : 'border-grey-200 bg-background text-grey-500 hover:border-grey-300 hover:text-foreground',
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
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-grey-200 p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {actionOptions.map(({ action, icon: Icon, label, selectedColor }) => {
              const isSelected = selectedActions.has(action);
              const isTeamLoading = action === 'post2team' && isProcessing && exitingId === currentItem.id;
              const isDisabled = isProcessing || isTeamLoading;
              
              return (
                <button
                  key={action}
                  onClick={() => toggleAction(action)}
                  disabled={isDisabled}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-medium',
                    isSelected
                      ? selectedColor
                      : 'border-grey-200 bg-background text-grey-500',
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

      {/* Team Post Modal */}
      {currentItem && (
        <TeamPostModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          onConfirm={handleTeamPostConfirm}
          itemId={currentItem.id}
          itemTitle={currentItem.title}
          existingInfographicUrl={currentItem.infographic_url}
          isProcessing={isProcessing}
        />
      )}

      {/* Newsletter Note Modal */}
      {currentItem && (
        <NewsletterNoteModal
          isOpen={isNewsletterModalOpen}
          onClose={() => setIsNewsletterModalOpen(false)}
          itemTitle={currentItem.title}
          existingNote={currentItem.curator_notes}
          onConfirm={handleNewsletterConfirm}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
