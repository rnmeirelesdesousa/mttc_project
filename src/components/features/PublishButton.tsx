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
        // Revalidate the page to reflect changes
        router.refresh();
        // Reset success state after a moment
        setTimeout(() => setIsSuccess(false), 2000);
      } else {
        // Handle error (could show toast notification)
        console.error('[PublishButton]:', result.error);
      }
    });
  };

  // Don't show button if already published
  if (currentStatus === 'published') {
    return (
      <span className="text-sm text-muted-foreground">
        {t('common.publish')}
      </span>
    );
  }

  return (
    <Button
      onClick={handlePublish}
      disabled={isPending || isSuccess}
      size="sm"
      variant="default"
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

