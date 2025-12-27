import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessImageRequest {
  image_id?: string;
  batch?: boolean;
  limit?: number;
}

interface ImageAnalysis {
  title: string;
  description: string;
  chart_type: string;
  key_insight: string;
  data_points: string[];
  trends_and_patterns: string[];
  topic_tags: string[];
  use_cases: string[];
  dain_context: string;
  visual_style: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')!;

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { image_id, batch = false, limit = 5 }: ProcessImageRequest = await req.json();

    console.log('Process image request:', { image_id, batch, limit });

    // Get images to process
    let imagesToProcess: any[] = [];

    if (image_id) {
      // Process single image
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('id', image_id)
        .single();
      
      if (error) throw new Error(`Image not found: ${error.message}`);
      imagesToProcess = [data];
    } else if (batch) {
      // Process unprocessed images (no embedding)
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .is('embedding', null)
        .not('storage_url', 'is', null)
        .limit(limit);
      
      if (error) throw new Error(`Failed to fetch images: ${error.message}`);
      imagesToProcess = data || [];
    } else {
      throw new Error('Must provide image_id or batch=true');
    }

    console.log(`Processing ${imagesToProcess.length} images`);

    if (imagesToProcess.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No images to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const image of imagesToProcess) {
      try {
        console.log(`Processing image: ${image.id} - ${image.filename || 'unnamed'}`);

        // Step 1: Analyze image with Gemini Vision
        const imageUrl = image.storage_url || image.google_drive_url;
        if (!imageUrl) {
          results.push({ id: image.id, success: false, error: 'No image URL available' });
          continue;
        }

        const analysisPrompt = `Analyze this image in detail for use in a business consulting knowledge library.

Return a JSON object with these exact fields:
{
  "title": "A clear, descriptive title (max 80 characters)",
  "description": "What the image shows, its context, and key information displayed (2-3 sentences)",
  "chart_type": "One of: bar_chart, line_graph, pie_chart, infographic, diagram, framework, matrix, table, screenshot, other",
  "key_insight": "The single most important takeaway from this image (1 sentence)",
  "data_points": ["Array of 3-5 specific data points, statistics, or metrics shown"],
  "trends_and_patterns": ["Array of 2-3 trends or patterns visible in the data"],
  "topic_tags": ["Array of 5-8 relevant topic tags like 'AI adoption', 'cloud computing', 'market trends'"],
  "use_cases": ["Array of 2-4 ways a consultant could use this image in presentations or reports"],
  "dain_context": "How this relates to DAIN Studios' work in data, AI, analytics, and digital transformation (1-2 sentences)",
  "visual_style": "One of: corporate, academic, infographic, minimalist, detailed, colorful, technical"
}

RULES:
- Be specific and precise with data points
- Focus on business/consulting relevance
- If you cannot determine something, use reasonable defaults
- Return ONLY the JSON object, no markdown or explanation`;

        const visionResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: analysisPrompt },
                  { 
                    inline_data: {
                      mime_type: "image/jpeg",
                    },
                    file_data: {
                      mime_type: "image/jpeg",
                      file_uri: imageUrl
                    }
                  }
                ]
              }]
            })
          }
        );

        // If file_uri doesn't work, try fetching the image and sending as base64
        if (!visionResponse.ok) {
          console.log('Trying base64 approach for image analysis...');
          
          // Fetch the image
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`);
          }
          
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
          const mimeType = image.mime_type || 'image/jpeg';

          const base64VisionResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: analysisPrompt },
                    { 
                      inline_data: {
                        mime_type: mimeType,
                        data: base64Image
                      }
                    }
                  ]
                }]
              })
            }
          );

          if (!base64VisionResponse.ok) {
            const errorText = await base64VisionResponse.text();
            throw new Error(`Gemini Vision API error: ${errorText}`);
          }

          const visionData = await base64VisionResponse.json();
          const analysisText = visionData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (!analysisText) {
            throw new Error('No analysis returned from Gemini Vision');
          }

          // Parse the JSON response
          let analysis: ImageAnalysis;
          try {
            const cleanedText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
            analysis = JSON.parse(cleanedText);
          } catch (parseError) {
            console.error('Failed to parse analysis:', analysisText);
            throw new Error('Failed to parse image analysis JSON');
          }

          console.log(`Analysis complete for ${image.id}:`, analysis.title);

          // Step 2: Generate embedding from combined text
          const embeddingText = [
            analysis.title,
            analysis.description,
            analysis.key_insight,
            analysis.dain_context,
            ...(analysis.topic_tags || []),
            ...(analysis.use_cases || []),
            ...(analysis.data_points || [])
          ].filter(Boolean).join(' ');

          const embeddingResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${googleApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'models/text-embedding-004',
                content: { parts: [{ text: embeddingText }] }
              })
            }
          );

          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`Embedding API error: ${errorText}`);
          }

          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.embedding?.values;

          if (!embedding) {
            throw new Error('No embedding returned from API');
          }

          console.log(`Embedding generated for ${image.id}, dimensions: ${embedding.length}`);

          // Step 3: Update the image record
          const { error: updateError } = await supabase
            .from('images')
            .update({
              title: analysis.title,
              description: analysis.description,
              chart_type: analysis.chart_type,
              key_insight: analysis.key_insight,
              data_points: analysis.data_points,
              trends_and_patterns: analysis.trends_and_patterns,
              topic_tags: analysis.topic_tags,
              use_cases: analysis.use_cases,
              dain_context: analysis.dain_context,
              visual_style: analysis.visual_style,
              embedding: `[${embedding.join(',')}]`,
              status: 'processed',
              processed_at: new Date().toISOString()
            })
            .eq('id', image.id);

          if (updateError) {
            throw new Error(`Failed to update image: ${updateError.message}`);
          }

          console.log(`Successfully processed image: ${image.id}`);
          results.push({ id: image.id, success: true });
        } else {
          // Original approach worked
          const visionData = await visionResponse.json();
          const analysisText = visionData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (!analysisText) {
            throw new Error('No analysis returned from Gemini Vision');
          }

          let analysis: ImageAnalysis;
          try {
            const cleanedText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
            analysis = JSON.parse(cleanedText);
          } catch (parseError) {
            console.error('Failed to parse analysis:', analysisText);
            throw new Error('Failed to parse image analysis JSON');
          }

          // Generate embedding
          const embeddingText = [
            analysis.title,
            analysis.description,
            analysis.key_insight,
            analysis.dain_context,
            ...(analysis.topic_tags || []),
            ...(analysis.use_cases || []),
            ...(analysis.data_points || [])
          ].filter(Boolean).join(' ');

          const embeddingResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${googleApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'models/text-embedding-004',
                content: { parts: [{ text: embeddingText }] }
              })
            }
          );

          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`Embedding API error: ${errorText}`);
          }

          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.embedding?.values;

          if (!embedding) {
            throw new Error('No embedding returned from API');
          }

          // Update the image record
          const { error: updateError } = await supabase
            .from('images')
            .update({
              title: analysis.title,
              description: analysis.description,
              chart_type: analysis.chart_type,
              key_insight: analysis.key_insight,
              data_points: analysis.data_points,
              trends_and_patterns: analysis.trends_and_patterns,
              topic_tags: analysis.topic_tags,
              use_cases: analysis.use_cases,
              dain_context: analysis.dain_context,
              visual_style: analysis.visual_style,
              embedding: `[${embedding.join(',')}]`,
              status: 'processed',
              processed_at: new Date().toISOString()
            })
            .eq('id', image.id);

          if (updateError) {
            throw new Error(`Failed to update image: ${updateError.message}`);
          }

          results.push({ id: image.id, success: true });
        }
      } catch (imageError) {
        console.error(`Error processing image ${image.id}:`, imageError);
        results.push({ 
          id: image.id, 
          success: false, 
          error: imageError instanceof Error ? imageError.message : 'Unknown error' 
        });

        // Update image with error status
        await supabase
          .from('images')
          .update({
            status: 'error',
            processing_error: imageError instanceof Error ? imageError.message : 'Unknown error'
          })
          .eq('id', image.id);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Processing complete: ${successCount} success, ${failCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      processed: successCount,
      failed: failCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-image function:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
