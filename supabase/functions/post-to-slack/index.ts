import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostToSlackRequest {
  item_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    if (!slackWebhookUrl) {
      console.error('SLACK_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Slack webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { item_id }: PostToSlackRequest = await req.json();
    if (!item_id) {
      return new Response(
        JSON.stringify({ error: 'item_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Posting item ${item_id} to Slack for user ${user.id}`);

    // Fetch the knowledge item
    const { data: item, error: itemError } = await supabase
      .from('knowledge_items')
      .select('id, title, summary, url, google_drive_url, dain_context, content_type, source_credibility')
      .eq('id', item_id)
      .eq('user_id', user.id)
      .single();

    if (itemError || !item) {
      console.error('Item fetch error:', itemError);
      return new Response(
        JSON.stringify({ error: 'Item not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Slack message
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📚 ${item.title}`,
          emoji: true
        }
      }
    ];

    // Add content type and credibility
    if (item.content_type || item.source_credibility) {
      const contextParts = [];
      if (item.content_type) contextParts.push(item.content_type);
      if (item.source_credibility) contextParts.push(item.source_credibility);
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: contextParts.join(' • ') }]
      });
    }

    // Add summary
    if (item.summary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: item.summary.length > 500 ? item.summary.substring(0, 497) + '...' : item.summary
        }
      });
    }

    // Add DAIN context
    if (item.dain_context) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Why it matters:* ${item.dain_context.length > 300 ? item.dain_context.substring(0, 297) + '...' : item.dain_context}`
        }
      });
    }

    // Add links
    const linkParts = [];
    if (item.url) linkParts.push(`<${item.url}|View Source>`);
    if (item.google_drive_url) linkParts.push(`<${item.google_drive_url}|View PDF>`);
    
    if (linkParts.length > 0) {
      blocks.push({
        type: 'actions',
        elements: linkParts.map(link => ({
          type: 'button',
          text: { type: 'plain_text', text: link.includes('PDF') ? '📄 View PDF' : '🔗 View Source', emoji: true },
          url: link.match(/https?:\/\/[^\|>]+/)?.[0] || ''
        }))
      });
    }

    // Post to Slack
    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks })
    });

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      console.error('Slack API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to post to Slack' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update item status
    const { error: updateError } = await supabase
      .from('knowledge_items')
      .update({
        shared_to_team: true,
        shared_to_team_at: new Date().toISOString(),
        status: 'knowledge'
      })
      .eq('id', item_id);

    if (updateError) {
      console.error('Update error:', updateError);
      // Don't fail - the Slack post succeeded
    }

    console.log(`Successfully posted item ${item_id} to Slack`);

    return new Response(
      JSON.stringify({ success: true, item_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in post-to-slack:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
