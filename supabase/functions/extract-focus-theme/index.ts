// supabase/functions/extract-focus-theme/index.ts
// Edge function to extract 1-2 word theme from Day 1 focus areas

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { focusText } = await req.json();

    if (!focusText || typeof focusText !== 'string') {
      throw new Error('focusText is required');
    }

    console.log('🎯 Extracting theme from:', focusText.substring(0, 50));

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.warn('⚠️ OpenAI key not found, using fallback');
      return new Response(
        JSON.stringify({ success: true, theme: 'Growth' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Extract a 1-2 word theme from this spiritual focus: "${focusText}".
Return ONLY the theme word(s), nothing else. Examples: "Trust", "Purpose", "Healing", "Community", "Growth", "Peace", "Love"`
        }],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.error('❌ OpenAI error:', response.status);
      return new Response(
        JSON.stringify({ success: true, theme: 'Growth' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const theme = data.choices[0].message.content.trim();
    console.log('✅ Extracted theme:', theme);

    return new Response(
      JSON.stringify({ success: true, theme }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
