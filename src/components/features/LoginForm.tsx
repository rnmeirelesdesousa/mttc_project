'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signInWithMagicLink } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
  locale: string;
}

/**
 * LoginForm Component
 * 
 * Handles user authentication via Magic Link:
 * - Form submission via Server Action
 * - Sends magic link email to user
 * - Success/error display
 */
export const LoginForm = ({ locale }: LoginFormProps) => {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccess(false);
    
    const email = formData.get('email') as string;
    
    if (!email || typeof email !== 'string') {
      setError(t('login.emailRequired') || 'Email is required');
      return;
    }
    
    startTransition(async () => {
      const result = await signInWithMagicLink(email);
      
      if (result.success) {
        setSuccess(true);
        setEmailSent(email);
      } else {
        setError(result.error || t('login.error'));
      }
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('login.title')}</CardTitle>
        <CardDescription>{t('login.description') || 'Enter your email to receive a magic link'}</CardDescription>
      </CardHeader>
      <CardContent>
        {success && emailSent ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-800 dark:text-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {t('login.magicLinkSent') || `Magic link sent to ${emailSent}. Please check your email.`}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setSuccess(false);
                setEmailSent(null);
              }}
            >
              {t('login.sendAnother') || 'Send another link'}
            </Button>
          </div>
        ) : (
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
                t('login.submit') || 'Send Magic Link'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};


