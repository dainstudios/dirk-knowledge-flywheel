import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface FormattedTextProps {
  content: string;
  className?: string;
  as?: 'p' | 'span' | 'div';
}

/**
 * Renders text with markdown formatting support.
 * Supports **bold**, *italic*, and inline formatting.
 */
export function FormattedText({ content, className, as = 'div' }: FormattedTextProps) {
  const Component = as;
  
  return (
    <Component className={cn('formatted-text', className)}>
      <ReactMarkdown
        components={{
          // Render paragraphs as spans to avoid nesting issues
          p: ({ children }) => <span>{children}</span>,
          // Render strong/bold text
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          // Render emphasis/italic
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          // Prevent rendering of block elements
          ul: ({ children }) => <>{children}</>,
          ol: ({ children }) => <>{children}</>,
          li: ({ children }) => <span>{children}</span>,
        }}
      >
        {content}
      </ReactMarkdown>
    </Component>
  );
}
