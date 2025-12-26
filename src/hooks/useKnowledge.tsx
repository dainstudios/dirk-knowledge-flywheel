import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface KnowledgeStats {
  total_items: number;
  pool_count: number;
  pending_count: number;
  knowledge_count: number;
  linkedin_queue: number;
  newsletter_queue: number;
}

export function useKnowledgeStats() {
  return useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: async (): Promise<KnowledgeStats> => {
      const { data, error } = await supabase.rpc('get_knowledge_stats');
      
      if (error) throw error;
      
      // Handle empty result (new user)
      if (!data || data.length === 0) {
        return {
          total_items: 0,
          pool_count: 0,
          pending_count: 0,
          knowledge_count: 0,
          linkedin_queue: 0,
          newsletter_queue: 0,
        };
      }
      
      return data[0];
    },
  });
}
