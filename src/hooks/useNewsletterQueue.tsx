import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface NewsletterQueueItem {
  id: string;
  title: string;
  author: string | null;
  author_organization: string | null;
  content_type: string | null;
  curator_notes: string | null;
  queued_for_newsletter_at: string | null;
  url: string | null;
}

export function useNewsletterQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['newsletter-queue', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('knowledge_items')
        .select('id, title, author, author_organization, content_type, curator_notes, queued_for_newsletter_at, url')
        .eq('user_id', user.id)
        .eq('queued_for_newsletter', true)
        .order('queued_for_newsletter_at', { ascending: false });

      if (error) throw error;
      return data as NewsletterQueueItem[];
    },
    enabled: !!user?.id,
  });

  const removeFromQueue = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('knowledge_items')
        .update({
          queued_for_newsletter: false,
          queued_for_newsletter_at: null,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-queue'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-queue-count'] });
      toast({
        description: 'Removed from newsletter queue',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        description: `Failed to remove: ${error.message}`,
      });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes: string }) => {
      const { error } = await supabase
        .from('knowledge_items')
        .update({ curator_notes: notes })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-queue'] });
      toast({
        description: 'Note updated',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        description: `Failed to update note: ${error.message}`,
      });
    },
  });

  return {
    items,
    isLoading,
    error,
    removeFromQueue,
    updateNotes,
  };
}

export function useNewsletterQueueCount() {
  const { user } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ['newsletter-queue-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('knowledge_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('queued_for_newsletter', true);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  return count;
}
