// supabase/functions/generate-mirror/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const MIRROR_THRESHOLD = 10; // Minimum journals needed for Mirror generation
const GENERATION_TIMEOUT_MS = 240000; // 4 minutes

// CORS headers for client requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
  custom_user_id: string;
  prompt_text?: string;
}

// Generate Mirror prompt (updated to 3 screens)
function generateMirrorPrompt(journalEntries: JournalEntry[]): string {
  const journalText = journalEntries.map((entry, index) => {
    const date = new Date(entry.created_at).toLocaleDateString();
    if (entry.prompt_text) {
      // Format guided journal entries with prompt context
      return `Entry ${index + 1} (${date}): In response to '${entry.prompt_text}', the user wrote: ${entry.content}`;
    }
    // Format free-form journal entries
    return `Entry ${index + 1} (${date}): ${entry.content}`;
  }).join('\n\n');

  return `You are a wise, compassionate spiritual director analyzing someone's journal entries to provide encouraging spiritual formation insights. 

JOURNAL ENTRIES TO ANALYZE:
${journalText}

Please generate a "Mirror" - a 3-screen spiritual reflection in JSON format with exactly this structure:

{
  "screen1_themes": {
    "title": "Themes",
    "subtitle": "Patterns across your journals",
    "themes": [
      {
        "name": "Theme Name",
        "description": "Brief description of this theme",
        "frequency": "Present in journals from March 15, March 22, and April 3"
      }
    ]
  },
  "screen2_biblical": {
    "title": "Biblical Mirror", 
    "subtitle": "Pattern matches in Scripture",
    "parallel_story": {
      "character": "Biblical character name",
      "story": "Brief story summary that parallels their experience",
      "connection": "How this connects to their journey"
    },
    "encouraging_verse": {
      "reference": "Bible verse reference",
      "text": "Verse text",
      "application": "How this verse speaks to their situation"
    },
    "challenging_verse": {
      "reference": "Bible verse reference", 
      "text": "Verse text",
      "invitation": "Gentle invitation for deeper reflection"
    }
  },
  "screen3_observations": {
    "title": "Observations",
    "subtitle": "Patterns in your framing",
    "self_perception": {
      "observation": "How they tend to view themselves spiritually, with specific journal date references"
    },
    "god_perception": {
      "observation": "How they tend to relate to or view God, with specific journal date references"
    },
    "others_perception": {
      "observation": "How they tend to view or relate to others, with specific journal date references"
    },
    "blind_spots": {
      "observation": "Pattern they may not be aware of that could benefit from attention, with journal date references"
    }
  }
}

IMPORTANT REQUIREMENTS:
- For screen1_themes: Generate exactly 4 themes maximum, no more
- For theme frequency references: Use actual journal dates (e.g., "Present in journals from March 15, March 22, and April 3") instead of entry numbers
- Do NOT include an "insight" field in screen1_themes
- For screen3_observations: Focus only on observations without recommendations. Each section should contain ONLY the observation field with specific journal date references. Do not include growth edges, invitations, challenges, or growth opportunities - just neutral observations of patterns. If no clear evidence exists in the journals for a particular area (self, God, others, blind spots), omit that section entirely rather than making generic observations.
- Reference specific dates from the journal entries provided above
- CRITICAL: Ensure all text in JSON strings is properly formatted. Do not use unescaped quotes or newline characters within strings. Keep text on single lines.

TONE GUIDELINES:
- Warm, encouraging, and non-judgmental
- Acknowledge struggles without being dismissive
- Find genuine hope and growth even in difficult seasons
- Use accessible, modern language while remaining spiritually grounded
- Be specific to their actual journal content, not generic
- Balance affirmation with gentle invitations for growth

Generate only the JSON response with no additional text.`;
}

// Generate Mirror with OpenAI
async function generateMirrorWithAI(
  journalEntries: JournalEntry[],
  openaiApiKey: string
): Promise<any> {
  console.log(`🎯 Generating Mirror for ${journalEntries.length} journals`);
  
  const prompt = generateMirrorPrompt(journalEntries);
  console.log(`📝 Prompt length: ${prompt.length} characters`);

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
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 10000,
        response_format: { type: "json_object" },
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

    let rawContent = data.choices[0].message.content;

    // Check for content filter truncation
    const finishReason = data.choices[0].finish_reason;
    console.log('🏁 Finish reason:', finishReason);

    if (finishReason === 'content_filter') {
      console.warn('⚠️ Content filter triggered, attempting to complete response...');

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
            content: `Complete this JSON response. It was cut off mid-generation. Return only valid, complete JSON with no explanation:\n\n${rawContent}`,
          }],
          max_completion_tokens: 10000,
          response_format: { type: "json_object" },
        }),
      });

      if (completionResponse.ok) {
        const completionData = await completionResponse.json();
        rawContent = completionData.choices[0].message.content;
        console.log('✅ Successfully completed filtered response');
        console.log('📄 Completed response length:', rawContent.length);
      } else {
        console.warn('⚠️ Failed to complete filtered response, proceeding with partial content');
      }
    }

    // Clean and parse JSON with better error handling
    let cleanedContent = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Log the raw content for debugging
    console.log('📄 Raw AI response length:', cleanedContent.length);

    // Multi-attempt JSON parsing with progressive sanitization
    let mirrorContent;
    let parseAttempts = 0;
    const maxParseAttempts = 3;

    while (parseAttempts < maxParseAttempts) {
      try {
        if (parseAttempts === 0) {
          // Attempt 1: Direct parse
          mirrorContent = JSON.parse(cleanedContent);
          console.log('✅ JSON parsed successfully');
          break;
        } else if (parseAttempts === 1) {
          // Attempt 2: Basic fixes (escape newlines)
          console.log('🔧 Attempting to fix JSON (attempt 1: basic fixes)...');
          const fixedContent = cleanedContent
            .replace(/\\n/g, '\\\\n')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ');

          mirrorContent = JSON.parse(fixedContent);
          console.log('✅ JSON parsed after basic fixes');
          break;
        } else if (parseAttempts === 2) {
          // Attempt 3: Aggressive sanitization
          console.log('🔧 Attempting to fix JSON (attempt 2: aggressive sanitization)...');
          const aggressivelyFixed = cleanedContent
            .replace(/\\n/g, '\\\\n')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ')
            .replace(/: "([^"]*)"([^,}\]])/g, (match, p1, p2) => {
              // Fix unescaped quotes within string values
              return `: "${p1}\\"${p2}`;
            });

          mirrorContent = JSON.parse(aggressivelyFixed);
          console.log('✅ JSON parsed after aggressive fixes');
          break;
        }
      } catch (parseError) {
        parseAttempts++;
        if (parseAttempts >= maxParseAttempts) {
          console.error('❌ All JSON parse attempts failed');
          console.error('❌ JSON parse error:', parseError.message);
          console.error('📄 Failed content (first 500 chars):', cleanedContent.substring(0, 500));
          console.error('📄 Failed content (last 500 chars):', cleanedContent.substring(Math.max(0, cleanedContent.length - 500)));
          throw new Error(`AI generation failed: ${parseError.message}\nContent: ${cleanedContent.substring(0, 200)}...`);
        }
        console.log(`⚠️ Parse attempt ${parseAttempts} failed, trying next strategy...`);
      }
    }

    return {
      success: true,
      content: mirrorContent,
      usage: data.usage,
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Generation timeout after 4 minutes');
      throw new Error('Mirror generation timeout - please try again');
    }
    
    console.error('❌ AI generation failed:', error.message);
    throw error;
  }
}

// Retry wrapper for AI generation
async function generateWithRetry(
  journalEntries: JournalEntry[],
  openaiApiKey: string,
  maxRetries: number = 1
): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries}`);
      }
      
      return await generateMirrorWithAI(journalEntries, openaiApiKey);
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt + 1} failed:`, error.message);
      
      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Otherwise, log and continue to retry
      console.log('⏳ Waiting 2 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw lastError!;
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let requestRecord: any = null;
  let supabase: any = null;

  try {
    console.log('🚀 Generate Mirror Edge Function invoked');

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { customUserId } = await req.json();
    
    if (!customUserId) {
      throw new Error('customUserId is required');
    }

    console.log(`👤 Generating Mirror for user: ${customUserId}`);

    // Step 1: Check rate limit
    console.log('🔍 Checking rate limit...');
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_mirror_generation_rate_limit', { user_id: customUserId });

    if (rateLimitError) {
      console.error('❌ Rate limit check failed:', rateLimitError);
      throw new Error('Failed to check rate limit');
    }

    if (rateLimitCheck === true) {
      console.log('⏸️ Rate limit exceeded');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You can only generate one Mirror per 24 hours. Please try again later.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2: Get user's group to determine threshold
    console.log('👥 Fetching user group...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('group_name')
      .eq('id', customUserId)
      .single();

    if (userError) {
      console.error('❌ Failed to fetch user:', userError);
      throw new Error('Failed to fetch user data');
    }

    // Determine threshold based on group
    const threshold = userData?.group_name === 'Mens Group' ? 6 : MIRROR_THRESHOLD;
    console.log(`✅ User group: ${userData?.group_name || 'none'}, Threshold: ${threshold}`);

    // Step 3: Get unassigned journals
    console.log('📚 Fetching unassigned journals...');
    const { data: journals, error: journalsError } = await supabase
      .from('journals')
      .select('*')
      .eq('custom_user_id', customUserId)
      .is('mirror_id', null)
      .order('created_at', { ascending: true });

    if (journalsError) {
      console.error('❌ Failed to fetch journals:', journalsError);
      throw new Error('Failed to fetch journals');
    }

    if (!journals || journals.length < threshold) {
      console.log(`⏸️ Insufficient journals: ${journals?.length || 0}/${threshold}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Need at least ${threshold} journals for Mirror generation. Currently have ${journals?.length || 0}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ Found ${journals.length} journals`);

    // Step 3: Create generation request record (marks as 'processing')
    console.log('📝 Creating generation request record...');
    const { data: requestData, error: requestError } = await supabase
      .from('mirror_generation_requests')
      .insert({
        custom_user_id: customUserId,
        status: 'processing',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (requestError) {
      console.error('❌ Failed to create request record:', requestError);
      throw new Error('Failed to create generation request');
    }

    requestRecord = requestData;
    console.log(`✅ Request record created: ${requestRecord.id}`);

    // Step 4: Generate Mirror with AI (with automatic retry)
    console.log('🤖 Starting AI generation with retry...');
    const aiResult = await generateWithRetry(journals, openaiApiKey, 1);

    if (!aiResult.success) {
      throw new Error('AI generation failed');
    }

    // Step 5: Save Mirror to database (screen_4_suggestions set to null)
    console.log('💾 Saving Mirror to database...');
    const { data: mirrorData, error: mirrorError } = await supabase
      .from('mirrors')
      .insert({
        custom_user_id: customUserId,
        user_id: null, // You can populate this if needed
        screen_1_themes: aiResult.content.screen1_themes,
        screen_2_biblical: aiResult.content.screen2_biblical,
        screen_3_observations: aiResult.content.screen3_observations,
        screen_4_suggestions: null, // ✅ No longer generating this
        journal_count: journals.length,
        status: 'completed',
        generation_started_at: requestRecord.requested_at,
        generation_completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (mirrorError) {
      console.error('❌ Failed to save Mirror:', mirrorError);
      throw new Error('Failed to save Mirror');
    }

    console.log(`✅ Mirror saved: ${mirrorData.id}`);

    // Step 6: Link journals to Mirror
    console.log('🔗 Linking journals to Mirror...');
    const journalIds = journals.map(j => j.id);
    const { error: linkError } = await supabase
      .from('journals')
      .update({ mirror_id: mirrorData.id })
      .in('id', journalIds);

    if (linkError) {
      console.error('❌ Failed to link journals:', linkError);
      // Don't throw - Mirror is saved, this is non-critical
    } else {
      console.log(`✅ Linked ${journalIds.length} journals to Mirror`);
    }

    // Step 7: Update request record to 'completed'
    console.log('✅ Updating request status to completed...');
    const { error: updateError } = await supabase
      .from('mirror_generation_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        mirror_id: mirrorData.id,
      })
      .eq('id', requestRecord.id);

    if (updateError) {
      console.error('⚠️ Failed to update request status:', updateError);
      // Non-critical - Mirror is saved
    }

    console.log('🎉 Mirror generation complete!');

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        mirror: mirrorData,
        journalsUsed: journals.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in generate-mirror function:', error);

    // Mark request as failed if it exists
    if (requestRecord?.id && supabase) {
      console.log('📝 Marking request as failed...');
      try {
        const { error: updateError } = await supabase
          .from('mirror_generation_requests')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', requestRecord.id);

        if (updateError) {
          console.error('⚠️ Failed to update request status:', updateError);
        } else {
          console.log('✅ Request marked as failed');
        }
      } catch (updateException) {
        console.error('⚠️ Exception while updating request status:', updateException);
        // Continue to return error response to user
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Mirror generation failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})