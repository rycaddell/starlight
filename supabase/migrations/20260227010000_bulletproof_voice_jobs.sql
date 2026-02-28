-- Migration: Transcription Jobs Table
-- Created: 2026-02-27
-- Description: Tracks voice recording transcription jobs so that transcription
-- can complete server-side even if the client disconnects after upload.

-- ============================================================================
-- Table: transcription_jobs
-- Lifecycle: pending → processing → completed | failed
-- Audio is uploaded to storage before row is inserted.
-- Edge Function reads this row, processes audio, saves journal, marks complete.
-- Storage audio file is deleted by Edge Function after successful transcription.
-- ============================================================================

create table transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  custom_user_id uuid not null,                          -- matches journals.custom_user_id (historical naming)
  storage_path text not null,                            -- e.g. "{custom_user_id}/{job_id}.m4a"
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  journal_id uuid references journals(id) on delete set null, -- populated on completion
  prompt_text text,                                      -- guided prompt if applicable
  entry_type text not null default 'voice',
  error_message text,                                    -- populated on failure
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Indexes
create index idx_transcription_jobs_user_status
  on transcription_jobs(custom_user_id, status);

create index idx_transcription_jobs_created_at
  on transcription_jobs(created_at desc);

-- Comments
comment on table transcription_jobs is 'Tracks server-side voice transcription jobs. Audio uploaded to storage first, edge function handles Whisper + journal save.';
comment on column transcription_jobs.custom_user_id is 'Matches journals.custom_user_id — historical naming convention';
comment on column transcription_jobs.storage_path is 'Path in audio-recordings bucket: {custom_user_id}/{job_id}.m4a';
comment on column transcription_jobs.journal_id is 'Set by Edge Function once journal entry is created';

-- ============================================================================
-- RLS
-- Note: App uses custom access code auth, not Supabase Auth.
-- Permissive policy — actual user-scoping enforced in service layer.
-- ============================================================================

alter table transcription_jobs enable row level security;

create policy "Allow all operations on transcription_jobs"
  on transcription_jobs for all
  using (true)
  with check (true);
