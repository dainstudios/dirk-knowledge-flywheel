import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, chart_type, count = 12 } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get Google API key for embeddings
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!googleApiKey) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    console.log("Find image request:", { query, chart_type, count });

    // Enhance query for better image matching
    const enhancedQuery = chart_type && chart_type !== "any"
      ? `${query} ${chart_type.replace(/_/g, " ")} chart visualization`
      : `${query} chart graph infographic visualization`;

    // Generate embedding for search query
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: enhancedQuery }] },
        }),
      }
    );

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding API error:", errorText);
      throw new Error("Failed to generate embedding");
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding?.values;

    if (!queryEmbedding) {
      throw new Error("No embedding returned from API");
    }

    // Search for matching images
    const { data: matchedImages, error: matchError } = await supabase.rpc(
      "match_images",
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.35,
        match_count: count,
        filter_chart_type: chart_type && chart_type !== "any" ? chart_type : null,
      }
    );

    if (matchError) {
      console.error("Match images error:", matchError);
      throw matchError;
    }

    console.log("Found images:", matchedImages?.length || 0);

    // Get full image details for matches
    const imageIds = matchedImages?.map((img: any) => img.id) || [];
    
    let fullImages: any[] = [];
    if (imageIds.length > 0) {
      const { data: imageDetails, error: detailsError } = await supabase
        .from("images")
        .select("*")
        .in("id", imageIds);

      if (detailsError) {
        console.error("Image details error:", detailsError);
      } else {
        fullImages = imageDetails || [];
      }
    }

    // Combine match results with full details
    const images = matchedImages?.map((match: any) => {
      const fullDetails = fullImages.find((img) => img.id === match.id) || {};
      return {
        id: match.id,
        title: match.title || fullDetails.title || "Untitled",
        description: match.description || fullDetails.description,
        key_insight: fullDetails.key_insight,
        chart_type: match.chart_type || fullDetails.chart_type,
        data_points: fullDetails.data_points,
        trends_and_patterns: fullDetails.trends_and_patterns,
        dain_context: fullDetails.dain_context,
        topics: match.topic_tags || fullDetails.topic_tags || [],
        use_cases: match.use_cases || fullDetails.use_cases || [],
        source: fullDetails.source_attribution,
        url: match.storage_url || fullDetails.google_drive_url || fullDetails.storage_url,
        google_drive_url: fullDetails.google_drive_url,
        storage_url: fullDetails.storage_url,
        relevance: Math.round(match.similarity * 100),
        knowledge_item_id: match.knowledge_item_id || fullDetails.knowledge_item_id,
      };
    }) || [];

    return new Response(
      JSON.stringify({
        images,
        stats: {
          total_found: images.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Find image error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
