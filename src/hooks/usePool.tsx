import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PoolItem {
  id: string;
  title: string;
  url: string | null;
  google_drive_url: string | null;
  summary: string | null;
  user_notes: string | null;
  dain_context: string | null;
  dain_relevance: string | null;
  content_type: string | null;
  industries: string[] | null;
  technologies: string[] | null;
  service_lines: string[] | null;
  business_functions: string[] | null;
  quotables: string[] | null;
  source_credibility: string | null;
  actionability: string | null;
  timeliness: string | null;
  author: string | null;
  author_organization: string | null;
  methodology: string | null;
  created_at: string;
}

export type PoolAction = 'trash' | 'post2team' | 'post2linkedin' | 'post2newsletter' | 'knowledge';

export function usePool() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pool-items'],
    queryFn: async (): Promise<PoolItem[]> => {
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('id, title, url, google_drive_url, summary, user_notes, dain_context, dain_relevance, content_type, industries, technologies, service_lines, business_functions, quotables, source_credibility, actionability, timeliness, author, author_organization, methodology, created_at')
        .eq('status', 'pool')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const curateItem = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PoolAction }) => {
      const { error } = await supabase
        .from('knowledge_items')
        .update({
          status,
          curated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['pool-items'] });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<PoolItem[]>(['pool-items']);

      // Optimistically remove the item
      queryClient.setQueryData<PoolItem[]>(['pool-items'], (old) =>
        old?.filter((item) => item.id !== id) ?? []
      );

      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['pool-items'], context.previousItems);
      }
    },
    onSettled: () => {
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
    },
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    curateItem: curateItem.mutate,
    isCurating: curateItem.isPending,
  };
}
