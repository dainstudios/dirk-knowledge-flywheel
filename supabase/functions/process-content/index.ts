import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use gemini-2.5-flash for high-quality content analysis
const GEMINI_MODEL = 'gemini-2.5-flash';
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
  // Restored fields for rich analysis
  methodology: string | null;
  dain_relevance: string;
  source_credibility: string;
  actionability: string;
  timeliness: string;
  business_functions: string[];
  author: string | null;
  author_organization: string | null;
}

// Valid content_type values from DB constraint
const VALID_CONTENT_TYPES = [
  'Research Report', 'Industry Analysis', 'Thought Piece', 'News', 
  'Case Study', 'How-To / Guide', 'Tool/Product', 'Field Guide', 'Video'
];

const CONTENT_EXTRACTION_PROMPT = `You are an expert content analyst for DAIN Studios, a data & AI consultancy. Analyze the provided content and extract comprehensive structured information.

Return a JSON object with these fields:
{
  "summary": "A 2-3 sentence executive summary of the content (max 200 words). Be specific about the main findings, not generic.",
  "key_insights": ["Array of 3-5 key insights or takeaways from the content. Each should be a complete, actionable insight."],
  "dain_context": "How this content is relevant to DAIN Studios' work in data strategy, AI implementation, analytics, or digital transformation (2-3 sentences with specific applications)",
  "quotables": ["Array of 2-4 notable quotes or statistics from the content that could be cited. Include specific numbers, percentages, or impactful statements."],
  "content_type": "MUST be exactly one of: Research Report, Industry Analysis, Thought Piece, News, Case Study, How-To / Guide, Tool/Product, Field Guide, Video",
  "industries": ["Array of relevant industries mentioned or applicable, e.g., Healthcare, Finance, Retail, Manufacturing, Energy, Technology"],
  "technologies": ["Array of technologies mentioned, e.g., Machine Learning, GenAI, LLM, Data Analytics, Cloud, IoT, Computer Vision"],
  "service_lines": ["Array of DAIN service lines this relates to: Data Strategy, AI Implementation, Analytics, Digital Transformation, Data Governance"],
  "methodology": "Research approach and methods used in the content (e.g., 'Survey of 500 executives', 'Case study analysis', 'Literature review'). Return null if not applicable or not mentioned.",
  "dain_relevance": "Rate overall relevance to DAIN's work. MUST be exactly one of: High, Medium, Low",
  "source_credibility": "Rate source credibility. MUST be exactly one of: Tier 1 (academic/major research institution/top consulting firm), Tier 2 (industry publication/established company), Tier 3 (blog/opinion piece/unknown source)",
  "actionability": "How actionable is this content? MUST be exactly one of: Direct Use (can apply immediately), Strategic Context (informs strategy), Reference Only (background knowledge)",
  "timeliness": "Content freshness. MUST be exactly one of: Current (recent/cutting-edge), Evergreen (timeless principles), Dated (older but potentially relevant)",
  "business_functions": ["Array of business departments this applies to, e.g., R&D, IT, Marketing, Operations, Finance, HR, Sales, Executive Leadership"],
  "author": "Primary author name if mentioned. Return null if not found.",
  "author_organization": "Author's organization/institution/company if mentioned. Return null if not found."
}

Be thorough and specific. Extract real quotes and statistics when available. Focus on business and technology insights relevant to a data & AI consultancy.`;

async function extractContentWithAI(item: KnowledgeItem, googleApiKey: string): Promise<ProcessedContent> {
  // Clean content: remove base64 data, very long URLs, and truncate
  const rawContent = item.content || item.summary || item.title || '';
  const cleanedContent = rawContent
    .replace(/data:[^;]+;base64,[A-Za-z0-9+/=]+/g, '[base64 data removed]')
    .replace(/https?:\/\/[^\s]{200,}/g, '[long URL removed]')
    .substring(0, 12000); // Increased to capture more content for richer analysis
  
  const prompt = `Analyze this content:

Title: ${item.title}
URL: ${item.url || 'N/A'}

Content:
${cleanedContent || 'No content available'}`;
  
  // Estimate token count and warn if still large
  const estimatedTokens = prompt.length / 4;
  if (estimatedTokens > 50000) {
    console.warn(`Large content detected (~${Math.round(estimatedTokens)} tokens), may be truncated by API`);
  }

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
            maxOutputTokens: 4000, // Increased for richer extraction
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

    // Validate enum fields
    const validRelevance = ['High', 'Medium', 'Low'];
    const validCredibility = ['Tier 1', 'Tier 2', 'Tier 3'];
    const validActionability = ['Direct Use', 'Strategic Context', 'Reference Only'];
    const validTimeliness = ['Current', 'Evergreen', 'Dated'];

    return {
      summary: parsed.summary || `Analysis of: ${item.title}`,
      key_insights: Array.isArray(parsed.key_insights) ? parsed.key_insights.slice(0, 5) : [],
      dain_context: parsed.dain_context || 'Relevant to data and AI consulting.',
      quotables: Array.isArray(parsed.quotables) ? parsed.quotables.slice(0, 4) : [],
      content_type: contentType,
      industries: Array.isArray(parsed.industries) ? parsed.industries : [],
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
      service_lines: Array.isArray(parsed.service_lines) ? parsed.service_lines : [],
      // Restored fields with validation
      methodology: parsed.methodology || null,
      dain_relevance: validRelevance.includes(parsed.dain_relevance) ? parsed.dain_relevance : 'Medium',
      source_credibility: validCredibility.includes(parsed.source_credibility) ? parsed.source_credibility : 'Tier 2',
      actionability: validActionability.includes(parsed.actionability) ? parsed.actionability : 'Strategic Context',
      timeliness: validTimeliness.includes(parsed.timeliness) ? parsed.timeliness : 'Current',
      business_functions: Array.isArray(parsed.business_functions) ? parsed.business_functions : [],
      author: parsed.author || null,
      author_organization: parsed.author_organization || null,
    };
  } catch (error) {
    console.error(`AI extraction failed for ${item.id}:`, error);
    // Return minimal fallback with valid values
    return {
      summary: item.summary || `Content from: ${item.title}`,
      key_insights: [],
      dain_context: 'Pending detailed analysis.',
      quotables: [],
      content_type: 'Thought Piece',
      industries: [],
      technologies: [],
      service_lines: [],
      methodology: null,
      dain_relevance: 'Medium',
      source_credibility: 'Tier 2',
      actionability: 'Reference Only',
      timeliness: 'Current',
      business_functions: [],
      author: null,
      author_organization: null,
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

        // Update the item with all fields including restored ones
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
            // Restored fields
            methodology: processed.methodology,
            dain_relevance: processed.dain_relevance,
            source_credibility: processed.source_credibility,
            actionability: processed.actionability,
            timeliness: processed.timeliness,
            business_functions: processed.business_functions,
            author: processed.author,
            author_organization: processed.author_organization,
            // Status and timestamp
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
