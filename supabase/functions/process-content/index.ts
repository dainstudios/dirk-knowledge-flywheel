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
  google_drive_url: string | null;
  google_drive_id: string | null;
  content: string | null;
  summary: string | null;
  user_id: string;
  content_type: string | null;
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

// ============= CONTENT FETCHING FUNCTIONS =============

/**
 * Fetch content from a regular URL using Jina Reader
 */
async function fetchUrlContent(url: string): Promise<string | null> {
  console.log(`Fetching URL content via Jina Reader: ${url}`);
  
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
      },
    });

    if (!response.ok) {
      console.error(`Jina Reader error for ${url}: ${response.status}`);
      return null;
    }

    const content = await response.text();
    
    if (!content || content.length < 100) {
      console.warn(`Jina Reader returned minimal content for ${url}`);
      return null;
    }

    console.log(`Successfully fetched ${content.length} chars from ${url}`);
    return content;
  } catch (error) {
    console.error(`Failed to fetch URL content: ${error}`);
    return null;
  }
}

/**
 * Extract file ID from Google Drive URL
 */
function extractGoogleDriveFileId(driveUrl: string): string | null {
  // Patterns for Google Drive URLs:
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://docs.google.com/document/d/FILE_ID/edit
  
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = driveUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch PDF content from Google Drive and extract text using Gemini Vision
 */
async function fetchGoogleDrivePdfContent(
  driveUrl: string,
  fileId: string | null,
  googleApiKey: string
): Promise<string | null> {
  console.log(`Fetching Google Drive PDF content: ${driveUrl}`);
  
  const extractedFileId = fileId || extractGoogleDriveFileId(driveUrl);
  
  if (!extractedFileId) {
    console.error(`Could not extract file ID from: ${driveUrl}`);
    return null;
  }

  try {
    // Try Jina Reader first - it supports Google Drive URLs
    const jinaUrl = `https://r.jina.ai/${driveUrl}`;
    const jinaResponse = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
      },
    });

    if (jinaResponse.ok) {
      const content = await jinaResponse.text();
      if (content && content.length > 200) {
        console.log(`Jina Reader successfully extracted ${content.length} chars from Google Drive`);
        return content;
      }
    }

    // Fallback: Use direct Google Drive export URL with Gemini vision
    console.log(`Jina failed, trying Gemini vision for PDF analysis...`);
    
    // Get direct download URL for PDF
    const directUrl = `https://drive.google.com/uc?export=download&id=${extractedFileId}`;
    
    // Use Gemini to analyze the PDF via URL
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Please extract and summarize all the text content from this PDF document. Provide the full text extraction including:
- Main headings and sections
- Key statistics and data points
- Important quotes and findings
- Author information if present
- Any methodology mentioned

Document URL: ${directUrl}
Google Drive URL: ${driveUrl}

Extract as much text content as possible for analysis.`
              }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8000,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`Gemini PDF extraction failed: ${geminiResponse.status} - ${errorText}`);
      return null;
    }

    const geminiData = await geminiResponse.json();
    const extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (extractedText && extractedText.length > 100) {
      console.log(`Gemini extracted ${extractedText.length} chars from PDF`);
      return extractedText;
    }

    console.warn(`Could not extract meaningful content from Google Drive PDF`);
    return null;
  } catch (error) {
    console.error(`Failed to fetch Google Drive PDF content: ${error}`);
    return null;
  }
}

/**
 * Determine content source and fetch content if needed
 */
async function ensureContentAvailable(
  item: KnowledgeItem,
  googleApiKey: string
): Promise<{ content: string | null; contentSource: string }> {
  // Skip YouTube videos - they're handled separately
  if (item.content_type === 'Video' || item.url?.includes('youtube.com') || item.url?.includes('youtu.be')) {
    console.log(`Skipping content fetch for video: ${item.id}`);
    return { content: item.content, contentSource: 'video' };
  }

  // If content already exists and is substantial, use it
  if (item.content && item.content.length > 500) {
    console.log(`Using existing content (${item.content.length} chars) for: ${item.id}`);
    return { content: item.content, contentSource: 'existing' };
  }

  // Try Google Drive URL first (for PDFs)
  if (item.google_drive_url) {
    console.log(`Attempting Google Drive content fetch for: ${item.id}`);
    const driveContent = await fetchGoogleDrivePdfContent(
      item.google_drive_url,
      item.google_drive_id,
      googleApiKey
    );
    
    if (driveContent && driveContent.length > 200) {
      return { content: driveContent, contentSource: 'google_drive' };
    }
  }

  // Try regular URL via Jina Reader
  if (item.url) {
    console.log(`Attempting URL content fetch for: ${item.id}`);
    const urlContent = await fetchUrlContent(item.url);
    
    if (urlContent && urlContent.length > 200) {
      return { content: urlContent, contentSource: 'url' };
    }
  }

  // Fallback to whatever we have
  console.warn(`Could not fetch content for ${item.id}, using fallback`);
  return { content: item.content || item.summary || item.title, contentSource: 'fallback' };
}

// ============= AI EXTRACTION =============

async function extractContentWithAI(
  item: KnowledgeItem, 
  content: string,
  googleApiKey: string
): Promise<ProcessedContent> {
  // Clean content: remove base64 data, very long URLs, and truncate
  const cleanedContent = content
    .replace(/data:[^;]+;base64,[A-Za-z0-9+/=]+/g, '[base64 data removed]')
    .replace(/https?:\/\/[^\s]{200,}/g, '[long URL removed]')
    .substring(0, 15000); // Increased limit for richer analysis
  
  const prompt = `Analyze this content:

Title: ${item.title}
URL: ${item.url || item.google_drive_url || 'N/A'}

Content:
${cleanedContent || 'No content available'}`;
  
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
            maxOutputTokens: 4000,
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
    return {
      summary: `Content from: ${item.title}`,
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

// ============= MAIN HANDLER =============

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

    // Fetch pending items - NOW including google_drive_url and google_drive_id
    const { data: pendingItems, error: fetchError } = await supabase
      .from('knowledge_items')
      .select('id, title, url, google_drive_url, google_drive_id, content, summary, user_id, content_type')
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
    const contentSources: Record<string, number> = {};

    // Process each item
    for (const item of pendingItems) {
      const itemStart = Date.now();
      console.log(`\nProcessing: ${item.id} - "${item.title?.substring(0, 50)}..."`);
      console.log(`  URL: ${item.url || 'none'}`);
      console.log(`  Google Drive: ${item.google_drive_url || 'none'}`);
      console.log(`  Existing content: ${item.content ? `${item.content.length} chars` : 'none'}`);

      try {
        // Step 1: Ensure we have content (fetch if needed)
        const { content, contentSource } = await ensureContentAvailable(item, googleApiKey);
        console.log(`  Content source: ${contentSource} (${content?.length || 0} chars)`);
        
        contentSources[contentSource] = (contentSources[contentSource] || 0) + 1;

        // Step 2: Store fetched content in database if we fetched new content
        if (content && contentSource !== 'existing' && contentSource !== 'fallback') {
          const { error: contentUpdateError } = await supabase
            .from('knowledge_items')
            .update({ content: content.substring(0, 50000) }) // Store up to 50k chars
            .eq('id', item.id);
          
          if (contentUpdateError) {
            console.warn(`  Failed to store fetched content: ${contentUpdateError.message}`);
          } else {
            console.log(`  Stored fetched content in database`);
          }
        }

        // Step 3: Extract structured data with AI
        const processed = await extractContentWithAI(item, content || item.title, googleApiKey);

        // Step 4: Update the item with all fields
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
            methodology: processed.methodology,
            dain_relevance: processed.dain_relevance,
            source_credibility: processed.source_credibility,
            actionability: processed.actionability,
            timeliness: processed.timeliness,
            business_functions: processed.business_functions,
            author: processed.author,
            author_organization: processed.author_organization,
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
    console.log(`Content sources: ${JSON.stringify(contentSources)}`);
    console.log(`Total duration: ${duration}ms`);
    console.log(`=== PROCESS-CONTENT END ===\n`);

    return new Response(
      JSON.stringify({
        message: 'Processing complete',
        processed: succeeded,
        failed,
        content_sources: contentSources,
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
