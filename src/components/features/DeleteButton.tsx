'use client';

import { useState, useTransition } from 'react';
import { deleteConstruction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteButtonProps {
  constructionId: string;
  /**
   * Phase 5.9.7.2: Permission check
   * - For researchers: Only show if status === 'draft' AND they are the author
   * - For admins: Always show
   */
  canDelete: boolean;
}

/**
 * DeleteButton Component
 * 
 * Phase 5.9.7.2: Scoped Deletion
 * Handles deletion with role-based permissions and redirects to dashboard after success.
 */
export const DeleteButton = ({ constructionId, canDelete }: DeleteButtonProps) => {
  const t = useTranslations();
  const locale = useLocale() as 'pt' | 'en';
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Don't render if user doesn't have permission
  if (!canDelete) {
    return null;
  }

  const handleDelete = () => {
    if (!confirm(t('common.confirmDelete'))) {
      return;
    }

    startTransition(async () => {
      const result = await deleteConstruction(constructionId);
      
      if (result.success) {
        // Phase 5.9.7.2: Redirect to dashboard after successful deletion
        router.push(`/${locale}/dashboard`);
        router.refresh();
      } else {
        // Handle error
        console.error('[DeleteButton]:', result.error);
        alert(result.error || t('common.deleteError'));
      }
    });
  };

  return (
    <Button
      onClick={handleDelete}
      disabled={isPending}
      size="sm"
      variant="destructive"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('common.loading')}
        </>
      ) : (
        <>
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common.delete')}
        </>
      )}
    </Button>
  );
};
