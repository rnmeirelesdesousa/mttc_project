import { redirect } from 'next/navigation';

interface RootLocalePageProps {
  params: {
    locale: string;
  };
}

/**
 * Root Locale Page
 * 
 * Landing page for each locale. Redirects to the map view.
 */
export default function RootLocalePage({ params }: RootLocalePageProps) {
  redirect(`/${params.locale}/map`);
}

