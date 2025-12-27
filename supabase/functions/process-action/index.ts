import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionRequest {
  item_id: string;
  actions: {
    trash: boolean;
    team: boolean;
    linkedin: boolean;
    newsletter: boolean;
    keep: boolean;
  };
}

Deno.serve(async (req) => {
  console.log('=== process-action function invoked ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required', details: 'No auth header in request' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the token is valid by getting the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', details: authError?.message || 'Session may have expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('User authenticated:', user.id);

    // Parse request body
    const body: ActionRequest = await req.json();
    const { item_id, actions } = body;

    console.log('Processing action for item:', item_id);
    console.log('Actions:', actions);

    if (!item_id) {
      return new Response(
        JSON.stringify({ error: 'item_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine the status and queue flags
    let status: string;
    let queuedForTeam = false;
    let queuedForLinkedin = false;
    let queuedForNewsletter = false;

    if (actions.trash) {
      // Trash is exclusive - overrides everything
      status = 'trash';
    } else {
      // Save to knowledge base
      status = 'knowledge';
      
      // Set queue flags based on selections
      queuedForTeam = actions.team;
      queuedForLinkedin = actions.linkedin;
      queuedForNewsletter = actions.newsletter;
    }

    // Update the knowledge item
    const { data, error } = await supabase
      .from('knowledge_items')
      .update({
        status,
        queued_for_team: queuedForTeam,
        queued_for_linkedin: queuedForLinkedin,
        queued_for_newsletter: queuedForNewsletter,
        curated_at: new Date().toISOString(),
      })
      .eq('id', item_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating item:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update item', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build summary of actions taken
    const actionsTaken: string[] = [];
    if (actions.trash) {
      actionsTaken.push('Moved to Trash');
    } else {
      if (actions.team) actionsTaken.push('Shared to Team');
      if (actions.linkedin) actionsTaken.push('Added to LinkedIn Queue');
      if (actions.newsletter) actionsTaken.push('Added to Newsletter Queue');
      if (actionsTaken.length === 0 || actions.keep) {
        actionsTaken.push('Saved to Knowledge Base');
      }
    }

    console.log('Successfully processed item:', item_id);
    console.log('Actions taken:', actionsTaken);

    return new Response(
      JSON.stringify({
        success: true,
        item_id,
        status,
        actions_taken: actionsTaken,
        message: actionsTaken.join(', '),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
