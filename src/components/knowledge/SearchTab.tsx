import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  BookOpen,
  Sparkles,
  Quote,
  Clock,
  Users,
  Linkedin,
  Mail,
  Star,
  StickyNote,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { KnowledgeItem, KnowledgeFilters, filterKnowledgeItems } from '@/hooks/useKnowledgeBase';
import { useKnowledgeActions } from '@/hooks/useKnowledgeActions';
import { SharingStatusBadges } from './SharingStatusBadges';
import { EditableTitle } from '@/components/pool/EditableTitle';
import { HighlightableQuote } from '@/components/pool/HighlightableQuote';
import { NotesEditor } from '@/components/pool/NotesEditor';

// Badge components
function ContentTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return (
    <Badge variant="secondary" className="text-xs">
      {type}
    </Badge>
  );
}

function CredibilityBadge({ credibility }: { credibility: string | null }) {
  if (!credibility) return null;
  const colors: Record<string, string> = {
    high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <Badge className={colors[credibility.toLowerCase()] || 'bg-muted text-muted-foreground'}>
      {credibility}
    </Badge>
  );
}

function TagBadge({ tag, variant }: { tag: string; variant: 'industry' | 'technology' | 'service' | 'function' }) {
  const colors = {
    industry: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    technology: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    service: 'bg-primary/10 text-primary',
    function: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  };
  return (
    <Badge className={`${colors[variant]} text-xs`}>
      {tag}
    </Badge>
  );
}

// Multi-select filter dropdown
function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const hasSelection = selected.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={hasSelection ? 'default' : 'outline'}
          size="sm"
          className="gap-1"
        >
          {label}
          {hasSelection && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-60 overflow-y-auto bg-background z-50">
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No options</div>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={selected.includes(option)}
              onCheckedChange={() => onToggle(option)}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper to parse summary bullets
function parseSummaryBullets(summary: string): string[] | null {
  if (!summary.includes('•')) return null;
  return summary
    .split(/(?:^|\n)\s*•\s*/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// Knowledge card
function KnowledgeCard({
  item,
  isExpanded,
  onToggle,
  onUpdateItem,
  isUpdating,
  onProcessAction,
  isProcessing,
}: {
  item: KnowledgeItem;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateItem: (id: string, updates: { title?: string; curator_notes?: string; highlighted_quotes?: number[] }) => void;
  isUpdating: boolean;
  onProcessAction: (itemId: string, action: 'post2team' | 'post2linkedin' | 'post2newsletter') => void;
  isProcessing: boolean;
}) {
  const allTags = [
    ...(item.industries?.map(t => ({ tag: t, variant: 'industry' as const })) || []),
    ...(item.technologies?.map(t => ({ tag: t, variant: 'technology' as const })) || []),
    ...(item.service_lines?.map(t => ({ tag: t, variant: 'service' as const })) || []),
    ...(item.business_functions?.map(t => ({ tag: t, variant: 'function' as const })) || []),
  ];
  const visibleTags = allTags.slice(0, 5);
  const hiddenCount = allTags.length - 5;

  const truncatedSummary = item.summary
    ? item.summary.replace(/•/g, '').replace(/\n/g, ' ').substring(0, 150) + (item.summary.length > 150 ? '...' : '')
    : null;

  const handleTitleSave = (newTitle: string) => {
    onUpdateItem(item.id, { title: newTitle });
  };

  const handleNotesSave = (newNotes: string) => {
    onUpdateItem(item.id, { curator_notes: newNotes });
  };

  const handleQuoteToggle = (index: number) => {
    const current = item.highlighted_quotes || [];
    const updated = current.includes(index)
      ? current.filter(i => i !== index)
      : [...current, index];
    onUpdateItem(item.id, { highlighted_quotes: updated });
  };

  // Check if item has been shared anywhere
  const hasBeenShared = item.shared_to_team || item.queued_for_linkedin || item.queued_for_newsletter;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${hasBeenShared ? 'border-l-4 border-l-primary/60' : ''}`}>
      <div className="p-4">
        {/* Header - always visible */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            <div className="flex items-center gap-2 mb-2">
              {isExpanded ? (
                <EditableTitle
                  title={item.title}
                  onSave={handleTitleSave}
                  isLoading={isUpdating}
                  className="flex-1"
                />
              ) : (
                <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-2">
              <ContentTypeBadge type={item.content_type} />
              <CredibilityBadge credibility={item.source_credibility} />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
              {/* Sharing status badges */}
              <SharingStatusBadges
                sharedToTeam={item.shared_to_team}
                sharedToTeamAt={item.shared_to_team_at}
                queuedForLinkedin={item.queued_for_linkedin}
                queuedForLinkedinAt={item.queued_for_linkedin_at}
                queuedForNewsletter={item.queued_for_newsletter}
                queuedForNewsletterAt={item.queued_for_newsletter_at}
              />
            </div>

            {!isExpanded && truncatedSummary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{truncatedSummary}</p>
            )}

            {!isExpanded && visibleTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {visibleTags.map(({ tag, variant }) => (
                  <TagBadge key={tag} tag={tag} variant={variant} />
                ))}
                {hiddenCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    +{hiddenCount} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0 items-end">
            {/* Prominent View Details button - always visible */}
            <Link
              to={`/knowledge/${item.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10">
                <BookOpen className="h-3.5 w-3.5" />
                View Details
              </Button>
            </Link>
            
            <div className="flex gap-2">
              {item.google_drive_url && (
                <a
                  href={item.google_drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <FileText className="h-3 w-3" />
                  PDF
                </a>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                  Source
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border">
          {item.summary && (
            <div className="p-4 border-b border-border/50">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Summary</h4>
              {(() => {
                const bullets = parseSummaryBullets(item.summary);
                if (bullets) {
                  return (
                    <ul className="space-y-2 text-foreground/90">
                      {bullets.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed text-sm">
                          <span className="text-primary mt-1 text-xs">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                return <p className="text-sm text-foreground/90 leading-relaxed">{item.summary}</p>;
              })()}
            </div>
          )}

          {item.dain_context && (
            <div className="p-4 border-b border-border/50 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium text-primary">DAIN Context</h4>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{item.dain_context}</p>
            </div>
          )}

          {/* Highlightable Quotes */}
          {item.quotables && item.quotables.length > 0 && (
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Quote className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium text-muted-foreground">Key Quotes</h4>
                <span className="text-xs text-muted-foreground">(click star to highlight)</span>
              </div>
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                {item.quotables.map((quote, i) => (
                  <HighlightableQuote
                    key={i}
                    quote={quote}
                    index={i}
                    isHighlighted={item.highlighted_quotes?.includes(i) || false}
                    onToggle={handleQuoteToggle}
                    disabled={isUpdating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Curator Notes */}
          <div className="p-4 border-b border-border/50" onClick={(e) => e.stopPropagation()}>
            <NotesEditor
              notes={item.curator_notes || ''}
              onSave={handleNotesSave}
              isLoading={isUpdating}
            />
          </div>

          <div className="p-4 border-b border-border/50">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Tags</h4>
            <div className="space-y-2">
              {item.industries && item.industries.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground mr-2">Industries:</span>
                  <div className="inline-flex flex-wrap gap-1">
                    {item.industries.map(tag => (
                      <TagBadge key={tag} tag={tag} variant="industry" />
                    ))}
                  </div>
                </div>
              )}
              {item.technologies && item.technologies.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground mr-2">Technologies:</span>
                  <div className="inline-flex flex-wrap gap-1">
                    {item.technologies.map(tag => (
                      <TagBadge key={tag} tag={tag} variant="technology" />
                    ))}
                  </div>
                </div>
              )}
              {item.service_lines && item.service_lines.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground mr-2">Service Lines:</span>
                  <div className="inline-flex flex-wrap gap-1">
                    {item.service_lines.map(tag => (
                      <TagBadge key={tag} tag={tag} variant="service" />
                    ))}
                  </div>
                </div>
              )}
              {item.business_functions && item.business_functions.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground mr-2">Functions:</span>
                  <div className="inline-flex flex-wrap gap-1">
                    {item.business_functions.map(tag => (
                      <TagBadge key={tag} tag={tag} variant="function" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions section */}
          <div className="p-4 border-b border-border/50 bg-muted/30" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onProcessAction(item.id, 'post2team')}
                disabled={isProcessing}
                className="gap-1"
              >
                <Users className="h-3 w-3" />
                {item.shared_to_team ? 'Share Again' : 'Share to Team'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onProcessAction(item.id, 'post2linkedin')}
                disabled={isProcessing}
                className="gap-1"
              >
                <Linkedin className="h-3 w-3" />
                {item.queued_for_linkedin ? 'Re-queue' : 'Queue for LinkedIn'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onProcessAction(item.id, 'post2newsletter')}
                disabled={isProcessing}
                className="gap-1"
              >
                <Mail className="h-3 w-3" />
                {item.queued_for_newsletter ? 'Re-queue' : 'Queue for Newsletter'}
              </Button>
            </div>
          </div>

          <div className="p-4 border-t border-border/50">
            <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
              {item.actionability && <span>Actionability: {item.actionability}</span>}
              {item.timeliness && <span>Timeliness: {item.timeliness}</span>}
              {item.dain_relevance && <span>Relevance: {item.dain_relevance}</span>}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

interface SearchTabProps {
  items: KnowledgeItem[];
  filterOptions: {
    industries: string[];
    technologies: string[];
    serviceLines: string[];
    contentTypes: string[];
  };
}

export function SearchTab({ items, filterOptions }: SearchTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeItem[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<KnowledgeFilters>({
    industries: [],
    technologies: [],
    serviceLines: [],
    contentTypes: [],
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { updateKnowledgeItem, processAction, isUpdating, isProcessing } = useKnowledgeActions();

  const handleUpdateItem = (id: string, updates: { title?: string; curator_notes?: string; highlighted_quotes?: number[] }) => {
    updateKnowledgeItem.mutate({ id, updates });
  };

  const handleProcessAction = (itemId: string, action: 'post2team' | 'post2linkedin' | 'post2newsletter') => {
    processAction.mutate({ itemId, action });
  };

  const toggleFilter = (key: keyof KnowledgeFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ industries: [], technologies: [], serviceLines: [], contentTypes: [] });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-search-embedding', {
        body: { query: searchQuery.trim() },
      });

      if (error) throw error;

      const results: KnowledgeItem[] = data.results.map((r: any) => ({
        id: r.id,
        title: r.title,
        url: r.url,
        summary: r.summary,
        dain_context: r.dain_context,
        industries: r.industries,
        service_lines: r.service_lines,
        technologies: r.technologies,
        content_type: r.content_type,
        actionability: r.actionability,
        source_credibility: r.source_credibility,
        created_at: r.created_at,
        google_drive_url: null,
        user_notes: null,
        dain_relevance: null,
        business_functions: null,
        quotables: null,
        timeliness: null,
      }));

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const displayItems = useMemo(() => {
    const baseItems = searchResults ?? items;
    return filterKnowledgeItems(baseItems, filters);
  }, [items, searchResults, filters]);

  const paginatedItems = displayItems.slice(0, page * itemsPerPage);
  const hasMore = paginatedItems.length < displayItems.length;

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown
          label="Industries"
          options={filterOptions.industries}
          selected={filters.industries}
          onToggle={(v) => toggleFilter('industries', v)}
        />
        <FilterDropdown
          label="Technologies"
          options={filterOptions.technologies}
          selected={filters.technologies}
          onToggle={(v) => toggleFilter('technologies', v)}
        />
        <FilterDropdown
          label="Service Lines"
          options={filterOptions.serviceLines}
          selected={filters.serviceLines}
          onToggle={(v) => toggleFilter('serviceLines', v)}
        />
        <FilterDropdown
          label="Content Type"
          options={filterOptions.contentTypes}
          selected={filters.contentTypes}
          onToggle={(v) => toggleFilter('contentTypes', v)}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Search indicator */}
      {searchResults !== null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Showing semantic search results for "{searchQuery}"</span>
          <Button variant="link" size="sm" onClick={clearSearch} className="h-auto p-0">
            Clear
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isSearching && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {!isSearching && (
        <>
          {displayItems.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchResults !== null
                  ? 'No results found'
                  : hasActiveFilters
                  ? 'No items match your filters'
                  : 'Your knowledge base is empty'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchResults !== null
                  ? 'Try a different search query.'
                  : hasActiveFilters
                  ? 'Try removing some filters.'
                  : 'Capture some content to get started.'}
              </p>
              {!searchResults && !hasActiveFilters && (
                <Button asChild>
                  <a href="/capture">Go to Capture</a>
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {paginatedItems.map((item) => (
                <KnowledgeCard
                  key={item.id}
                  item={item}
                  isExpanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onUpdateItem={handleUpdateItem}
                  isUpdating={isUpdating}
                  onProcessAction={handleProcessAction}
                  isProcessing={isProcessing}
                />
              ))}

              {hasMore && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                    Load more ({displayItems.length - paginatedItems.length} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
