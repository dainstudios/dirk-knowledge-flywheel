import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =============================================================================
// POOL HOOK - KNOWLEDGE FLYWHEEL v3.0
// =============================================================================
// 
// All Slack posting goes through processAction with actions.team = true.
// The deprecated postToSlack mutation has been removed.
// =============================================================================

export interface PoolItem {
  id: string;
  title: string;
  url: string | null;
  google_drive_url: string | null;
  summary: string | null;
  user_notes: string | null;
  curator_notes: string | null;
  dain_context: string | null;
  dain_relevance: string | null;
  content_type: string | null;
  industries: string[] | null;
  technologies: string[] | null;
  service_lines: string[] | null;
  business_functions: string[] | null;
  quotables: string[] | null;
  highlighted_quotes: number[] | null;
  highlighted_findings: number[] | null;
  source_credibility: string | null;
  actionability: string | null;
  timeliness: string | null;
  author: string | null;
  author_organization: string | null;
  methodology: string | null;
  infographic_url: string | null;
  created_at: string;
}

export interface PoolItemUpdate {
  title?: string;
  curator_notes?: string;
  highlighted_quotes?: number[];
  highlighted_findings?: number[];
}

export type PoolAction = 'trash' | 'post2team' | 'post2linkedin' | 'post2newsletter' | 'knowledge';

export type PostOption = 
  | 'summary_only'
  | 'summary_quick'
  | 'summary_detailed'
  | 'infographic_quick'
  | 'infographic_detailed';

export interface ProcessActionPayload {
  item_id: string;
  actions: {
    trash: boolean;
    team: boolean;
    linkedin: boolean;
    newsletter: boolean;
    keep: boolean;
  };
  post_option?: PostOption;
}

export interface ProcessActionResponse {
  success: boolean;
  item_id: string;
  title?: string;
  results?: Array<{ action: string; success: boolean; error?: string }>;
  final_status?: string;
  summary?: string;
  error?: string;
}

export function usePool() {
  const queryClient = useQueryClient();

  // Fetch pool items
  const query = useQuery({
    queryKey: ['pool-items'],
    queryFn: async (): Promise<PoolItem[]> => {
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('id, title, url, google_drive_url, summary, user_notes, curator_notes, dain_context, dain_relevance, content_type, industries, technologies, service_lines, business_functions, quotables, highlighted_quotes, highlighted_findings, source_credibility, actionability, timeliness, author, author_organization, methodology, infographic_url, created_at')
        .eq('status', 'pool')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Update pool item (for inline editing)
  const updatePoolItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PoolItemUpdate }) => {
      const { error } = await supabase
        .from('knowledge_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['pool-items'] });
      const previousItems = queryClient.getQueryData<PoolItem[]>(['pool-items']);
      queryClient.setQueryData<PoolItem[]>(['pool-items'], (old) =>
        old?.map((item) => (item.id === id ? { ...item, ...updates } : item)) ?? []
      );
      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['pool-items'], context.previousItems);
      }
    },
  });

  // Process action mutation - canonical path for all actions including Slack
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

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    updatePoolItem: updatePoolItem.mutate,
    isUpdating: updatePoolItem.isPending,
    processAction: processAction.mutate,
    isProcessing: processAction.isPending,
  };
}
