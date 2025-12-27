import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get('id');

    if (!fileId) {
      console.error('Missing file ID parameter');
      return new Response('Missing file ID', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log(`Proxying Google Drive image: ${fileId}`);

    // Try multiple Google Drive URL formats
    const urls = [
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    ];

    let imageResponse: Response | null = null;
    let lastError: string = '';

    for (const driveUrl of urls) {
      try {
        console.log(`Trying URL: ${driveUrl}`);
        const response = await fetch(driveUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          redirect: 'follow',
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          // Check if it's actually an image
          if (contentType.startsWith('image/')) {
            imageResponse = response;
            console.log(`Success with URL: ${driveUrl}, Content-Type: ${contentType}`);
            break;
          } else {
            lastError = `Not an image: ${contentType}`;
            console.log(`Response not an image from ${driveUrl}: ${contentType}`);
          }
        } else {
          lastError = `HTTP ${response.status}`;
          console.log(`Failed with status ${response.status} from ${driveUrl}`);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        lastError = errMsg;
        console.log(`Error fetching ${driveUrl}: ${errMsg}`);
      }
    }

    if (!imageResponse) {
      console.error(`All URLs failed for file ID: ${fileId}. Last error: ${lastError}`);
      return new Response(`Failed to fetch image: ${lastError}`, { 
        status: 404,
        headers: corsHeaders 
      });
    }

    const imageData = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    console.log(`Successfully proxied image ${fileId}, size: ${imageData.byteLength} bytes`);

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Proxy error:', errMsg);
    return new Response(`Proxy error: ${errMsg}`, { 
      status: 500,
      headers: corsHeaders
    });
  }
});
