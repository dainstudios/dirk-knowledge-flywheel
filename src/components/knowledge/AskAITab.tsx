import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  MessageSquare,
  Zap,
  Loader2,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
  const sourcesRef = useRef<HTMLDivElement>(null);

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

  const scrollToSource = (sourceNum: number) => {
    const sourceElement = document.getElementById(`source-${sourceNum}`);
    if (sourceElement) {
      sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sourceElement.classList.add('bg-primary/20');
      setTimeout(() => sourceElement.classList.remove('bg-primary/20'), 2000);
    }
  };

  // Parse citations [1], [2] etc and render as clickable superscripts
  const renderTextWithCitations = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return (
          <button
            key={i}
            onClick={() => scrollToSource(num)}
            className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 ml-0.5 text-[10px] font-semibold bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors align-super"
            title={`Jump to source ${num}`}
          >
            {num}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
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
    <TooltipProvider>
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
            <Card className="overflow-hidden border-l-4 border-l-primary">
              <div className="p-4 bg-primary/5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">AI Answer</h3>
                </div>
              </div>
              <div className="p-5">
                <div className="prose prose-sm max-w-none text-foreground">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="mb-3 leading-relaxed last:mb-0">
                          {typeof children === 'string' 
                            ? renderTextWithCitations(children)
                            : children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold mt-3 mb-2 text-foreground">{children}</h3>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-2 ml-4 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1.5 text-xs">•</span>
                          <span className="flex-1">
                            {typeof children === 'string' 
                              ? renderTextWithCitations(children)
                              : children}
                          </span>
                        </li>
                      ),
                    }}
                  >
                    {response.answer}
                  </ReactMarkdown>
                </div>
              </div>
            </Card>

            {/* References Section */}
            {response.sources.length > 0 && (
              <div ref={sourcesRef} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">References</h4>
                    <span className="text-xs text-muted-foreground">
                      ({response.sources.length} sources)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-success" />
                    <span>= Full content indexed</span>
                  </div>
                </div>
                
                <Card className="divide-y divide-border">
                  {response.sources.map((source, idx) => (
                    <div 
                      key={source.id} 
                      id={`source-${idx + 1}`}
                      className="flex items-center gap-3 p-3 transition-colors duration-300"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-foreground hover:text-primary underline underline-offset-2 truncate flex items-center gap-1"
                          >
                            <span className="truncate">{source.title}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                          </a>
                        ) : (
                          <span className="text-sm text-foreground truncate block">{source.title}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                        {Math.round(source.similarity * 100)}% match
                      </span>
                      {source.has_full_content && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CheckCircle className="h-4 w-4 text-success flex-shrink-0 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[200px]">
                            <p className="text-xs">Full content indexed — this source was processed with complete text, providing higher quality context for answers.</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}