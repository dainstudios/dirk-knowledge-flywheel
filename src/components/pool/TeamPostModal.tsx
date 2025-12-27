import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { PostOption } from '@/hooks/usePool';

interface TeamPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (option: PostOption) => void;
  itemId: string;
  itemTitle: string;
  existingInfographicUrl: string | null;
  isProcessing: boolean;
}

const QUICK_MESSAGES = ['Preparing content...', 'Generating visual...'];
const PREMIUM_MESSAGES = [
  'Fetching document...',
  'Analyzing content...',
  'Extracting themes...',
  'Generating visual...',
];

export function TeamPostModal({
  isOpen,
  onClose,
  onConfirm,
  itemId,
  itemTitle,
  existingInfographicUrl,
  isProcessing,
}: TeamPostModalProps) {
  const { session } = useAuth();
  const [selectedOption, setSelectedOption] = useState<PostOption>('summary_only');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedOption('summary_only');
      setIsGenerating(false);
      setStatusMessage('');
    }
  }, [isOpen]);

  // Cycle through status messages during generation
  useEffect(() => {
    if (!isGenerating) return;

    const isPremium = selectedOption.includes('premium');
    const messages = isPremium ? PREMIUM_MESSAGES : QUICK_MESSAGES;
    setStatusMessage(messages[0]);
    setStatusIndex(0);

    const interval = setInterval(() => {
      setStatusIndex((prev) => {
        const next = (prev + 1) % messages.length;
        setStatusMessage(messages[next]);
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isGenerating, selectedOption]);

  const needsInfographic = selectedOption !== 'summary_only';
  const hasExistingInfographic = !!existingInfographicUrl;

  const handlePost = async () => {
    // If we need an infographic and don't have one, generate it first
    if (needsInfographic && !hasExistingInfographic) {
      setIsGenerating(true);
      const type = selectedOption.includes('premium') ? 'premium' : 'quick';

      try {
        const response = await fetch(
          'https://wcdtdjztzrlvwkmlwpgw.supabase.co/functions/v1/generate-infographic',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              item_id: itemId,
              type: type,
              model: 'nano-banana',
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate infographic');
        }

        // Infographic generated, now proceed with team post
        setIsGenerating(false);
        onConfirm(selectedOption);
      } catch (error) {
        console.error('Infographic generation error:', error);
        setIsGenerating(false);
        // Still try to post even if infographic fails - the confirm handler can decide
        onConfirm(selectedOption);
      }
    } else {
      // No infographic needed or already exists
      onConfirm(selectedOption);
    }
  };

  const options = [
    {
      value: 'summary_only' as PostOption,
      label: 'Summary only',
      description: 'Instant',
    },
    {
      value: 'summary_quick' as PostOption,
      label: 'Summary + Quick infographic',
      description: hasExistingInfographic ? 'Uses existing' : '~15 sec',
    },
    {
      value: 'summary_premium' as PostOption,
      label: 'Summary + Premium infographic',
      description: hasExistingInfographic ? 'Uses existing' : '~60 sec',
    },
    {
      value: 'infographic_quick' as PostOption,
      label: 'Infographic only (Quick)',
      description: hasExistingInfographic ? 'Uses existing' : '~15 sec',
    },
    {
      value: 'infographic_premium' as PostOption,
      label: 'Infographic only (Premium)',
      description: hasExistingInfographic ? 'Uses existing' : '~60 sec',
    },
  ];

  const isLoading = isGenerating || isProcessing;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post to Team</DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              {statusMessage}
            </p>
            <p className="text-xs text-muted-foreground">
              Generating infographic before posting...
            </p>
          </div>
        ) : (
          <>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                What to include:
              </p>
              <RadioGroup
                value={selectedOption}
                onValueChange={(val) => setSelectedOption(val as PostOption)}
                className="space-y-3"
              >
                {options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="block text-sm font-medium text-foreground">
                        {option.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handlePost} disabled={isLoading}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Posting...
                  </>
                ) : (
                  'Post'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
