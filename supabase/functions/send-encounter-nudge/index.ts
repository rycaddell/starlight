// supabase/functions/send-encounter-nudge/index.ts
// Sends smart encounter-aware push notifications based on user spiritual rhythms
// Runs at :30 past each hour via cron. Checks each user's rhythm slots against current local time.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Time window end hours in local time (24h). Cron fires at :30, so 11:30, 16:30, 21:30.
const TIME_WINDOW_HOURS: Record<string, number> = {
  morning: 11,    // fires at 11:30 AM (30 min after morning window closes at 11:00)
  afternoon: 16,  // fires at 4:30 PM (30 min after afternoon window closes at 4:00)
  evening: 21,    // fires at 9:30 PM (~30 min after evening end)
}

// Notification copy banks per slot context — body only (no title; iOS shows app name)
// Use {name} as a placeholder for the user's display name.
const COPY_BANKS: Record<string, string[]> = {
  church: [
    "{name}, what landed in the service today? Capture it before it gets lost in the week.",
    "What from church today is still with you?",
    "What did God have for you at church today?",
  ],
  small_group: [
    "What came up in group tonight that's still with you?",
    "What did someone say tonight you don't want to lose?",
    "{name}, what are you still processing from small group? Capture it.",
  ],
  one_on_one: [
    "{name}, what's one thing from your time with God this morning worth holding?",
    "What showed up in your time with God this morning?",
    "Anything from quiet time this morning before the day gets away from you?",
  ],
  default_morning: [
    "{name}, anything from this morning worth capturing?",
  ],
  default_evening: [
    "End of the day. What are you reflecting on?",
  ],
}

const CUSTOM_SLOT_TEMPLATES = [
  (label: string) => `You just had ${label}. What's still with you?`,
  (label: string) => `What came out of ${label} today worth capturing?`,
]

function buildCustomCopy(label: string): string[] {
  return CUSTOM_SLOT_TEMPLATES.map(t => t(label))
}

function personalize(template: string, name: string): string {
  return template.replace('{name}', name)
}

function getLocalDateTime(timezone: string): { hour: number; dayOfWeek: string; dateString: string } {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
  const dayOfWeek = parts.find(p => p.type === 'weekday')?.value ?? ''
  const year = parts.find(p => p.type === 'year')?.value ?? ''
  const month = parts.find(p => p.type === 'month')?.value ?? ''
  const day = parts.find(p => p.type === 'day')?.value ?? ''
  const dateString = `${year}-${month}-${day}` // YYYY-MM-DD in user's timezone
  return { hour, dayOfWeek, dateString }
}

function isSameCalendarDay(isoString: string | null, timezone: string): boolean {
  if (!isoString) return false
  const { dateString: todayString } = getLocalDateTime(timezone)
  const thenFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const thenParts = thenFormatter.formatToParts(new Date(isoString))
  const thenYear = thenParts.find(p => p.type === 'year')?.value ?? ''
  const thenMonth = thenParts.find(p => p.type === 'month')?.value ?? ''
  const thenDay = thenParts.find(p => p.type === 'day')?.value ?? ''
  const thenString = `${thenYear}-${thenMonth}-${thenDay}`
  return todayString === thenString
}

function isDormant(isoString: string | null): boolean {
  if (!isoString) return false
  const then = new Date(isoString).getTime()
  const now = Date.now()
  return now - then > 14 * 24 * 60 * 60 * 1000
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const debug = url.searchParams.get('debug') === 'true'

    console.log(`🔔 Running send-encounter-nudge... ${debug ? '[DEBUG MODE]' : ''}`)

    // Fetch users with notifications enabled and push tokens
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, push_token, timezone, spiritual_rhythm, last_opened_at')
      .eq('notifications_enabled', true)
      .not('push_token', 'is', null)
      .not('spiritual_rhythm', 'is', null)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw new Error('Failed to fetch users')
    }

    console.log(`👥 Found ${users?.length ?? 0} users with notifications enabled`)

    // Fetch day_1_progress.completed_at for all relevant users
    const userIds = (users ?? []).map((u: any) => u.id)
    const day1CompletedAtMap: Record<string, string | null> = {}

    if (userIds.length > 0) {
      const { data: day1Rows } = await supabase
        .from('day_1_progress')
        .select('custom_user_id, completed_at')
        .in('custom_user_id', userIds)

      for (const row of (day1Rows ?? [])) {
        day1CompletedAtMap[row.custom_user_id] = row.completed_at
      }
    }

    let sentCount = 0
    let skippedCount = 0

    for (const user of (users ?? [])) {
      const timezone = user.timezone ?? 'America/Denver'
      let localTime: { hour: number; dayOfWeek: string; dateString: string }
      try {
        localTime = getLocalDateTime(timezone)
      } catch {
        skippedCount++
        continue
      }

      if (!debug) {
        // Suppression rule 1: dormant (last opened > 14 days ago)
        if (isDormant(user.last_opened_at)) {
          skippedCount++
          continue
        }

        // Suppression rule 2: already opened today (same calendar date in user's timezone)
        if (isSameCalendarDay(user.last_opened_at, timezone)) {
          skippedCount++
          continue
        }

        // Suppression rule 3: completed Day 1 today
        const day1CompletedAt = day1CompletedAtMap[user.id] ?? null
        if (isSameCalendarDay(day1CompletedAt, timezone)) {
          skippedCount++
          continue
        }
      }

      const slots: any[] = Array.isArray(user.spiritual_rhythm) ? user.spiritual_rhythm : []

      // Find the first matching slot. In debug mode, pick the first enabled slot regardless of time.
      const matchedSlot = debug
        ? slots.find((slot: any) => slot.enabled)
        : slots.find((slot: any) => {
            if (!slot.enabled || !slot.timeWindow) return false

            const windowEndHour = TIME_WINDOW_HOURS[slot.timeWindow]
            if (windowEndHour !== localTime.hour) return false

            // 1:1 with God fires daily (no day restriction)
            if (!slot.hasDaySelection) return true

            return slot.day === localTime.dayOfWeek
          })

      // Suppression rule 4: no matching slot for this time
      if (!matchedSlot) {
        skippedCount++
        continue
      }

      // Select copy bank: known slot IDs first, then custom label, then time-aware default
      const defaultBank = localTime.hour < 16 ? COPY_BANKS.default_morning : COPY_BANKS.default_evening
      const copyBank =
        matchedSlot.id === 'church' ? COPY_BANKS.church
        : matchedSlot.id === 'small_group' ? COPY_BANKS.small_group
        : matchedSlot.id === 'one_on_one' ? COPY_BANKS.one_on_one
        : matchedSlot.label ? buildCustomCopy(matchedSlot.label)
        : defaultBank

      const name = user.display_name ?? 'Friend'
      const body = personalize(pickRandom(copyBank), name)

      const message = {
        to: user.push_token,
        sound: 'default',
        body,
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
