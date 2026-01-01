import { useState, useEffect } from 'react';
import { Loader2, Copy, AlertCircle, Check, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

type ModalState = 'idle' | 'generating' | 'complete' | 'error';

interface NewsletterDraftItem {
  id: string;
  title: string;
  context: string;
  key_findings: string[];
  dain_take: string;
  source_url?: string;
}

interface NewsletterDraft {
  intro: string;
  items: NewsletterDraftItem[];
  closing: string;
  markdown: string;
  plain_text: string;
}

interface NewsletterDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: Array<{
    id: string;
    title: string;
    author_organization?: string | null;
    author?: string | null;
    content_type?: string | null;
  }>;
}

const PROGRESS_MESSAGES = [
  'Analyzing items...',
  'Synthesizing themes...',
  'Writing in your voice...',
  'Formatting for LinkedIn...',
];

// Mock function - will be replaced with real Edge Function call
const generateNewsletterDraft = async (itemIds: string[]): Promise<{
  success: boolean;
  draft?: NewsletterDraft;
  error?: string;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Return mock data for testing UI
  return {
    success: true,
    draft: {
      intro: "This week's signals point to a clear pattern: enterprise AI is moving from pilot to production faster than anyone expected. Here's what you need to know...",
      items: itemIds.map((id, index) => ({
        id,
        title: `Sample Article ${index + 1}`,
        context: "McKinsey surveyed 1,363 executives across 14 industries globally to assess GenAI adoption and organizational impact.",
        key_findings: [
          "65% of organizations now regularly use GenAI (up from 33% in 2023)",
          "Cost reduction and revenue gains reported by 25%+ of users",
          "Top use cases: marketing content (43%), software dev (40%)"
        ],
        dain_take: "The 2x jump in 10 months tells us the early-mover window is closing. Clients still 'exploring' AI are now officially behind.",
        source_url: "https://example.com"
      })),
      closing: "What trend are you watching most closely? Let me know in the comments.",
      markdown: `🎯 **THIS EDITION**

This week's signals point to a clear pattern: enterprise AI is moving from pilot to production faster than anyone expected. Here's what you need to know...

---

**📊 Article 1: Sample Article 1**

**Context:** McKinsey surveyed 1,363 executives across 14 industries globally to assess GenAI adoption and organizational impact.

**Key Findings:**
• 65% of organizations now regularly use GenAI (up from 33% in 2023)
• Cost reduction and revenue gains reported by 25%+ of users
• Top use cases: marketing content (43%), software dev (40%)

**🎤 DAIN Take:** The 2x jump in 10 months tells us the early-mover window is closing. Clients still 'exploring' AI are now officially behind.

---

What trend are you watching most closely? Let me know in the comments.`,
      plain_text: `🎯 THIS EDITION

This week's signals point to a clear pattern: enterprise AI is moving from pilot to production faster than anyone expected. Here's what you need to know...

---

📊 Article 1: Sample Article 1

Context: McKinsey surveyed 1,363 executives across 14 industries globally to assess GenAI adoption and organizational impact.

Key Findings:
• 65% of organizations now regularly use GenAI (up from 33% in 2023)
• Cost reduction and revenue gains reported by 25%+ of users
• Top use cases: marketing content (43%), software dev (40%)

🎤 DAIN Take: The 2x jump in 10 months tells us the early-mover window is closing. Clients still 'exploring' AI are now officially behind.

---

What trend are you watching most closely? Let me know in the comments.`
    }
  };
};

export function NewsletterDraftModal({
  isOpen,
  onClose,
  selectedItems,
}: NewsletterDraftModalProps) {
  const { toast } = useToast();
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [draft, setDraft] = useState<NewsletterDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [copied, setCopied] = useState<'markdown' | 'plain' | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalState('idle');
      setDraft(null);
      setError(null);
      setProgressIndex(0);
      setCopied(null);
    }
  }, [isOpen]);

  // Cycle progress messages during generation
  useEffect(() => {
    if (modalState !== 'generating') return;
    
    const interval = setInterval(() => {
      setProgressIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [modalState]);

  const handleGenerate = async () => {
    setModalState('generating');
    setError(null);
    
    try {
      const result = await generateNewsletterDraft(selectedItems.map(item => item.id));
      
      if (result.success && result.draft) {
        setDraft(result.draft);
        setModalState('complete');
      } else {
        setError(result.error || 'Failed to generate newsletter');
        setModalState('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setModalState('error');
    }
  };

  const handleClose = () => {
    if (modalState === 'generating') {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  const copyToClipboard = async (format: 'markdown' | 'plain') => {
    if (!draft) return;
    
    const text = format === 'markdown' ? draft.markdown : draft.plain_text;
    await navigator.clipboard.writeText(text);
    setCopied(format);
    toast({
      description: `Newsletter copied as ${format === 'markdown' ? 'Markdown' : 'plain text'}`,
    });
    
    setTimeout(() => setCopied(null), 2000);
  };

  const progressMessage = PROGRESS_MESSAGES[progressIndex].replace(
    'items',
    `${selectedItems.length} items`
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl">
          {/* Idle State */}
          {modalState === 'idle' && (
            <>
              <DialogHeader>
                <DialogTitle>Generate Newsletter Draft</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Selected items list */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected items ({selectedItems.length})</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {selectedItems.map((item, index) => (
                      <li key={item.id} className="truncate">
                        {item.title}
                      </li>
                    ))}
                  </ol>
                </div>
                
                {/* Info box */}
                <div className="flex gap-3 p-3 bg-muted/50 rounded-xl text-sm">
                  <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">AI will generate:</p>
                    <p>Newsletter intro (themes + key takeaways), Per-item: Context → Key Findings → DAIN Take</p>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate}>
                  Generate Newsletter
                </Button>
              </DialogFooter>
            </>
          )}
          
          {/* Generating State */}
          {modalState === 'generating' && (
            <>
              <DialogHeader>
                <DialogTitle>Generating Newsletter...</DialogTitle>
              </DialogHeader>
              
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-lg font-medium">{progressMessage}</p>
                <p className="text-sm text-muted-foreground">This takes about 30-60 seconds</p>
              </div>
            </>
          )}
          
          {/* Complete State */}
          {modalState === 'complete' && draft && (
            <>
              <DialogHeader className="flex-row items-center justify-between space-y-0">
                <DialogTitle>Newsletter Draft Ready</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => copyToClipboard('markdown')}
                >
                  {copied === 'markdown' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy All
                </Button>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                    {draft.markdown}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
              
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={onClose} className="sm:mr-auto">
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard('markdown')}
                  className="gap-2"
                >
                  {copied === 'markdown' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy as Markdown
                </Button>
                <Button
                  onClick={() => copyToClipboard('plain')}
                  className="gap-2"
                >
                  {copied === 'plain' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy as Plain Text
                </Button>
              </DialogFooter>
            </>
          )}
          
          {/* Error State */}
          {modalState === 'error' && (
            <>
              <DialogHeader>
                <DialogTitle>Generation Failed</DialogTitle>
              </DialogHeader>
              
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {error || 'An error occurred while generating the newsletter'}
                </p>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={handleGenerate}>
                  Try Again
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel generation?</AlertDialogTitle>
            <AlertDialogDescription>
              The newsletter draft is still being generated. Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Generating</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              Cancel Generation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
