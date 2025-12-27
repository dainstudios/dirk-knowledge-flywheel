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
  type: "quick" | "premium";
  model?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: GenerateInfographicRequest = await req.json();
    const { item_id, type } = body;

    if (!item_id) {
      return new Response(
        JSON.stringify({ success: false, error: "item_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`GENERATE-INFOGRAPHIC - ${type.toUpperCase()}`);
    console.log(`Item: ${item_id}`);
    console.log(`${"=".repeat(60)}\n`);

    // Fetch the knowledge item
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
    const keyFindings = item.key_findings?.slice(0, 5).join("\n• ") || item.summary?.substring(0, 500) || "Key insights from this content";
    
    const prompt = type === "premium"
      ? `Create a professional consulting-style infographic visual for this research:

Title: ${item.title}
Author: ${item.author || item.author_organization || "Unknown"}

Key Findings:
• ${keyFindings}

DAIN Context: ${item.dain_context || "Relevant for AI strategy consulting"}

Design Requirements:
- Clean, modern consulting aesthetic (McKinsey/BCG style)
- Use dark blue (#1a365d), orange (#FFA92E), and white color scheme
- Include data visualizations, icons, and clear hierarchy
- Professional typography with clear headings
- 16:9 aspect ratio, suitable for Slack/presentations
- Include the title prominently at the top
- Show 3-5 key data points or findings with visual elements
- Bottom section with "DAIN Studios" branding

Ultra high resolution, professional quality.`
      : `Create a simple infographic visual summarizing:

Title: ${item.title}
Key Points:
• ${keyFindings}

Design: Clean, modern style with blue (#1a365d) and orange (#FFA92E) accents. Include title, 3-5 bullet points with icons, 16:9 aspect ratio. Professional consulting style. Include "DAIN Studios" at bottom.`;

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
