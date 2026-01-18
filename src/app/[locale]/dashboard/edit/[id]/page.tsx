import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { isResearcherOrAdmin } from '@/lib/auth';
import { getItemTypeById } from '@/actions/admin';

interface PageProps {
  params: {
    locale: string;
    id: string;
  };
}

/**
 * Edit Route Handler
 * 
 * Determines if the ID is a Mill or Levada and redirects to the appropriate edit form.
 * For now, redirects to the add page - in the future could have dedicated edit pages.
 * 
 * Security: Requires researcher or admin role
 */
export default async function EditPage({ params }: PageProps) {
  const t = await getTranslations();

  // Security: Verify researcher or admin role
  const hasPermission = await isResearcherOrAdmin();
  if (!hasPermission) {
    redirect(`/${params.locale}/dashboard`);
  }

  // Get item type
  const result = await getItemTypeById(params.id);

  if (!result.success) {
    // Item not found or error - redirect to dashboard
    redirect(`/${params.locale}/dashboard`);
  }

  const { type } = result.data;

  // Redirect to appropriate form with edit parameter
  if (type === 'MILL') {
    redirect(`/${params.locale}/dashboard/add?edit=${params.id}`);
  } else {
    // For water lines, redirect to water line creation page with edit parameter
    redirect(`/${params.locale}/dashboard/water-lines/new?edit=${params.id}`);
  }
}
