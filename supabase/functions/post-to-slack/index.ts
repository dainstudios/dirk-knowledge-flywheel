import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This function is intentionally disabled to prevent legacy Slack formatting from being used.
  console.log("HIT post-to-slack (DEPRECATED)", {
    method: req.method,
    ts: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      error: "post-to-slack is deprecated. Use process-action with actions.team=true instead.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
