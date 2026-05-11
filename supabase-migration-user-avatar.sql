-- Add avatar_url column to users table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.users.avatar_url IS 'Base64-encoded profile picture (max 400x400px, JPEG 80% quality)';
