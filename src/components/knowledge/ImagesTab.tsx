import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Copy,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  Sparkles,
  BarChart3,
  LineChart,
  PieChart,
  GitBranch,
  LayoutGrid,
  Grid3X3,
  Table,
  FileImage,
} from 'lucide-react';
import { toast } from 'sonner';

interface ImageResult {
  id: string;
  title: string;
  description: string | null;
  key_insight: string | null;
  chart_type: string | null;
  data_points: string[] | null;
  trends_and_patterns: string[] | null;
  dain_context: string | null;
  topics: string[];
  use_cases: string[];
  source: string | null;
  url: string | null;
  google_drive_url: string | null;
  storage_url: string | null;
  relevance: number;
}

interface ImageResponse {
  images: ImageResult[];
  stats: {
    total_found: number;
  };
}

// Convert Google Drive view links to embeddable URLs
function getDisplayUrl(image: ImageResult): string | null {
  if (image.storage_url) return image.storage_url;
  
  if (image.google_drive_url) {
    // Extract file ID from various Google Drive URL formats
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,           // /d/FILE_ID/
      /id=([a-zA-Z0-9_-]+)/,             // ?id=FILE_ID
      /\/file\/d\/([a-zA-Z0-9_-]+)/,     // /file/d/FILE_ID
    ];
    
    for (const pattern of patterns) {
      const match = image.google_drive_url.match(pattern);
      if (match) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }
  }
  
  if (image.url) return image.url;
  return null;
}

// Get chart type icon
function getChartIcon(chartType: string | null) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    bar_chart: BarChart3,
    line_graph: LineChart,
    pie_chart: PieChart,
    diagram: GitBranch,
    framework: LayoutGrid,
    matrix: Grid3X3,
    table: Table,
    infographic: FileImage,
  };
  return chartType ? iconMap[chartType] || ImageIcon : ImageIcon;
}

function ImageCard({ image, onClick, index }: { image: ImageResult; onClick: () => void; index: number }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imageUrl = getDisplayUrl(image);
  const ChartIcon = getChartIcon(image.chart_type);

  return (
    <Card
      className="group overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick}
    >
      {/* Image thumbnail */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {imageUrl && !hasError ? (
          <>
            {/* Loading skeleton */}
            {!isLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            <img
              src={imageUrl}
              alt={image.title}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
              }`}
              onLoad={() => setIsLoaded(true)}
              onError={() => setHasError(true)}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50">
            <ChartIcon className="h-12 w-12 text-muted-foreground/40 mb-2" />
            <span className="text-xs text-muted-foreground/60 capitalize">
              {image.chart_type?.replace(/_/g, ' ') || 'Image'}
            </span>
          </div>
        )}
        
        {/* Match percentage badge - positioned on image */}
        <div className="absolute top-2 right-2">
          <Badge 
            className="bg-primary text-primary-foreground border-0 shadow-lg text-xs font-semibold"
          >
            {image.relevance}%
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-foreground text-sm truncate mb-2 group-hover:text-primary transition-colors">
          {image.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {image.chart_type && (
            <Badge variant="secondary" className="text-xs capitalize bg-secondary/80">
              {image.chart_type.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

function ImageModal({
  image,
  open,
  onClose,
}: {
  image: ImageResult | null;
  open: boolean;
  onClose: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  if (!image) return null;

  const imageUrl = getDisplayUrl(image);
  const ChartIcon = getChartIcon(image.chart_type);

  const copyLink = async () => {
    if (imageUrl) {
      await navigator.clipboard.writeText(imageUrl);
      toast.success('Link copied!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl">{image.title}</DialogTitle>
            </DialogHeader>

            {/* Image */}
            <div className="mt-4 rounded-xl overflow-hidden bg-muted relative">
              {imageUrl && !hasError ? (
                <>
                  {!isLoaded && (
                    <Skeleton className="w-full h-[300px]" />
                  )}
                  <img
                    src={imageUrl}
                    alt={image.title}
                    className={`w-full h-auto max-h-[400px] object-contain transition-opacity duration-300 ${
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                  />
                </>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center">
                  <ChartIcon className="h-16 w-16 text-muted-foreground/30 mb-2" />
                  <span className="text-sm text-muted-foreground/60 capitalize">
                    {image.chart_type?.replace(/_/g, ' ') || 'Image unavailable'}
                  </span>
                </div>
              )}
            </div>

            {/* Key Insight */}
            {image.key_insight && (
              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-primary text-sm">Key Insight</h4>
                </div>
                <p className="text-sm text-foreground">{image.key_insight}</p>
              </div>
            )}

            {/* Description */}
            {image.description && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">{image.description}</p>
              </div>
            )}

            {/* Data Points */}
            {image.data_points && image.data_points.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-foreground text-sm mb-2">Data Points</h4>
                <ul className="space-y-1">
                  {image.data_points.map((point, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trends & Patterns */}
            {image.trends_and_patterns && image.trends_and_patterns.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium text-foreground text-sm">Trends & Patterns</h4>
                </div>
                <ul className="space-y-1">
                  {image.trends_and_patterns.map((trend, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {trend}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* DAIN Context */}
            {image.dain_context && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-primary text-sm">How to Use</h4>
                </div>
                <p className="text-sm text-foreground">{image.dain_context}</p>
              </div>
            )}

            {/* Topics */}
            {image.topics.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-foreground text-sm mb-2">Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {image.topics.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Source */}
            {image.source && (
              <p className="mt-4 text-xs text-muted-foreground">
                Source: {image.source}
              </p>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              {image.google_drive_url && (
                <Button asChild className="gap-2">
                  <a href={image.google_drive_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open Original
                  </a>
                </Button>
              )}
              {imageUrl && (
                <Button variant="outline" onClick={copyLink} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const CHART_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'bar_chart', label: 'Bar Chart' },
  { value: 'line_graph', label: 'Line Graph' },
  { value: 'pie_chart', label: 'Pie Chart' },
  { value: 'infographic', label: 'Infographic' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'framework', label: 'Framework' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'table', label: 'Table' },
  { value: 'other', label: 'Other' },
];

export function ImagesTab() {
  const [query, setQuery] = useState('');
  const [chartType, setChartType] = useState('any');
  const [isSearching, setIsSearching] = useState(false);
  const [response, setResponse] = useState<ImageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResponse(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('find-image', {
        body: {
          query: query.trim(),
          chart_type: chartType === 'any' ? null : chartType,
          count: 12,
        },
      });

      if (fnError) {
        console.error('Function invocation error:', fnError);
        throw new Error(fnError.message || 'Failed to search images');
      }
      
      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      setResponse(data);
    } catch (err) {
      console.error('Find images error:', err);
      setError(err instanceof Error ? err.message : 'Failed to find images');
    } finally {
      setIsSearching(false);
    }
  };

  const clearAll = () => {
    setQuery('');
    setResponse(null);
    setError(null);
    setChartType('any');
  };

  return (
    <div className="space-y-6">
      {/* Helper text */}
      <p className="text-sm text-muted-foreground">
        Search charts, graphs, and infographics from your visual library
      </p>

      {/* Input */}
      <div className="space-y-4">
        <Input
          placeholder="Find an image about... (e.g., AI adoption chart, industry benchmark, framework diagram)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Type:</span>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" />
                Find Images
              </>
            )}
          </Button>
          {(response || query) && (
            <Button variant="outline" onClick={clearAll}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video" />
              <div className="p-3">
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <div className="flex items-center justify-between">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={handleSearch} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Results */}
      {response && !isSearching && (
        <>
          {response.images.length === 0 ? (
            <Card className="p-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No matching images found
              </h3>
              <p className="text-muted-foreground">
                Try different keywords or upload more visuals.
              </p>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">
                  Found {response.images.length} image{response.images.length !== 1 ? 's' : ''}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {response.images.map((image, index) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    index={index}
                    onClick={() => setSelectedImage(image)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Image Modal */}
      <ImageModal
        image={selectedImage}
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
