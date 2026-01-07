// supabase/functions/wednesday-journal-reminder/index.ts
// Sends journaling reminders to Mens Group users on Wednesdays at 12:30 PM MT

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('📅 Running Wednesday journal reminder check...')

    // Get current date in Mountain Time
    const now = new Date()
    const mtFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const mtParts = mtFormatter.formatToParts(now)
    const mtDate = mtParts.find(p => p.type === 'day')?.value
    const mtMonth = mtParts.find(p => p.type === 'month')?.value
    const mtYear = mtParts.find(p => p.type === 'year')?.value
    const mtHour = mtParts.find(p => p.type === 'hour')?.value
    const mtMinute = mtParts.find(p => p.type === 'minute')?.value

    console.log(`🕐 Current MT time: ${mtMonth}/${mtDate}/${mtYear} ${mtHour}:${mtMinute}`)

    // Check if today is Wednesday (3 = Wednesday in JavaScript)
    const mtDateObj = new Date(`${mtYear}-${mtMonth}-${mtDate}T${mtHour}:${mtMinute}:00`)
    const dayOfWeek = mtDateObj.getUTCDay()

    if (dayOfWeek !== 3) {
      console.log(`ℹ️ Not Wednesday (day: ${dayOfWeek}), skipping`)
      return new Response(
        JSON.stringify({ success: true, message: 'Not Wednesday, no reminders sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get start and end of today in Mountain Time (for journal check)
    const startOfDay = `${mtYear}-${mtMonth}-${mtDate}T00:00:00`
    const endOfDay = `${mtYear}-${mtMonth}-${mtDate}T23:59:59`

    // Get all Mens Group users with push tokens
    const { data: mensGroupUsers, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, push_token')
      .eq('group_name', 'Mens Group')
      .not('push_token', 'is', null)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw new Error('Failed to fetch users')
    }

    console.log(`👥 Found ${mensGroupUsers?.length || 0} Mens Group users with push tokens`)

    if (!mensGroupUsers || mensGroupUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sentCount = 0
    let skippedCount = 0

    // Check each user to see if they've journaled today
    for (const user of mensGroupUsers) {
      // Check if user has journaled today
      const { data: journals, error: journalsError } = await supabase
        .from('journals')
        .select('id')
        .eq('custom_user_id', user.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .limit(1)

      if (journalsError) {
        console.error(`❌ Error checking journals for user ${user.id}:`, journalsError)
        continue
      }

      if (journals && journals.length > 0) {
        console.log(`✅ User ${user.display_name} already journaled today, skipping`)
        skippedCount++
        continue
      }

      // User hasn't journaled today - send reminder
      console.log(`📬 Sending reminder to ${user.display_name}`)

      const message = {
        to: user.push_token,
        sound: 'default',
        title: 'Journal Reminder',
        body: 'What was your takeaway from Men\'s Group today?',
        data: {
          type: 'journal_reminder',
          screen: 'journal_voice',
        },
      }

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        })

        const result = await response.json()

        if (response.ok && !result.errors) {
          sentCount++
          console.log(`✅ Sent reminder to ${user.display_name}`)
        } else {
          console.error(`❌ Failed to send to ${user.display_name}:`, result)
        }
      } catch (error) {
        console.error(`❌ Error sending to ${user.display_name}:`, error)
      }
    }

    console.log(`✅ Wednesday reminders complete: ${sentCount} sent, ${skippedCount} skipped`)

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        skippedCount,
        totalUsers: mensGroupUsers.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
