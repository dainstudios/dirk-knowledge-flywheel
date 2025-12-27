import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeItem {
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
  created_at: string;
  // Infographic fields
  infographic_url: string | null;
  infographic_generated_at: string | null;
  infographic_type: string | null;
}

export interface KnowledgeFilters {
  industries: string[];
  technologies: string[];
  serviceLines: string[];
  contentTypes: string[];
}

export function useKnowledgeBase() {
  const query = useQuery({
    queryKey: ['knowledge-items'],
    queryFn: async (): Promise<KnowledgeItem[]> => {
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('id, title, url, google_drive_url, summary, user_notes, dain_context, dain_relevance, content_type, industries, technologies, service_lines, business_functions, quotables, source_credibility, actionability, timeliness, created_at, infographic_url, infographic_generated_at, infographic_type')
        .eq('status', 'knowledge')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Extract unique filter options from the data
  const filterOptions = {
    industries: [...new Set(query.data?.flatMap(item => item.industries || []) || [])].sort(),
    technologies: [...new Set(query.data?.flatMap(item => item.technologies || []) || [])].sort(),
    serviceLines: [...new Set(query.data?.flatMap(item => item.service_lines || []) || [])].sort(),
    contentTypes: [...new Set(query.data?.map(item => item.content_type).filter(Boolean) as string[] || [])].sort(),
  };

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    filterOptions,
  };
}

// Apply filters client-side
export function filterKnowledgeItems(
  items: KnowledgeItem[],
  filters: KnowledgeFilters
): KnowledgeItem[] {
  return items.filter(item => {
    // Check industries filter
    if (filters.industries.length > 0) {
      if (!item.industries?.some(ind => filters.industries.includes(ind))) {
        return false;
      }
    }

    // Check technologies filter
    if (filters.technologies.length > 0) {
      if (!item.technologies?.some(tech => filters.technologies.includes(tech))) {
        return false;
      }
    }

    // Check service lines filter
    if (filters.serviceLines.length > 0) {
      if (!item.service_lines?.some(sl => filters.serviceLines.includes(sl))) {
        return false;
      }
    }

    // Check content types filter
    if (filters.contentTypes.length > 0) {
      if (!item.content_type || !filters.contentTypes.includes(item.content_type)) {
        return false;
      }
    }

    return true;
  });
}
