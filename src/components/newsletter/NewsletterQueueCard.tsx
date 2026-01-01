import { useState } from 'react';
import { format } from 'date-fns';
import { MessageSquare, Trash2, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { NewsletterQueueItem } from '@/hooks/useNewsletterQueue';

interface NewsletterQueueCardProps {
  item: NewsletterQueueItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onOpenDetail: (id: string) => void;
  isUpdating?: boolean;
}

export function NewsletterQueueCard({
  item,
  isSelected,
  onToggleSelect,
  onRemove,
  onUpdateNotes,
  onOpenDetail,
  isUpdating,
}: NewsletterQueueCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(item.curator_notes || '');

  const sourceLine = item.author_organization || item.author || 'Unknown source';
  const contentType = item.content_type || 'Article';
  const formattedDate = item.queued_for_newsletter_at
    ? format(new Date(item.queued_for_newsletter_at), 'MMM d')
    : null;

  const handleSaveNotes = () => {
    onUpdateNotes(item.id, editedNotes);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedNotes(item.curator_notes || '');
    setIsEditing(false);
  };

  return (
    <Card
      className={cn(
        'transition-colors rounded-2xl',
        isSelected ? 'bg-primary/5 border-primary/20' : 'bg-card'
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Checkbox */}
          <div className="flex items-start pt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(item.id)}
              className="h-5 w-5"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title - clickable */}
            <button
              onClick={() => onOpenDetail(item.id)}
              className="text-left font-semibold text-foreground line-clamp-2 hover:underline hover:text-primary transition-colors"
            >
              {item.title}
            </button>

            {/* Source line */}
            <p className="text-sm text-muted-foreground">
              {sourceLine} • {contentType}
            </p>

            {/* Curator notes */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="Add a note about why this matters..."
                  className="min-h-[80px] text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={isUpdating}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : item.curator_notes ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="italic line-clamp-2">{item.curator_notes}</p>
              </div>
            ) : null}

            {/* Date badge */}
            {formattedDate && (
              <Badge variant="secondary" className="text-xs">
                {formattedDate}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              disabled={isEditing}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit Note</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(item.id)}
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Remove</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
