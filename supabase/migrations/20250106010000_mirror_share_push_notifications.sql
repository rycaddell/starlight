-- Create trigger for mirror share push notifications
-- Created: 2025-01-06

-- Function to send push notification when mirror is shared
CREATE OR REPLACE FUNCTION notify_mirror_share()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get sender's display name
  SELECT display_name INTO sender_name
  FROM users
  WHERE id = NEW.sender_user_id;

  -- Get Edge Function URL and service role key from vault or environment
  function_url := 'https://olqdyikgelidrytiiwfm.supabase.co/functions/v1/send-push-notification';
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Call edge function to send push notification (async, don't wait for response)
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'userId', NEW.recipient_user_id,
        'title', sender_name || ' shared their Mirror with you',
        'body', 'Tap to view their latest spiritual reflection',
        'data', jsonb_build_object(
          'type', 'mirror_share',
          'shareId', NEW.id,
          'senderId', NEW.sender_user_id
        )
      )
    );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on mirror_shares table
DROP TRIGGER IF EXISTS on_mirror_share_created ON mirror_shares;

CREATE TRIGGER on_mirror_share_created
  AFTER INSERT ON mirror_shares
  FOR EACH ROW
  EXECUTE FUNCTION notify_mirror_share();

COMMENT ON FUNCTION notify_mirror_share() IS 'Sends push notification when a mirror is shared with a user';
