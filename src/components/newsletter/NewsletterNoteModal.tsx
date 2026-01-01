import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface NewsletterNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  existingNote: string | null;
  onConfirm: (note: string) => void;
  isProcessing?: boolean;
}

export function NewsletterNoteModal({
  isOpen,
  onClose,
  itemTitle,
  existingNote,
  onConfirm,
  isProcessing = false,
}: NewsletterNoteModalProps) {
  const [note, setNote] = useState(existingNote || '');

  // Reset note when modal opens with new item
  useEffect(() => {
    if (isOpen) {
      setNote(existingNote || '');
    }
  }, [isOpen, existingNote]);

  const handleConfirm = () => {
    onConfirm(note);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Newsletter Queue</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {itemTitle}
          </p>

          <div className="space-y-2">
            <Label htmlFor="newsletter-note">Why does this matter?</Label>
            <Textarea
              id="newsletter-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Shows enterprise AI adoption is accelerating faster than expected..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Brief is better - 1-2 sentences. This becomes the seed for your DAIN Take.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              'Add to Queue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
