// supabase/functions/generate-mirror/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { generateCorePrompt, generateEncouragingVersePrompt, generateInvitationToGrowthPrompt } from './prompts.ts'

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

// Make individual OpenAI API call with error handling
async function makeOpenAICall(
  prompt: string,
  callType: string,
  openaiApiKey: string
): Promise<any> {
  console.log(`🎯 Making ${callType} API call (prompt length: ${prompt.length} chars)`);

  try {
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
      console.error(`❌ ${callType} API error:`, response.status, errorText);
      return {
        success: false,
        contentFilterTriggered: false,
        finishReason: 'api_error',
        error: `API error: ${response.status}`,
        usage: null,
      };
    }

    const data = await response.json();
    const finishReason = data.choices[0].finish_reason;
    const rawContent = data.choices[0].message.content;

    console.log(`🏁 ${callType} finish reason:`, finishReason);
    console.log(`💰 ${callType} tokens:`, data.usage?.total_tokens || 'unknown');

    // Check for content filter
    if (finishReason === 'content_filter') {
      console.warn(`⚠️ ${callType} triggered content filter`);
      console.error(`🚨 ${callType} CONTENT FILTER DETAILS:`, JSON.stringify(data, null, 2));
      return {
        success: false,
        contentFilterTriggered: true,
        finishReason,
        content: null,
        usage: data.usage,
      };
    }

    // Parse JSON response
    let cleanedContent = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsedContent;
    let parseAttempts = 0;
    const maxParseAttempts = 3;

    while (parseAttempts < maxParseAttempts) {
      try {
        if (parseAttempts === 0) {
          parsedContent = JSON.parse(cleanedContent);
          console.log(`✅ ${callType} JSON parsed successfully`);
          break;
        } else if (parseAttempts === 1) {
          console.log(`🔧 ${callType} attempting basic JSON fixes...`);
          const fixedContent = cleanedContent
            .replace(/\\n/g, '\\\\n')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ');
          parsedContent = JSON.parse(fixedContent);
          console.log(`✅ ${callType} JSON parsed after basic fixes`);
          break;
        } else {
          console.log(`🔧 ${callType} attempting aggressive JSON fixes...`);
          const aggressivelyFixed = cleanedContent
            .replace(/\\n/g, '\\\\n')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ');
          parsedContent = JSON.parse(aggressivelyFixed);
          console.log(`✅ ${callType} JSON parsed after aggressive fixes`);
          break;
        }
      } catch (parseError) {
        parseAttempts++;
        if (parseAttempts >= maxParseAttempts) {
          console.error(`❌ ${callType} JSON parse failed:`, parseError.message);
          return {
            success: false,
            contentFilterTriggered: false,
            finishReason: 'parse_error',
            error: parseError.message,
            usage: data.usage,
          };
        }
      }
    }

    return {
      success: true,
      contentFilterTriggered: false,
      finishReason,
      content: parsedContent,
      usage: data.usage,
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`❌ ${callType} timeout after 4 minutes`);
      return {
        success: false,
        contentFilterTriggered: false,
        finishReason: 'timeout',
        error: 'Request timeout',
        usage: null,
      };
    }

    console.error(`❌ ${callType} call failed:`, error.message);
    return {
      success: false,
      contentFilterTriggered: false,
      finishReason: 'exception',
      error: error.message,
      usage: null,
    };
  }
}

// Generate Mirror with 3 parallel OpenAI calls
async function generateMirrorWithAI(
  journalEntries: JournalEntry[],
  openaiApiKey: string
): Promise<any> {
  console.log(`🎯 Generating Mirror with 3 parallel calls for ${journalEntries.length} journals`);

  // Generate all 3 prompts
  const corePrompt = generateCorePrompt(journalEntries);
  const encouragingPrompt = generateEncouragingVersePrompt(journalEntries);
  const invitationPrompt = generateInvitationToGrowthPrompt(journalEntries);

  // Make all 3 API calls in parallel
  console.log('🚀 Starting 3 parallel API calls...');
  const [coreResult, encouragingResult, invitationResult] = await Promise.all([
    makeOpenAICall(corePrompt, 'core', openaiApiKey),
    makeOpenAICall(encouragingPrompt, 'encouraging_verse', openaiApiKey),
    makeOpenAICall(invitationPrompt, 'invitation_to_growth', openaiApiKey),
  ]);

  // Log results
  console.log('📊 Call Results:');
  console.log(`  Core: ${coreResult.success ? '✅' : '❌'} (${coreResult.finishReason})`);
  console.log(`  Encouraging: ${encouragingResult.success ? '✅' : '❌'} (${encouragingResult.finishReason})`);
  console.log(`  Invitation: ${invitationResult.success ? '✅' : '❌'} (${invitationResult.finishReason})`);

  // Core is REQUIRED - fail if it didn't succeed
  if (!coreResult.success) {
    console.error('❌ Core generation failed - cannot create Mirror');
    const errorMsg = coreResult.contentFilterTriggered
      ? 'Content filter triggered during core generation. The journal content may contain sensitive material that violates OpenAI content policy.'
      : `Core generation failed: ${coreResult.error || coreResult.finishReason}`;
    throw new Error(errorMsg);
  }

  // Build screen_2_biblical with potential nulls for verses
  const screen2Biblical = {
    title: "Biblical Mirror",
    subtitle: "Pattern matches in Scripture",
    parallel_story: coreResult.content?.screen2_biblical?.parallel_story || null,
    encouraging_verse: encouragingResult.success ? encouragingResult.content?.encouraging_verse : null,
    invitation_to_growth: invitationResult.success ? invitationResult.content?.invitation_to_growth : null,
  };

  // Log partial success warnings
  if (!encouragingResult.success) {
    console.warn('⚠️ Encouraging verse generation failed - will be omitted from Mirror');
  }
  if (!invitationResult.success) {
    console.warn('⚠️ Invitation to growth generation failed - will be omitted from Mirror');
  }

  // Calculate total token usage
  const totalTokens =
    (coreResult.usage?.total_tokens || 0) +
    (encouragingResult.usage?.total_tokens || 0) +
    (invitationResult.usage?.total_tokens || 0);

  console.log(`💰 Total tokens used: ${totalTokens}`);

  return {
    success: true,
    content: {
      screen1_themes: coreResult.content?.screen1_themes,
      screen2_biblical: screen2Biblical,
      screen3_observations: coreResult.content?.screen3_observations,
    },
    usage: { total_tokens: totalTokens },
  };
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

    // Rate limiting disabled - can be re-enabled later if needed by calling
    // check_mirror_generation_rate_limit RPC function

    // Step 1: Get user's group to determine threshold
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

    // Step 2: Get unassigned journals
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

    const { data: mirrorData, error: mirrorError } = await supabase
      .from('mirrors')
      .insert({
        custom_user_id: customUserId,
        user_id: null, // You can populate this if needed
        screen_1_themes: sanitizeContent(aiResult.content.screen1_themes),
        screen_2_biblical: sanitizeContent(aiResult.content.screen2_biblical),
        screen_3_observations: sanitizeContent(aiResult.content.screen3_observations),
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

    // Capture detailed error information
    const errorDetails = {
      message: error.message || 'Mirror generation failed',
      type: error.name || 'UnknownError',
      timestamp: new Date().toISOString(),
    };

    console.error('🔍 Full error details:', JSON.stringify(errorDetails, null, 2));

    // Mark request as failed if it exists
    if (requestRecord?.id && supabase) {
      console.log('📝 Marking request as failed...');
      try {
        const { error: updateError } = await supabase
          .from('mirror_generation_requests')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorDetails.message,
          })
          .eq('id', requestRecord.id);

        if (updateError) {
          console.error('⚠️ Failed to update request status:', updateError);
        } else {
          console.log('✅ Request marked as failed with error details');
        }
      } catch (updateException) {
        console.error('⚠️ Exception while updating request status:', updateException);
        // Continue to return error response to user
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorDetails.message,
        errorType: errorDetails.type,
        timestamp: errorDetails.timestamp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})