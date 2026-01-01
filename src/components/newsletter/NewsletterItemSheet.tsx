import { useState, useEffect } from 'react';
import { ExternalLink, Star, MessageSquare } from 'lucide-react';
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
                {sourceLine}
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

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-5">
            {/* Summary */}
            {item.summary && (
              <section>
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Summary
                </h4>
                <p className="text-sm text-foreground leading-relaxed">
                  {item.summary}
                </p>
              </section>
            )}

            {/* Key Findings */}
            {item.key_findings && item.key_findings.length > 0 && (
              <section>
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Key Findings
                </h4>
                <ul className="space-y-2">
                  {item.key_findings.map((finding, idx) => (
                    <li key={idx} className="text-sm text-foreground flex gap-2">
                      <span className="text-muted-foreground shrink-0">•</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Key Quotes */}
            {item.quotables && item.quotables.length > 0 && (
              <section>
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Key Quotes
                </h4>
                <div className="space-y-2">
                  {item.quotables.map((quote, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'text-sm p-3 rounded-lg border',
                        highlightedSet.has(idx)
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-muted/30 border-transparent'
                      )}
                    >
                      <div className="flex gap-2">
                        {highlightedSet.has(idx) && (
                          <Star className="h-4 w-4 text-primary fill-primary shrink-0 mt-0.5" />
                        )}
                        <p className="italic text-foreground">"{quote}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* DAIN Context */}
            {item.dain_context && (
              <section>
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  DAIN Context
                </h4>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-foreground">{item.dain_context}</p>
                </div>
              </section>
            )}

            {/* Original Notes */}
            {item.user_notes && (
              <section>
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Capture Notes
                </h4>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="italic">{item.user_notes}</p>
                </div>
              </section>
            )}

            {/* Curator Notes (Why it matters) */}
            <section>
              <h4 className="text-xs font-medium uppercase tracking-wide text-primary mb-2">
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
            </section>
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
