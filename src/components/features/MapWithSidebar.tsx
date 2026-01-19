'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { MillMap } from './MillMap';
import { MillSidebar } from './MillSidebar';
import { MapSidebar } from './MapSidebar';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { PublishedMill, MapWaterLine } from '@/actions/public';

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
export const MapWithSidebar = ({ mills, waterLines, locale, availableDistricts }: MapWithSidebarProps) => {
  const [selectedMillId, setSelectedMillId] = useState<string | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number } | null>(null);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleMillClick = (millId: string) => {
    setSelectedMillId(millId);
  };

  const handleMapClick = () => {
    setSelectedMillId(null);
    setCardPosition(null);
  };

  const handleCloseSidebar = () => {
    setSelectedMillId(null);
    setCardPosition(null);
  };

  // Find the selected mill's coordinates for focus zoom
  const selectedMill = mills.find((mill) => mill.id === selectedMillId);
  const selectedMillCoords = selectedMill
    ? { lat: selectedMill.lat, lng: selectedMill.lng }
    : null;

  return (
    <div className="relative h-full w-full">
      <DynamicMillMap
        mills={mills}
        waterLines={waterLines}
        locale={locale}
        onMillClick={handleMillClick}
        onMapClick={handleMapClick}
        selectedMillCoords={selectedMillCoords}
        onCardPositionUpdate={setCardPosition}
        mapContainerRef={mapContainerRef}
      />
      <MillSidebar
        millId={selectedMillId}
        locale={locale}
        onClose={handleCloseSidebar}
        cardPosition={cardPosition}
      />
      
      {/* Filter Menu Icon - Fixed position on left side */}
      <div className="absolute top-4 left-4 z-[500]">
        <Sheet open={filterSidebarOpen} onOpenChange={setFilterSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="bg-white/95 hover:bg-white text-gray-900 shadow-lg border border-gray-200"
              aria-label="Open filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[400px] sm:w-[540px] overflow-y-auto">
            <MapSidebar availableDistricts={availableDistricts} locale={locale} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
