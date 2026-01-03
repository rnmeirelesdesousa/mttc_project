import { getPublishedMills, getUniqueDistricts, type MillFilters } from '@/actions/public';
import { getTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { MapSidebar } from '@/components/features/MapSidebar';

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
  searchParams: {
    typology?: string | string[];
    district?: string;
  };
}

/**
 * Public Map Page
 * 
 * Displays published mills on an interactive Leaflet map with filter sidebar.
 * 
 * Security: Public route - no authentication required
 */
export default async function MapPage({ params, searchParams }: PageProps) {
  const t = await getTranslations();

  // Parse filters from searchParams
  const filters: MillFilters = {};
  
  // Handle typology (can be string or string[])
  if (searchParams.typology) {
    filters.typology = Array.isArray(searchParams.typology)
      ? searchParams.typology
      : [searchParams.typology];
  }

  // Handle district
  if (searchParams.district) {
    filters.district = searchParams.district;
  }

  // Fetch unique districts for the sidebar
  const districtsResult = await getUniqueDistricts();
  const availableDistricts = districtsResult.success ? districtsResult.data : [];

  // Fetch published mills with filters
  const result = await getPublishedMills(params.locale, Object.keys(filters).length > 0 ? filters : undefined);

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
      
      {/* Sidebar and Map side-by-side layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar - 1 column on mobile, 1 column on large screens */}
        <div className="lg:col-span-1">
          <MapSidebar availableDistricts={availableDistricts} locale={params.locale} />
        </div>
        
        {/* Map - 1 column on mobile, 3 columns on large screens */}
        <div className="lg:col-span-3 h-[600px] w-full rounded-lg overflow-hidden border border-gray-300">
          <DynamicMillMap mills={mills} locale={params.locale} />
        </div>
      </div>
    </div>
  );
}

