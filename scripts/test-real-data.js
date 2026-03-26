#!/usr/bin/env node
/**
 * Mirror Prompt Tester — Real Production Data
 *
 * Fetches real journals + Day 1 data from Supabase for a specific user,
 * runs the current prompts against them, and prints the results.
 *
 * Usage:
 *   node scripts/test-real-data.js                     # uses default USER_ID below
 *   node scripts/test-real-data.js [userId] [mirror|day1|both]
 *
 * Setup (one-time):
 *   Add to .env.local (never commit this file):
 *     SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *     OPENAI_API_KEY=sk-...
 *
 * The service role key bypasses RLS so you can fetch any user's data.
 * Find it: Supabase dashboard → Settings → API → service_role key.
 */

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_USER_ID = '23813684-d957-4509-9c28-8ead940a8529';
const SUPABASE_URL = 'https://olqdyikgelidrytiiwfm.supabase.co';
const MODEL = 'gpt-5.4';

const userId = process.argv[2] || DEFAULT_USER_ID;
const mirrorType = process.argv[3] || 'both'; // 'mirror' | 'day1' | 'both'

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(__dirname, '../.env.local'));
loadEnvFile(path.join(__dirname, '../.env'));

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set. Add it to .env.local');
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not set. Add it to .env.local');
  process.exit(1);
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function supabaseGet(table, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── OpenAI helper ────────────────────────────────────────────────────────────

async function callOpenAI(prompt, label) {
  process.stdout.write(`  → ${label}... `);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 10000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.log(`❌ ${res.status}`);
    return { success: false, error: err };
  }

  const data = await res.json();
  const choice = data.choices[0];
  const tokens = data.usage?.total_tokens ?? '?';
  if (choice.finish_reason === 'content_filter') {
    console.log(`🚫 content_filter (${tokens} tokens)`);
    return { success: false, contentFilter: true };
  }

  console.log(`✅ ${tokens} tokens`);
  return { success: true, parsed: JSON.parse(choice.message.content), tokens };
}

// ─── Prompts (mirror) ─────────────────────────────────────────────────────────

function formatJournals(entries) {
  return entries.map((e, i) => {
    const d = new Date(e.created_at);
    const date = `${d.getMonth() + 1}/${d.getDate()}`;
    return e.prompt_text
      ? `Entry ${i + 1} (${date}): In response to '${e.prompt_text}', the user wrote: ${e.content}`
      : `Entry ${i + 1} (${date}): ${e.content}`;
  }).join('\n\n');
}

function mirrorCorePrompt(entries) {
  const text = formatJournals(entries);
  return `You are a wise, compassionate spiritual director analyzing someone's journal entries to provide encouraging spiritual formation insights.

JOURNAL ENTRIES TO ANALYZE:
${text}

Generate themes, biblical parallel, and observations in JSON format:

{
  "screen1_themes": {
    "title": "Themes",
    "subtitle": "Patterns across your journals",
    "themes": [
      {
        "name": "Theme Name",
        "description": "Brief description of this theme",
        "frequency": "Present in journals from [actual dates from entries]"
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
    "growth_areas": {
      "observation": "Pattern they may not be aware of that could benefit from attention, with journal date references"
    }
  }
}

REQUIREMENTS:
- Exactly 4 themes maximum
- Use actual journal dates in frequency references
- Observations only - no recommendations or growth edges
- Omit observation sections if no clear evidence
- Properly formatted JSON strings
- The character field must be 25 characters or fewer

TONE:
- Warm, encouraging, and non-judgmental.
- Acknowledge struggles without being dismissive.
- Use accessible, modern language while remaining spiritually grounded.
- Be specific to their actual journal content, not generic.
- Balance affirmation with gentle invitations for growth.
- Sound like someone who has chosen their words carefully
- Maintain warmth and patience, but with measured, efficient phrasing - no filler

Generate only JSON.`;
}

function mirrorEncouragingVersePrompt(entries) {
  const text = formatJournals(entries);
  return `You are a compassionate spiritual director writing one section of a spiritual reflection called a Mirror, based on a user's journal entries.

JOURNAL ENTRIES:
${text}

Generate an encouraging Bible verse and application in JSON format:

{
  "encouraging_verse": {
    "reference": "Bible verse reference",
    "text": "Full verse text",
    "application": "How this verse speaks to their specific situation"
  }
}

YOUR ROLE:
You are reflecting back what you see — not directing what the user should do. The application should name what is already true or already present in the user's life and let the verse speak to it. Celebrate what you notice. Do not prescribe practices, suggest next steps, or resolve the tensions you surface. Leave space for the user and God to do that work together.

APPLICATION REQUIREMENTS:
- 4-6 sentences maximum
- Name specific details from their journals — not generic spiritual encouragement
- Affirm what is already alive in them spiritually, even if small or unintentional
- Do not instruct, advise, or interpret what the user should conclude
- End with the verse speaking into their situation, not a call to action

TONE:
- Warm, unhurried, and precise — no filler
- Pastoral but not preachy
- Comfortable leaving things open

Generate only JSON.`;
}

function mirrorInvitationPrompt(entries) {
  const text = formatJournals(entries);
  return `You are a compassionate spiritual director writing one section of a spiritual reflection called a Mirror, based on a user's journal entries.

JOURNAL ENTRIES:
${text}

Generate a reflective invitation in JSON format:

{
  "invitation_to_growth": {
    "reference": "Bible verse reference",
    "text": "Full verse text",
    "invitation": "A brief reflection and 1-2 open questions that point the user toward God."
  }
}

YOUR ROLE:
You are opening a door, not leading the user through it. Name the tension, longing, or pattern you see honestly — then invite the user to bring it to God. Do not resolve the tension, suggest what they should do, or ask questions that assume a predetermined answer. The user and God do the work of integration together; you are only creating space for that conversation to begin.

INVITATION REQUIREMENTS:
- 4-6 sentences maximum
- Begin by briefly naming what you see in their journals — the specific burden, longing, or pattern the verse speaks to
- Let the verse land without explaining what it means for them
- Close with 1-2 genuine questions that point inward or toward God — not toward behavior or action
- Questions should open, not guide. Avoid questions that contain an implied answer or lead toward a specific reframe.
- Do not suggest practices, experiments, prayers, or next steps

TONE:
- Warm, unhurried, and precise — no filler
- More like a spiritual director asking a good question than a pastor giving a homily
- Comfortable leaving things genuinely unresolved

Generate only JSON.`;
}

// ─── Prompts (day 1) ──────────────────────────────────────────────────────────

function sanitize(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .trim();
}

function day1CorePrompt(spiritualPlace, j2, j3) {
  const s2 = sanitize(j2.content);
  const s3 = sanitize(j3.content);
  return `You are a wise, compassionate spiritual director. A new directee is helping you understand where they are in their journey and you're trying to give them a vision for their spiritual growth.

SPIRITUAL PLACE: ${spiritualPlace}
(User chose "${spiritualPlace}" from options: Adventuring, Battling, Hiding, Resting, Working, Wandering, Grieving, Celebrating)

QUESTION 2: "What in your life and experience shaped your choice of place?"
ANSWER 2: ${s2}

QUESTION 3: "When you pray, what do you talk to God about most often?"
ANSWER 3: ${s3}

Generate a biblical parallel and one-line summaries in JSON format:

{
  "screen2_biblical": {
    "title": "Biblical Mirror",
    "subtitle": "Your story reflected in Scripture",
    "parallel_story": {
      "character": "Biblical character name (e.g., David, Peter, Ruth)",
      "story": "2-3 sentence story that parallels their experience. Reference their spiritual place (${spiritualPlace}) and their answers.",
      "connection": "How this biblical story connects to their current journey"
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
- The character field must be 25 characters or fewer
- Use standard JSON encoding — apostrophes and single quotes do not need escaping

TONE:
- Warm, encouraging, and non-judgmental.
- Acknowledge struggles without being dismissive.
- Use accessible, modern language while remaining spiritually grounded.
- Be specific to their actual journal content, not generic.
- Balance affirmation with gentle invitations for growth.
- Sound like someone who has chosen their words carefully
- Maintain warmth and patience, but with measured, efficient phrasing - no filler

Generate only JSON.`;
}

function day1EncouragingVersePrompt(spiritualPlace, j2, j3) {
  const s2 = sanitize(j2.content);
  const s3 = sanitize(j3.content);
  return `You are a compassionate spiritual director providing encouragement to a new directee.

SPIRITUAL PLACE: ${spiritualPlace}
(User chose "${spiritualPlace}" from options: Adventuring, Battling, Hiding, Resting, Working, Wandering, Grieving, Celebrating)

QUESTION 2: "What in your life and experience shaped your choice of place?"
ANSWER 2: ${s2}

QUESTION 3: "When you pray, what do you talk to God about most often?"
ANSWER 3: ${s3}

Generate an encouraging Bible verse in JSON format:

{
  "encouraging_verse": {
    "reference": "Bible verse reference",
    "text": "Full verse text",
    "application": "How this verse speaks to their specific situation. Reference ${spiritualPlace} if relevant."
  }
}

IMPORTANT REQUIREMENTS:
- Be specific to their actual answers, not generic
- Keep summaries to 10-12 words maximum each
- Use standard JSON encoding — apostrophes and single quotes do not need escaping

TONE:
- Warm, encouraging, and non-judgmental.
- Acknowledge struggles without being dismissive.
- Use accessible, modern language while remaining spiritually grounded.
- Be specific to their actual journal content, not generic.
- Balance affirmation with gentle invitations for growth.
- Sound like someone who has chosen their words carefully
- Maintain warmth and patience, but with measured, efficient phrasing - no filler

Generate only JSON.`;
}

function day1InvitationPrompt(spiritualPlace, j2, j3) {
  const s2 = sanitize(j2.content);
  const s3 = sanitize(j3.content);
  return `You are a spiritual director inviting deeper reflection for a new directee.

SPIRITUAL PLACE: ${spiritualPlace}
(User chose "${spiritualPlace}" from options: Adventuring, Battling, Hiding, Resting, Working, Wandering, Grieving, Celebrating)

QUESTION 2: "What in your life and experience shaped your choice of place?"
ANSWER 2: ${s2}

QUESTION 3: "When you pray, what do you talk to God about most often?"
ANSWER 3: ${s3}

Generate a reflective invitation in JSON format:

{
  "invitation_to_growth": {
    "reference": "Bible verse reference",
    "text": "Full verse text",
    "invitation": "Gentle invitation for deeper reflection. Not prescriptive, but exploratory."
  }
}

IMPORTANT REQUIREMENTS:
- Be specific to their actual answers, not generic
- Keep summaries to 10-12 words maximum each
- Use standard JSON encoding — apostrophes and single quotes do not need escaping

TONE:
- Gentle, exploratory, non-judgmental.
- Sound like someone who has chosen their words carefully
- Maintain warmth and patience, but with measured, efficient phrasing - no filler

Generate only JSON.`;
}

// ─── Pretty print ─────────────────────────────────────────────────────────────

function printSection(title, obj) {
  console.log('\n' + '─'.repeat(60));
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
  console.log(JSON.stringify(obj, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runMirror(journals) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  REGULAR MIRROR  (${journals.length} journals)`);
  console.log('═'.repeat(60));

  const [core, verse, invitation] = await Promise.all([
    callOpenAI(mirrorCorePrompt(journals), 'Core (themes + biblical + observations)'),
    callOpenAI(mirrorEncouragingVersePrompt(journals), 'Encouraging verse'),
    callOpenAI(mirrorInvitationPrompt(journals), 'Invitation to growth'),
  ]);

  if (core.success)       printSection('Screen 1 — Themes + Biblical + Observations', core.parsed);
  if (verse.success)      printSection('Screen 2 — Encouraging Verse', verse.parsed);
  if (invitation.success) printSection('Screen 3 — Invitation to Growth', invitation.parsed);
}

async function runDay1Mirror(spiritualPlace, j2, j3) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  DAY 1 MIRROR  (spiritual place: ${spiritualPlace})`);
  console.log('═'.repeat(60));
  console.log(`  Q2 preview: "${j2.content.slice(0, 80)}..."`);
  console.log(`  Q3 preview: "${j3.content.slice(0, 80)}..."`);

  const [core, verse, invitation] = await Promise.all([
    callOpenAI(day1CorePrompt(spiritualPlace, j2, j3), 'Core (parallel story + summaries)'),
    callOpenAI(day1EncouragingVersePrompt(spiritualPlace, j2, j3), 'Encouraging verse'),
    callOpenAI(day1InvitationPrompt(spiritualPlace, j2, j3), 'Invitation to growth'),
  ]);

  if (core.success)       printSection('Biblical Mirror + One-Line Summaries', core.parsed);
  if (verse.success)      printSection('Encouraging Verse', verse.parsed);
  if (invitation.success) printSection('Invitation to Growth', invitation.parsed);
}

async function main() {
  console.log(`\n🔍 Fetching data for user: ${userId}`);

  // ── Fetch journals ──
  const journals = await supabaseGet('journals', {
    'custom_user_id': `eq.${userId}`,
    'order': 'created_at.asc',
    'select': 'id,content,created_at,prompt_text',
  });
  console.log(`📓 Found ${journals.length} journal entries`);

  // ── Fetch Day 1 progress ──
  const day1Rows = await supabaseGet('day_1_progress', {
    'user_id': `eq.${userId}`,
    'select': 'spiritual_place,step_2_journal_id,step_3_journal_id',
    'limit': '1',
  });
  const day1 = day1Rows[0];
  if (day1) {
    console.log(`🌱 Day 1 progress found (spiritual place: ${day1.spiritual_place})`);
  } else {
    console.log('🌱 No Day 1 progress found');
  }

  // ── Run requested mirror types ──
  if ((mirrorType === 'mirror' || mirrorType === 'both') && journals.length > 0) {
    const subset = journals.slice(-15); // most recent 15 (matches prod behaviour)
    await runMirror(subset);
  }

  if ((mirrorType === 'day1' || mirrorType === 'both') && day1) {
    // Fetch the two Day 1 voice journals by ID
    const [j2Rows, j3Rows] = await Promise.all([
      supabaseGet('journals', { 'id': `eq.${day1.step_2_journal_id}`, 'select': 'id,content,created_at' }),
      supabaseGet('journals', { 'id': `eq.${day1.step_3_journal_id}`, 'select': 'id,content,created_at' }),
    ]);

    if (!j2Rows[0] || !j3Rows[0]) {
      console.log('⚠️  Could not find Day 1 voice journals — skipping Day 1 mirror');
    } else {
      await runDay1Mirror(day1.spiritual_place, j2Rows[0], j3Rows[0]);
    }
  }

  console.log('\n✅ Done\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
