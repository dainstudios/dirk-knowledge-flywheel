-- Recreate the view with SECURITY INVOKER (the default, but explicit)
DROP VIEW IF EXISTS public.model_usage_summary;

CREATE VIEW public.model_usage_summary 
WITH (security_invoker = true)
AS
SELECT 
  edge_function,
  model_used,
  COUNT(*) AS call_count,
  COUNT(*) FILTER (WHERE success = true) AS success_count,
  COUNT(*) FILTER (WHERE success = false) AS error_count,
  SUM(tokens_input) AS total_input_tokens,
  SUM(tokens_output) AS total_output_tokens,
  AVG(duration_ms)::integer AS avg_duration_ms
FROM public.model_usage_log
GROUP BY edge_function, model_used;