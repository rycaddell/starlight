// supabase/functions/generate-onboarding-preview/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GENERATION_TIMEOUT_MS = 60000; // 1 minute (preview is faster than full Mirror)

// CORS headers for client requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate onboarding preview prompt
function generateOnboardingPreviewPrompt(journalContent: string): string {
  return `You are a wise, compassionate spiritual director. Someone has just written their first spiritual journal entry. Create a brief encouraging preview to show them what ongoing journaling might reveal.

THEIR JOURNAL ENTRY:
${journalContent}

Generate a JSON response with this structure:

{
  "biblical_profile": {
    "character": "Biblical character name that resonates with their entry",
    "connection": "2-3 sentences connecting their spiritual journey to this biblical figure"
  },
  "encouraging_verse": {
    "reference": "Bible verse reference",
    "text": "Full verse text",
    "application": "2-3 sentences about how this verse speaks to their current situation"
  }
}

IMPORTANT:
- Be specific to their actual journal content
- Warm, encouraging, non-judgmental tone
- Find genuine hope even in struggles
- Use accessible, modern language
- Keep it brief - this is just a preview

Generate only the JSON response with no additional text.`;
}

// Generate preview with OpenAI
async function generatePreviewWithAI(
  journalContent: string,
  openaiApiKey: string
): Promise<any> {
  console.log('🎯 Generating onboarding preview');
  
  const prompt = generateOnboardingPreviewPrompt(journalContent);
  console.log(`📝 Prompt length: ${prompt.length} characters`);

  const requestBody = {
    model: 'gpt-5-mini',
    messages: [{ role: 'user', content: prompt }],
    max_completion_tokens: 2000,
  };
  
  console.log('📤 Request body:', JSON.stringify({
    model: requestBody.model,
    messages: [{ role: 'user', content: `${prompt.substring(0, 100)}...` }],
    max_completion_tokens: requestBody.max_completion_tokens,
  }));

  try {
    // Call OpenAI with timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      
      // Try to parse error as JSON for better error message
      try {
        const errorJson = JSON.parse(errorText);
        console.error('❌ OpenAI error details:', JSON.stringify(errorJson, null, 2));
        throw new Error(`OpenAI API error: ${response.status} - ${errorJson.error?.message || errorText}`);
      } catch {
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log('✅ OpenAI response received');
    console.log('💰 Tokens used:', data.usage?.total_tokens || 'unknown');

    // Check if we have the expected response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Unexpected OpenAI response structure:', JSON.stringify(data));
      throw new Error('Invalid OpenAI response structure');
    }

    const rawContent = data.choices[0].message.content;
    console.log('📄 Raw content length:', rawContent?.length || 0);
    console.log('📄 Raw content preview:', rawContent?.substring(0, 200));
    
    if (!rawContent || rawContent.trim().length === 0) {
      console.error('❌ Empty content from OpenAI');
      throw new Error('Empty response from OpenAI');
    }
    
    // Clean and parse JSON
    const cleanedContent = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    console.log('🧹 Cleaned content preview:', cleanedContent.substring(0, 200));
    
    const previewContent = JSON.parse(cleanedContent);
    console.log('✅ JSON parsed successfully');
    console.log('✅ Preview has biblical_profile:', !!previewContent.biblical_profile);
    console.log('✅ Preview has encouraging_verse:', !!previewContent.encouraging_verse);

    return {
      success: true,
      content: previewContent,
      usage: data.usage,
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Generation timeout after 1 minute');
      throw new Error('Preview generation timeout - please try again');
    }
    
    console.error('❌ AI generation failed:', error.message);
    throw error;
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Generate Onboarding Preview Edge Function invoked');

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get request body
    const { journalContent } = await req.json();
    
    if (!journalContent || !journalContent.trim()) {
      throw new Error('journalContent is required');
    }

    console.log(`📝 Generating preview for journal (${journalContent.length} chars)`);

    // Generate preview with AI
    console.log('🤖 Starting AI generation...');
    const aiResult = await generatePreviewWithAI(journalContent, openaiApiKey);

    if (!aiResult.success) {
      throw new Error('AI generation failed');
    }

    console.log('🎉 Preview generation complete!');

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        content: aiResult.content,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in generate-onboarding-preview function:', error);

    // Return fallback content on error
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Preview generation failed',
        fallback: {
          biblical_profile: {
            character: "David",
            connection: "Like David in the Psalms, you're bringing your honest thoughts and feelings to God. David didn't hide his struggles or doubts - he brought them into the light through writing and prayer. Your willingness to reflect like this is already a step toward spiritual growth."
          },
          encouraging_verse: {
            reference: "Psalm 139:23-24",
            text: "Search me, God, and know my heart; test me and know my anxious thoughts. See if there is any offensive way in me, and lead me in the way everlasting.",
            application: "This verse reminds us that honest self-reflection before God is not just acceptable - it's invited. As you continue journaling, you're creating space for God to reveal patterns, growth areas, and His leading in your life."
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Still return 200 so client can use fallback
      }
    );
  }
})