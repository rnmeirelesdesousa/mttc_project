'use client';

import { useState, useTransition } from 'react';
import { updateConstructionStatus } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handlePublish = () => {
    startTransition(async () => {
      const result = await updateConstructionStatus(constructionId, 'published');
      
      if (result.success) {
        setIsSuccess(true);
        // Trigger page refresh to re-fetch data and remove published item from list
        // The query filters for draft/review, so published items won't appear
        router.refresh();
        // Keep success state visible briefly, then it will disappear when item is removed
        setTimeout(() => {
          setIsSuccess(false);
        }, 1500);
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

