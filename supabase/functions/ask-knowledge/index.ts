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
    const { question, mode = 'standard' } = await req.json();

    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
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
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // 1. Generate embedding for the question
    console.log('Generating embedding for question:', question.substring(0, 100));
    
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: question }] },
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

    // 2. Search for relevant knowledge using match_knowledge RPC
    const matchCount = mode === 'deep' ? 30 : 3;
    const matchThreshold = mode === 'deep' ? 0.2 : 0.3;

    console.log(`Searching with mode=${mode}, matchCount=${matchCount}, threshold=${matchThreshold}`);

    const { data: sources, error: searchError } = await supabase.rpc('match_knowledge', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (searchError) {
      console.error('Search error:', searchError);
      throw new Error('Failed to search knowledge base');
    }

    console.log(`Found ${sources?.length || 0} matching sources`);

    // 3. Fetch full content for sources if available
    let sourcesWithContent: any[] = [];
    let withFullContentCount = 0;

    if (sources && sources.length > 0) {
      const sourceIds = sources.map((s: any) => s.id);
      
      const { data: fullSources, error: fetchError } = await supabase
        .from('knowledge_items')
        .select('id, title, summary, dain_context, content, url, google_drive_url, quotables')
        .in('id', sourceIds);

      if (fetchError) {
        console.error('Fetch full sources error:', fetchError);
      }

      // Map sources with similarity scores and full content
      sourcesWithContent = sources.map((s: any) => {
        const fullSource = fullSources?.find((fs: any) => fs.id === s.id);
        const hasFullContent = !!fullSource?.content;
        if (hasFullContent) withFullContentCount++;
        
        return {
          id: s.id,
          title: s.title || fullSource?.title,
          summary: s.summary || fullSource?.summary,
          dain_context: s.dain_context || fullSource?.dain_context,
          content: fullSource?.content,
          url: s.url || fullSource?.url,
          google_drive_url: s.google_drive_url || fullSource?.google_drive_url,
          quotables: s.quotables || fullSource?.quotables,
          similarity: s.similarity,
          has_full_content: hasFullContent,
        };
      });
    }

    // 4. Build context for AI with numbered source mapping
    let contextParts: string[] = [];
    let sourceMapping: string[] = [];
    
    sourcesWithContent.forEach((source, index) => {
      const sourceNum = index + 1;
      sourceMapping.push(`[${sourceNum}] = "${source.title}"`);
      
      let sourceContext = `### [${sourceNum}] ${source.title}\n`;
      sourceContext += `Relevance: ${Math.round(source.similarity * 100)}%\n\n`;
      
      if (source.dain_context) {
        sourceContext += `**DAIN Context:** ${source.dain_context}\n\n`;
      }
      
      if (source.summary) {
        sourceContext += `**Summary:** ${source.summary}\n\n`;
      }
      
      // Include full content for standard mode (top 3) or if it's a high-relevance source in deep mode
      if (source.content && (mode === 'standard' || source.similarity > 0.5)) {
        const truncatedContent = source.content.substring(0, 2000);
        sourceContext += `**Full Content (excerpt):** ${truncatedContent}${source.content.length > 2000 ? '...' : ''}\n\n`;
      }
      
      if (source.quotables && source.quotables.length > 0) {
        sourceContext += `**Key Quotes:**\n`;
        for (const quote of source.quotables.slice(0, 3)) {
          sourceContext += `- "${quote}"\n`;
        }
        sourceContext += '\n';
      }
      
      contextParts.push(sourceContext);
    });

    const context = contextParts.join('\n---\n\n');
    const sourceMappingText = sourceMapping.join('\n');

    // 5. Generate answer using Claude
    console.log('Generating answer with Claude...');

    const systemPrompt = `You are a knowledgeable assistant for DAIN Studios, a consulting firm specializing in AI, data strategy, and digital transformation.

Your task is to answer questions based ONLY on the provided knowledge base context. Follow these rules:
1. Only use information from the provided context - do not make up information
2. If the context doesn't contain relevant information, say so honestly
3. **IMPORTANT: Use numbered citations like [1], [2], [3] when referencing information from sources.** Place the citation immediately after the relevant statement.
4. Be concise but thorough
5. Use bullet points for clarity when listing multiple items
6. If asked about specific topics, synthesize information across multiple sources when relevant
7. Format your response with proper markdown: use **bold** for emphasis, bullet points for lists

Source Number Mapping:
${sourceMappingText}

The user is asking about content in their curated knowledge base for professional consulting work.`;

    const userPrompt = `Based on the following knowledge base context, please answer this question:

**Question:** ${question}

---

**Knowledge Base Context:**

${context || 'No relevant sources found in the knowledge base.'}

---

Please provide a helpful, accurate answer based on the context above. Remember to cite sources using [1], [2], etc.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      console.error('Claude API error:', error);
      throw new Error('Failed to generate answer');
    }

    const claudeData = await claudeResponse.json();
    const answer = claudeData.content?.[0]?.text || 'Unable to generate an answer.';

    console.log('Answer generated successfully');

    // 6. Return response
    return new Response(
      JSON.stringify({
        answer,
        sources: sourcesWithContent.map(s => ({
          id: s.id,
          title: s.title,
          url: s.url || s.google_drive_url,
          similarity: s.similarity,
          has_full_content: s.has_full_content,
        })),
        stats: {
          total_searched: sourcesWithContent.length,
          with_full_content: withFullContentCount,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ask-knowledge function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
