import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import dainLogo from '@/assets/dain-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');

export default function Login() {
  const { user, loading, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
    }
    setIsGoogleLoading(false);
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSending(true);
    const { error: signInError } = await signInWithMagicLink(email);
    setIsSending(false);

    if (!signInError) {
      setIsSuccess(true);
    }
  };

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex flex-col items-center gap-2">
            <img src={dainLogo} alt="DAIN Studios" className="h-14 w-auto" />
            <span className="font-semibold text-2xl tracking-tight text-foreground">
              Knowledge Flywheel
            </span>
          </div>
          <div className="pt-4">
            <CardTitle className="text-lg font-medium tracking-tight">Welcome back</CardTitle>
            <CardDescription className="mt-1">
              Sign in to continue
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300 font-medium"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSuccess}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Magic Link Form */}
          {isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div className="text-center">
                <h3 className="font-medium text-foreground">Check your email!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a login link to <span className="font-medium">{email}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                }}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="pl-10"
                    disabled={isSending}
                    autoComplete="email"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSending || !email}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Magic Link'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      
      {/* Footer */}
      <p className="mt-6 text-xs text-muted-foreground">
        built by Dirk
      </p>
    </div>
  );
}
