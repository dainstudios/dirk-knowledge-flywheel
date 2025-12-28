import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Link as LinkIcon, FileText, FolderOpen, Clock, ExternalLink, Video, CheckCircle2, XCircle } from 'lucide-react';
import { z } from 'zod';
import { Header, MobileNav } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const GOOGLE_DRIVE_INBOX_URL = 'https://drive.google.com/drive/folders/1_smc1iuRP7yNygdE3B7EnUYGbe30JFCM';
const YOUTUBE_WEBHOOK_URL = 'https://n8n.dainservices.com/webhook/youtube-capture';

const urlSchema = z.string().trim().url({ message: 'Please enter a valid URL' });

const MAX_NOTES_LENGTH = 500;

// Helper function to detect YouTube URLs
function isYouTubeUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed/.test(url);
}

export default function Capture() {
  const { user, loading } = useAuth();
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [fastTrack, setFastTrack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    setIsYouTube(isYouTubeUrl(value));
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
      setFeedback({ type: 'error', message: 'Unable to identify user. Please refresh the page.' });
      return;
    }

    setFeedback(null);

    setIsSubmitting(true);

    try {
      const trimmedUrl = url.trim();
      const trimmedNotes = notes.trim() || null;

      if (isYouTubeUrl(trimmedUrl)) {
        // YouTube URL - send to n8n webhook
        const response = await fetch(YOUTUBE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: trimmedUrl,
            source: 'web_ui',
            notes: trimmedNotes,
            fast_track: fastTrack,
            user_id: user.id,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (errorText.includes('duplicate') || errorText.includes('already')) {
            setFeedback({ type: 'error', message: "You've already captured this video." });
            return;
          }
          throw new Error(`Webhook error: ${response.status}`);
        }

        setFeedback({ type: 'success', message: '🎬 YouTube video queued for processing' });
      } else {
        // Regular URL - use existing Supabase flow
        const { error } = await supabase.from('knowledge_items').insert({
          url: trimmedUrl,
          title: trimmedUrl,
          user_notes: trimmedNotes,
          fast_track: fastTrack,
          status: 'pending',
          capture_source: 'web_ui',
          user_id: user.id,
        });

        if (error) {
          if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
            setFeedback({ type: 'error', message: "You've already captured this article." });
          } else {
            throw error;
          }
          return;
        }

        setFeedback({ type: 'success', message: '✓ Added to pool for processing' });
      }

      // Clear form
      setUrl('');
      setNotes('');
      setFastTrack(false);
      setIsYouTube(false);
      urlInputRef.current?.focus();

    } catch (error) {
      console.error('Capture error:', error);
      setFeedback({ type: 'error', message: 'Something went wrong. Please try again.' });
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
                      placeholder="Paste URL (articles or YouTube)..."
                      value={url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      onBlur={() => url && validateUrl(url)}
                      className={`h-12 text-base ${urlError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      disabled={isSubmitting}
                    />
                    {urlError && (
                      <p className="text-sm text-destructive">{urlError}</p>
                    )}
                    {isYouTube && !urlError && (
                      <p className="text-sm text-primary flex items-center gap-1.5">
                        <Video className="h-4 w-4" />
                        YouTube video detected
                      </p>
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

                  {/* Inline Feedback Message */}
                  {feedback && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                        feedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-destructive/10 text-destructive border border-destructive/20'
                      }`}
                    >
                      {feedback.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>{feedback.message}</span>
                    </div>
                  )}
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
