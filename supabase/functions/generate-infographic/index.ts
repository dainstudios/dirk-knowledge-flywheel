// =============================================================================
// GENERATE INFOGRAPHIC EDGE FUNCTION
// =============================================================================
// Generates an AI-powered infographic for a knowledge item using the Lovable
// AI Gateway (nano-banana model), uploads to Supabase Storage, and updates
// the knowledge_items.infographic_url field.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateInfographicRequest {
  item_id: string;
  type: "quick" | "detailed";
  model?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // =========================================================================
    // AUTH VERIFICATION - Verify user owns this item before generating
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

    const body: GenerateInfographicRequest = await req.json();
    const { item_id, type } = body;

    if (!item_id) {
      return new Response(
        JSON.stringify({ success: false, error: "item_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`GENERATE-INFOGRAPHIC - ${type.toUpperCase()} - WITH AUTH`);
    console.log(`User: ${user.id}`);
    console.log(`Item: ${item_id}`);
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

    // Check if infographic already exists
    if (item.infographic_url) {
      console.log("Infographic already exists, returning existing URL");
      return new Response(
        JSON.stringify({
          success: true,
          item_id,
          infographic_url: item.infographic_url,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt for infographic generation
    // QUICK: Use top 5 key insights only
    // DETAILED: Use full document content
    const topFindings = (item.key_insights || item.key_findings || []).slice(0, 5);
    const keyFindingsText = topFindings.length > 0 
      ? topFindings.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")
      : item.summary?.substring(0, 500) || "Key insights from this content";
    
    // For detailed, get full content
    const fullContent = item.content || item.pdf_data || item.summary || "";
    const truncatedContent = fullContent.substring(0, 20000);
    
    const prompt = type === "detailed"
      ? `Create an extensive, professional consulting-style infographic.
CRITICAL: Image MUST be LANDSCAPE orientation (1792x1024 pixels, 16:9 aspect ratio).

TITLE: "${item.title}"
AUTHOR: ${item.author || item.author_organization || "Research team"}
${item.methodology ? `METHODOLOGY: ${item.methodology}` : ""}

FULL DOCUMENT CONTENT FOR ANALYSIS:
${truncatedContent}

DAIN STUDIOS RELEVANCE:
${item.dain_context || "Data & AI strategy consulting"}

LAYOUT REQUIREMENTS:
- LANDSCAPE orientation only (wider than tall, 16:9 ratio)
- Header: Dark navy blue (#1a365d) with white title and author text
- Main content: Two-column layout with maximum space utilization
  - Left: "KEY FINDINGS" section with orange (#FFA92E) heading
    - 5-7 key insights with professional vector icons
    - Data visualizations where applicable
  - Right: "DAIN CONTEXT" section with orange heading
    - How this relates to data strategy & AI consulting
    - Relevant service lines and applications
- Footer: Navy blue bar with:
  - Bottom right corner: Small "powered by" text with "DAIN Studios" in slightly larger font and a minimalist circular "D" icon (do NOT generate a full logo image, just render clean text and simple icon)

STYLE REQUIREMENTS:
- Institutional and authoritative (McKinsey/Deloitte quarterly report style)
- Color scheme: Navy (#1a365d), Orange (#FFA92E), White, Light gray
- Professional sans-serif typography with clear hierarchy
- High-fidelity, crisp, legible text rendering
- Clean vector illustrations and icons
- Grid layout with balanced white space
- Ultra high resolution quality`
      : `Create a professional, minimalist infographic.
CRITICAL: Image MUST be LANDSCAPE orientation (1792x1024 pixels, 16:9 aspect ratio).

Title: "${item.title}"
${item.author ? `Author: ${item.author}` : ""}

KEY FINDINGS:
${keyFindingsText}

DAIN CONTEXT:
${item.dain_context || "Relevant for AI strategy consulting"}

LAYOUT REQUIREMENTS:
- Landscape orientation only (wider than tall)
- Top section: Dark blue (#1a365d) header bar with white title text
- Main content: Two columns layout
  - Left column: "KEY FINDINGS" with orange (#FFA92E) heading, 3-5 bullet points with professional icons
  - Right column: "DAIN CONTEXT" with orange heading, showing relevance to consulting
- Footer: Navy blue bar with bottom right corner showing small "powered by" text with "DAIN Studios" (do NOT generate a logo image, just render the text in small italic font with a simple circular "D" icon)

STYLE: Clean corporate aesthetic, McKinsey/Deloitte consulting style. High-fidelity text rendering. Crisp typography. Minimalist. Professional icons. White background for main content. Ultra high resolution.`;

    console.log("Calling Lovable AI Gateway for image generation...");
    console.log(`Prompt length: ${prompt.length} chars`);

    // Call the Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway failed: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Gateway response received");

    // Extract the base64 image from the response
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiData).substring(0, 500));
      throw new Error("No image generated by AI");
    }

    console.log("Image generated successfully, uploading to storage...");

    // Extract base64 data (remove data:image/png;base64, prefix)
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid base64 image format");
    }

    const imageFormat = base64Match[1]; // png, jpeg, etc.
    const base64Data = base64Match[2];

    // Convert base64 to Uint8Array for upload
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `infographics/${item_id}_${type}_${timestamp}.${imageFormat}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("images")
      .upload(filename, bytes, {
        contentType: `image/${imageFormat}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log("Uploaded to storage:", filename);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(filename);

    const infographicUrl = urlData.publicUrl;
    console.log("Public URL:", infographicUrl);

    // Update the knowledge item with the infographic URL
    const { error: updateError } = await supabase
      .from("knowledge_items")
      .update({
        infographic_url: infographicUrl,
        infographic_type: type,
        infographic_generated_at: new Date().toISOString(),
      })
      .eq("id", item_id);

    if (updateError) {
      console.error("Update error:", updateError);
      // Don't fail - the image was generated successfully
    }

    console.log(`\nInfographic generated successfully!`);
    console.log(`Type: ${type}`);
    console.log(`URL: ${infographicUrl}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        item_id,
        infographic_url: infographicUrl,
        type,
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Generate infographic error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
