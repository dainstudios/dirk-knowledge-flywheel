import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Quote,
  Loader2,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface QuoteResult {
  id: string;
  quote_text: string;
  source_title: string | null;
  source_author: string | null;
  source_url: string | null;
  topic_tags: string[];
  use_cases: string[];
  tone: string | null;
  similarity: number;
}

interface QuoteResponse {
  quotes: QuoteResult[];
  stats: {
    from_quotes_table: number;
    from_quotables: number;
  };
}

function QuoteCard({ quote }: { quote: QuoteResult }) {
  const [copied, setCopied] = useState<'quote' | 'attributed' | null>(null);

  const copyQuote = async () => {
    await navigator.clipboard.writeText(`"${quote.quote_text}"`);
    setCopied('quote');
    toast.success('Copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const copyWithAttribution = async () => {
    const attribution = quote.source_author
      ? `"${quote.quote_text}"\n— ${quote.source_title || 'Unknown'}, ${quote.source_author}`
      : `"${quote.quote_text}"\n— ${quote.source_title || 'Unknown Source'}`;
    await navigator.clipboard.writeText(attribution);
    setCopied('attributed');
    toast.success('Copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="p-5 border-l-4 border-l-primary hover:shadow-md transition-shadow">
      {/* Quote text */}
      <blockquote className="text-lg italic text-foreground leading-relaxed mb-4">
        <span className="text-primary text-2xl font-serif">"</span>
        {quote.quote_text}
        <span className="text-primary text-2xl font-serif">"</span>
      </blockquote>

      {/* Source line */}
      <p className="text-sm text-muted-foreground mb-3">
        — {quote.source_url ? (
          <a
            href={quote.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {quote.source_title || 'Source'}
          </a>
        ) : (
          quote.source_title || 'Unknown Source'
        )}
        {quote.source_author && `, ${quote.source_author}`}
      </p>

      {/* Topic tags and match percentage */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge
          variant="outline"
          className="bg-primary/10 text-primary border-primary/30 text-xs"
        >
          {Math.round(quote.similarity * 100)}% match
        </Badge>
        {quote.topic_tags.slice(0, 3).map((tag, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
        {quote.tone && (
          <Badge variant="outline" className="text-xs">
            {quote.tone}
          </Badge>
        )}
      </div>

      {/* Copy buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={copyQuote}
          className="gap-2"
        >
          {copied === 'quote' ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={copyWithAttribution}
          className="gap-2"
        >
          {copied === 'attributed' ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          Copy with Source
        </Button>
      </div>
    </Card>
  );
}

export function FindQuoteTab() {
  const [query, setQuery] = useState('');
  const [context, setContext] = useState('any');
  const [isSearching, setIsSearching] = useState(false);
  const [response, setResponse] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResponse(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('find-quote', {
        body: { query: query.trim(), context: context === 'any' ? null : context, count: 5 },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setResponse(data);
    } catch (err) {
      console.error('Find quotes error:', err);
      setError(err instanceof Error ? err.message : 'Failed to find quotes');
    } finally {
      setIsSearching(false);
    }
  };

  const clearAll = () => {
    setQuery('');
    setResponse(null);
    setError(null);
    setContext('any');
  };

  return (
    <div className="space-y-6">
      {/* Helper text */}
      <p className="text-sm text-muted-foreground">
        Find memorable, quotable insights from your knowledge base for presentations and content
      </p>

      {/* Input */}
      <div className="space-y-4">
        <Input
          placeholder="Find a quote about... (e.g., AI ROI, data governance, change management, digital transformation)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">For use in:</span>
            <Select value={context} onValueChange={setContext}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Any context" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="board">Board Presentation</SelectItem>
                <SelectItem value="linkedin">LinkedIn Post</SelectItem>
                <SelectItem value="pitch">Client Pitch</SelectItem>
                <SelectItem value="workshop">Workshop Opening</SelectItem>
                <SelectItem value="training">Internal Training</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding...
              </>
            ) : (
              <>
                <Quote className="h-4 w-4" />
                Find Quotes
              </>
            )}
          </Button>
          {(response || query) && (
            <Button variant="outline" onClick={clearAll}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isSearching && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Finding matching quotes...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <div className="flex items-center justify-between">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={handleSearch} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Results */}
      {response && !isSearching && (
        <div className="space-y-4">
          {response.quotes.length === 0 ? (
            <Card className="p-8 text-center">
              <Quote className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No matching quotes found
              </h3>
              <p className="text-muted-foreground">
                Try different keywords or add more content to your knowledge base.
              </p>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  Found {response.quotes.length} quote{response.quotes.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {response.stats.from_quotes_table} from quotes, {response.stats.from_quotables} from knowledge items
                </p>
              </div>
              <div className="space-y-4">
                {response.quotes.map((quote) => (
                  <QuoteCard key={quote.id} quote={quote} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
