'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MillMap } from './MillMap';
import { MillSidebar } from './MillSidebar';
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
}

/**
 * MapWithSidebar Component
 * 
 * Wrapper component that manages the map and floating postal card state.
 * Handles mill selection and map click events.
 */
export const MapWithSidebar = ({ mills, waterLines, locale }: MapWithSidebarProps) => {
  const [selectedMillId, setSelectedMillId] = useState<string | null>(null);

  const handleMillClick = (millId: string) => {
    setSelectedMillId(millId);
  };

  const handleMapClick = () => {
    setSelectedMillId(null);
  };

  const handleCloseSidebar = () => {
    setSelectedMillId(null);
  };

  return (
    <div className="relative h-full w-full">
      <DynamicMillMap
        mills={mills}
        waterLines={waterLines}
        locale={locale}
        onMillClick={handleMillClick}
        onMapClick={handleMapClick}
      />
      <MillSidebar
        millId={selectedMillId}
        locale={locale}
        onClose={handleCloseSidebar}
      />
    </div>
  );
};
