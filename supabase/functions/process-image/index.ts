import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum file size to process (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface ProcessImageRequest {
  image_id?: string;
  batch?: boolean;
  limit?: number;
  process_all?: boolean;
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

// Helper function to fetch image with fallback URLs
async function fetchImageWithFallback(
  storageUrl: string | null,
  googleDriveUrl: string | null,
  filename: string
): Promise<{ buffer: ArrayBuffer; mimeType: string } | null> {
  const urlsToTry: { url: string; name: string }[] = [];
  
  if (storageUrl) {
    urlsToTry.push({ url: storageUrl, name: 'storage_url' });
  }
  
  if (googleDriveUrl) {
    // Convert Google Drive view URL to direct download URL
    const driveMatch = googleDriveUrl.match(/\/d\/([^/]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      urlsToTry.push({ 
        url: `https://drive.google.com/uc?export=download&id=${fileId}`, 
        name: 'google_drive_direct' 
      });
    }
    urlsToTry.push({ url: googleDriveUrl, name: 'google_drive_url' });
  }
  
  for (const { url, name } of urlsToTry) {
    try {
      console.log(`Trying to fetch from ${name}: ${url.substring(0, 100)}...`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'image/*',
        },
      });
      
      if (!response.ok) {
        console.log(`${name} returned ${response.status}: ${response.statusText}`);
        continue;
      }
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.arrayBuffer();
      
      // Check file size
      if (buffer.byteLength > MAX_FILE_SIZE) {
        console.log(`${name} file too large: ${buffer.byteLength} bytes (max ${MAX_FILE_SIZE})`);
        continue;
      }
      
      console.log(`Successfully fetched from ${name}: ${buffer.byteLength} bytes, type: ${contentType}`);
      return { buffer, mimeType: contentType };
    } catch (error) {
      console.log(`Failed to fetch from ${name}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  console.log(`All fetch attempts failed for: ${filename}`);
  return null;
}

// Process a single image and return result
async function processSingleImage(
  image: any,
  supabase: any,
  googleApiKey: string
): Promise<{ success: boolean; error?: string }> {
  const filename = image.filename || 'unnamed';
  console.log(`Processing image: ${image.id} - ${filename}`);

  // Skip GIF files (often animated and cause issues)
  const mimeType = image.mime_type || '';
  if (mimeType === 'image/gif' || filename.toLowerCase().endsWith('.gif')) {
    console.log(`Skipping GIF file: ${filename}`);
    await supabase.from('images').update({
      status: 'skipped',
      processing_error: 'GIF files not supported'
    }).eq('id', image.id);
    return { success: false, error: 'GIF files not supported (often animated)' };
  }

  // Fetch image with fallback
  const imageData = await fetchImageWithFallback(
    image.storage_url,
    image.google_drive_url,
    filename
  );

  if (!imageData) {
    await supabase.from('images').update({
      status: 'error',
      processing_error: 'Could not fetch image from any URL'
    }).eq('id', image.id);
    return { success: false, error: 'Could not fetch image from any URL' };
  }

  // Convert to base64 using Deno's built-in encoder (no stack overflow)
  const base64Image = encodeBase64(imageData.buffer);
  const detectedMimeType = imageData.mimeType.split(';')[0] || 'image/jpeg';

  console.log(`Image fetched successfully, size: ${imageData.buffer.byteLength}, mime: ${detectedMimeType}`);

  // Step 1: Analyze image with Gemini Vision
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

  // Use gemini-2.5-flash for quality vision analysis
  const visionResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: analysisPrompt },
            { 
              inline_data: {
                mime_type: detectedMimeType,
                data: base64Image
              }
            }
          ]
        }]
      })
    }
  );

  if (!visionResponse.ok) {
    const errorText = await visionResponse.text();
    throw new Error(`Gemini Vision API error (${visionResponse.status}): ${errorText.substring(0, 200)}`);
  }

  const visionData = await visionResponse.json();
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
    console.error('Failed to parse analysis:', analysisText.substring(0, 500));
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
  return { success: true };
}

// Background task to process all images
async function processAllImages(
  jobId: string,
  userId: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  googleApiKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log(`[Background] Starting process_all job: ${jobId}`);
  
  let processed = 0;
  let failed = 0;
  const batchSize = 10;
  let hasMore = true;
  
  try {
    while (hasMore) {
      // Fetch next batch of unprocessed images for this user
      const { data: images, error: fetchError } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', userId)
        .is('embedding', null)
        .not('storage_url', 'is', null)
        .limit(batchSize);
      
      if (fetchError) {
        console.error(`[Background] Error fetching images:`, fetchError.message);
        break;
      }
      
      if (!images || images.length === 0) {
        console.log(`[Background] No more images to process`);
        hasMore = false;
        break;
      }
      
      console.log(`[Background] Processing batch of ${images.length} images`);
      
      for (const image of images) {
        try {
          const result = await processSingleImage(image, supabase, googleApiKey);
          if (result.success) {
            processed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`[Background] Error processing image ${image.id}:`, error);
          failed++;
          
          // Update image with error status
          await supabase
            .from('images')
            .update({
              status: 'error',
              processing_error: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', image.id);
        }
        
        // Update job progress after each image
        const { error: progressError } = await supabase
          .from('processing_jobs')
          .update({
            processed_items: processed,
            failed_items: failed
          })
          .eq('id', jobId);
        
        if (progressError) {
          console.error(`[Background] Failed to update job progress:`, progressError.message);
        }
      }
      
      // Small delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Mark job as completed
    await supabase
      .from('processing_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    console.log(`[Background] Job ${jobId} completed: ${processed} processed, ${failed} failed`);
    
  } catch (error) {
    console.error(`[Background] Job ${jobId} failed:`, error);
    
    await supabase
      .from('processing_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')!;

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    // =========================================================================
    // AUTH VERIFICATION - Verify user owns images before processing
    // =========================================================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create RLS-enforced client using user's JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Auth verification failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // Create admin client for privileged operations (after auth verified)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { image_id, batch = false, limit = 5, process_all = false }: ProcessImageRequest = await req.json();

    console.log('Process image request:', { image_id, batch, limit, process_all, user_id: user.id });

    // =========================================================================
    // PROCESS ALL MODE - Background processing with job tracking
    // =========================================================================
    if (process_all) {
      // Count total unprocessed images for this user
      const { count, error: countError } = await supabaseAuth
        .from('images')
        .select('*', { count: 'exact', head: true })
        .is('embedding', null)
        .not('storage_url', 'is', null);
      
      if (countError) {
        throw new Error(`Failed to count images: ${countError.message}`);
      }
      
      const totalItems = count || 0;
      
      if (totalItems === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No images to process',
          job_id: null,
          total: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Create job record using service role (RLS allows insert for own user_id)
      const { data: job, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          job_type: 'images',
          status: 'running',
          total_items: totalItems,
          processed_items: 0,
          failed_items: 0,
          user_id: user.id
        })
        .select()
        .single();
      
      if (jobError || !job) {
        throw new Error(`Failed to create job: ${jobError?.message}`);
      }
      
      console.log(`Created job ${job.id} for ${totalItems} images`);
      
      // Start background processing using EdgeRuntime.waitUntil
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      EdgeRuntime.waitUntil(
        processAllImages(job.id, user.id, supabaseUrl, supabaseServiceKey, googleApiKey)
      );
      
      // Return immediately with job ID
      return new Response(JSON.stringify({
        success: true,
        job_id: job.id,
        total: totalItems,
        message: 'Processing started in background'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // NORMAL MODE - Process single or batch images synchronously
    // =========================================================================
    let imagesToProcess: any[] = [];

    if (image_id) {
      // Process single image - verify ownership via RLS
      const { data, error } = await supabaseAuth
        .from('images')
        .select('*')
        .eq('id', image_id)
        .single();
      
      if (error) {
        console.error(`Image not found or not owned by user: ${error.message}`);
        return new Response(
          JSON.stringify({ error: 'Image not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      imagesToProcess = [data];
    } else if (batch) {
      // Process unprocessed images - RLS ensures only user's images
      const { data, error } = await supabaseAuth
        .from('images')
        .select('*')
        .is('embedding', null)
        .not('storage_url', 'is', null)
        .limit(limit);
      
      if (error) throw new Error(`Failed to fetch images: ${error.message}`);
      imagesToProcess = data || [];
    } else {
      throw new Error('Must provide image_id, batch=true, or process_all=true');
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
        const result = await processSingleImage(image, supabase, googleApiKey);
        results.push({ id: image.id, ...result });
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
