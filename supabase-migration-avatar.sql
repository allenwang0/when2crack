-- Migration: Add avatar_url column to roster table
-- Run this SQL in your Supabase SQL Editor if you already have the database set up

-- Add avatar_url column to roster table
ALTER TABLE public.roster ADD COLUMN IF NOT EXISTS avatar_url TEXT;
