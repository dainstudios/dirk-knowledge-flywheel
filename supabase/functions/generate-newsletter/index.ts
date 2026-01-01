import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsletterItem {
  id: string;
  title: string;
  context: string;
  key_findings: string[];
  dain_take: string;
  source_url?: string;
}

interface NewsletterDraft {
  intro: string;
  items: NewsletterItem[];
  closing: string;
  markdown: string;
  plain_text: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { item_ids } = await req.json();

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one item_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating newsletter for ${item_ids.length} items:`, item_ids);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch knowledge items
    const { data: items, error: fetchError } = await supabase
      .from('knowledge_items')
      .select(`
        id,
        title,
        summary,
        dain_context,
        quotables,
        key_findings,
        curator_notes,
        author,
        author_organization,
        url,
        content_type
      `)
      .in('id', item_ids);

    if (fetchError) {
      console.error('Error fetching items:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch knowledge items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No items found with the provided IDs' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${items.length} items for newsletter generation`);

    // Build the prompt for Claude
    const itemsContext = items.map((item, index) => `
### Item ${index + 1}: ${item.title}
- **Source**: ${item.author_organization || item.author || 'Unknown'}
- **Type**: ${item.content_type || 'Article'}
- **URL**: ${item.url || 'N/A'}
- **Summary**: ${item.summary || 'No summary available'}
- **DAIN Context**: ${item.dain_context || 'No context available'}
- **Key Findings**: ${item.key_findings?.join('; ') || 'None extracted'}
- **Quotables**: ${item.quotables?.join('; ') || 'None'}
- **Curator Notes**: ${item.curator_notes || 'None'}
`).join('\n');

    const systemPrompt = `You are a newsletter editor for DAIN Studios, a data and AI consultancy. 
Your task is to synthesize multiple knowledge items into a compelling newsletter section.

Writing style:
- Professional but engaging
- Punchy and direct
- Focus on actionable insights
- Use the DAIN Studios perspective (practical AI implementation, real business value)

Output format: You MUST respond with valid JSON matching this structure:
{
  "intro": "2-3 sentence introduction that identifies connecting themes",
  "items": [
    {
      "id": "item-uuid",
      "title": "Original title",
      "context": "1-2 sentences explaining what this source is and why it matters",
      "key_findings": ["Finding 1", "Finding 2", "Finding 3"],
      "dain_take": "1-2 sentences with DAIN's unique perspective/implication",
      "source_url": "original URL"
    }
  ],
  "closing": "Engagement question or call to action"
}`;

    const userPrompt = `Generate a newsletter section for these ${items.length} knowledge items:

${itemsContext}

Remember:
- Identify 1-2 connecting themes across all items
- Write a punchy intro (2-3 sentences)
- For each item: context (what is it), key findings (3 bullets max), DAIN take (unique perspective)
- End with an engagement question

Respond ONLY with the JSON object, no markdown code blocks.`;

    // Call Claude API
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling Claude API...');

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt,
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const claudeData = await claudeResponse.json();
    const generatedText = claudeData.content[0]?.text;

    if (!generatedText) {
      console.error('No content in Claude response');
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned empty response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Claude response received, parsing...');

    // Parse the JSON response
    let parsedDraft;
    try {
      parsedDraft = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError, generatedText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate markdown and plain text versions
    const markdown = generateMarkdown(parsedDraft);
    const plainText = generatePlainText(parsedDraft);

    const draft: NewsletterDraft = {
      intro: parsedDraft.intro,
      items: parsedDraft.items,
      closing: parsedDraft.closing,
      markdown,
      plain_text: plainText,
    };

    console.log('Newsletter draft generated successfully');

    return new Response(
      JSON.stringify({ success: true, draft }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateMarkdown(draft: any): string {
  let md = `🎯 **THIS EDITION**\n\n${draft.intro}\n\n---\n\n`;

  for (const item of draft.items) {
    md += `## ${item.title}\n\n`;
    md += `**Context:** ${item.context}\n\n`;
    md += `**Key Findings:**\n`;
    for (const finding of item.key_findings) {
      md += `• ${finding}\n`;
    }
    md += `\n**DAIN Take:** ${item.dain_take}\n\n`;
    if (item.source_url) {
      md += `🔗 [Read more](${item.source_url})\n\n`;
    }
    md += `---\n\n`;
  }

  md += `💬 ${draft.closing}`;

  return md;
}

function generatePlainText(draft: any): string {
  let text = `🎯 THIS EDITION\n\n${draft.intro}\n\n---\n\n`;

  for (const item of draft.items) {
    text += `${item.title}\n\n`;
    text += `Context: ${item.context}\n\n`;
    text += `Key Findings:\n`;
    for (const finding of item.key_findings) {
      text += `• ${finding}\n`;
    }
    text += `\nDAIN Take: ${item.dain_take}\n\n`;
    if (item.source_url) {
      text += `Read more: ${item.source_url}\n\n`;
    }
    text += `---\n\n`;
  }

  text += `💬 ${draft.closing}`;

  return text;
}
