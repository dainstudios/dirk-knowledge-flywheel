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

const CONTENT_EXTRACTION_PROMPT = `You are an expert content analyst for DAIN Studios, a data & AI consultancy. Analyze the provided content and extract structured information optimized for team sharing.

CRITICAL FORMATTING RULES:
1. summary: ONE punchy sentence (max 50 words) capturing the single most important insight. Be specific with numbers/data, not generic.
2. key_insights: EXACTLY 5 findings, each MUST follow this format: "**[2-3 word label]:** [specific insight with numbers/percentages/metrics]"
3. methodology: Start with author/organization name, then methodology. Example: "Ethan Mollick at Wharton analyzed 1,500 knowledge workers across North America, March-June 2024."

Return a JSON object with these fields:
{
  "summary": "ONE sentence (max 50 words) with the key insight. Include specific numbers/percentages. Example: 'AI coding assistants boost developer productivity by 55% but require 6-week adoption period before benefits materialize.'",
  "key_insights": [
    "**[Label]:** [specific insight with data/metrics]",
    "**[Label]:** [specific finding with percentages]",
    "**[Label]:** [actionable insight with numbers]",
    "**[Label]:** [key takeaway with data]",
    "**[Label]:** [notable finding with metrics]"
  ],
  "dain_context": "How this content is relevant to DAIN Studios' work in data strategy, AI implementation, analytics, or digital transformation (2-3 sentences with specific applications)",
  "quotables": ["Array of 2-4 notable quotes or statistics from the content that could be cited. Include specific numbers, percentages, or impactful statements."],
  "content_type": "MUST be exactly one of: Research Report, Industry Analysis, Thought Piece, News, Case Study, How-To / Guide, Tool/Product, Field Guide, Video",
  "industries": ["Array of relevant industries mentioned or applicable, e.g., Healthcare, Finance, Retail, Manufacturing, Energy, Technology"],
  "technologies": ["Array of technologies mentioned, e.g., Machine Learning, GenAI, LLM, Data Analytics, Cloud, IoT, Computer Vision"],
  "service_lines": ["Array of DAIN service lines this relates to: Data Strategy, AI Implementation, Analytics, Digital Transformation, Data Governance"],
  "methodology": "Start with author/org name, then research approach. Example: 'McKinsey Global Institute surveyed 1,800 C-suite executives across 14 industries, Q1 2024.' Return null if author/methodology not found.",
  "dain_relevance": "Rate overall relevance to DAIN's work. MUST be exactly one of: High, Medium, Low",
  "source_credibility": "Rate source credibility. MUST be exactly one of: Tier 1 (academic/major research institution/top consulting firm), Tier 2 (industry publication/established company), Tier 3 (blog/opinion piece/unknown source)",
  "actionability": "How actionable is this content? MUST be exactly one of: Direct Use (can apply immediately), Strategic Context (informs strategy), Reference Only (background knowledge)",
  "timeliness": "Content freshness. MUST be exactly one of: Current (recent/cutting-edge), Evergreen (timeless principles), Dated (older but potentially relevant)",
  "business_functions": ["Array of business departments this applies to, e.g., R&D, IT, Marketing, Operations, Finance, HR, Sales, Executive Leadership"],
  "author": "Primary author name if mentioned. Return null if not found.",
  "author_organization": "Author's organization/institution/company if mentioned. Return null if not found."
}

STRICT REQUIREMENTS:
- key_insights MUST have exactly 5 items, each starting with **Label:** format
- Extract surprising, non-obvious insights with real numbers - avoid generic observations
- summary must be ONE sentence with specific data, not a generic description`;

// ============= CONTENT FETCHING FUNCTIONS =============

/**
 * Fetch content from a regular URL using Gemini
 */
async function fetchUrlContent(url: string, googleApiKey: string): Promise<string | null> {
  console.log(`Fetching URL content via Gemini: ${url}`);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a web content extractor. Visit this URL and extract ALL text content from the page.

URL: ${url}

Extract and return:
- The article title and all headings
- The full body text (paragraphs, lists, etc.)
- Key statistics, data points, and numbers mentioned
- Author information and publication date if present
- Any quotes or cited sources

Return the extracted content as plain text, preserving the logical structure with headings. Do not summarize - extract the FULL text content.`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini URL fetch error for ${url}: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content || content.length < 100) {
      console.warn(`Gemini returned minimal content for ${url}`);
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
 * Fetch PDF/document content from Google Drive using Gemini
 */
async function fetchGoogleDrivePdfContent(
  driveUrl: string,
  fileId: string | null,
  googleApiKey: string
): Promise<string | null> {
  console.log(`Fetching Google Drive content via Gemini: ${driveUrl}`);
  
  const extractedFileId = fileId || extractGoogleDriveFileId(driveUrl);
  
  if (!extractedFileId) {
    console.error(`Could not extract file ID from: ${driveUrl}`);
    return null;
  }

  try {
    // Get direct download URL for the file
    const directUrl = `https://drive.google.com/uc?export=download&id=${extractedFileId}`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a document content extractor. Extract ALL text content from this PDF/document.

Document URL: ${directUrl}
Google Drive URL: ${driveUrl}

Extract and return:
- Document title and all section headings
- Full body text from all pages/sections
- All statistics, data points, charts descriptions, and tables (as text)
- Author information, publication date, and source attribution
- Methodology and research approach if mentioned
- Key quotes and findings

Return the extracted content as plain text, preserving logical structure. Extract the COMPLETE text - do not summarize.`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini Drive extraction failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (extractedText && extractedText.length > 100) {
      console.log(`Gemini extracted ${extractedText.length} chars from Google Drive`);
      return extractedText;
    }

    console.warn(`Could not extract meaningful content from Google Drive`);
    return null;
  } catch (error) {
    console.error(`Failed to fetch Google Drive content: ${error}`);
    return null;
  }
}

/**
 * Fetch YouTube video transcript/content using Gemini
 */
async function fetchYouTubeContent(url: string, googleApiKey: string): Promise<string | null> {
  console.log(`Fetching YouTube content via Gemini: ${url}`);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a video content analyzer. Analyze this YouTube video and extract comprehensive information.

YouTube URL: ${url}

Extract and return:
- Video title and description
- Complete transcript or detailed summary of spoken content
- Key topics discussed and main arguments
- Notable quotes from speakers
- Statistics or data points mentioned
- Speaker names and their roles/expertise if mentioned

Provide as much detail as possible about the video's content.`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini YouTube analysis failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (content && content.length > 100) {
      console.log(`Gemini extracted ${content.length} chars from YouTube`);
      return content;
    }

    console.warn(`Could not extract meaningful content from YouTube`);
    return null;
  } catch (error) {
    console.error(`Failed to fetch YouTube content: ${error}`);
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
  // If content already exists and is substantial, use it
  if (item.content && item.content.length > 500) {
    console.log(`Using existing content (${item.content.length} chars) for: ${item.id}`);
    return { content: item.content, contentSource: 'existing' };
  }

  // Check if it's a YouTube video
  const isYouTube = item.url?.includes('youtube.com') || item.url?.includes('youtu.be');
  if (isYouTube && item.url) {
    console.log(`Attempting YouTube content fetch for: ${item.id}`);
    const youtubeContent = await fetchYouTubeContent(item.url, googleApiKey);
    
    if (youtubeContent && youtubeContent.length > 200) {
      return { content: youtubeContent, contentSource: 'youtube' };
    }
  }

  // Try Google Drive URL (for PDFs/documents)
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

  // Try regular URL via Gemini
  if (item.url && !isYouTube) {
    console.log(`Attempting URL content fetch for: ${item.id}`);
    const urlContent = await fetchUrlContent(item.url, googleApiKey);
    
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
    // Parse request body for optional parameters
    let reprocess = false;
    try {
      const body = await req.json();
      reprocess = body?.reprocess === true;
    } catch {
      // No body or invalid JSON - use defaults
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If reprocess=true, reset all pool items to pending first
    if (reprocess) {
      console.log('REPROCESS MODE: Resetting pool items to pending...');
      const { data: resetItems, error: resetError } = await supabase
        .from('knowledge_items')
        .update({
          status: 'pending',
          summary: null,
          key_insights: null,
          processed_at: null,
        })
        .eq('status', 'pool')
        .select('id');

      if (resetError) {
        throw new Error(`Failed to reset pool items: ${resetError.message}`);
      }
      console.log(`Reset ${resetItems?.length || 0} pool items to pending`);
    }

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
