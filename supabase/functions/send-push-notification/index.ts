// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  userId: string; // User ID to send notification to
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId, title, body, data } = await req.json() as NotificationPayload

    console.log(`📬 Sending push notification to user: ${userId}`)
    console.log(`Title: ${title}`)
    console.log(`Body: ${body}`)

    // Get user's push token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('❌ Error fetching user:', userError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!userData.push_token) {
      console.log('⚠️ User has no push token registered')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User has no push token registered'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Send push notification via Expo Push API
    const message = {
      to: userData.push_token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }

    console.log('📤 Sending to Expo Push API...')

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()
    console.log('Expo Push API response:', result)

    if (!response.ok || result.errors) {
      console.error('❌ Expo Push API error:', result)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send push notification',
          details: result
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ Push notification sent successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Push notification sent'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
