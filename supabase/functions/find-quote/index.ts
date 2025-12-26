import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context = 'any', count = 5 } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Enhance query with context if provided
    let searchQuery = query;
    if (context && context !== 'any') {
      const contextHints: Record<string, string> = {
        'board': 'executive leadership C-suite strategic business impact',
        'linkedin': 'thought leadership professional insight industry trend',
        'pitch': 'client value proposition solution benefit ROI',
        'workshop': 'engaging interactive learning collaborative insight',
      };
      searchQuery = `${query} ${contextHints[context] || ''}`;
    }

    console.log('Finding quotes for query:', searchQuery.substring(0, 100));

    // 1. Generate embedding for the query
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: searchQuery }] },
        }),
      }
    );

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('Embedding API error:', error);
      throw new Error('Failed to generate embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.embedding?.values;

    if (!embedding) {
      throw new Error('No embedding returned');
    }

    // 2. Search quotes table first using match_quotes RPC
    const { data: quotes, error: quotesError } = await supabase.rpc('match_quotes', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.4,
      match_count: count,
    });

    if (quotesError) {
      console.error('Quotes search error:', quotesError);
    }

    console.log(`Found ${quotes?.length || 0} matching quotes from quotes table`);

    // 3. Also search knowledge_items for quotables
    const { data: knowledgeItems, error: knowledgeError } = await supabase.rpc('match_knowledge', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.3,
      match_count: 10,
    });

    if (knowledgeError) {
      console.error('Knowledge search error:', knowledgeError);
    }

    console.log(`Found ${knowledgeItems?.length || 0} matching knowledge items`);

    // 4. Extract quotables from knowledge items
    const quotablesFromKnowledge: any[] = [];
    
    if (knowledgeItems && knowledgeItems.length > 0) {
      for (const item of knowledgeItems) {
        if (item.quotables && item.quotables.length > 0) {
          for (const quote of item.quotables) {
            quotablesFromKnowledge.push({
              id: `${item.id}-quote-${quotablesFromKnowledge.length}`,
              quote_text: quote,
              source_title: item.title,
              source_author: null,
              source_url: item.url || item.google_drive_url,
              topic_tags: item.industries || [],
              use_cases: [],
              tone: null,
              similarity: item.similarity,
            });
          }
        }
      }
    }

    // 5. Combine and dedupe results
    const allQuotes = [
      ...(quotes || []).map((q: any) => ({
        ...q,
        from_quotes_table: true,
      })),
      ...quotablesFromKnowledge.map((q: any) => ({
        ...q,
        from_quotes_table: false,
      })),
    ];

    // Sort by similarity and take top N
    allQuotes.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    const topQuotes = allQuotes.slice(0, count);

    console.log(`Returning ${topQuotes.length} quotes`);

    return new Response(
      JSON.stringify({
        quotes: topQuotes.map((q: any) => ({
          id: q.id,
          quote_text: q.quote_text,
          source_title: q.source_title,
          source_author: q.source_author,
          source_url: q.source_url,
          topic_tags: q.topic_tags || [],
          use_cases: q.use_cases || [],
          tone: q.tone,
          similarity: q.similarity,
        })),
        stats: {
          from_quotes_table: (quotes || []).length,
          from_quotables: quotablesFromKnowledge.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-quote function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
