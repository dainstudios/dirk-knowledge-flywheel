import { useState, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface NotesEditorProps {
  notes: string | null;
  onSave: (notes: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function NotesEditor({ notes, onSave, isLoading, className }: NotesEditorProps) {
  const [isExpanded, setIsExpanded] = useState(!!notes);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(notes || '');

  useEffect(() => {
    setEditValue(notes || '');
  }, [notes]);

  const handleSave = () => {
    onSave(editValue.trim());
    setIsEditing(false);
    if (!editValue.trim()) {
      setIsExpanded(false);
    }
  };

  const handleCancel = () => {
    setEditValue(notes || '');
    setIsEditing(false);
    if (!notes) {
      setIsExpanded(false);
    }
  };

  const handleStartEditing = () => {
    setIsExpanded(true);
    setIsEditing(true);
  };

  return (
    <div className={cn('border-t border-border/50', className)}>
      {/* Header */}
      <button
        onClick={() => notes ? setIsExpanded(!isExpanded) : handleStartEditing()}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          {notes ? 'Curator Notes' : 'Add Note'}
        </div>
        {notes && (
          isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-5 pb-4">
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Add your notes, comments, or additional context..."
                className="min-h-[100px] resize-none"
                disabled={isLoading}
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save Note
                </Button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditing(true)}
              className="p-3 bg-muted/30 rounded-lg text-sm text-foreground/80 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {notes || <span className="text-muted-foreground italic">Click to add a note...</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
