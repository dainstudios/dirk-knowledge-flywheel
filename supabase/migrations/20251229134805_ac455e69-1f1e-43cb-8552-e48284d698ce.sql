-- Enable RLS on model_usage_log
ALTER TABLE public.model_usage_log ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT policy
CREATE POLICY "Admins can view usage logs"
ON public.model_usage_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert (for edge functions) - this uses the service role which bypasses RLS anyway
-- But we add an explicit policy for completeness
CREATE POLICY "Service role can insert usage logs"
ON public.model_usage_log
FOR INSERT
WITH CHECK (true);