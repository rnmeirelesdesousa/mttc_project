'use client';

import { useState, useTransition } from 'react';
import { updateConstructionStatus } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface PublishButtonProps {
  constructionId: string;
  currentStatus: 'draft' | 'review' | 'published';
}

/**
 * PublishButton Component
 * 
 * Handles the transition from draft/review to published status.
 * - Shows loading state during the update
 * - Displays success feedback after publishing
 * - Triggers page refresh to remove published items from the review queue
 * - The item will disappear from the list since the query filters for draft/review only
 */
export const PublishButton = ({ constructionId, currentStatus }: PublishButtonProps) => {
  const t = useTranslations();
  const locale = useLocale() as 'pt' | 'en';
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handlePublish = () => {
    startTransition(async () => {
      const result = await updateConstructionStatus(constructionId, 'published');
      
      if (result.success) {
        setIsSuccess(true);
        // Phase 5.9.7.2: Redirect to dashboard after successful status update
        setTimeout(() => {
          router.push(`/${locale}/dashboard`);
        }, 500);
      } else {
        // Handle error
        console.error('[PublishButton]:', result.error);
        alert(result.error || t('review.publishError'));
      }
    });
  };

  // Don't show button if already published (shouldn't happen in review queue, but safety check)
  if (currentStatus === 'published') {
    return (
      <span className="inline-flex items-center text-sm text-muted-foreground">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {t('common.published')}
      </span>
    );
  }

  return (
    <Button
      onClick={handlePublish}
      disabled={isPending || isSuccess}
      size="sm"
      variant="default"
      className={isSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('common.loading')}
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {t('review.publishSuccess')}
        </>
      ) : (
        t('common.publish')
      )}
    </Button>
  );
};

