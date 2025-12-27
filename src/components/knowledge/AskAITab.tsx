import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  MessageSquare,
  Zap,
  Loader2,
  CheckCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface AskSource {
  id: string;
  title: string;
  url: string | null;
  similarity: number;
  has_full_content: boolean;
}

interface AskResponse {
  answer: string;
  sources: AskSource[];
  stats: {
    total_searched: number;
    with_full_content: number;
  };
}

type AskMode = 'standard' | 'deep';

export function AskAITab() {
  const [mode, setMode] = useState<AskMode>('standard');
  const [query, setQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!query.trim()) return;

    setIsAsking(true);
    setError(null);
    setResponse(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ask-knowledge', {
        body: { question: query.trim(), mode },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setResponse(data);
    } catch (err) {
      console.error('Ask AI error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setIsAsking(false);
    }
  };

  const clearAll = () => {
    setQuery('');
    setResponse(null);
    setError(null);
  };

  const modeInfo = {
    standard: {
      label: 'Standard',
      description: 'Gets answers from your top 7 most relevant sources',
      icon: MessageSquare,
    },
    deep: {
      label: 'Deep Search',
      description: 'Analyzes 30+ documents for complex research questions',
      icon: Zap,
    },
  };

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['standard', 'deep'] as const).map((m) => {
            const Icon = modeInfo[m].icon;
            return (
              <Button
                key={m}
                variant={mode === m ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode(m)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {modeInfo[m].label}
              </Button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          {modeInfo[mode].description}
        </p>
      </div>

      {/* Input */}
      <div className="space-y-4">
        <Textarea
          placeholder="Ask a question about your knowledge..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
        />

        <div className="flex gap-2">
          <Button
            onClick={handleAsk}
            disabled={isAsking || !query.trim()}
            className="gap-2"
          >
            {isAsking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Ask Knowledge Base
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
      {isAsking && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Searching knowledge and generating answer...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <div className="flex items-center justify-between">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={handleAsk} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Response */}
      {response && !isAsking && (
        <div className="space-y-3">
          {/* Answer Card */}
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">AI Answer</h3>
            </div>
            <div className="text-sm text-foreground leading-relaxed space-y-2">
              {response.answer.split('\n').map((line, i, arr) => {
                // Skip consecutive empty lines
                if (!line.trim() && arr[i - 1] && !arr[i - 1].trim()) return null;
                if (!line.trim()) return <div key={i} className="h-2" />;
                if (line.startsWith('###')) {
                  return <h4 key={i} className="text-sm font-semibold mt-3 mb-1 text-foreground">{line.replace(/^###\s*/, '')}</h4>;
                }
                if (line.startsWith('##')) {
                  return <h3 key={i} className="text-base font-semibold mt-3 mb-1 text-foreground">{line.replace(/^##\s*/, '')}</h3>;
                }
                if (line.startsWith('#')) {
                  return <h2 key={i} className="text-lg font-semibold mt-3 mb-1 text-foreground">{line.replace(/^#\s*/, '')}</h2>;
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return (
                    <div key={i} className="flex items-start gap-1.5 ml-2">
                      <span className="text-primary text-xs mt-1.5">•</span>
                      <span className="flex-1">{line.replace(/^[-*]\s*/, '')}</span>
                    </div>
                  );
                }
                if (line.match(/^\d+\.\s/)) {
                  return (
                    <div key={i} className="flex items-start gap-1.5 ml-2">
                      <span className="text-muted-foreground text-xs font-medium min-w-[1.25rem]">{line.match(/^(\d+\.)/)?.[1]}</span>
                      <span className="flex-1">{line.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  );
                }
                return <p key={i}>{line}</p>;
              })}
            </div>
          </Card>

          {/* Sources Used - Compact List */}
          {response.sources.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Sources ({response.sources.length}) · {response.stats.with_full_content} with full content
              </p>
              <div className="space-y-1">
                {response.sources.map((source, idx) => (
                  <div key={source.id} className="flex items-center gap-2 text-sm py-1">
                    <span className="text-muted-foreground text-xs w-4">{idx + 1}.</span>
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-primary underline underline-offset-2 truncate flex-1 flex items-center gap-1"
                      >
                        {source.title}
                        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                      </a>
                    ) : (
                      <span className="text-foreground truncate flex-1">{source.title}</span>
                    )}
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {Math.round(source.similarity * 100)}%
                    </span>
                    {source.has_full_content && (
                      <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
