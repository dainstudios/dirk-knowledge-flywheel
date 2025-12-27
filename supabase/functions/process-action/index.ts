// =============================================================================
// KNOWLEDGE FLYWHEEL - PROCESS ICURATE ACTION EDGE FUNCTION
// Version: 2.0 - Self-contained with AI-powered Slack formatting
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// CONFIGURATION
// =============================================================================

const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL')!;
const GEMINI_MODEL = "gemini-3-flash-preview";

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// TYPES
// =============================================================================

interface ProcessActionRequest {
  item_id: string;
  actions: {
    trash?: boolean;
    team?: boolean;
    linkedin?: boolean;
    newsletter?: boolean;
    keep?: boolean;
  };
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

// =============================================================================
// AI FORMATTING PROMPT
// =============================================================================

const FORMAT_PROMPT = `You are formatting content for a Slack post to share with a consulting team at DAIN Studios (an AI consultancy).

Given the following content, create a concise but informative summary:

CONTENT:
Title: {title}
Author: {author}
Summary: {summary}
Industries: {industries}
Technologies: {technologies}

Generate a JSON response with EXACTLY this structure:
{
  "context": "2-3 sentences providing quick background so readers understand the findings. MUST include: who authored/published it (person or organization), and if it's research/survey: sample size, regions covered, time period. Example: 'This paper, authored by Microsoft AI, analyzes 37.5 million deidentified conversations with Microsoft Copilot that occurred between January and September 2025.'",
  "key_findings": [
    "First key finding with a bold topic label followed by explanation. Format: **Label:** Details with specific data",
    "Second key finding. Format: **Label:** Details with numbers/percentages",
    "Third key finding. Format: **Label:** Details",
    "Fourth key finding. Format: **Label:** Details",
    "Fifth key finding. Format: **Label:** Details"
  ],
  "dain_relevance": "1-2 sentences on how DAIN consultants can use this in client conversations, proposals, or thought leadership."
}

RULES:
- Context MUST mention the author/organization and methodology details (sample size, regions, time period if available)
- Each finding should start with a **Bold Label:** followed by the insight
- Include specific numbers, percentages, or data points when available
- Focus on surprising or non-obvious insights, not generic observations
- Maximum 5 findings (not more)

Return ONLY valid JSON, no markdown, no explanation.`;

// =============================================================================
// GENERATE FORMATTED CONTENT WITH AI
// =============================================================================

async function generateFormattedContent(
  item: any,
  googleApiKey: string
): Promise<FormattedContent> {
  const prompt = FORMAT_PROMPT
    .replace("{title}", item.title || "Untitled")
    .replace("{author}", item.author || item.source_credibility || "Unknown")
    .replace("{summary}", item.summary || item.content?.substring(0, 3000) || "No summary available")
    .replace("{industries}", (item.industries || []).join(", ") || "General")
    .replace("{technologies}", (item.technologies || []).join(", ") || "General");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${googleApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API failed: ${err}`);
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response from Gemini");
  }

  // Clean markdown if present
  text = text.trim();
  if (text.startsWith("```json")) text = text.slice(7);
  if (text.startsWith("```")) text = text.slice(3);
  if (text.endsWith("```")) text = text.slice(0, -3);
  text = text.trim();

  console.log("Gemini response:", text.substring(0, 500));

  try {
    return JSON.parse(text) as FormattedContent;
  } catch (parseError) {
    console.error("JSON parse failed, using fallback");
    return {
      context: item.summary?.substring(0, 300) || "Analysis of this content.",
      key_findings: extractBullets(item.summary) || [
        "Key insight from this content",
        "Important finding worth noting",
        "Relevant data point identified",
        "Strategic implication discovered",
        "Actionable takeaway for consultants"
      ],
      dain_relevance: item.dain_context || "Relevant for AI strategy and client conversations."
    };
  }
}

// Helper to extract bullets from summary
function extractBullets(summary: string | null): string[] {
  if (!summary) return [];
  
  const lines = summary.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))
    .map(line => line.replace(/^[•\-\*]\s*/, ''))
    .filter(line => line.length > 20)
    .slice(0, 5);
  
  return lines.length >= 3 ? lines : [];
}

// =============================================================================
// FORMAT SLACK MESSAGE
// =============================================================================

function formatSlackMessage(
  item: any,
  formatted: FormattedContent,
  customMessage?: string
): object {
  const sourceUrl = item.google_drive_url || item.url || null;

  // Build the message text
  let messageText = "";
  
  // Context
  messageText += `*Context*\n${formatted.context}\n\n`;
  
  // Key Findings - NUMBERED
  messageText += `*Top ${formatted.key_findings.length} Findings*\n`;
  formatted.key_findings.forEach((finding, index) => {
    messageText += `${index + 1}. ${finding}\n`;
  });
  messageText += "\n";
  
  // DAIN Relevance
  messageText += `*Why it matters for DAIN*\n${formatted.dain_relevance}`;

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `✨ ${item.title}`.substring(0, 150), // Slack header max 150 chars
        emoji: true,
      },
    },
  ];

  // Custom message from user
  if (customMessage) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `💬 _"${customMessage}"_`,
      },
    });
    blocks.push({ type: "divider" });
  }

  // Main content
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: messageText,
    },
  });

  // Source button
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

  blocks.push({ type: "divider" });

  return {
    blocks,
    text: `✨ ${item.title}`,
  };
}

// =============================================================================
// POST TO SLACK
// =============================================================================

async function postToSlack(message: object): Promise<void> {
  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Slack post failed: ${response.status} - ${error}`);
  }
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ProcessActionRequest = await req.json();
    const { item_id, actions, custom_message } = body;

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

    console.log(`\n${"=".repeat(50)}`);
    console.log(`Processing item: ${item_id}`);
    console.log(`Actions: ${JSON.stringify(actions)}`);
    console.log(`${"=".repeat(50)}\n`);

    // Fetch the item
    const { data: item, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("*")
      .eq("id", item_id)
      .single();

    if (fetchError || !item) {
      return new Response(
        JSON.stringify({ success: false, error: `Item not found: ${fetchError?.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log(`Found item: ${item.title}`);

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

    // TEAM - Post to Slack with AI formatting
    if (actions.team) {
      console.log("Action: TEAM (Slack with AI formatting)");
      try {
        // Generate AI-powered formatted content
        const formatted = await generateFormattedContent(item, googleApiKey);
        const message = formatSlackMessage(item, formatted, custom_message);
        await postToSlack(message);
        
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

    // Determine final status based on selections
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

    // Build summary
    const summary = queues.length > 0
      ? `Processed: ${queues.join(", ")}`
      : "Saved to knowledge base";

    console.log(`\nCompleted: ${summary}`);
    console.log(`Final status: ${updateData.status}`);
    console.log(`Results: ${JSON.stringify(results)}\n`);

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
