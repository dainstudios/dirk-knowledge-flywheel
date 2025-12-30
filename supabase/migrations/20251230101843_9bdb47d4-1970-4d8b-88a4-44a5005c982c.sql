-- Step 1: Drop the old check constraint
ALTER TABLE public.knowledge_items 
DROP CONSTRAINT IF EXISTS knowledge_items_infographic_type_check;

-- Step 2: Normalize existing data
-- Convert 'premium' to 'detailed'
UPDATE public.knowledge_items 
SET infographic_type = 'detailed' 
WHERE infographic_type = 'premium';

-- Infer type from URL for null types with existing infographics
UPDATE public.knowledge_items 
SET infographic_type = 'detailed' 
WHERE infographic_url IS NOT NULL 
  AND infographic_type IS NULL 
  AND infographic_url LIKE '%_detailed_%';

UPDATE public.knowledge_items 
SET infographic_type = 'quick' 
WHERE infographic_url IS NOT NULL 
  AND infographic_type IS NULL 
  AND infographic_url LIKE '%_quick_%';

-- Step 3: Add new check constraint allowing only 'quick' or 'detailed'
ALTER TABLE public.knowledge_items 
ADD CONSTRAINT knowledge_items_infographic_type_check 
CHECK (infographic_type IS NULL OR infographic_type IN ('quick', 'detailed'));