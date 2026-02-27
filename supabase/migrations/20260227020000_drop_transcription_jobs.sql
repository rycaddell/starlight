-- Migration: Drop transcription_jobs table
-- Created: 2026-02-27
-- Reason: Pivoting to use existing journals.transcription_status columns instead
-- of a separate job-tracking table. The journals table already has:
-- local_audio_path, audio_url, transcription_status, upload_attempts,
-- transcription_attempts, error_message, max_upload_attempts

drop table if exists transcription_jobs;
