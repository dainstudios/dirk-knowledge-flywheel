import { supabase } from '@/integrations/supabase/client';

export interface AuthenticatedInvokeOptions {
  body?: unknown;
}

export interface AuthenticatedInvokeResult<T> {
  data: T | null;
  error: Error | null;
  isAuthError: boolean;
}

/**
 * Invokes a Supabase Edge Function with guaranteed fresh authentication.
 * 
 * This helper:
 * 1. Refreshes the session to get a fresh JWT token
 * 2. Explicitly passes the token in the Authorization header
 * 3. Returns structured error info including auth error detection
 */
export async function invokeWithAuth<T = unknown>(
  functionName: string,
  options?: AuthenticatedInvokeOptions
): Promise<AuthenticatedInvokeResult<T>> {
  // Step 1: Refresh session to ensure fresh token
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  
  if (refreshError || !session) {
    console.error(`[invokeWithAuth] Session refresh failed:`, refreshError?.message);
    return {
      data: null,
      error: new Error('Session expired. Please log in again.'),
      isAuthError: true,
    };
  }

  console.log(`[invokeWithAuth] Invoking ${functionName} with fresh token`);

  // Step 2: Invoke with explicit Authorization header
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: options?.body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  // Step 3: Handle errors
  if (error) {
    const errorMessage = error.message || 'Edge function error';
    const isAuthError = errorMessage.toLowerCase().includes('unauthorized') ||
                        errorMessage.toLowerCase().includes('401') ||
                        errorMessage.toLowerCase().includes('jwt');
    
    console.error(`[invokeWithAuth] ${functionName} failed:`, errorMessage);
    
    return {
      data: null,
      error: new Error(errorMessage),
      isAuthError,
    };
  }

  // Step 4: Check for application-level errors in response
  if (data?.error) {
    const appError = typeof data.error === 'string' ? data.error : 'Operation failed';
    console.error(`[invokeWithAuth] ${functionName} returned error:`, appError);
    
    return {
      data: null,
      error: new Error(appError),
      isAuthError: false,
    };
  }

  console.log(`[invokeWithAuth] ${functionName} succeeded`);
  
  return {
    data: data as T,
    error: null,
    isAuthError: false,
  };
}
