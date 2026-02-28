-- Migration: Audio Recording Storage Bucket
-- Created: 2026-02-27
-- Description: Creates private storage bucket for temporary audio files
-- used during voice transcription. Files are deleted after successful transcription.

-- ============================================================================
-- Storage Bucket: audio-recordings
-- Private bucket — files are short-lived temp storage, not user-visible
-- Path convention: {custom_user_id}/{job_id}.m4a
-- Size limit: 50MB (well above 8-min recording max of ~15MB)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-recordings',
  'audio-recordings',
  false,
  52428800, -- 50MB
  array['audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/aac']
)
on conflict (id) do nothing;

-- ============================================================================
-- RLS for storage.objects
-- Note: App uses custom access code auth, not Supabase Auth.
-- Permissive policy — actual path-scoping enforced in service layer and
-- Edge Functions using service role key.
-- ============================================================================

create policy "Allow audio recording operations"
  on storage.objects for all
  using (bucket_id = 'audio-recordings')
  with check (bucket_id = 'audio-recordings');
