// =============================================================================
// ⚠️  DEPRECATED — DO NOT USE  ⚠️
// =============================================================================
// 
// This function is deprecated as of v3.0.
// All Slack posting MUST go through process-action which uses the canonical
// Slack template with deterministic rendering.
// 
// This endpoint returns HTTP 410 Gone to prevent accidental usage.
// 
// Migration: Use process-action with actions: { team: true } instead.
// =============================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.warn("DEPRECATED: post-to-slack called. Use process-action instead.");

  return new Response(
    JSON.stringify({
      error: "This endpoint is deprecated. Use process-action with actions: { team: true } instead.",
      deprecated: true,
      migration: "POST to /functions/v1/process-action with body: { item_id: '...', actions: { team: true } }"
    }),
    { 
      status: 410, // Gone
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
