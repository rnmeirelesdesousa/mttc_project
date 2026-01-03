import { getPublishedMills } from '@/actions/public';
import { getTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

// Dynamically import MillMap to avoid SSR issues with Leaflet
// Leaflet requires window object which is not available during SSR
const DynamicMillMap = dynamic(
  () => import('@/components/features/MillMap').then((mod) => ({ default: mod.MillMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-gray-100">
        <p className="text-gray-600">Loading map...</p>
      </div>
    ),
  }
);

interface PageProps {
  params: {
    locale: string;
  };
}

/**
 * Public Map Page
 * 
 * Displays published mills on an interactive Leaflet map.
 * 
 * Security: Public route - no authentication required
 */
export default async function MapPage({ params }: PageProps) {
  const t = await getTranslations();

  // Fetch published mills for the current locale
  const result = await getPublishedMills(params.locale);

  if (!result.success) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">{t('map.title')}</h1>
        <p className="text-red-600">Error: {result.error}</p>
      </div>
    );
  }

  const mills = result.data;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">{t('map.title')}</h1>
      <div className="h-[600px] w-full rounded-lg overflow-hidden border border-gray-300">
        <DynamicMillMap mills={mills} locale={params.locale} />
      </div>
    </div>
  );
}

