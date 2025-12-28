import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_MODEL = 'gemini-3-flash-preview';
const BATCH_SIZE = 10;

interface KnowledgeItem {
  id: string;
  title: string;
  url: string | null;
  content: string | null;
  summary: string | null;
  user_id: string;
}

interface ProcessedContent {
  summary: string;
  key_insights: string[];
  dain_context: string;
  quotables: string[];
  content_type: string;
  industries: string[];
  technologies: string[];
  service_lines: string[];
}

// Valid content_type values from DB constraint
const VALID_CONTENT_TYPES = [
  'Research Report', 'Industry Analysis', 'Thought Piece', 'News', 
  'Case Study', 'How-To / Guide', 'Tool/Product', 'Field Guide', 'Video'
];

const CONTENT_EXTRACTION_PROMPT = `You are an expert content analyst for DAIN Studios, a data & AI consultancy. Analyze the provided content and extract structured information.

Return a JSON object with these fields:
{
  "summary": "A 2-3 sentence executive summary of the content (max 200 words)",
  "key_insights": ["Array of 3-5 key insights or takeaways from the content"],
  "dain_context": "How this content is relevant to DAIN Studios' work in data strategy, AI implementation, analytics, or digital transformation (1-2 sentences)",
  "quotables": ["Array of 2-3 notable quotes or statistics from the content that could be cited"],
  "content_type": "MUST be exactly one of: Research Report, Industry Analysis, Thought Piece, News, Case Study, How-To / Guide, Tool/Product, Field Guide, Video",
  "industries": ["Array of relevant industries mentioned or applicable, e.g., Healthcare, Finance, Retail, Manufacturing"],
  "technologies": ["Array of technologies mentioned, e.g., Machine Learning, GenAI, Data Analytics, Cloud"],
  "service_lines": ["Array of DAIN service lines this relates to: Data Strategy, AI Implementation, Analytics, Digital Transformation, Data Governance"]
}

Be concise and specific. Focus on business and technology insights relevant to a data & AI consultancy.`;

async function extractContentWithAI(item: KnowledgeItem, googleApiKey: string): Promise<ProcessedContent> {
  const contentToAnalyze = item.content || item.summary || item.title;
  
  const prompt = `Analyze this content:

Title: ${item.title}
URL: ${item.url || 'N/A'}

Content:
${contentToAnalyze?.substring(0, 15000) || 'No content available'}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${CONTENT_EXTRACTION_PROMPT}\n\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No content in Gemini response');
    }

    const parsed = JSON.parse(text);
    
    // Validate content_type against allowed values
    const contentType = VALID_CONTENT_TYPES.includes(parsed.content_type) 
      ? parsed.content_type 
      : 'Thought Piece';

    return {
      summary: parsed.summary || `Analysis of: ${item.title}`,
      key_insights: Array.isArray(parsed.key_insights) ? parsed.key_insights.slice(0, 5) : [],
      dain_context: parsed.dain_context || 'Relevant to data and AI consulting.',
      quotables: Array.isArray(parsed.quotables) ? parsed.quotables.slice(0, 3) : [],
      content_type: contentType,
      industries: Array.isArray(parsed.industries) ? parsed.industries : [],
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
      service_lines: Array.isArray(parsed.service_lines) ? parsed.service_lines : [],
    };
  } catch (error) {
    console.error(`AI extraction failed for ${item.id}:`, error);
    // Return minimal fallback with valid content_type
    return {
      summary: item.summary || `Content from: ${item.title}`,
      key_insights: [],
      dain_context: 'Pending detailed analysis.',
      quotables: [],
      content_type: 'Thought Piece',  // Valid fallback
      industries: [],
      technologies: [],
      service_lines: [],
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`\n=== PROCESS-CONTENT START ===`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending items
    const { data: pendingItems, error: fetchError } = await supabase
      .from('knowledge_items')
      .select('id, title, url, content, summary, user_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      throw new Error(`Failed to fetch pending items: ${fetchError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log('No pending items to process');
      return new Response(
        JSON.stringify({ message: 'No pending items', processed: 0, failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingItems.length} pending items to process`);

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each item
    for (const item of pendingItems) {
      const itemStart = Date.now();
      console.log(`\nProcessing: ${item.id} - "${item.title?.substring(0, 50)}..."`);

      try {
        // Extract content with AI
        const processed = await extractContentWithAI(item, googleApiKey);

        // Update the item
        const { error: updateError } = await supabase
          .from('knowledge_items')
          .update({
            summary: processed.summary,
            key_insights: processed.key_insights,
            dain_context: processed.dain_context,
            quotables: processed.quotables,
            content_type: processed.content_type,
            industries: processed.industries,
            technologies: processed.technologies,
            service_lines: processed.service_lines,
            status: 'pool',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        succeeded++;
        console.log(`✓ Processed ${item.id} in ${Date.now() - itemStart}ms`);
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${item.id}: ${errorMsg}`);
        console.error(`✗ Failed ${item.id}: ${errorMsg}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\nProcessing complete: ${succeeded} succeeded, ${failed} failed`);
    console.log(`Total duration: ${duration}ms`);
    console.log(`=== PROCESS-CONTENT END ===\n`);

    return new Response(
      JSON.stringify({
        message: 'Processing complete',
        processed: succeeded,
        failed,
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Process-content error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
