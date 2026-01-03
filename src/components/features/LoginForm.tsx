'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { loginUser } from '@/actions/auth';
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
 * Handles user authentication:
 * - Form submission via Server Action
 * - Error display
 * - Redirect logic (check URL params or default to dashboard)
 */
export const LoginForm = ({ locale }: LoginFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    
    startTransition(async () => {
      const result = await loginUser(formData);
      
      if (result.success) {
        // Get redirect URL from search params, or default to dashboard
        const redirectPath = searchParams.get('redirect') || `/${locale}/dashboard`;
        router.push(redirectPath);
        router.refresh(); // Refresh to update auth state
      } else {
        setError(result.error || t('login.error'));
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


