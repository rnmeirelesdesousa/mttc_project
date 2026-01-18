'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createWaterLine } from '@/actions/admin';
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
 * New Water Line Page
 * 
 * Form for creating a new water line (levada) entry.
 * - Interactive map for drawing the line path
 * - Form fields for name, description, and color
 * 
 * Security: Should be protected by middleware/auth (researcher or admin only)
 */
export default function NewWaterLinePage() {
  const t = useTranslations();
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();

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

  const handleSubmit = async (e: React.FormEvent) => {
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

      // Call server action
      const result = await createWaterLine({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        path,
        locale,
      });

      if (result.success) {
        // Redirect to dashboard
        router.push(`/${locale}/dashboard`);
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
      <h1 className="text-3xl font-bold mb-2">{t('waterLines.new.title')}</h1>
      <p className="text-muted-foreground mb-8">{t('waterLines.new.description')}</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Section */}
          <div className="space-y-4">
            <Label>{t('waterLines.form.map')}</Label>
            <DynamicLevadaEditor 
              color={color} 
              onPathChange={handlePathChange}
              existingMills={mapData?.mills || []}
              existingWaterLines={mapData?.waterLines || []}
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('waterLines.form.submitting') : t('waterLines.form.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
