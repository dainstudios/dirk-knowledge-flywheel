import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header, LoadingState } from '@/components/common';
import { InfographicSection } from '@/components/knowledge/InfographicSection';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Sparkles,
  Quote,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { KnowledgeItem } from '@/hooks/useKnowledgeBase';

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

function CredibilityBadge({ credibility }: { credibility: string | null }) {
  if (!credibility) return null;
  const colors: Record<string, string> = {
    high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <Badge className={colors[credibility.toLowerCase()] || 'bg-muted text-muted-foreground'}>
      {credibility} credibility
    </Badge>
  );
}

function parseSummaryBullets(summary: string): string[] | null {
  if (!summary.includes('•')) return null;
  return summary
    .split(/(?:^|\n)\s*•\s*/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export default function KnowledgeItemDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: item, isLoading, error, refetch } = useQuery({
    queryKey: ['knowledge-item', id],
    queryFn: async (): Promise<KnowledgeItem | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('id, title, url, google_drive_url, summary, user_notes, dain_context, dain_relevance, content_type, industries, technologies, service_lines, business_functions, quotables, source_credibility, actionability, timeliness, created_at, infographic_url, infographic_generated_at, infographic_type')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as KnowledgeItem;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
          <LoadingState message="Loading knowledge item..." />
        </main>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Item not found</h2>
            <p className="text-muted-foreground mb-4">
              This knowledge item doesn't exist or you don't have access.
            </p>
            <Link to="/knowledge">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Knowledge Base
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6 max-w-4xl">
        {/* Back link */}
        <Link
          to="/knowledge"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Knowledge Base
        </Link>

        {/* Title & Meta */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-3">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {item.content_type && (
              <Badge variant="secondary">{item.content_type}</Badge>
            )}
            <CredibilityBadge credibility={item.source_credibility} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Links */}
          <div className="flex gap-3 mt-3">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Source
              </a>
            )}
            {item.google_drive_url && (
              <a
                href={item.google_drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                View PDF
              </a>
            )}
          </div>
        </div>

        {/* Summary */}
        {item.summary && (
          <Card className="p-6 mb-4">
            <h3 className="font-semibold text-foreground mb-3">Summary</h3>
            {(() => {
              const bullets = parseSummaryBullets(item.summary);
              if (bullets) {
                return (
                  <ul className="space-y-2 text-foreground/90">
                    {bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return <p className="text-sm text-foreground/90 leading-relaxed">{item.summary}</p>;
            })()}
          </Card>
        )}

        {/* DAIN Context */}
        {item.dain_context && (
          <Card className="p-6 mb-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">DAIN Context</h3>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{item.dain_context}</p>
          </Card>
        )}

        {/* Quotables */}
        {item.quotables && item.quotables.length > 0 && (
          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Key Quotes</h3>
            </div>
            <div className="space-y-3">
              {item.quotables.map((quote, i) => (
                <blockquote
                  key={i}
                  className="border-l-2 border-primary/50 pl-4 text-sm italic text-foreground/80"
                >
                  "{quote}"
                </blockquote>
              ))}
            </div>
          </Card>
        )}

        {/* User Notes */}
        {item.user_notes && (
          <Card className="p-6 mb-4">
            <h3 className="font-semibold text-foreground mb-3">My Notes</h3>
            <p className="text-sm text-foreground/90 leading-relaxed">{item.user_notes}</p>
          </Card>
        )}

        {/* Tags */}
        <Card className="p-6 mb-4">
          <h3 className="font-semibold text-foreground mb-4">Tags</h3>
          <div className="space-y-3">
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
        </Card>

        {/* Metadata */}
        <Card className="p-6 mb-4">
          <h3 className="font-semibold text-foreground mb-3">Metadata</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {item.actionability && (
              <div>
                <span className="text-muted-foreground">Actionability:</span>
                <p className="font-medium text-foreground">{item.actionability}</p>
              </div>
            )}
            {item.timeliness && (
              <div>
                <span className="text-muted-foreground">Timeliness:</span>
                <p className="font-medium text-foreground">{item.timeliness}</p>
              </div>
            )}
            {item.dain_relevance && (
              <div>
                <span className="text-muted-foreground">Relevance:</span>
                <p className="font-medium text-foreground">{item.dain_relevance}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Added:</span>
              <p className="font-medium text-foreground">
                {format(new Date(item.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </Card>

        {/* Infographic Section */}
        <InfographicSection
          itemId={item.id}
          itemTitle={item.title}
          infographicUrl={item.infographic_url}
          infographicType={item.infographic_type}
          infographicGeneratedAt={item.infographic_generated_at}
          onGenerated={() => refetch()}
        />
      </main>
    </div>
  );
}
