-- Add author_organization and methodology fields to knowledge_items
ALTER TABLE public.knowledge_items
ADD COLUMN IF NOT EXISTS author_organization text,
ADD COLUMN IF NOT EXISTS methodology text;