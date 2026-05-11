-- =====================================================
-- PROFILE PICTURE FIX - REQUIRED MIGRATION
-- =====================================================
-- This migration adds the missing avatar_url column to the users table
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Add avatar_url column to users table (if it doesn't already exist)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.avatar_url IS 'Base64-encoded profile picture (max 400x400px, JPEG 80% quality)';

-- Verify the column was added successfully
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'avatar_url';

-- Expected output: One row showing "avatar_url | text"
