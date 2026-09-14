-- Migration: Add recommendations column to day_logs table
-- Stores daily AI food recommendations snapshot per user per day

alter table public.day_logs
  add column if not exists recommendations jsonb default null;

comment on column public.day_logs.recommendations is 'Cached AI food recommendations for this user and date (JSON list of items)';
