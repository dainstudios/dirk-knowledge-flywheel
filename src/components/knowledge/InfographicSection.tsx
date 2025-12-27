import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Rocket,
  Star,
  BarChart3,
  RefreshCw,
  Download,
  Link2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface InfographicSectionProps {
  itemId: string;
  itemTitle: string;
  infographicUrl: string | null;
  infographicType: string | null;
  infographicGeneratedAt: string | null;
  onGenerated: () => void;
}

const QUICK_MESSAGES = ['Preparing content...', 'Generating visual...'];
const PREMIUM_MESSAGES = [
  'Fetching document...',
  'Analyzing content...',
  'Extracting themes...',
  'Generating visual...',
];

export function InfographicSection({
  itemId,
  itemTitle,
  infographicUrl,
  infographicType,
  infographicGeneratedAt,
  onGenerated,
}: InfographicSectionProps) {
  const { session } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<'quick' | 'premium' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  // Cycle through status messages
  useEffect(() => {
    if (!isGenerating || !generatingType) return;

    const messages = generatingType === 'quick' ? QUICK_MESSAGES : PREMIUM_MESSAGES;
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
  }, [isGenerating, generatingType]);

  const handleGenerate = async (type: 'quick' | 'premium') => {
    setIsGenerating(true);
    setGeneratingType(type);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-infographic`,
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

      toast({
        title: 'Infographic generated!',
        description: `Your ${type} infographic is ready.`,
      });
      onGenerated();
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };

  const handleDownload = async () => {
    if (!infographicUrl) return;
    try {
      const response = await fetch(infographicUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${itemTitle.replace(/[^a-z0-9]/gi, '_')}_infographic.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Download started' });
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' });
    }
  };

  const handleCopyLink = () => {
    if (!infographicUrl) return;
    navigator.clipboard.writeText(infographicUrl);
    toast({ title: 'Link copied to clipboard' });
  };

  // Loading state
  if (isGenerating) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Infographic</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            {statusMessage}
          </p>
          <p className="text-xs text-muted-foreground">
            Generating {generatingType} infographic...
          </p>
        </div>
      </Card>
    );
  }

  // Has infographic
  if (infographicUrl) {
    return (
      <>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Infographic</h3>
            </div>
            <Badge variant="secondary" className="capitalize">
              {infographicType}
            </Badge>
          </div>

          <div
            className="relative cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
            onClick={() => setIsImageExpanded(true)}
          >
            <img
              src={infographicUrl}
              alt={`Infographic for ${itemTitle}`}
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-foreground/0 hover:bg-foreground/5 transition-colors flex items-center justify-center">
              <span className="text-xs text-muted-foreground opacity-0 hover:opacity-100 bg-background/80 px-2 py-1 rounded">
                Click to expand
              </span>
            </div>
          </div>

          {infographicGeneratedAt && (
            <p className="text-xs text-muted-foreground mt-3">
              Generated: {format(new Date(infographicGeneratedAt), 'MMM d, yyyy \'at\' h:mm a')}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleGenerate('quick')}>
                  <Rocket className="h-4 w-4 mr-2" />
                  Quick (~15 sec)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGenerate('premium')}>
                  <Star className="h-4 w-4 mr-2" />
                  Premium (~60 sec)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>

            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Link2 className="h-4 w-4 mr-1" />
              Copy Link
            </Button>
          </div>
        </Card>

        {/* Expanded Image Modal */}
        <Dialog open={isImageExpanded} onOpenChange={setIsImageExpanded}>
          <DialogContent className="max-w-4xl p-2">
            <DialogTitle className="sr-only">Infographic for {itemTitle}</DialogTitle>
            <img
              src={infographicUrl}
              alt={`Infographic for ${itemTitle}`}
              className="w-full h-auto rounded"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // No infographic - show generation options
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Infographic</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Generate a visual summary of this content
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Quick Card */}
        <Card className="p-4 border-2 border-transparent hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-foreground">Quick</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Simple visual summary
            <br />
            <span className="text-xs">~15 seconds</span>
          </p>
          <Button
            onClick={() => handleGenerate('quick')}
            className="w-full"
            size="sm"
          >
            Generate
          </Button>
        </Card>

        {/* Premium Card */}
        <Card className="p-4 border-2 border-transparent hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-foreground">Premium</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Rich ecosystem diagram
            <br />
            <span className="text-xs">~60 seconds</span>
          </p>
          <Button
            onClick={() => handleGenerate('premium')}
            className="w-full"
            size="sm"
          >
            Generate
          </Button>
        </Card>
      </div>
    </Card>
  );
}
