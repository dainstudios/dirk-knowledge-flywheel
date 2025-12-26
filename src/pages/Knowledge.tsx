import { useState, useMemo } from 'react';
import { Header, LoadingState } from '@/components/common';
import { useKnowledgeBase, filterKnowledgeItems, KnowledgeFilters, KnowledgeItem } from '@/hooks/useKnowledgeBase';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

// Reuse helper from Pool
function parseSummaryBullets(summary: string): string[] | null {
  if (!summary.includes('•')) return null;
  return summary
    .split(/(?:^|\n)\s*•\s*/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

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

// Compact knowledge card
function KnowledgeCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: KnowledgeItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const allTags = [
    ...(item.industries?.map(t => ({ tag: t, variant: 'industry' as const })) || []),
    ...(item.technologies?.map(t => ({ tag: t, variant: 'technology' as const })) || []),
    ...(item.service_lines?.map(t => ({ tag: t, variant: 'service' as const })) || []),
    ...(item.business_functions?.map(t => ({ tag: t, variant: 'function' as const })) || []),
  ];
  const visibleTags = allTags.slice(0, 5);
  const hiddenCount = allTags.length - 5;

  // Truncate summary to 2 lines (~150 chars)
  const truncatedSummary = item.summary
    ? item.summary.replace(/•/g, '').replace(/\n/g, ' ').substring(0, 150) + (item.summary.length > 150 ? '...' : '')
    : null;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      {/* Compact Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <ContentTypeBadge type={item.content_type} />
              <CredibilityBadge credibility={item.source_credibility} />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Truncated summary (only when collapsed) */}
            {!isExpanded && truncatedSummary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{truncatedSummary}</p>
            )}

            {/* Tags (only when collapsed) */}
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

          {/* Links */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            {item.google_drive_url && (
              <a
                href={item.google_drive_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
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
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Source
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Full Summary */}
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

          {/* DAIN Context */}
          {item.dain_context && (
            <div className="p-4 border-b border-border/50 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium text-primary">DAIN Context</h4>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{item.dain_context}</p>
            </div>
          )}

          {/* Quotables */}
          {item.quotables && item.quotables.length > 0 && (
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Quote className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium text-muted-foreground">Key Quotes</h4>
              </div>
              <div className="space-y-2">
                {item.quotables.map((quote, i) => (
                  <blockquote
                    key={i}
                    className="border-l-2 border-primary/50 pl-3 text-sm italic text-foreground/80"
                  >
                    "{quote}"
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {/* All Tags Grouped */}
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

          {/* Metadata */}
          <div className="p-4 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-4">
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

// Main page
export default function Knowledge() {
  const { items, isLoading, filterOptions } = useKnowledgeBase();
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

  // Toggle filter value
  const toggleFilter = (key: keyof KnowledgeFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
    setPage(1); // Reset to first page
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ industries: [], technologies: [], serviceLines: [], contentTypes: [] });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  // Perform semantic search
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

      // Map search results to KnowledgeItem format
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

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Apply filters to items
  const displayItems = useMemo(() => {
    const baseItems = searchResults ?? items;
    const filtered = filterKnowledgeItems(baseItems, filters);
    return filtered;
  }, [items, searchResults, filters]);

  // Paginated items
  const paginatedItems = displayItems.slice(0, page * itemsPerPage);
  const hasMore = paginatedItems.length < displayItems.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
          <LoadingState message="Loading knowledge base..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
            <Badge variant="secondary" className="text-sm">
              {displayItems.length} items
            </Badge>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your knowledge..."
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
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
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
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Showing semantic search results for "{searchQuery}"</span>
            <Button variant="link" size="sm" onClick={clearSearch} className="h-auto p-0">
              Clear
            </Button>
          </div>
        )}

        {/* Searching state */}
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
                    : 'Process some content to get started.'}
                </p>
                {!searchResults && !hasActiveFilters && (
                  <Button asChild>
                    <a href="/capture">Capture Content</a>
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
                  />
                ))}

                {/* Load more */}
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
      </main>
    </div>
  );
}
