import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Sparkles } from 'lucide-react';
import { Header } from '@/components/common/Header';
import { MobileNav } from '@/components/common/MobileNav';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useNewsletterQueue } from '@/hooks/useNewsletterQueue';
import { NewsletterQueueCard } from '@/components/newsletter/NewsletterQueueCard';

export default function Newsletter() {
  const { items, isLoading, removeFromQueue, updateNotes } = useNewsletterQueue();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

  // Initialize selection with all items
  useEffect(() => {
    if (items.length > 0) {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }, [items]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const handleRemoveClick = (id: string) => {
    setItemToRemove(id);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (itemToRemove) {
      removeFromQueue.mutate(itemToRemove);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(itemToRemove);
        return next;
      });
    }
    setRemoveDialogOpen(false);
    setItemToRemove(null);
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    updateNotes.mutate({ itemId: id, notes });
  };

  const handleGenerateDraft = () => {
    toast({
      description: 'Newsletter generation coming soon',
    });
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Newsletter Queue</h1>
            <p className="text-muted-foreground">
              {items.length} item{items.length !== 1 ? 's' : ''} ready for next edition
            </p>
          </div>
          <Button
            onClick={handleGenerateDraft}
            disabled={selectedIds.size < 2}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate Draft
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Newspaper className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No items in newsletter queue</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Mark items for newsletter in the Pool to build your next edition
            </p>
            <Button asChild>
              <Link to="/pool">Go to Pool</Link>
            </Button>
          </div>
        )}

        {/* Selection Controls & Items List */}
        {!isLoading && items.length > 0 && (
          <>
            {/* Selection controls */}
            <div className="flex items-center gap-3 py-2 border-b border-border">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={handleSelectAll}
                className="h-5 w-5"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} of {items.length} selected
              </span>
            </div>

            {/* Items list */}
            <div className="space-y-4">
              {items.map((item) => (
                <NewsletterQueueCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                  onRemove={handleRemoveClick}
                  onUpdateNotes={handleUpdateNotes}
                  isUpdating={updateNotes.isPending}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <MobileNav />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from newsletter queue?</AlertDialogTitle>
            <AlertDialogDescription>
              This item will be removed from the newsletter queue. You can add it back later from the Pool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
