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

interface RootLocalePageProps {
  params: {
    locale: string;
  };
  searchParams: {
    typology?: string | string[];
    district?: string;
    roofMaterial?: string | string[];
    roofShape?: string | string[];
    access?: string | string[];
    motiveApparatus?: string | string[];
    epoch?: string | string[];
    currentUse?: string | string[];
    setting?: string | string[];
    legalProtection?: string | string[];
    propertyStatus?: string | string[];
    constructionTechnique?: string | string[];
    planShape?: string | string[];
    volumetry?: string | string[];
    exteriorFinish?: string | string[];
    millId?: string;
  };
}

/**
 * Home Page - Map View
 * 
 * Displays published mills on an interactive Leaflet map with filter sidebar.
 * This is now the primary entry point for the application.
 * 
 * Security: Public route - no authentication required
 */
export default async function RootLocalePage({ params, searchParams }: RootLocalePageProps) {
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

  // Handle roof shape (can be string or string[])
  if (searchParams.roofShape) {
    filters.roofShape = Array.isArray(searchParams.roofShape)
      ? searchParams.roofShape
      : [searchParams.roofShape];
  }

  // Handle access (can be string or string[])
  if (searchParams.access) {
    filters.access = Array.isArray(searchParams.access)
      ? searchParams.access
      : [searchParams.access];
  }

  // Handle motive apparatus (can be string or string[])
  if (searchParams.motiveApparatus) {
    filters.motiveApparatus = Array.isArray(searchParams.motiveApparatus)
      ? searchParams.motiveApparatus
      : [searchParams.motiveApparatus];
  }

  // Handle epoch (can be string or string[])
  if (searchParams.epoch) {
    filters.epoch = Array.isArray(searchParams.epoch)
      ? searchParams.epoch
      : [searchParams.epoch];
  }

  // Handle current use (can be string or string[])
  if (searchParams.currentUse) {
    filters.currentUse = Array.isArray(searchParams.currentUse)
      ? searchParams.currentUse
      : [searchParams.currentUse];
  }

  // Handle setting (can be string or string[])
  if (searchParams.setting) {
    filters.setting = Array.isArray(searchParams.setting)
      ? searchParams.setting
      : [searchParams.setting];
  }

  // Handle legal protection (can be string or string[])
  if (searchParams.legalProtection) {
    filters.legalProtection = Array.isArray(searchParams.legalProtection)
      ? searchParams.legalProtection
      : [searchParams.legalProtection];
  }

  // Handle property status (can be string or string[])
  if (searchParams.propertyStatus) {
    filters.propertyStatus = Array.isArray(searchParams.propertyStatus)
      ? searchParams.propertyStatus
      : [searchParams.propertyStatus];
  }

  // Handle construction technique (can be string or string[])
  if (searchParams.constructionTechnique) {
    filters.constructionTechnique = Array.isArray(searchParams.constructionTechnique)
      ? searchParams.constructionTechnique
      : [searchParams.constructionTechnique];
  }

  // Handle plan shape (can be string or string[])
  if (searchParams.planShape) {
    filters.planShape = Array.isArray(searchParams.planShape)
      ? searchParams.planShape
      : [searchParams.planShape];
  }

  // Handle volumetry (can be string or string[])
  if (searchParams.volumetry) {
    filters.volumetry = Array.isArray(searchParams.volumetry)
      ? searchParams.volumetry
      : [searchParams.volumetry];
  }

  // Handle exterior finish (can be string or string[])
  if (searchParams.exteriorFinish) {
    filters.exteriorFinish = Array.isArray(searchParams.exteriorFinish)
      ? searchParams.exteriorFinish
      : [searchParams.exteriorFinish];
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
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="container mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4">{t('map.title')}</h1>
          <p className="text-red-600">Error: {result.error}</p>
        </div>
      </div>
    );
  }

  const { mills, pocas, waterLines } = result.data;

  return (
    <div className="fixed inset-x-0 top-20 bottom-0 w-full h-[calc(100vh-5rem)] overflow-hidden">
      <DynamicMapWithSidebar 
        mills={mills}
        pocas={pocas}
        waterLines={waterLines} 
        locale={params.locale}
        availableDistricts={availableDistricts}
      />
    </div>
  );
}
