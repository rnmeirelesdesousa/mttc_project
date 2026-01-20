'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardMessageBannerProps {
  success?: string;
  error?: string;
  locale: string;
}

/**
 * Dashboard Message Banner Component
 * 
 * Displays success or error messages from URL query parameters.
 * Automatically removes the query parameter from URL after display.
 */
export function DashboardMessageBanner({ success, error, locale }: DashboardMessageBannerProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get success message translation key
  const getSuccessMessage = (successKey?: string): string | null => {
    if (!successKey) return null;
    
    const messageKey = `dashboard.messages.success.${successKey}`;
    const message = t(messageKey as any);
    
    // If translation not found, return null (don't show generic message)
    return message !== messageKey ? message : null;
  };

  // Get error message translation key
  const getErrorMessage = (errorKey?: string): string | null => {
    if (!errorKey) return null;
    
    const messageKey = `dashboard.messages.error.${errorKey}`;
    const message = t(messageKey as any);
    
    // If translation not found, return null (don't show generic message)
    return message !== messageKey ? message : null;
  };

  const successMessage = getSuccessMessage(success);
  const errorMessage = getErrorMessage(error);

  // Remove query parameters from URL after component mounts
  useEffect(() => {
    if (success || error) {
      const params = new URLSearchParams(searchParams.toString());
      if (params.has('success')) params.delete('success');
      if (params.has('error')) params.delete('error');
      
      const newUrl = params.toString() 
        ? `/${locale}/dashboard?${params.toString()}`
        : `/${locale}/dashboard`;
      
      // Replace URL without query params (but keep the message visible)
      router.replace(newUrl, { scroll: false });
    }
  }, [success, error, locale, router, searchParams]);

  if (!successMessage && !errorMessage) {
    return null;
  }

  return (
    <div className="mb-6">
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-green-800 text-sm font-medium">{successMessage}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-green-600 hover:text-green-800 hover:bg-green-100"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('success');
              const newUrl = params.toString() 
                ? `/${locale}/dashboard?${params.toString()}`
                : `/${locale}/dashboard`;
              router.replace(newUrl, { scroll: false });
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-red-800 text-sm font-medium">{errorMessage}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('error');
              const newUrl = params.toString() 
                ? `/${locale}/dashboard?${params.toString()}`
                : `/${locale}/dashboard`;
              router.replace(newUrl, { scroll: false });
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
