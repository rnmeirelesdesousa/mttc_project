import { getMapData, getUniqueDistricts, type MillFilters } from '@/actions/public';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

// Dynamically import MapWithSidebar to avoid SSR issues with Leaflet
// Leaflet requires window object which is not available during SSR
const DynamicMapWithSidebar = dynamic(
  () => import('@/components/features/MapWithSidebar').then((mod) => ({ default: mod.MapWithSidebar })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100">
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
    roofMaterial?: string | string[];
    motiveApparatus?: string | string[];
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

  // Handle roof material (can be string or string[])
  if (searchParams.roofMaterial) {
    filters.roofMaterial = Array.isArray(searchParams.roofMaterial)
      ? searchParams.roofMaterial
      : [searchParams.roofMaterial];
  }

  // Handle motive apparatus (can be string or string[])
  if (searchParams.motiveApparatus) {
    filters.motiveApparatus = Array.isArray(searchParams.motiveApparatus)
      ? searchParams.motiveApparatus
      : [searchParams.motiveApparatus];
  }

  // Fetch unique districts for the sidebar
  const districtsResult = await getUniqueDistricts();
  const availableDistricts = districtsResult.success ? districtsResult.data : [];

  // Fetch map data (mills + water lines) with filters
  const result = await getMapData(
    params.locale,
    Object.keys(filters).length > 0 ? filters : undefined
  );

  if (!result.success) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="container mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4">{t('map.title')}</h1>
          <p className="text-red-600">Error: {result.error}</p>
        </div>
      </div>
    );
  }

  const { mills, waterLines } = result.data;

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 w-full h-[calc(100vh-4rem)]">
      <DynamicMapWithSidebar 
        mills={mills} 
        waterLines={waterLines} 
        locale={params.locale}
        availableDistricts={availableDistricts}
      />
    </div>
  );
}

