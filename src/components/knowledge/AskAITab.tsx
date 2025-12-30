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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

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
      sourceElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => sourceElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
    }
  };

  // Pre-process citations [1], [2] into HTML that rehype-raw can parse
  const preprocessCitations = (text: string): string => {
    return text.replace(
      /\[(\d+)\]/g,
      '<cite data-num="$1">$1</cite>'
    );
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
          <div className="space-y-6">
            {/* Answer Card - Clean minimal design */}
            <Card className="bg-muted/30 border-0 shadow-sm">
              <div className="p-6 md:p-8">
                <div className="prose prose-neutral max-w-none 
                  prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-em:italic
                  prose-headings:text-foreground prose-headings:font-semibold
                  prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-3
                  prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-3
                  prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
                  prose-ul:my-3 prose-ul:pl-0
                  prose-ol:my-3 prose-ol:pl-5
                  prose-li:text-foreground prose-li:my-1
                ">
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      // Handle our custom citation elements
                      cite: ({ node, ...props }) => {
                        const num = props['data-num'] as string;
                        if (num) {
                          return (
                            <button
                              onClick={() => scrollToSource(Number(num))}
                              className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 mx-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/80 transition-colors cursor-pointer align-super -translate-y-0.5"
                              title={`Jump to source ${num}`}
                            >
                              {num}
                            </button>
                          );
                        }
                        return <cite {...props} />;
                      },
                      p: ({ children }) => (
                        <p className="mb-4 leading-relaxed last:mb-0">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-3 space-y-2">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="my-3 space-y-2 list-decimal list-inside">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="flex items-start gap-2 text-foreground">
                          <span className="text-primary mt-1 flex-shrink-0">•</span>
                          <span className="flex-1">{children}</span>
                        </li>
                      ),
                    }}
                  >
                    {preprocessCitations(response.answer)}
                  </ReactMarkdown>
                </div>
              </div>
            </Card>

            {/* References Section - Clean minimal design */}
            {response.sources.length > 0 && (
              <div ref={sourcesRef} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    References
                  </h4>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                        <CheckCircle className="h-3 w-3 text-success" />
                        <span>Full content indexed</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[220px]">
                      <p className="text-xs">Sources with this icon were processed with complete text, providing higher quality context for answers.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <div className="space-y-2">
                  {response.sources.map((source, idx) => (
                    <div 
                      key={source.id} 
                      id={`source-${idx + 1}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border/50 transition-all duration-300"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-foreground hover:text-primary transition-colors truncate flex items-center gap-1.5 group"
                          >
                            <span className="truncate">{source.title}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <span className="text-sm text-foreground truncate block">{source.title}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                        {Math.round(source.similarity * 100)}%
                      </span>
                      {source.has_full_content && (
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
