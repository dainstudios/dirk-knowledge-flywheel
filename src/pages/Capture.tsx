import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Link as LinkIcon, Check, FileText, FolderOpen, Clock, ExternalLink } from 'lucide-react';
import { z } from 'zod';
import { Header, MobileNav } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const GOOGLE_DRIVE_INBOX_URL = 'https://drive.google.com/drive/folders/1_smc1iuRP7yNygdE3B7EnUYGbe30JFCM';

const urlSchema = z.string().trim().url({ message: 'Please enter a valid URL' });

const MAX_NOTES_LENGTH = 500;

export default function Capture() {
  const { user, loading } = useAuth();
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
    
    // Use user from useAuth() - ProtectedRoute already ensures we're logged in
    if (!user) {
      toast({
        title: 'Error',
        description: 'Unable to identify user. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('knowledge_items').insert({
        url: url.trim(),
        title: url.trim(),
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
        description: (
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Added to pool for processing
          </span>
        ),
        action: (
          <Link 
            to="/dashboard" 
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Dashboard
          </Link>
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

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <CardContent className="pt-6">
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="w-full flex mb-6">
                <TabsTrigger value="url" className="flex-1 flex items-center justify-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex-1 flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" />
                  PDF Upload
                </TabsTrigger>
              </TabsList>

              {/* URL Tab */}
              <TabsContent value="url" className="mt-0">
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
              </TabsContent>

              {/* PDF Tab */}
              <TabsContent value="pdf" className="mt-0">
                <div className="space-y-6">
                  {/* Explanation */}
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <FileText className="h-5 w-5 mt-0.5 shrink-0" />
                    <p className="text-sm">
                      PDFs are processed via Google Drive for better organization and team access.
                    </p>
                  </div>

                  {/* Drop Zone Visual */}
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/30">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          Drop files in Google Drive Inbox
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Click below to open the shared folder
                        </p>
                      </div>

                      {/* Google Drive Button */}
                      <Button
                        size="lg"
                        className="h-12 px-6 text-base bg-primary hover:bg-primary/90"
                        onClick={() => window.open(GOOGLE_DRIVE_INBOX_URL, '_blank')}
                      >
                        <ExternalLink className="h-5 w-5 mr-2" />
                        Open Google Drive Inbox
                      </Button>
                    </div>
                  </div>

                  {/* Helper Text */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                    <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Files dropped here are automatically analyzed and added to your knowledge base within <span className="font-medium text-foreground">5 minutes</span>.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}
