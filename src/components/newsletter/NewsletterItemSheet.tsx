import { useState, useEffect } from 'react';
import { ExternalLink, Star, MessageSquare, Info, Lightbulb, Quote } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormattedText } from '@/components/common';
import { cn } from '@/lib/utils';
import type { NewsletterQueueItem } from '@/hooks/useNewsletterQueue';

interface NewsletterItemSheetProps {
  item: NewsletterQueueItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (notes: string) => void;
  isUpdating: boolean;
}

export function NewsletterItemSheet({
  item,
  isOpen,
  onClose,
  onSaveNotes,
  isUpdating,
}: NewsletterItemSheetProps) {
  const [notes, setNotes] = useState('');

  // Sync notes when item changes
  useEffect(() => {
    if (item) {
      setNotes(item.curator_notes || '');
    }
  }, [item]);

  const handleSave = () => {
    onSaveNotes(notes);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!item) return null;

  const sourceLine = item.author_organization || item.author || 'Unknown source';
  const highlightedSet = new Set(item.highlighted_quotes || []);
  const findings = item.key_insights || item.key_findings || [];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <SheetTitle className="text-lg font-semibold leading-tight line-clamp-2">
                {item.title}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                By {item.author}
                {item.author_organization && (
                  <span className="font-medium text-foreground"> • {item.author_organization}</span>
                )}
              </p>
            </div>
            {item.url && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={() => window.open(item.url!, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Source
              </Button>
            )}
          </div>
          {item.content_type && (
            <Badge variant="secondary" className="w-fit mt-2">
              {item.content_type}
            </Badge>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {/* Context Section (formerly Methodology) */}
            {item.methodology && (
              <div className="px-6 py-4 bg-muted/30">
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  Context
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.methodology}
                </p>
              </div>
            )}

            {/* Key Findings Section */}
            {findings.length > 0 && (
              <div className="px-6 py-4">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  Key Findings
                </h4>
                <div className="space-y-2">
                  {findings.slice(0, 5).map((finding, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <FormattedText content={finding} as="span" className="text-foreground/90 leading-relaxed text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Quotes Section */}
            {item.quotables && item.quotables.length > 0 && (
              <div className="px-6 py-4">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Quote className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  Key Quotes
                </h4>
                <div className="space-y-2">
                  {item.quotables.slice(0, 5).map((quote, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-start gap-2 p-3 rounded-lg text-sm',
                        highlightedSet.has(idx)
                          ? 'bg-primary/5 border border-primary/20'
                          : 'bg-muted/30'
                      )}
                    >
                      {highlightedSet.has(idx) && (
                        <Star className="h-4 w-4 text-primary fill-primary shrink-0 mt-0.5" />
                      )}
                      <p className="italic text-foreground/90">"{quote}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DAIN Context Section */}
            {item.dain_context && (
              <div className="px-6 py-4">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  DAIN Context
                </h4>
                <div className="p-3 rounded-lg bg-primary/5 border-l-4 border-l-primary">
                  <p className="text-sm text-foreground">{item.dain_context}</p>
                </div>
              </div>
            )}

            {/* Original Capture Notes */}
            {item.user_notes && (
              <div className="px-6 py-4">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Capture Notes
                </h4>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="italic">{item.user_notes}</p>
                </div>
              </div>
            )}

            {/* Curator Notes (Why it matters) */}
            <div className="px-6 py-4">
              <h4 className="text-sm font-medium text-primary mb-2">
                Why It Matters (Newsletter Note)
              </h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Why is this important for our readers? What should they take away?"
                className="min-h-[100px] text-sm focus-visible:ring-primary"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                ⌘+Enter to save
              </p>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t border-border shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isUpdating} className="flex-1 sm:flex-none">
              {isUpdating ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
