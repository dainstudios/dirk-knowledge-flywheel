import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  MessageSquare,
  Zap,
  Loader2,
  CheckCircle,
  RefreshCw,
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
        <div className="space-y-4">
          {/* Answer Card */}
          <Card className="p-6 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">AI Answer</h3>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {response.answer.split('\n').map((line, i) => {
                if (!line.trim()) return <br key={i} />;
                if (line.startsWith('###')) {
                  return <h4 key={i} className="text-base font-semibold mt-4 mb-2">{line.replace(/^###\s*/, '')}</h4>;
                }
                if (line.startsWith('##')) {
                  return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.replace(/^##\s*/, '')}</h3>;
                }
                if (line.startsWith('#')) {
                  return <h2 key={i} className="text-xl font-semibold mt-4 mb-2">{line.replace(/^#\s*/, '')}</h2>;
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return (
                    <div key={i} className="flex items-start gap-2 ml-4">
                      <span className="text-primary mt-1">•</span>
                      <span>{line.replace(/^[-*]\s*/, '')}</span>
                    </div>
                  );
                }
                if (line.match(/^\d+\.\s/)) {
                  return (
                    <div key={i} className="flex items-start gap-2 ml-4">
                      <span className="text-muted-foreground font-medium">{line.match(/^(\d+\.)/)?.[1]}</span>
                      <span>{line.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  );
                }
                return <p key={i} className="mb-2 leading-relaxed">{line}</p>;
              })}
            </div>
          </Card>

          {/* Sources Used */}
          {response.sources.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Sources Used</h3>
              <div className="space-y-3">
                {response.sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline truncate block"
                        >
                          {source.title}
                        </a>
                      ) : (
                        <span className="font-medium text-foreground truncate block">{source.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(source.similarity * 100)}% match
                      </Badge>
                      {source.has_full_content && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Full Content
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {response.stats.total_searched} sources searched, {response.stats.with_full_content} with full content analyzed
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
