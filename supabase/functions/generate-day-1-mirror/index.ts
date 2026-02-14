// supabase/functions/generate-day-1-mirror/index.ts
// Edge function to generate Day 1 mini-mirror from 2 voice journals + spiritual place

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const GENERATION_TIMEOUT_MS = 240000; // 4 minutes (match regular mirrors)

// CORS headers for client requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Journal {
  id: string;
  content: string;
  created_at: string;
}

// Generate Day 1 mini-mirror prompt
function generateDay1Prompt(spiritualPlace: string, journal2: Journal, journal3: Journal): string {
  // Sanitize journal content to prevent prompt injection or malformed prompts
  const sanitizeContent = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')    // Escape quotes
      .replace(/\n/g, ' ')     // Replace newlines with spaces
      .replace(/\r/g, '')      // Remove carriage returns
      .replace(/\t/g, ' ')     // Replace tabs with spaces
      .trim();
  };

  const sanitizedJournal2 = sanitizeContent(journal2.content);
  const sanitizedJournal3 = sanitizeContent(journal3.content);

  return `You are a wise, compassionate spiritual director. A user just completed Day 1 onboarding.

CRITICAL: You MUST respond with valid JSON. Escape all quotes in strings using \\" and ensure no unescaped newlines.

SPIRITUAL PLACE: ${spiritualPlace}
(User chose "${spiritualPlace}" from options: Adventuring, Battling, Hiding, Resting, Working, Wandering, Grieving, Celebrating)

QUESTION 2: "What in your life and experience shaped your choice of place?"
ANSWER 2: ${sanitizedJournal2}

QUESTION 3: "When you pray, what do you talk to God about most often?"
ANSWER 3: ${sanitizedJournal3}

Generate a biblical mirror AND one-line summaries in JSON format:

{
  "screen2_biblical": {
    "title": "Biblical Mirror",
    "subtitle": "Your story reflected in Scripture",
    "parallel_story": {
      "character": "Biblical character name (e.g., David, Peter, Ruth)",
      "story": "2-3 sentence story that parallels their experience. Reference their spiritual place (${spiritualPlace}) and their answers.",
      "connection": "How this biblical story connects to their current journey"
    },
    "encouraging_verse": {
      "reference": "Bible verse reference",
      "text": "Full verse text",
      "application": "How this verse speaks to their specific situation. Reference ${spiritualPlace} if relevant."
    },
    "challenging_verse": {
      "reference": "Bible verse reference",
      "text": "Full verse text",
      "invitation": "Gentle invitation for deeper reflection. Not prescriptive, but exploratory."
    }
  },
  "one_line_summaries": {
    "spiritual_journey": "One concise sentence summarizing their answer to question 2 (about what shaped their choice)",
    "prayer_focus": "One concise sentence summarizing their answer to question 3 (about prayer topics)"
  }
}

IMPORTANT REQUIREMENTS:
- Reference their spiritual place (${spiritualPlace}) throughout the response
- Be specific to their actual answers, not generic
- Keep summaries to 10-12 words maximum each
- Ensure all JSON strings are properly formatted (no unescaped quotes or newlines)
- Tone: Warm, encouraging, personal, accessible

Generate only the JSON response with no additional text.`;
}

// Extract 1-2 word theme from focus areas
async function extractFocusTheme(focusText: string, openaiApiKey: string): Promise<string> {
  try {
    console.log('🎯 Extracting focus theme from:', focusText.substring(0, 50));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Extract a 1-2 word theme from this spiritual focus: "${focusText}".
Return ONLY the theme word(s), nothing else. Examples: "Trust", "Purpose", "Healing", "Community", "Growth", "Peace"`
        }],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.error('❌ Theme extraction failed:', response.status);
      return 'Growth';
    }

    const data = await response.json();
    const theme = data.choices[0].message.content.trim();
    console.log('✅ Extracted theme:', theme);

    return theme;
  } catch (error) {
    console.error('❌ Error extracting theme:', error);
    return 'Growth';
  }
}

// Generate mini-mirror with OpenAI
async function generateMiniMirrorWithAI(
  spiritualPlace: string,
  journal2: Journal,
  journal3: Journal,
  openaiApiKey: string
): Promise<any> {
  console.log('🎯 Generating Day 1 mini-mirror');
  console.log(`  Spiritual place: ${spiritualPlace}`);
  console.log(`  Journal 2 length: ${journal2.content.length} chars`);
  console.log(`  Journal 3 length: ${journal3.content.length} chars`);

  const prompt = generateDay1Prompt(spiritualPlace, journal2, journal3);

  try {
    // Call OpenAI with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 10000, // Match regular mirror generation
        response_format: { type: "json_object" }, // Force valid JSON
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI response received');
    console.log('💰 Tokens used:', data.usage?.total_tokens || 'unknown');
    console.log('🔍 Finish reason:', data.choices[0].finish_reason);
    console.log('📏 Content length:', data.choices[0].message.content?.length || 0, 'characters');

    // Check if generation completed successfully
    const finishReason = data.choices[0].finish_reason;
    let rawContent = data.choices[0].message.content;

    // Handle content_filter by making a completion request
    if (finishReason === 'content_filter') {
      console.warn('⚠️ Content filter triggered, attempting to complete response...');

      try {
        // Create new controller for completion request
        const completionController = new AbortController();
        const completionTimeoutId = setTimeout(() => completionController.abort(), GENERATION_TIMEOUT_MS);

        const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-5.1',
            messages: [{
              role: 'user',
              content: `Complete this JSON response. It was cut off mid-generation. Add the missing content and ensure it's valid JSON:

${rawContent}

Continue from where it stopped and complete the entire structure. The final JSON should have this structure:
{
  "screen2_biblical": {
    "parallel_story": { "character": "...", "story": "...", "connection": "..." },
    "encouraging_verse": { "reference": "...", "text": "...", "application": "..." },
    "challenging_verse": { "reference": "...", "text": "...", "invitation": "..." }
  },
  "one_line_summaries": {
    "spiritual_journey": "...",
    "prayer_focus": "..."
  }
}

Return ONLY the complete, valid JSON.`
            }],
            max_completion_tokens: 5000,
            response_format: { type: "json_object" },
          }),
          signal: completionController.signal,
        });

        clearTimeout(completionTimeoutId);

        if (completionResponse.ok) {
          const completionData = await completionResponse.json();
          rawContent = completionData.choices[0].message.content;
          console.log('✅ Successfully completed filtered response');
          console.log('💰 Additional tokens used:', completionData.usage?.total_tokens || 'unknown');
        } else {
          console.warn('⚠️ Completion request failed, using partial response');
        }
      } catch (completionError) {
        console.error('❌ Error completing filtered response:', completionError);
        console.warn('⚠️ Falling back to partial response');
      }
    } else if (finishReason !== 'stop') {
      console.error('⚠️ Generation did not complete normally. Finish reason:', finishReason);
      if (finishReason === 'length') {
        console.error('❌ Hit token limit - need to increase max_completion_tokens');
      }
    }

    if (!rawContent) {
      console.error('❌ No content in OpenAI response');
      throw new Error('OpenAI returned empty content');
    }

    if (rawContent.length < 100) {
      console.warn('⚠️ Very short response from OpenAI:', rawContent);
    }

    // Clean and parse JSON
    let cleanedContent = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let mirrorContent;
    let parseAttempts = 0;
    const maxParseAttempts = 3;

    while (parseAttempts < maxParseAttempts) {
      try {
        if (parseAttempts === 0) {
          mirrorContent = JSON.parse(cleanedContent);
          console.log('✅ JSON parsed successfully');
          break;
        } else if (parseAttempts === 1) {
          console.log('🔧 Attempting to fix JSON (attempt 1: basic fixes)...');
          const fixedContent = cleanedContent
            .replace(/\\n/g, '\\\\n')  // Escape already-escaped newlines
            .replace(/\n/g, ' ')        // Replace literal newlines with spaces
            .replace(/\r/g, '')         // Remove carriage returns
            .replace(/\t/g, ' ');       // Replace tabs with spaces

          mirrorContent = JSON.parse(fixedContent);
          console.log('✅ JSON parsed after basic fixes');
          break;
        } else if (parseAttempts === 2) {
          console.log('🔧 Attempting to fix JSON (attempt 2: aggressive sanitization)...');
          // More aggressive fix: handle unescaped quotes in strings
          const aggressivelyFixed = cleanedContent
            .replace(/\\n/g, '\\\\n')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ')
            // Fix common issues with quotes in Bible verses
            .replace(/: "([^"]*)"([^,}\]])/g, (match, p1, p2) => {
              // If a quote ends but isn't followed by comma/brace, it's likely an unescaped quote
              return `: "${p1}\\"${p2}`;
            });

          mirrorContent = JSON.parse(aggressivelyFixed);
          console.log('✅ JSON parsed after aggressive fixes');
          break;
        }
      } catch (parseError) {
        parseAttempts++;
        if (parseAttempts === 1) {
          console.error('❌ JSON parse error on first attempt:', parseError.message);
          console.error('📄 Failed content (first 1000 chars):', cleanedContent.substring(0, 1000));
          console.error('📄 Failed content (last 500 chars):', cleanedContent.substring(Math.max(0, cleanedContent.length - 500)));
        } else if (parseAttempts >= maxParseAttempts) {
          console.error('❌ All JSON parse attempts failed');
          throw new Error(`AI generation failed: ${parseError.message}`);
        }
      }
    }

    return {
      success: true,
      content: mirrorContent,
      usage: data.usage,
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Generation timeout after 30 seconds');
      throw new Error('Mini-mirror generation timeout - please try again');
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
    console.log('🚀 Generate Day 1 Mini-Mirror Edge Function invoked');

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log(`👤 Generating mini-mirror for user: ${userId}`);

    // Step 1: Get day_1_progress
    console.log('🔍 Fetching Day 1 progress...');
    const { data: progress, error: progressError } = await supabase
      .from('day_1_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progressError || !progress) {
      console.error('❌ Failed to fetch progress:', progressError);
      throw new Error('Day 1 progress not found');
    }

    if (!progress.spiritual_place || !progress.step_2_journal_id || !progress.step_3_journal_id) {
      console.error('❌ Incomplete Day 1 data:', progress);
      throw new Error('Day 1 flow not complete - missing data');
    }

    console.log('✅ Progress loaded:', {
      spiritualPlace: progress.spiritual_place,
      step2: progress.step_2_journal_id,
      step3: progress.step_3_journal_id,
    });

    // Step 2: Fetch both journals
    console.log('📚 Fetching journals...');
    const { data: journals, error: journalsError } = await supabase
      .from('journals')
      .select('id, content, created_at, transcription_status')
      .in('id', [progress.step_2_journal_id, progress.step_3_journal_id]);

    if (journalsError || !journals || journals.length !== 2) {
      console.error('❌ Failed to fetch journals:', journalsError);
      throw new Error('Failed to fetch journals');
    }

    const journal2 = journals.find(j => j.id === progress.step_2_journal_id);
    const journal3 = journals.find(j => j.id === progress.step_3_journal_id);

    if (!journal2 || !journal3) {
      throw new Error('Journals not found');
    }

    // Verify transcriptions are complete
    if (journal2.transcription_status !== 'completed' || journal3.transcription_status !== 'completed') {
      console.error('❌ Transcriptions not complete:', {
        step2: journal2.transcription_status,
        step3: journal3.transcription_status,
      });
      throw new Error('Transcriptions not yet complete');
    }

    console.log('✅ Both journals loaded and transcribed');

    // Step 3: Generate mini-mirror with AI
    console.log('🤖 Starting AI generation...');
    const aiResult = await generateMiniMirrorWithAI(
      progress.spiritual_place,
      journal2,
      journal3,
      openaiApiKey
    );

    if (!aiResult.success) {
      throw new Error('AI generation failed');
    }

    // Step 4: Save mini-mirror to database
    console.log('💾 Saving mini-mirror to database...');

    // Sanitize content to remove null bytes (PostgreSQL can't store \u0000)
    const sanitizeContent = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\u0000/g, '');
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeContent);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[key] = sanitizeContent(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };

    const sanitizedBiblical = sanitizeContent(aiResult.content.screen2_biblical);
    const sanitizedSummaries = sanitizeContent(aiResult.content.one_line_summaries);

    const { data: mirrorData, error: mirrorError } = await supabase
      .from('mirrors')
      .insert({
        custom_user_id: userId,
        mirror_type: 'day_1',
        screen_1_themes: null,
        screen_2_biblical: sanitizedBiblical,
        screen_3_observations: null,
        screen_4_suggestions: null,
        journal_count: 2,
        status: 'completed',
        generation_started_at: new Date().toISOString(),
        generation_completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (mirrorError) {
      console.error('❌ Failed to save mirror:', mirrorError);
      throw new Error('Failed to save mini-mirror');
    }

    console.log(`✅ Mini-mirror saved: ${mirrorData.id}`);

    // Step 5: Update day_1_progress
    console.log('📝 Updating Day 1 progress...');
    const { error: updateError } = await supabase
      .from('day_1_progress')
      .update({
        mini_mirror_id: mirrorData.id,
        generation_status: 'completed',
        current_step: 5,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('⚠️ Failed to update progress:', updateError);
      // Non-critical - mirror is saved
    }

    console.log('🎉 Day 1 mini-mirror generation complete!');

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        mirror: mirrorData,
        summaries: sanitizedSummaries,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in generate-day-1-mirror function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Mini-mirror generation failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
