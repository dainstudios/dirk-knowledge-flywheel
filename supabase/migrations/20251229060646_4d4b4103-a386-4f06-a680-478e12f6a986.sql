-- Add columns for Pool page editing capabilities
-- curator_notes: for notes added during curation (separate from capture-time user_notes)
-- highlighted_quotes: array of quote indices that are marked as important
-- highlighted_findings: array of finding/insight indices marked as priority

ALTER TABLE public.knowledge_items 
ADD COLUMN IF NOT EXISTS curator_notes text,
ADD COLUMN IF NOT EXISTS highlighted_quotes integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS highlighted_findings integer[] DEFAULT '{}';