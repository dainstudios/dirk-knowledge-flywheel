-- Add boolean columns for queue tracking (multi-select support)
ALTER TABLE public.knowledge_items 
ADD COLUMN IF NOT EXISTS queued_for_team BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS queued_for_linkedin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS queued_for_newsletter BOOLEAN DEFAULT false;