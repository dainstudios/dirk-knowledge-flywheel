import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingJob {
  id: string;
  job_type: string;
  status: 'running' | 'completed' | 'failed';
  total_items: number;
  processed_items: number;
  failed_items: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  user_id: string;
}

export function useProcessingJob(jobId: string | null) {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchJob = useCallback(async () => {
    if (!jobId) {
      setJob(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Failed to fetch job:', error.message);
        return;
      }

      setJob(data as ProcessingJob);
    } catch (err) {
      console.error('Error fetching job:', err);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setIsLoading(true);
    fetchJob().finally(() => setIsLoading(false));

    // Poll for updates while job is running
    const interval = setInterval(() => {
      if (job?.status === 'running' || !job) {
        fetchJob();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, fetchJob, job?.status]);

  // Stop polling when job is complete
  useEffect(() => {
    if (job && job.status !== 'running') {
      // Job is done, no need to poll
    }
  }, [job?.status]);

  return {
    job,
    isLoading,
    isRunning: job?.status === 'running',
    isCompleted: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    progress: job ? Math.round((job.processed_items / job.total_items) * 100) : 0,
    refetch: fetchJob
  };
}
