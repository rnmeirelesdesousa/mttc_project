'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { MillMap } from './MillMap';
import { MillSidebar } from './MillSidebar';
import { MapSidebar } from './MapSidebar';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PublishedMill, PublishedPoca, MapWaterLine } from '@/actions/public';

// Dynamically import MillMap to avoid SSR issues with Leaflet
const DynamicMillMap = dynamic(
  () => Promise.resolve({ default: MillMap }),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <p className="text-gray-600">Loading map...</p>
      </div>
    ),
  }
);

interface MapWithSidebarProps {
  mills: PublishedMill[];
  pocas: PublishedPoca[];
  waterLines: MapWaterLine[];
  locale: string;
  availableDistricts: string[];
}

/**
 * MapWithSidebar Component
 * 
 * Wrapper component that manages the map and floating postal card state.
 * Handles mill selection and map click events.
 * Full-page map interface with filter sidebar accessible via menu icon.
 */
export const MapWithSidebar = ({ mills, pocas = [], waterLines, locale, availableDistricts }: MapWithSidebarProps) => {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedMillId, setSelectedMillId] = useState<string | null>(null);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Sync selectedMillId with URL param
  useEffect(() => {
    const millIdParam = searchParams.get('millId');
    if (millIdParam) {
      // Verify the mill exists in the current mills array
      const millExists = mills.some((mill) => mill.id === millIdParam);
      if (millExists) {
        setSelectedMillId(millIdParam);
      }
    } else {
      setSelectedMillId(null);
    }
  }, [searchParams, mills]);

  const handleMillClick = (millId: string) => {
    setSelectedMillId(millId);
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('millId', millId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleMapClick = () => {
    setSelectedMillId(null);
    // Remove millId from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('millId');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  const handleCloseSidebar = () => {
    setSelectedMillId(null);
    // Remove millId from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('millId');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  // Find the selected mill's coordinates for focus zoom
  const selectedMill = mills.find((mill) => mill.id === selectedMillId);
  const selectedMillCoords = selectedMill
    ? { lat: selectedMill.lat, lng: selectedMill.lng }
    : null;

  // Trigger map resize when sidebar toggles
  useEffect(() => {
    if (mapContainerRef.current) {
      // Use setTimeout to ensure DOM has updated
      const timer = setTimeout(() => {
        // Trigger window resize event to notify Leaflet
        window.dispatchEvent(new Event('resize'));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [filterSidebarOpen]);

  return (
    <div className="relative h-full w-full overflow-hidden flex">
      {/* Filter Sidebar - Persistent, non-blocking */}
      {filterSidebarOpen && (
        <div className="w-[400px] bg-white border-r border-gray-200 overflow-y-auto z-[1001] flex-shrink-0">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
            <h2 className="text-lg font-semibold">{t('map.filters')}</h2>
          </div>
          <div className="p-0">
            <MapSidebar availableDistricts={availableDistricts} locale={locale} />
          </div>
        </div>
      )}

      {/* Map Container - Takes remaining space */}
      <div className="flex-1 relative h-full w-full">
        <DynamicMillMap
          mills={mills}
          pocas={pocas}
          waterLines={waterLines}
          locale={locale}
          onMillClick={handleMillClick}
          onMapClick={handleMapClick}
          selectedMillCoords={selectedMillCoords}
          mapContainerRef={mapContainerRef}
          selectedMillId={selectedMillId}
          sidebarRef={sidebarRef}
        />
        <MillSidebar
          millId={selectedMillId}
          locale={locale}
          onClose={handleCloseSidebar}
          sidebarRef={sidebarRef}
        />

        {/* Filter Menu Icon - Fixed position on left side */}
        <div className="absolute top-4 left-4 z-[1002]">
          <Button
            variant="default"
            size="sm"
            className="bg-white/95 hover:bg-white text-gray-900 shadow-lg border border-gray-200 p-2"
            aria-label={filterSidebarOpen ? "Close filters" : "Open filters"}
            onClick={() => setFilterSidebarOpen(!filterSidebarOpen)}
          >
            {filterSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
