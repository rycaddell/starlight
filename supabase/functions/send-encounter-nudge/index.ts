// supabase/functions/send-encounter-nudge/index.ts
// Sends smart encounter-aware push notifications based on user spiritual rhythms
// Runs hourly via cron. Checks each user's rhythm slots against current local time.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Time window end hours in local time (24h)
const TIME_WINDOW_HOURS: Record<string, number> = {
  morning: 11,    // 11:00 AM
  afternoon: 16,  // 4:00 PM
  evening: 20,    // 8:00 PM (8:30 rounded to hour trigger)
}

// Notification copy banks per slot context
const COPY_BANKS: Record<string, Array<{ title: string; body: string }>> = {
  church: [
    { title: 'What did God say today?', body: 'Capture what stood out in church while it\'s fresh.' },
    { title: 'Something landed this morning', body: 'What did you hear today that you don\'t want to forget?' },
    { title: 'Don\'t let it slip away', body: 'Take 2 minutes to capture what God said in church today.' },
  ],
  small_group: [
    { title: 'What came up in group?', body: 'Something worth capturing from your small group today.' },
    { title: 'God speaks in community', body: 'What did you hear — or say — that you want to hold onto?' },
    { title: 'Capture it before life moves on', body: 'What stood out from your group time today?' },
  ],
  one_on_one: [
    { title: 'Time with God', body: 'What did He say? Capture it before the day takes over.' },
    { title: 'He\'s been speaking', body: 'What\'s been on your heart? Take a moment to write it down.' },
    { title: 'Still, small voice', body: 'What did you sense God saying today?' },
  ],
  default: [
    { title: 'God speaks.', body: 'What has He been saying? Capture it in Oxbow.' },
    { title: 'Don\'t forget what you heard', body: 'Take 2 minutes to write it down.' },
    { title: 'Something worth capturing', body: 'What did God put on your heart today?' },
  ],
}

function getLocalDateTime(timezone: string): { hour: number; dayOfWeek: string } {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    weekday: 'long',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
  const dayOfWeek = parts.find(p => p.type === 'weekday')?.value ?? ''
  return { hour, dayOfWeek }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function isWithin24Hours(isoString: string | null): boolean {
  if (!isoString) return false
  const then = new Date(isoString).getTime()
  const now = Date.now()
  return now - then < 24 * 60 * 60 * 1000
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔔 Running send-encounter-nudge...')

    // Fetch users with notifications enabled and push tokens
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, push_token, timezone, spiritual_rhythm, last_opened_at')
      .eq('notifications_enabled', true)
      .not('push_token', 'is', null)
      .not('spiritual_rhythm', 'is', null)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw new Error('Failed to fetch users')
    }

    console.log(`👥 Found ${users?.length ?? 0} users with notifications enabled`)

    let sentCount = 0
    let skippedCount = 0

    for (const user of (users ?? [])) {
      // Anti-spam: skip if opened within last 24h
      if (isWithin24Hours(user.last_opened_at)) {
        skippedCount++
        continue
      }

      const timezone = user.timezone ?? 'America/Denver'
      let localTime: { hour: number; dayOfWeek: string }
      try {
        localTime = getLocalDateTime(timezone)
      } catch {
        skippedCount++
        continue
      }

      const slots: any[] = Array.isArray(user.spiritual_rhythm) ? user.spiritual_rhythm : []

      // Find slots that match: enabled, timeWindow ending this hour, and day matches
      const matchingSlots = slots.filter((slot: any) => {
        if (!slot.enabled || !slot.timeWindow) return false

        const windowEndHour = TIME_WINDOW_HOURS[slot.timeWindow]
        if (windowEndHour !== localTime.hour) return false

        // 1:1 with God fires daily (no day restriction)
        if (!slot.hasDaySelection) return true

        return slot.day === localTime.dayOfWeek
      })

      if (matchingSlots.length === 0) {
        skippedCount++
        continue
      }

      // Pick the first matching slot for copy context
      const matchedSlot = matchingSlots[0]
      const copyBank = COPY_BANKS[matchedSlot.id] ?? COPY_BANKS.default
      const copy = pickRandom(copyBank)

      const message = {
        to: user.push_token,
        sound: 'default',
        title: copy.title,
        body: copy.body,
        data: {
          type: 'encounter_nudge',
          slotId: matchedSlot.id,
          screen: 'journal_voice',
        },
      }

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        })

        const result = await response.json()

        if (response.ok && !result.errors) {
          sentCount++
          console.log(`✅ Sent nudge to user ${user.id} (slot: ${matchedSlot.id})`)
        } else {
          console.error(`❌ Failed to send to user ${user.id}:`, result)
        }
      } catch (error) {
        console.error(`❌ Error sending to user ${user.id}:`, error)
      }
    }

    console.log(`✅ Encounter nudge complete: ${sentCount} sent, ${skippedCount} skipped`)

    return new Response(
      JSON.stringify({ success: true, sentCount, skippedCount, totalUsers: users?.length ?? 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
