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

export interface ProcessActionPayload {
  item_id: string;
  actions: {
    trash: boolean;
    team: boolean;
    linkedin: boolean;
    newsletter: boolean;
    keep: boolean;
  };
}

export interface ProcessActionResponse {
  success: boolean;
  item_id: string;
  status: string;
  actions_taken: string[];
  message: string;
}

export interface PostToSlackResponse {
  success: boolean;
  item_id: string;
}

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

  // Legacy single action mutation (kept for backwards compatibility)
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
      await queryClient.cancelQueries({ queryKey: ['pool-items'] });
      const previousItems = queryClient.getQueryData<PoolItem[]>(['pool-items']);
      queryClient.setQueryData<PoolItem[]>(['pool-items'], (old) =>
        old?.filter((item) => item.id !== id) ?? []
      );
      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['pool-items'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
    },
  });

  // New multi-select action mutation
  const processAction = useMutation({
    mutationFn: async (payload: ProcessActionPayload): Promise<ProcessActionResponse> => {
      const { data, error } = await supabase.functions.invoke('process-action', {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as ProcessActionResponse;
    },
    onMutate: async ({ item_id }) => {
      await queryClient.cancelQueries({ queryKey: ['pool-items'] });
      const previousItems = queryClient.getQueryData<PoolItem[]>(['pool-items']);
      queryClient.setQueryData<PoolItem[]>(['pool-items'], (old) =>
        old?.filter((item) => item.id !== item_id) ?? []
      );
      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['pool-items'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
    },
  });

  // Post to Slack mutation
  const postToSlack = useMutation({
    mutationFn: async (itemId: string): Promise<PostToSlackResponse> => {
      const { data, error } = await supabase.functions.invoke('post-to-slack', {
        body: { item_id: itemId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as PostToSlackResponse;
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['pool-items'] });
      const previousItems = queryClient.getQueryData<PoolItem[]>(['pool-items']);
      queryClient.setQueryData<PoolItem[]>(['pool-items'], (old) =>
        old?.filter((item) => item.id !== itemId) ?? []
      );
      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['pool-items'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
    },
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    curateItem: curateItem.mutate,
    isCurating: curateItem.isPending,
    processAction: processAction.mutate,
    isProcessing: processAction.isPending,
    postToSlack: postToSlack.mutate,
    isPostingToSlack: postToSlack.isPending,
  };
}
