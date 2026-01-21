'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createPocaConstruction, updatePocaConstruction, getPocaByIdForEdit } from '@/actions/admin';
import { getWaterLinesList, getMapData, type WaterLineListItem } from '@/actions/public';
import dynamic from 'next/dynamic';

// Dynamically import LocationPickerMap to avoid SSR issues with Leaflet
const DynamicLocationPickerMap = dynamic(
  () => import('@/components/features/LocationPickerMap').then((mod) => ({ default: mod.LocationPickerMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] bg-gray-100 rounded-md border border-input">
        <p className="text-gray-600">Loading map...</p>
      </div>
    ),
  }
);

/**
 * New Poça Page (Inner Component)
 * 
 * Simplified form for creating a new poça entry.
 * - Name (populates construction_translations)
 * - Location picker on map
 * - Levada dropdown (water_lines)
 * 
 * Security: Should be protected by middleware/auth (researcher or admin only)
 */
function NewPocaPageContent() {
  const t = useTranslations();
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();
  const searchParams = useSearchParams();

  // Edit mode state
  const editId = searchParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(!!editId);
  const [isLoadingData, setIsLoadingData] = useState(!!editId);
  const [pocaId, setPocaId] = useState<string | null>(editId);
  const [initialStatus, setInitialStatus] = useState<'draft' | 'review' | 'published' | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [waterLineId, setWaterLineId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Water lines list for selector
  const [waterLines, setWaterLines] = useState<WaterLineListItem[]>([]);
  const [loadingWaterLines, setLoadingWaterLines] = useState(true);
  
  // Map data for contextual creation layer
  const [mapData, setMapData] = useState<{ mills: any[]; waterLines: any[] } | null>(null);
  const [loadingMapData, setLoadingMapData] = useState(true);

  // Fetch water lines list on mount
  useEffect(() => {
    const fetchWaterLines = async () => {
      setLoadingWaterLines(true);
      try {
        const result = await getWaterLinesList(locale, { publishedOnly: true });
        if (result.success) {
          setWaterLines(result.data);
        } else {
          console.error('[NewPocaPage]: Failed to fetch water lines:', result.error);
          setError(result.error);
        }
      } catch (err) {
        console.error('[NewPocaPage]: Error fetching water lines:', err);
        setError('Failed to load water lines');
      } finally {
        setLoadingWaterLines(false);
      }
    };

    fetchWaterLines();
  }, [locale]);

  // Fetch map data for contextual creation layer
  useEffect(() => {
    const fetchMapData = async () => {
      setLoadingMapData(true);
      try {
        const result = await getMapData(locale);
        if (result.success) {
          setMapData(result.data);
        } else {
          console.error('[NewPocaPage]: Failed to fetch map data:', result.error);
        }
      } catch (err) {
        console.error('[NewPocaPage]: Error fetching map data:', err);
      } finally {
        setLoadingMapData(false);
      }
    };

    fetchMapData();
  }, [locale]);

  // Fetch existing poça data if in edit mode
  useEffect(() => {
    const fetchPocaData = async () => {
      if (!editId || !isEditMode) return;

      setIsLoadingData(true);
      setError(null);

      try {
        const result = await getPocaByIdForEdit(editId, locale);
        
        if (result.success) {
          const data = result.data;
          setPocaId(data.id);
          
          // Populate form fields
          setName(data.title || data.slug || '');
          setLatitude(data.latitude);
          setLongitude(data.longitude);
          setWaterLineId(data.waterLineId);
          setInitialStatus(data.status);
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('[NewPocaPage]: Error fetching poça data:', err);
        setError('Failed to load poça data');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchPocaData();
  }, [editId, isEditMode, locale]);

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'review') => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!name.trim()) {
        setError(t('pocas.form.nameRequired'));
        setIsSubmitting(false);
        return;
      }

      if (latitude === null || longitude === null) {
        setError(t('pocas.form.locationRequired'));
        setIsSubmitting(false);
        return;
      }

      if (!waterLineId.trim()) {
        setError(t('pocas.form.waterLineRequired'));
        setIsSubmitting(false);
        return;
      }

      // Call appropriate server action (create or update)
      const result = isEditMode && pocaId
        ? await updatePocaConstruction({
            id: pocaId,
            title: name.trim(),
            locale,
            latitude,
            longitude,
            waterLineId: waterLineId.trim(),
            status, // Pass status for update
          })
        : await createPocaConstruction({
            title: name.trim(),
            locale,
            latitude,
            longitude,
            waterLineId: waterLineId.trim(),
            status, // Phase 5.9.7.1: Pass status
          });

      if (result.success) {
        // Redirect to dashboard with success message
        const successKey = status === 'draft' ? 'savedDraft' : 'submittedForReview';
        router.push(`/${locale}/dashboard?success=${successKey}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[NewPocaPage]: Submit error:', err);
      setError(t('pocas.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching data in edit mode
  if (isLoadingData) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">
        {isEditMode ? t('pocas.edit.title') : t('pocas.new.title')}
      </h1>
      <p className="text-muted-foreground mb-8">
        {isEditMode ? t('pocas.edit.description') : t('pocas.new.description')}
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name">{t('pocas.form.name')}</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('pocas.form.namePlaceholder')}
            required
          />
        </div>

        {/* Location Picker Map */}
        <div className="space-y-2">
          <Label>{t('pocas.form.location')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('pocas.form.locationDescription')}
          </p>
          <DynamicLocationPickerMap
            latitude={latitude}
            longitude={longitude}
            onLocationSelect={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
            existingMills={mapData?.mills || []}
            existingWaterLines={mapData?.waterLines || []}
          />
        </div>

        {/* Water Line Selector */}
        <div className="space-y-2">
          <Label htmlFor="waterLineId">{t('pocas.form.waterLine')}</Label>
          <select
            id="waterLineId"
            value={waterLineId}
            onChange={(e) => setWaterLineId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loadingWaterLines || isLoadingData}
            required
          >
            <option value="">{t('pocas.form.selectWaterLine')}</option>
            {waterLines.map((waterLine) => (
              <option key={waterLine.id} value={waterLine.id}>
                {waterLine.name}
              </option>
            ))}
          </select>
          {loadingWaterLines && (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          )}
          {!loadingWaterLines && waterLines.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('pocas.form.noWaterLines')}</p>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            {t('pocas.form.cancel')}
          </Button>
          {/* Only show draft/review buttons if not published or if in edit mode with draft/review status */}
          {(!isEditMode || !initialStatus || initialStatus !== 'published') && (
            <>
              <Button 
                type="button" 
                variant="outline"
                onClick={(e) => handleSubmit(e, 'draft')} 
                disabled={isSubmitting || loadingWaterLines || isLoadingData}
              >
                {isSubmitting ? t('pocas.form.savingDraft') : t('pocas.form.saveAsDraft')}
              </Button>
              <Button 
                type="button"
                onClick={(e) => handleSubmit(e, 'review')} 
                disabled={isSubmitting || loadingWaterLines || isLoadingData}
              >
                {isSubmitting ? t('pocas.form.submittingForReview') : t('pocas.form.submitForReview')}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * New Poça Page (Wrapper with Suspense)
 * 
 * Wraps the content in Suspense to support useSearchParams()
 */
export default function NewPocaPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <NewPocaPageContent />
    </Suspense>
  );
}
