#!/usr/bin/env node
/**
 * Day 1 Mini-Mirror Generation Content Filter Test Script
 *
 * Tests Day 1 mini-mirror generation with different user responses
 *
 * Usage:
 *   node scripts/test-day1-mirror-generation.js
 *
 * Requirements:
 *   - OPENAI_API_KEY environment variable set or hardcoded
 */

const fs = require('fs');
const path = require('path');

// ⚠️ WARNING: Do not commit your API key to git!
// For testing convenience, you can paste your key here temporarily:
const HARDCODED_API_KEY = ''; // Paste your OpenAI key here for testing

const OPENAI_API_KEY = HARDCODED_API_KEY || process.env.OPENAI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, 'test-results-day1');
const TRIALS_PER_SET = 3;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Shared sanitization helper
function sanitizeContent(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .trim();
}

// Core prompt: parallel_story + one_line_summaries
function generateCorePrompt(spiritualPlace, journal2Content, journal3Content) {
  const sanitizedJournal2 = sanitizeContent(journal2Content);
  const sanitizedJournal3 = sanitizeContent(journal3Content);

  return `You are a wise, compassionate spiritual director. A new directee is helping you understand where they are in their journey.

CRITICAL: You MUST respond with valid JSON.

SPIRITUAL PLACE: ${spiritualPlace}

QUESTION 2: "What in your life and experience shaped your choice of place?"
ANSWER 2: ${sanitizedJournal2}

QUESTION 3: "When you pray, what do you talk to God about most often?"
ANSWER 3: ${sanitizedJournal3}

Generate in JSON format:

{
  "parallel_story": {
    "character": "Biblical character name (e.g., David, Peter, Ruth)",
    "story": "2-3 sentence story that parallels their experience. Reference their spiritual place (${spiritualPlace}).",
    "connection": "How this biblical story connects to their current journey"
  },
  "one_line_summaries": {
    "spiritual_journey": "One concise sentence summarizing answer to question 2 (10-12 words max)",
    "prayer_focus": "One concise sentence summarizing answer to question 3 (10-12 words max)"
  }
}

TONE: Warm, encouraging, non-judgmental, specific to their answers.
Generate only the JSON response.`;
}

// Encouraging verse prompt (independent)
function generateEncouragingVersePrompt(spiritualPlace, journal2Content, journal3Content) {
  const sanitizedJournal2 = sanitizeContent(journal2Content);
  const sanitizedJournal3 = sanitizeContent(journal3Content);

  return `You are a compassionate spiritual director providing encouragement.

SPIRITUAL PLACE: ${spiritualPlace}

QUESTION 2: "What shaped your choice of place?"
ANSWER 2: ${sanitizedJournal2}

QUESTION 3: "What do you pray about most?"
ANSWER 3: ${sanitizedJournal3}

Generate an encouraging Bible verse in JSON format:

{
  "encouraging_verse": {
    "reference": "Bible verse reference",
    "text": "Full verse text",
    "application": "How this verse speaks to their specific situation"
  }
}

TONE: Warm, hopeful, supportive.
Generate only the JSON response.`;
}

// Invitation to growth prompt (independent)
function generateInvitationPrompt(spiritualPlace, journal2Content, journal3Content) {
  const sanitizedJournal2 = sanitizeContent(journal2Content);
  const sanitizedJournal3 = sanitizeContent(journal3Content);

  return `You are a spiritual director inviting deeper reflection.

SPIRITUAL PLACE: ${spiritualPlace}

QUESTION 2: "What shaped your choice of place?"
ANSWER 2: ${sanitizedJournal2}

QUESTION 3: "What do you pray about most?"
ANSWER 3: ${sanitizedJournal3}

Generate a reflective invitation in JSON format:

{
  "invitation_to_growth": {
    "reference": "Bible verse reference",
    "text": "Full verse text",
    "invitation": "Gentle invitation for deeper reflection. Not prescriptive, but exploratory."
  }
}

TONE: Gentle, exploratory, non-judgmental.
Generate only the JSON response.`;
}

// Helper: Make single API call
async function makeOpenAICall(prompt, callType) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 10000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        callType,
        error: `OpenAI API error: ${response.status} - ${errorText}`,
        contentFilterTriggered: false,
      };
    }

    const data = await response.json();
    const finishReason = data.choices[0].finish_reason;
    const content = data.choices[0].message.content;
    const contentFilterTriggered = finishReason === 'content_filter';

    return {
      success: !contentFilterTriggered,
      callType,
      contentFilterTriggered,
      finishReason,
      content,
      usage: data.usage,
      fullResponse: data,
    };
  } catch (error) {
    return {
      success: false,
      callType,
      error: error.message,
      contentFilterTriggered: false,
    };
  }
}

// Main function: Make 3 parallel calls
async function generateDay1Mirror(spiritualPlace, journal2, journal3, testName, trialNum) {
  console.log(`\n🎯 Testing: ${testName} - Trial ${trialNum}`);
  console.log(`  Spiritual Place: ${spiritualPlace}`);

  // Generate 3 prompts
  const corePrompt = generateCorePrompt(spiritualPlace, journal2, journal3);
  const encouragingPrompt = generateEncouragingVersePrompt(spiritualPlace, journal2, journal3);
  const invitationPrompt = generateInvitationPrompt(spiritualPlace, journal2, journal3);

  // Make 3 parallel API calls
  const [coreResult, encouragingResult, invitationResult] = await Promise.all([
    makeOpenAICall(corePrompt, 'core'),
    makeOpenAICall(encouragingPrompt, 'encouraging_verse'),
    makeOpenAICall(invitationPrompt, 'invitation_to_growth'),
  ]);

  // Log individual results
  console.log(`  Core: ${coreResult.success ? '✅ SUCCESS' : '❌ FAILED'} (${coreResult.finishReason || coreResult.error})`);
  console.log(`  Encouraging: ${encouragingResult.success ? '✅ SUCCESS' : '❌ FAILED'} (${encouragingResult.finishReason || encouragingResult.error})`);
  console.log(`  Invitation: ${invitationResult.success ? '✅ SUCCESS' : '❌ FAILED'} (${invitationResult.finishReason || invitationResult.error})`);

  const totalTokens =
    (coreResult.usage?.total_tokens || 0) +
    (encouragingResult.usage?.total_tokens || 0) +
    (invitationResult.usage?.total_tokens || 0);
  console.log(`  Total tokens: ${totalTokens}`);

  // Combine results
  const anyContentFilter = coreResult.contentFilterTriggered ||
                          encouragingResult.contentFilterTriggered ||
                          invitationResult.contentFilterTriggered;
  const allSucceeded = coreResult.success && encouragingResult.success && invitationResult.success;

  return {
    testName,
    trialNum,
    spiritualPlace,
    allSucceeded,
    anyContentFilter,
    totalTokens,
    core: coreResult,
    encouraging_verse: encouragingResult,
    invitation_to_growth: invitationResult,
  };
}

// Test cases - 5 different Day 1 user responses
const day1TestCases = [
  {
    name: 'User 1: Battling (Addiction Recovery)',
    spiritualPlace: 'Battling',
    question2: "I've been fighting addiction for the past three years. Started with prescription painkillers after my back surgery, then it spiraled. I've been to rehab twice. Relapsed last year and almost lost my family. My wife gave me an ultimatum and I finally got serious about recovery. Eight months sober now but every day feels like a battle. The cravings, the shame, the broken trust - it all weighs on me. I chose 'Battling' because that's what sobriety feels like - constant spiritual warfare against something that wants to destroy me.",
    question3: "I pray a lot about strength to stay sober. I ask God to remove the desire to use. I pray for my wife and kids, that they can forgive me and trust me again. Sometimes I just cry and tell God I'm scared of failing again. I pray for other people in my recovery group, especially the ones who are struggling. And honestly, I pray for understanding - why did God let me get addicted in the first place? What's the purpose of all this pain?"
  },
  {
    name: 'User 2: Grieving (Loss of Child)',
    spiritualPlace: 'Grieving',
    question2: "Our daughter Emma died six months ago. She was only seven. Leukemia. We prayed for healing, had the whole church praying, believed God would save her. But she died anyway. My faith feels shattered. I don't understand why God would take an innocent child. People keep saying 'she's in a better place' or 'God needed another angel' and it makes me want to scream. I chose 'Grieving' because that's all I am right now - a broken parent who lost their baby and can't make sense of a God who claims to be loving but let this happen.",
    question3: "I don't really pray anymore. When I try, I just get angry. Sometimes I yell at God asking why He took Emma. Other times I beg Him to bring her back even though I know that's impossible. My wife prays for peace and healing for our family. I mostly sit in silence. If I'm honest, I pray that God will help me believe again, because right now I feel abandoned by Him. I pray that someday this pain won't be so crushing that I can't breathe."
  },
  {
    name: 'User 3: Wandering (Faith Crisis)',
    spiritualPlace: 'Wandering',
    question2: "I grew up evangelical, very conservative church. I was a youth group leader, went on mission trips, the whole thing. But over the past few years, I've started questioning everything I was taught. The church's stance on LGBTQ+ people doesn't align with Jesus' actual teachings about love. The political Christianity I see makes me nauseous. I've been deconstructing my faith and it's lonely and disorienting. I chose 'Wandering' because I feel lost - I haven't abandoned God, but I've left the church and the certainty I used to have. I'm trying to find what I actually believe versus what I was programmed to believe.",
    question3: "My prayers have changed completely. I used to pray structured prayers with scripture. Now I mostly just sit in silence and try to sense if God is there. I pray for clarity about what's true. I pray for the courage to be okay with uncertainty. I pray for my family who thinks I'm backsliding and breaking their hearts. Sometimes I pray to know if Jesus would really condemn people for who they love. I pray to find a faith community that values questions over easy answers."
  },
  {
    name: 'User 4: Hiding (Shame & Secret)',
    spiritualPlace: 'Hiding',
    question2: "I'm hiding something that's eating me alive. I had an affair two years ago. My spouse doesn't know. I ended it, confessed to God, begged for forgiveness, but the guilt is destroying me. Every time my spouse trusts me or tells me they love me, I feel sick. I should tell them, I know that's what integrity demands, but I'm terrified of losing my family. I go to church and pretend everything is fine while internally I'm drowning in shame. I chose 'Hiding' because that's exactly what I'm doing - hiding from my spouse, hiding from real community, hiding from the consequences of my choices.",
    question3: "I pray constantly for forgiveness, though I wonder if God can forgive me when I'm still actively deceiving my spouse. I pray for courage to confess but then I chicken out. I pray that somehow the truth never comes out, which I know is cowardly. I pray for my spouse and kids, that God would protect them from the fallout of my sin. Sometimes I pray that God would just expose me so I don't have to make the choice. I pray to become the person I'm pretending to be."
  },
  {
    name: 'User 5: Resting (Post-Burnout)',
    spiritualPlace: 'Resting',
    question2: "I burned out spectacularly after ten years in ministry. I was a worship pastor, doing 60-hour weeks, saying yes to everything, measuring my worth by how productive I was for God. My marriage was falling apart, my kids barely knew me, my health was declining. I had a breakdown and had to step away from ministry completely. That was a year ago. I'm still recovering, learning what it means to just be instead of constantly doing. I chose 'Resting' because that's what God is teaching me - that my value isn't in what I produce for Him, but simply in being His child.",
    question3: "My prayers now are so different from before. I used to pray long intercession lists, strategic prayers for church growth, spiritual warfare prayers. Now I mostly practice contemplative prayer - just sitting in God's presence without an agenda. I pray for healing from the damage of ministry culture. I pray to hear God's voice outside of productivity and performance. I pray for my family, that they can forgive me for neglecting them. I pray to learn Sabbath rest and to trust that God doesn't need me to exhaust myself to accomplish His work."
  }
];

// Main test runner
async function runTests() {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    process.exit(1);
  }

  console.log('🚀 Starting Day 1 Mini-Mirror Content Filter Tests');
  console.log(`📊 Testing ${day1TestCases.length} cases × ${TRIALS_PER_SET} trials = ${day1TestCases.length * TRIALS_PER_SET} total tests\n`);

  const results = [];
  let totalTests = 0;
  let allSucceededCount = 0;
  let anyFilterCount = 0;

  // Track by call type
  let coreSuccessCount = 0;
  let encouragingSuccessCount = 0;
  let invitationSuccessCount = 0;
  let coreFilterCount = 0;
  let encouragingFilterCount = 0;
  let invitationFilterCount = 0;

  for (const testCase of day1TestCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${testCase.name}`);
    console.log(`Spiritual Place: ${testCase.spiritualPlace}`);
    console.log('='.repeat(60));

    for (let trial = 1; trial <= TRIALS_PER_SET; trial++) {
      totalTests++;
      const result = await generateDay1Mirror(
        testCase.spiritualPlace,
        testCase.question2,
        testCase.question3,
        testCase.name,
        trial
      );
      results.push(result);

      // Track overall
      if (result.allSucceeded) allSucceededCount++;
      if (result.anyContentFilter) anyFilterCount++;

      // Track by call type
      if (result.core.success) coreSuccessCount++;
      if (result.encouraging_verse.success) encouragingSuccessCount++;
      if (result.invitation_to_growth.success) invitationSuccessCount++;
      if (result.core.contentFilterTriggered) coreFilterCount++;
      if (result.encouraging_verse.contentFilterTriggered) encouragingFilterCount++;
      if (result.invitation_to_growth.contentFilterTriggered) invitationFilterCount++;

      // Save individual result
      const filename = `${testCase.name.replace(/[^a-z0-9]/gi, '_')}_trial${trial}.json`;
      fs.writeFileSync(
        path.join(OUTPUT_DIR, filename),
        JSON.stringify(result, null, 2)
      );

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Generate summary report
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tests: ${totalTests}`);
  console.log(`All 3 calls succeeded: ${allSucceededCount} (${(allSucceededCount/totalTests * 100).toFixed(1)}%)`);
  console.log(`Any content filter triggered: ${anyFilterCount} (${(anyFilterCount/totalTests * 100).toFixed(1)}%)`);

  console.log(`\n📋 Success Rate by Call Type:`);
  console.log(`  Core (parallel_story + summaries):`);
  console.log(`    ✅ Succeeded: ${coreSuccessCount}/${totalTests} (${(coreSuccessCount/totalTests * 100).toFixed(1)}%)`);
  console.log(`    🚨 Content filter: ${coreFilterCount}/${totalTests} (${(coreFilterCount/totalTests * 100).toFixed(1)}%)`);

  console.log(`  Encouraging Verse:`);
  console.log(`    ✅ Succeeded: ${encouragingSuccessCount}/${totalTests} (${(encouragingSuccessCount/totalTests * 100).toFixed(1)}%)`);
  console.log(`    🚨 Content filter: ${encouragingFilterCount}/${totalTests} (${(encouragingFilterCount/totalTests * 100).toFixed(1)}%)`);

  console.log(`  Invitation to Growth:`);
  console.log(`    ✅ Succeeded: ${invitationSuccessCount}/${totalTests} (${(invitationSuccessCount/totalTests * 100).toFixed(1)}%)`);
  console.log(`    🚨 Content filter: ${invitationFilterCount}/${totalTests} (${(invitationFilterCount/totalTests * 100).toFixed(1)}%)`);

  // Break down by case
  console.log(`\n📋 Results by Test Case:`);
  for (const testCase of day1TestCases) {
    const caseResults = results.filter(r => r.testName === testCase.name);
    const caseAllSucceeded = caseResults.filter(r => r.allSucceeded).length;
    console.log(`  ${testCase.name}: ${caseAllSucceeded}/${TRIALS_PER_SET} all succeeded`);
  }

  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    testType: 'Day 1 Mini-Mirror (3 Parallel Calls)',
    totalTests,
    allSucceededCount,
    allSucceededRate: (allSucceededCount / totalTests * 100).toFixed(1) + '%',
    anyContentFilterCount: anyFilterCount,
    anyContentFilterRate: (anyFilterCount / totalTests * 100).toFixed(1) + '%',
    byCallType: {
      core: {
        successCount: coreSuccessCount,
        successRate: (coreSuccessCount / totalTests * 100).toFixed(1) + '%',
        contentFilterCount: coreFilterCount,
        contentFilterRate: (coreFilterCount / totalTests * 100).toFixed(1) + '%',
      },
      encouraging_verse: {
        successCount: encouragingSuccessCount,
        successRate: (encouragingSuccessCount / totalTests * 100).toFixed(1) + '%',
        contentFilterCount: encouragingFilterCount,
        contentFilterRate: (encouragingFilterCount / totalTests * 100).toFixed(1) + '%',
      },
      invitation_to_growth: {
        successCount: invitationSuccessCount,
        successRate: (invitationSuccessCount / totalTests * 100).toFixed(1) + '%',
        contentFilterCount: invitationFilterCount,
        contentFilterRate: (invitationFilterCount / totalTests * 100).toFixed(1) + '%',
      },
    },
    resultsByCase: day1TestCases.map(testCase => ({
      name: testCase.name,
      spiritualPlace: testCase.spiritualPlace,
      trials: TRIALS_PER_SET,
      allSucceeded: results.filter(r => r.testName === testCase.name && r.allSucceeded).length,
    })),
    allResults: results.map(r => ({
      testName: r.testName,
      trialNum: r.trialNum,
      spiritualPlace: r.spiritualPlace,
      allSucceeded: r.allSucceeded,
      anyContentFilter: r.anyContentFilter,
      totalTokens: r.totalTokens,
      core: {
        success: r.core.success,
        contentFilter: r.core.contentFilterTriggered,
        finishReason: r.core.finishReason,
        error: r.core.error,
      },
      encouraging_verse: {
        success: r.encouraging_verse.success,
        contentFilter: r.encouraging_verse.contentFilterTriggered,
        finishReason: r.encouraging_verse.finishReason,
        error: r.encouraging_verse.error,
      },
      invitation_to_growth: {
        success: r.invitation_to_growth.success,
        contentFilter: r.invitation_to_growth.contentFilterTriggered,
        finishReason: r.invitation_to_growth.finishReason,
        error: r.invitation_to_growth.error,
      },
    }))
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log(`\n✅ Results saved to: ${OUTPUT_DIR}`);
  console.log(`📄 Summary: ${path.join(OUTPUT_DIR, 'summary.json')}`);
}

// Run tests
runTests().catch(console.error);
