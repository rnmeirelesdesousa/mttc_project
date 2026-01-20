'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createWaterLine, updateWaterLine, getWaterLineByIdForEdit } from '@/actions/admin';
import { getMapData } from '@/actions/public';
import dynamic from 'next/dynamic';

// Dynamically import LevadaEditor to avoid SSR issues with Leaflet
const DynamicLevadaEditor = dynamic(
  () => import('@/components/features/LevadaEditor').then((mod) => ({ default: mod.LevadaEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-md border border-input">
        <p className="text-gray-600">Loading map...</p>
      </div>
    ),
  }
);

/**
 * New Water Line Page (Inner Component)
 * 
 * Form for creating a new water line (levada) entry.
 * - Interactive map for drawing the line path
 * - Form fields for name, description, and color
 * 
 * Security: Should be protected by middleware/auth (researcher or admin only)
 */
function NewWaterLinePageContent() {
  const t = useTranslations();
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();
  const searchParams = useSearchParams();

  // Edit mode state
  const editId = searchParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(!!editId);
  const [isLoadingData, setIsLoadingData] = useState(!!editId);
  const [waterLineId, setWaterLineId] = useState<string | null>(editId);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [path, setPath] = useState<[number, number][]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Phase 5.9.3: Map data for contextual creation layer
  const [mapData, setMapData] = useState<{ mills: any[]; waterLines: any[] } | null>(null);
  const [loadingMapData, setLoadingMapData] = useState(true);

  const handlePathChange = (newPath: [number, number][]) => {
    setPath(newPath);
  };

  // Phase 5.9.3: Fetch map data for contextual creation layer
  useEffect(() => {
    const fetchMapData = async () => {
      setLoadingMapData(true);
      try {
        const result = await getMapData(locale);
        if (result.success) {
          setMapData(result.data);
        } else {
          console.error('[NewWaterLinePage]: Failed to fetch map data:', result.error);
        }
      } catch (err) {
        console.error('[NewWaterLinePage]: Error fetching map data:', err);
      } finally {
        setLoadingMapData(false);
      }
    };

    fetchMapData();
  }, [locale]);

  // Fetch existing water line data if in edit mode
  useEffect(() => {
    const fetchWaterLineData = async () => {
      if (!editId || !isEditMode) return;

      setIsLoadingData(true);
      setError(null);

      try {
        const result = await getWaterLineByIdForEdit(editId, locale);
        
        if (result.success) {
          const data = result.data;
          setWaterLineId(data.id);
          
          // Populate form fields
          setName(data.name);
          setDescription(data.description || '');
          setColor(data.color);
          
          // Convert path from [lng, lat] to [lat, lng] for Leaflet
          const leafletPath: [number, number][] = data.path.map(([lng, lat]) => [lat, lng]);
          setPath(leafletPath);
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('[NewWaterLinePage]: Error fetching water line data:', err);
        setError('Failed to load water line data');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchWaterLineData();
  }, [editId, isEditMode, locale]);

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'review') => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!name.trim()) {
        setError(t('waterLines.form.nameRequired'));
        setIsSubmitting(false);
        return;
      }

      if (path.length < 2) {
        setError(t('waterLines.form.pathRequired'));
        setIsSubmitting(false);
        return;
      }

      // Validate color format
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!colorRegex.test(color)) {
        setError(t('waterLines.form.invalidColor'));
        setIsSubmitting(false);
        return;
      }

      // Convert path from [lat, lng] (Leaflet) to [lng, lat] (PostGIS)
      // Phase 5.9.7.1: Verify coordinate order - Leaflet uses [lat, lng], PostGIS uses [lng, lat]
      const dbPath: [number, number][] = path.map(([lat, lng]) => [lng, lat]);

      // Call appropriate server action (create or update)
      // Note: Water lines don't currently have status field, but we pass it for future compatibility
      const result = isEditMode && waterLineId
        ? await updateWaterLine({
            id: waterLineId,
            name: name.trim(),
            description: description.trim() || undefined,
            color,
            path: dbPath,
            locale,
          })
        : await createWaterLine({
            name: name.trim(),
            description: description.trim() || undefined,
            color,
            path: dbPath,
            locale,
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
      console.error('[NewWaterLinePage]: Submit error:', err);
      setError(t('waterLines.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">
        {isEditMode ? t('waterLines.editTitle') : t('waterLines.new.title')}
      </h1>
      <p className="text-muted-foreground mb-8">
        {isEditMode ? t('waterLines.editDescription') : t('waterLines.new.description')}
      </p>

      {isLoadingData && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
          {t('waterLines.loadingData')}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Section */}
          <div className="space-y-4">
            <Label>{t('waterLines.form.map')}</Label>
            <DynamicLevadaEditor 
              color={color} 
              onPathChange={handlePathChange}
              existingMills={mapData?.mills || []}
              existingWaterLines={mapData?.waterLines || []}
              initialPath={path}
            />
          </div>

          {/* Form Fields Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('waterLines.form.name')}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('waterLines.form.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('waterLines.form.description')}</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('waterLines.form.descriptionPlaceholder')}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">{t('waterLines.form.color')}</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('waterLines.form.colorDescription')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            {t('waterLines.form.cancel')}
          </Button>
          {!isEditMode && (
            <>
              <Button 
                type="button" 
                variant="outline"
                onClick={(e) => handleSubmit(e, 'draft')} 
                disabled={isSubmitting || isLoadingData}
              >
                {isSubmitting ? t('waterLines.form.savingDraft') : t('waterLines.form.saveAsDraft')}
              </Button>
              <Button 
                type="button"
                onClick={(e) => handleSubmit(e, 'review')} 
                disabled={isSubmitting || isLoadingData}
              >
                {isSubmitting ? t('waterLines.form.submittingForReview') : t('waterLines.form.submitForReview')}
              </Button>
            </>
          )}
          {isEditMode && (
            <Button 
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')} 
              disabled={isSubmitting || isLoadingData}
            >
              {isSubmitting ? t('waterLines.form.updating') : t('waterLines.form.update')}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * New Water Line Page (Wrapper with Suspense)
 * 
 * Wraps the content in Suspense to support useSearchParams()
 */
export default function NewWaterLinePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <NewWaterLinePageContent />
    </Suspense>
  );
}
