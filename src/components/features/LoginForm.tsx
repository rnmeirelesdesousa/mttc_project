'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signInWithPassword } from '@/actions/auth';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  locale: string;
}

/**
 * LoginForm Component
 * 
 * Handles user authentication via Email/Password:
 * - Form submission via Server Action
 * - Email and password input fields
 * - Success/error display
 * - Redirects to dashboard on successful login
 */
export const LoginForm = ({ locale }: LoginFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    if (!email || typeof email !== 'string') {
      setError(t('login.emailRequired') || 'Email is required');
      return;
    }
    
    if (!password || typeof password !== 'string') {
      setError(t('login.passwordRequired') || 'Password is required');
      return;
    }
    
    startTransition(async () => {
      const result = await signInWithPassword(email, password);
      
      if (result.success) {
        // Verify session exists in browser before navigating
        const supabase = createBrowserSupabaseClient();
        let sessionConfirmed = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        // Poll for session to be available in browser (up to 1 second)
        while (!sessionConfirmed && attempts < maxAttempts) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            sessionConfirmed = true;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        // Use hard redirect to ensure full page reload and session is picked up
        window.location.href = `/${locale}/dashboard`;
      } else {
        // Server action returns translation keys (e.g., 'errors.auth.invalidInput')
        // Translate the error key; if translation returns the same key (not found), use fallback
        const errorKey = result.error || 'login.error';
        const translatedError = t(errorKey as any);
        // If translation didn't find the key, it returns the key itself - use fallback
        setError(translatedError === errorKey ? t('login.error') : translatedError);
      }
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('login.title')}</CardTitle>
        <CardDescription>{t('login.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('login.email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('login.emailPlaceholder')}
              required
              disabled={isPending}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('login.password')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              required
              disabled={isPending}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('login.submit')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};


