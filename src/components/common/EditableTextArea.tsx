import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface EditableTextAreaProps {
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
  isLoading?: boolean;
  className?: string;
  minRows?: number;
}

export function EditableTextArea({
  value,
  placeholder = 'Click to edit...',
  onSave,
  isLoading = false,
  className,
  minRows = 3,
}: EditableTextAreaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editValue.length, editValue.length);
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    // Cmd/Ctrl + Enter to save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={minRows}
          className={cn('resize-none', className)}
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            <span className="ml-1">Save</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="h-3 w-3" />
            <span className="ml-1">Cancel</span>
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            ⌘+Enter to save, Esc to cancel
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        'group cursor-pointer rounded-md p-2 -m-2 hover:bg-primary/10 transition-colors',
        className
      )}
    >
      {value ? (
        <p className="leading-relaxed">{value}</p>
      ) : (
        <p className="text-muted-foreground italic">{placeholder}</p>
      )}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Click to edit</span>
      </div>
    </div>
  );
}
