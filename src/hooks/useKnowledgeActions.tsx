import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KnowledgeItem } from './useKnowledgeBase';
import { toast } from 'sonner';

export interface KnowledgeItemUpdate {
  title?: string;
  curator_notes?: string;
  highlighted_quotes?: number[];
}

export function useKnowledgeActions() {
  const queryClient = useQueryClient();

  const updateKnowledgeItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: KnowledgeItemUpdate }) => {
      const { data, error } = await supabase
        .from('knowledge_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['knowledge-items'] });
      await queryClient.cancelQueries({ queryKey: ['knowledge-item', id] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<KnowledgeItem[]>(['knowledge-items']);

      // Optimistically update the cache
      if (previousItems) {
        queryClient.setQueryData<KnowledgeItem[]>(['knowledge-items'], (old) =>
          old?.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          )
        );
      }

      return { previousItems };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['knowledge-items'], context.previousItems);
      }
      toast.error('Failed to update item');
      console.error('Update error:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
    },
  });

  const processAction = useMutation({
    mutationFn: async ({ 
      itemId, 
      action, 
      postOption 
    }: { 
      itemId: string; 
      action: 'post2team' | 'post2linkedin' | 'post2newsletter'; 
      postOption?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('process-action', {
        body: { itemId, action, postOption },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const actionLabels = {
        post2team: 'Shared to Team',
        post2linkedin: 'Queued for LinkedIn',
        post2newsletter: 'Queued for Newsletter',
      };
      toast.success(actionLabels[variables.action]);
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-item', variables.itemId] });
    },
    onError: (err) => {
      toast.error('Action failed');
      console.error('Action error:', err);
    },
  });

  return {
    updateKnowledgeItem,
    processAction,
    isUpdating: updateKnowledgeItem.isPending,
    isProcessing: processAction.isPending,
  };
}
