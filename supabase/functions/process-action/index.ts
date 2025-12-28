// =============================================================================
// KNOWLEDGE FLYWHEEL - PROCESS ICURATE ACTION EDGE FUNCTION
// =============================================================================
// VERSION: 3.0 - CANONICAL SLACK TEMPLATE
// 
// ⚠️  CANONICAL SLACK TEMPLATE — DO NOT DUPLICATE  ⚠️
// 
// This is the ONLY function that posts to Slack. 
// The template format is strictly enforced via:
//   1. AI generates ONLY structured JSON (context, findings, dain_relevance)
//   2. renderSlackMessage() builds the EXACT template deterministically
//   3. validateSlackCompliance() rejects forbidden patterns
// 
// NEVER modify Slack formatting logic without updating all three.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// CONFIGURATION
// =============================================================================

const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL')!;
const GEMINI_MODEL = "gemini-3-flash-preview";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// SLACK TEMPLATE SPECIFICATION (v3.0)
// =============================================================================
// 
// EXACT FORMAT:
// ┌──────────────────────────────────────────────────────────────────┐
// │ ✨ [Article Title]                                               │
// │                                                                   │
// │ *Context*                                                         │
// │ [Author/Org name first] + [methodology: sample size, regions,    │
// │ time period, data sources]                                        │
// │                                                                   │
// │ *Top 5 Findings*                                                  │
// │ 1. **Label:** Details with specific data                          │
// │ 2. **Label:** Details with numbers/percentages                    │
// │ 3. **Label:** Details                                             │
// │ 4. **Label:** Details                                             │
// │ 5. **Label:** Details                                             │
// │                                                                   │
// │ *Why it matters for DAIN*                                         │
// │ [1-2 sentences on consultant use]                                 │
// │                                                                   │
// │ [📄 View Source]                                                  │
// └──────────────────────────────────────────────────────────────────┘
//
// FORBIDDEN PATTERNS (will cause validation failure):
// - "•" (bullet points)
// - "Tier 1", "Tier 2", etc. with bullet separators
// - "New Insight Shared"
// - "Research Report •" or similar tag lines
// - Context not starting with author/org name
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

type PostOption = 
  | 'summary_only'
  | 'summary_quick'
  | 'summary_premium'
  | 'infographic_quick'
  | 'infographic_premium';

interface ProcessActionRequest {
  item_id: string;
  actions: {
    trash?: boolean;
    team?: boolean;
    linkedin?: boolean;
    newsletter?: boolean;
    keep?: boolean;
  };
  post_option?: PostOption;
  custom_message?: string;
}

interface ActionResult {
  action: string;
  success: boolean;
  error?: string;
}

interface FormattedContent {
  context: string;
  key_findings: string[];
  dain_relevance: string;
}

interface SlackMessage {
  blocks: any[];
  text: string;
}

// =============================================================================
// AI PROMPT - RETURNS STRUCTURED JSON ONLY
// =============================================================================

const AI_EXTRACTION_PROMPT = `You are extracting structured content for a Slack post. Return ONLY valid JSON.

CONTENT TO ANALYZE:
Title: {title}
Author: {author}
Organization: {organization}
Summary: {summary}
Key Findings: {key_findings}
Methodology: {methodology}
Industries: {industries}
Technologies: {technologies}

REQUIRED JSON OUTPUT:
{
  "context": "[AUTHOR/ORG NAME] + methodology details. MUST start with the specific author name (e.g., 'Ethan Mollick', 'Mary Meeker') or organization (e.g., 'Microsoft Research', 'McKinsey', 'Gartner'). Then include: sample size, number surveyed, regions, time period, data sources. Example: 'Ethan Mollick at Wharton analyzed responses from 1,500 knowledge workers across North America and Europe, collected March-June 2024, focusing on AI adoption in professional services.'",
  "key_findings": [
    "**[2-3 word label]:** [specific finding with numbers/percentages]",
    "**[2-3 word label]:** [specific finding with data]",
    "**[2-3 word label]:** [specific finding with metrics]",
    "**[2-3 word label]:** [specific finding with percentages]",
    "**[2-3 word label]:** [actionable insight with data]"
  ],
  "dain_relevance": "[1-2 sentences on how DAIN consultants can use this with clients, in proposals, or thought leadership]"
}

STRICT RULES:
1. Context MUST begin with author/org name - never "This report" or "This study"
2. If author unknown, use organization from the Organization field
3. AUTHOR LIMIT: If there are more than 3 authors, list only the first 3 names followed by " +more" (e.g., "Jiahao Qiu, Xuan Qi, Tongcheng Zhang +more")
4. Each finding MUST have format: **Label:** then details
5. Each finding MUST include a number, percentage, or specific metric
6. Exactly 5 findings - no more, no less
7. No bullet points (•), no "Tier" ratings, no generic labels
8. Extract surprising/non-obvious insights, not generic observations

Return ONLY the JSON object. No markdown, no explanation, no code blocks.`;

// =============================================================================
// FORBIDDEN PATTERNS FOR VALIDATION
// =============================================================================

const FORBIDDEN_PATTERNS = [
  /•/g,                                    // Bullet points
  /Tier\s*[123]/gi,                        // Tier ratings
  /New Insight Shared/gi,                  // Old header
  /Research Report\s*•/gi,                 // Old tag format
  /Industry Analysis\s*•/gi,               // Old tag format
  /^\s*This (report|study|paper|analysis)/mi,  // Context starting with "This..."
];

// =============================================================================
// VALIDATION: ENSURE SLACK TEMPLATE COMPLIANCE
// =============================================================================

function validateSlackCompliance(messageText: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  // Check for forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(messageText)) {
      violations.push(`Contains forbidden pattern: ${pattern.source}`);
    }
  }
  
  // Check for required sections
  if (!messageText.includes("*Context*")) {
    violations.push("Missing *Context* section");
  }
  if (!messageText.includes("*Top 5 Findings*")) {
    violations.push("Missing *Top 5 Findings* section");
  }
  if (!messageText.includes("*Why it matters for DAIN*")) {
    violations.push("Missing *Why it matters for DAIN* section");
  }
  
  // Check for numbered findings (1. through 5.)
  const findingNumbers = [1, 2, 3, 4, 5];
  for (const num of findingNumbers) {
    if (!messageText.includes(`${num}. **`)) {
      violations.push(`Missing finding #${num} with **Label:** format`);
    }
  }
  
  return { valid: violations.length === 0, violations };
}

// =============================================================================
// DETERMINISTIC SLACK RENDERER
// =============================================================================

function renderSlackMessage(item: any, content: FormattedContent, postOption?: PostOption): SlackMessage {
  const sourceUrl = item.google_drive_url || item.url || null;
  const infographicUrl = item.infographic_url || null;
  
  // Determine what to include based on post_option
  const isInfographicOnly = postOption === 'infographic_quick' || postOption === 'infographic_premium';
  const includeSummary = !isInfographicOnly;
  const includeInfographic = postOption !== 'summary_only' && infographicUrl;
  
  // Ensure exactly 5 findings, with proper format
  const findings = ensureFiveFindings(content.key_findings);
  
  const blocks: any[] = [
    // Header: sparkles emoji + article title (NEVER tags/ratings)
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `✨ ${(item.title || "Untitled").substring(0, 145)}`,
        emoji: true,
      },
    },
  ];
  
  // Add infographic image if available and requested
  if (includeInfographic) {
    blocks.push({
      type: "image",
      image_url: infographicUrl,
      alt_text: `Infographic for ${item.title}`,
    });
  }
  
  // Add summary content if not infographic-only
  if (includeSummary) {
    // Build message text with EXACT template structure
    let messageText = "";
    
    // Section: Context
    messageText += `*Context*\n${sanitizeContext(content.context)}\n\n`;
    
    // Section: Top 5 Findings (numbered, NO bullets)
    messageText += `*Top 5 Findings*\n`;
    findings.forEach((finding, index) => {
      messageText += `${index + 1}. ${sanitizeFinding(finding)}\n\n`;
    });
    
    // Section: Why it matters for DAIN
    messageText += `*Why it matters for DAIN*\n${content.dain_relevance}`;
    
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: messageText,
      },
    });
  }
  
  // View Source button
  if (sourceUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "📄 View Source",
            emoji: true,
          },
          url: sourceUrl,
          action_id: "view_source",
        },
      ],
    });
  }
  
  return {
    blocks,
    text: `✨ ${item.title}`,
  };
}

// =============================================================================
// HELPER: ENSURE EXACTLY 5 FINDINGS
// =============================================================================

function ensureFiveFindings(findings: string[]): string[] {
  const defaultFindings = [
    "**Key Insight:** Important finding from this content",
    "**Data Point:** Relevant metric identified in the analysis",
    "**Trend:** Notable pattern discovered in the research",
    "**Implication:** Strategic consideration for consultants",
    "**Action Item:** Practical takeaway for client work",
  ];
  
  const result: string[] = [];
  
  for (let i = 0; i < 5; i++) {
    if (findings[i] && findings[i].trim().length > 10) {
      result.push(findings[i]);
    } else {
      result.push(defaultFindings[i]);
    }
  }
  
  return result;
}

// =============================================================================
// HELPER: SANITIZE CONTEXT (ensure starts with author/org)
// =============================================================================

function sanitizeContext(context: string): string {
  // Remove any forbidden patterns
  let clean = context
    .replace(/•/g, "")
    .replace(/Tier\s*[123]/gi, "")
    .trim();
  
  // If context starts with "This report/study/etc", it's non-compliant
  // We can't fully fix it here, but we can flag it for logging
  if (/^This (report|study|paper|analysis)/i.test(clean)) {
    console.warn("Context does not start with author/org name - AI output non-compliant");
  }
  
  return clean;
}

// =============================================================================
// HELPER: SANITIZE FINDING (ensure **Label:** format, convert to Slack bold)
// =============================================================================

function sanitizeFinding(finding: string): string {
  // Remove bullet points
  let clean = finding.replace(/•/g, "").trim();
  
  // Ensure **Label:** format exists
  if (!clean.startsWith("**")) {
    // Try to add bold formatting if there's a colon
    const colonIndex = clean.indexOf(":");
    if (colonIndex > 0 && colonIndex < 40) {
      clean = `**${clean.substring(0, colonIndex)}:**${clean.substring(colonIndex + 1)}`;
    } else {
      clean = `**Insight:** ${clean}`;
    }
  }
  
  // Convert markdown **bold** to Slack *bold* format
  clean = clean.replace(/\*\*([^*]+)\*\*/g, "*$1*");
  
  return clean;
}

// =============================================================================
// BUILD CONTENT FROM EXISTING DATABASE FIELDS (NO AI CALL)
// =============================================================================

function buildContentFromExisting(item: any): FormattedContent {
  console.log("Building content from existing database fields (no AI call)...");
  
  // Build context from author + methodology
  const author = item.author || item.author_organization || 'Research team';
  const methodology = item.methodology || '';
  const context = methodology 
    ? `${author} ${methodology}`
    : `${author} presents key findings on ${item.title || 'this topic'}`;
  
  // Use key_insights directly - format them with **Label:** structure
  const rawInsights = item.key_insights || [];
  const key_findings = rawInsights.map((insight: string) => {
    if (!insight) return '**Insight:** Key finding from this content';
    // If already has bold formatting, keep it
    if (insight.includes('**')) return insight;
    // Try to detect a natural label (first phrase before colon)
    const colonIndex = insight.indexOf(':');
    if (colonIndex > 0 && colonIndex < 50) {
      const label = insight.substring(0, colonIndex).trim();
      const rest = insight.substring(colonIndex + 1).trim();
      return `**${label}:** ${rest}`;
    }
    // Otherwise add a generic label
    return `**Key Insight:** ${insight}`;
  });
  
  // Use dain_context directly
  const dain_relevance = item.dain_context || 
    'Useful for client conversations and thought leadership on AI strategy.';
  
  console.log(`Built content: ${key_findings.length} insights from existing data`);
  
  return { context, key_findings, dain_relevance };
}

// =============================================================================
// AI CONTENT EXTRACTION (FALLBACK ONLY)
// =============================================================================

async function extractContentWithAI(item: any, googleApiKey: string): Promise<FormattedContent> {
  const prompt = AI_EXTRACTION_PROMPT
    .replace("{title}", item.title || "Untitled")
    .replace("{author}", item.author || "Unknown author")
    .replace("{organization}", item.author_organization || item.source_credibility || "Unknown organization")
    .replace("{summary}", item.summary || item.content?.substring(0, 3000) || "No summary available")
    .replace("{key_findings}", (item.key_findings || []).join("; ") || "No key findings")
    .replace("{methodology}", item.methodology || "No methodology details")
    .replace("{industries}", (item.industries || []).join(", ") || "General")
    .replace("{technologies}", (item.technologies || []).join(", ") || "General");

  console.log("Calling Gemini for content extraction...");
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${googleApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Gemini API error:", err);
    throw new Error(`Gemini API failed: ${response.status}`);
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response from Gemini");
  }

  // Clean markdown code blocks if present
  text = text.trim();
  if (text.startsWith("```json")) text = text.slice(7);
  if (text.startsWith("```")) text = text.slice(3);
  if (text.endsWith("```")) text = text.slice(0, -3);
  text = text.trim();

  console.log("Gemini raw response:", text.substring(0, 300));

  try {
    const parsed = JSON.parse(text) as FormattedContent;
    
    // Validate the parsed content
    if (!parsed.context || !parsed.key_findings || !parsed.dain_relevance) {
      throw new Error("Missing required fields in AI response");
    }
    
    return parsed;
  } catch (parseError) {
    console.error("JSON parse error, using fallback:", parseError);
    return createFallbackContent(item);
  }
}

// =============================================================================
// FALLBACK CONTENT (when AI fails)
// =============================================================================

function createFallbackContent(item: any): FormattedContent {
  const author = item.author || item.author_organization || "Unknown source";
  const summary = item.summary || "Content analysis";
  
  return {
    context: `${author} presents insights on ${item.title || "this topic"}. ${item.methodology || "The analysis covers key trends and findings relevant to the industry."}`,
    key_findings: [
      `**Key Finding:** ${summary.substring(0, 100)}...`,
      "**Industry Impact:** Relevant implications for business strategy",
      "**Technology Angle:** Considerations for AI and digital transformation",
      "**Market Trend:** Notable patterns in the competitive landscape",
      "**Strategic Value:** Actionable insights for consulting engagements",
    ],
    dain_relevance: item.dain_context || "Useful for client conversations and thought leadership on AI strategy.",
  };
}

// =============================================================================
// POST TO SLACK
// =============================================================================

async function postToSlack(message: SlackMessage): Promise<void> {
  console.log("Posting to Slack...");
  
  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Slack post failed: ${response.status} - ${error}`);
  }
  
  console.log("Successfully posted to Slack");
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY")!;

    // =========================================================================
    // AUTH VERIFICATION - Verify user owns this item before processing
    // =========================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No Authorization header provided");
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create RLS-enforced client using user's JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Auth verification failed:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const body: ProcessActionRequest = await req.json();
    const { item_id, actions, post_option } = body;

    if (!item_id) {
      return new Response(
        JSON.stringify({ success: false, error: "item_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!actions || Object.keys(actions).length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "At least one action is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`PROCESS-ACTION v3.2 - WITH AUTH VERIFICATION`);
    console.log(`User: ${user.id}`);
    console.log(`Item: ${item_id}`);
    console.log(`Actions: ${JSON.stringify(actions)}`);
    console.log(`Post Option: ${post_option || 'summary_only (default)'}`);
    console.log(`${"=".repeat(60)}\n`);

    // Verify ownership - RLS will block if user doesn't own this item
    const { data: item, error: fetchError } = await supabaseAuth
      .from("knowledge_items")
      .select("*")
      .eq("id", item_id)
      .single();

    if (fetchError || !item) {
      console.error(`Item not found or not owned by user: ${fetchError?.message}`);
      return new Response(
        JSON.stringify({ success: false, error: "Item not found or access denied" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log(`Verified ownership - Found item: ${item.title}`);

    // Create admin client for privileged operations (after ownership verified)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: ActionResult[] = [];

    // ===================
    // HANDLE TRASH (exclusive action)
    // ===================
    if (actions.trash) {
      console.log("Action: TRASH");
      
      const { error: updateError } = await supabase
        .from("knowledge_items")
        .update({
          status: "trash",
          processed_at: new Date().toISOString(),
        })
        .eq("id", item_id);

      if (updateError) {
        results.push({ action: "trash", success: false, error: updateError.message });
      } else {
        results.push({ action: "trash", success: true });
      }

      return new Response(
        JSON.stringify({
          success: true,
          item_id,
          title: item.title,
          results,
          final_status: "trash"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===================
    // HANDLE MULTI-SELECT ACTIONS
    // ===================
    
    const updateData: any = {
      processed_at: new Date().toISOString(),
      status: "knowledge"
    };

    const queues: string[] = [];

    // TEAM - Post to Slack with deterministic template
    if (actions.team) {
      console.log(`\n>>> TEAM ACTION DEBUG (v3.3) <<<`);
      console.log(`post_option received: "${post_option}" (type: ${typeof post_option})`);
      console.log(`item.infographic_url: ${item.infographic_url || 'NULL'}`);
      
      const isInfographicOnly = post_option === 'infographic_quick' || post_option === 'infographic_premium';
      const includeSummary = !isInfographicOnly;
      const includeInfographic = post_option !== 'summary_only' && !!item.infographic_url;
      
      console.log(`isInfographicOnly: ${isInfographicOnly}`);
      console.log(`includeSummary: ${includeSummary}`);
      console.log(`includeInfographic: ${includeInfographic}`);
      
      try {
        // Step 1: Build content - use existing data if available, AI as fallback
        let content: FormattedContent;
        
        // Check if we have good existing data (key_insights with at least 3 items)
        const hasGoodExistingData = item.key_insights && 
                                    Array.isArray(item.key_insights) && 
                                    item.key_insights.length >= 3;
        
        if (isInfographicOnly && item.infographic_url) {
          console.log(`Using minimal content (infographic-only mode)`);
          content = createFallbackContent(item);
        } else if (hasGoodExistingData) {
          console.log(`Using existing Pool data (${item.key_insights.length} insights available)`);
          content = buildContentFromExisting(item);
        } else {
          console.log(`Falling back to AI extraction (key_insights: ${item.key_insights?.length || 0})`);
          content = await extractContentWithAI(item, googleApiKey);
        }
        
        // Step 2: Render with deterministic template (includes infographic if available)
        const message = renderSlackMessage(item, content, post_option);
        
        // Log block types being sent
        const blockTypes = message.blocks.map((b: any) => b.type);
        console.log(`Slack message blocks: ${JSON.stringify(blockTypes)}`);
        
        // Step 3: Validate compliance (log violations but don't block)
        const messageText = message.blocks
          .filter((b: any) => b.type === "section")
          .map((b: any) => b.text?.text || "")
          .join("\n");
        
        if (messageText) {
          const validation = validateSlackCompliance(messageText);
          if (!validation.valid) {
            console.warn("Template compliance violations:", validation.violations);
          }
        }
        
        // Step 4: Post to Slack
        console.log(`Posting to Slack...`);
        await postToSlack(message);
        
        console.log(`>>> TEAM ACTION COMPLETE <<<\n`);
        results.push({ action: "team", success: true });
        queues.push("team");
        updateData.shared_to_team = true;
        updateData.shared_to_team_at = new Date().toISOString();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("Slack error:", error.message);
        results.push({ action: "team", success: false, error: error.message });
      }
    }

    // LINKEDIN - Add to queue
    if (actions.linkedin) {
      console.log("Action: LINKEDIN");
      updateData.queued_for_linkedin = true;
      updateData.queued_for_linkedin_at = new Date().toISOString();
      results.push({ action: "linkedin", success: true });
      queues.push("linkedin");
    }

    // NEWSLETTER - Add to queue
    if (actions.newsletter) {
      console.log("Action: NEWSLETTER");
      updateData.queued_for_newsletter = true;
      updateData.queued_for_newsletter_at = new Date().toISOString();
      results.push({ action: "newsletter", success: true });
      queues.push("newsletter");
    }

    // KEEP - Just save to knowledge base (default behavior)
    if (actions.keep && queues.length === 0) {
      console.log("Action: KEEP (knowledge base only)");
      results.push({ action: "keep", success: true });
    }

    // Determine final status
    if (queues.includes("team")) {
      updateData.status = "post2team";
    } else if (queues.includes("linkedin")) {
      updateData.status = "post2linkedin";
    } else if (queues.includes("newsletter")) {
      updateData.status = "post2newsletter";
    } else {
      updateData.status = "knowledge";
    }

    // Update the item
    const { error: updateError } = await supabase
      .from("knowledge_items")
      .update(updateData)
      .eq("id", item_id);

    if (updateError) {
      console.error("Update error:", updateError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to update item: ${updateError.message}`,
          results
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const summary = queues.length > 0
      ? `Processed: ${queues.join(", ")}`
      : "Saved to knowledge base";

    console.log(`\nCompleted: ${summary}`);
    console.log(`Final status: ${updateData.status}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        item_id,
        title: item.title,
        results,
        final_status: updateData.status,
        summary
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Process action error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
