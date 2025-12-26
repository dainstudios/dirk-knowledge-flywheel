import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Link as LinkIcon } from 'lucide-react';
import { z } from 'zod';
import { Header, MobileNav } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const urlSchema = z.string().trim().url({ message: 'Please enter a valid URL' });

const MAX_NOTES_LENGTH = 500;

export default function Capture() {
  const { user } = useAuth();
  const { toast } = useToast();
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [fastTrack, setFastTrack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Auto-focus URL input on mount
  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError('URL is required');
      return false;
    }
    
    const result = urlSchema.safeParse(value);
    if (!result.success) {
      setUrlError(result.error.errors[0].message);
      return false;
    }
    
    setUrlError(null);
    return true;
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (urlError) {
      validateUrl(value);
    }
  };

  const handleNotesChange = (value: string) => {
    if (value.length <= MAX_NOTES_LENGTH) {
      setNotes(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUrl(url)) return;
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to capture content.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('knowledge_items').insert({
        url: url.trim(),
        title: url.trim(), // Required field - will be updated by processing
        user_notes: notes.trim() || null,
        fast_track: fastTrack,
        status: 'pending',
        capture_source: 'web_ui',
        user_id: user.id,
      });

      if (error) {
        // Check for duplicate URL error
        if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
          toast({
            title: "Already captured",
            description: "You've already captured this article.",
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      // Success
      toast({
        title: 'Content captured!',
        description: (
          <span>
            Your content is queued for processing.{' '}
            <Link to="/pool" className="underline font-medium hover:text-primary">
              View Pool
            </Link>
          </span>
        ),
      });

      // Clear form
      setUrl('');
      setNotes('');
      setFastTrack(false);
      urlInputRef.current?.focus();

    } catch (error) {
      console.error('Capture error:', error);
      toast({
        title: 'Capture failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="container py-6 md:py-8 max-w-lg mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Capture</h1>
        </div>

        {/* Capture Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-muted-foreground" />
              Add Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  ref={urlInputRef}
                  id="url"
                  type="url"
                  inputMode="url"
                  placeholder="Paste article URL..."
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onBlur={() => url && validateUrl(url)}
                  className={`h-12 text-base ${urlError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  disabled={isSubmitting}
                />
                {urlError && (
                  <p className="text-sm text-destructive">{urlError}</p>
                )}
              </div>

              {/* Notes Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes">Notes</Label>
                  <span className="text-xs text-muted-foreground">
                    {notes.length}/{MAX_NOTES_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="notes"
                  placeholder="Why is this interesting? (optional)"
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={3}
                  className="resize-none text-base"
                  disabled={isSubmitting}
                />
              </div>

              {/* Fast Track Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="fast-track" className="text-base cursor-pointer">
                    Fast Track
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Process immediately for high-priority content
                  </p>
                </div>
                <Switch
                  id="fast-track"
                  checked={fastTrack}
                  onCheckedChange={setFastTrack}
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  'Capture'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}
