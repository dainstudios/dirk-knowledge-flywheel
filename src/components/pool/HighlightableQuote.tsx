import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HighlightableQuoteProps {
  quote: string;
  index: number;
  isHighlighted: boolean;
  onToggle: (index: number) => void;
  disabled?: boolean;
}

export function HighlightableQuote({ 
  quote, 
  index, 
  isHighlighted, 
  onToggle,
  disabled 
}: HighlightableQuoteProps) {
  return (
    <div 
      className={cn(
        'group relative pl-8 pr-4 py-2 rounded-lg transition-all',
        isHighlighted 
          ? 'border-l-4 border-l-primary bg-primary/5' 
          : 'border-l-2 border-l-muted-foreground/30 hover:bg-muted/30'
      )}
    >
      <button
        onClick={() => onToggle(index)}
        disabled={disabled}
        className={cn(
          'absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all',
          isHighlighted
            ? 'text-primary'
            : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-primary/70',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        title={isHighlighted ? 'Remove highlight' : 'Mark as important'}
      >
        <Star 
          className={cn('h-4 w-4', isHighlighted && 'fill-current')} 
        />
      </button>
      
      <blockquote className="text-sm text-foreground/80 italic">
        &ldquo;{quote}&rdquo;
      </blockquote>
    </div>
  );
}
