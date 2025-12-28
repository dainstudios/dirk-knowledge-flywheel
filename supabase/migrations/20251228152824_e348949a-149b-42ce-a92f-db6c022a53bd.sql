-- Add URL validation constraints to knowledge_items table
-- Ensures URLs use http/https scheme and are max 2048 characters

ALTER TABLE public.knowledge_items
ADD CONSTRAINT knowledge_items_url_scheme_check 
CHECK (
  url IS NULL 
  OR (
    (url LIKE 'http://%' OR url LIKE 'https://%')
    AND LENGTH(url) <= 2048
  )
);

ALTER TABLE public.knowledge_items
ADD CONSTRAINT knowledge_items_google_drive_url_scheme_check 
CHECK (
  google_drive_url IS NULL 
  OR (
    (google_drive_url LIKE 'http://%' OR google_drive_url LIKE 'https://%')
    AND LENGTH(google_drive_url) <= 2048
  )
);