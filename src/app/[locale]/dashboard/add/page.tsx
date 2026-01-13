'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createMillConstruction } from '@/actions/admin';

/**
 * Add New Mill Construction Page
 * 
 * Multi-step form for creating a new mill construction entry.
 * Uses Tabs to separate: General Info, Location, and Technical Specs.
 * 
 * Security: Should be protected by middleware/auth (researcher or admin only)
 */
export default function AddMillPage() {
  const t = useTranslations();
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();

  // Form state
  const [activeTab, setActiveTab] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Location
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [district, setDistrict] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [parish, setParish] = useState('');
  const [address, setAddress] = useState('');
  const [drainageBasin, setDrainageBasin] = useState('');

  // Technical Specs
  const [typology, setTypology] = useState<string>('');
  const [access, setAccess] = useState<string>('');
  const [legalProtection, setLegalProtection] = useState<string>('');
  const [propertyStatus, setPropertyStatus] = useState<string>('');
  const [epoch, setEpoch] = useState<string>('');
  const [currentUse, setCurrentUse] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!title.trim()) {
        setError(t('add.form.general.titleRequired'));
        setActiveTab('general');
        setIsSubmitting(false);
        return;
      }

      if (!latitude || !longitude) {
        setError(t('add.form.location.latitudeRequired') || t('add.form.location.longitudeRequired'));
        setActiveTab('location');
        setIsSubmitting(false);
        return;
      }

      const latNum = parseFloat(latitude);
      const lngNum = parseFloat(longitude);

      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        setError(t('add.form.location.latitudeRequired'));
        setActiveTab('location');
        setIsSubmitting(false);
        return;
      }

      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        setError(t('add.form.location.longitudeRequired'));
        setActiveTab('location');
        setIsSubmitting(false);
        return;
      }

      if (!typology) {
        setError(t('add.form.technical.typologyRequired'));
        setActiveTab('technical');
        setIsSubmitting(false);
        return;
      }

      // Call server action
      const result = await createMillConstruction({
        title: title.trim(),
        description: description.trim() || undefined,
        locale,
        latitude: latNum,
        longitude: lngNum,
        district: district.trim() || undefined,
        municipality: municipality.trim() || undefined,
        parish: parish.trim() || undefined,
        address: address.trim() || undefined,
        drainageBasin: drainageBasin.trim() || undefined,
        typology: typology as 'azenha' | 'rodizio' | 'mare' | 'torre_fixa' | 'giratorio' | 'velas' | 'armacao',
        access: access || undefined,
        legalProtection: legalProtection || undefined,
        propertyStatus: propertyStatus || undefined,
        epoch: epoch || undefined,
        currentUse: currentUse || undefined,
      });

      if (result.success) {
        // Redirect to dashboard or review queue
        router.push(`/${locale}/dashboard`);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[AddMillPage]: Submit error:', err);
      setError(t('add.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">{t('add.title')}</h1>
      <p className="text-muted-foreground mb-8">{t('add.description')}</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">{t('add.tabs.general')}</TabsTrigger>
            <TabsTrigger value="location">{t('add.tabs.location')}</TabsTrigger>
            <TabsTrigger value="technical">{t('add.tabs.technical')}</TabsTrigger>
          </TabsList>

          {/* General Info Tab */}
          <TabsContent value="general" className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">{t('add.form.general.title')}</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('add.form.general.titlePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('add.form.general.description')}</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('add.form.general.descriptionPlaceholder')}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={5}
              />
            </div>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">{t('add.form.location.latitude')}</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder={t('add.form.location.latitudePlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">{t('add.form.location.longitude')}</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder={t('add.form.location.longitudePlaceholder')}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">{t('add.form.location.district')}</Label>
              <Input
                id="district"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={t('add.form.location.districtPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="municipality">{t('add.form.location.municipality')}</Label>
              <Input
                id="municipality"
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder={t('add.form.location.municipalityPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parish">{t('add.form.location.parish')}</Label>
              <Input
                id="parish"
                type="text"
                value={parish}
                onChange={(e) => setParish(e.target.value)}
                placeholder={t('add.form.location.parishPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('add.form.location.address')}</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('add.form.location.addressPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drainageBasin">{t('add.form.location.drainageBasin')}</Label>
              <Input
                id="drainageBasin"
                type="text"
                value={drainageBasin}
                onChange={(e) => setDrainageBasin(e.target.value)}
                placeholder={t('add.form.location.drainageBasinPlaceholder')}
              />
            </div>
          </TabsContent>

          {/* Technical Specs Tab */}
          <TabsContent value="technical" className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="typology">{t('add.form.technical.typology')}</Label>
              <select
                id="typology"
                value={typology}
                onChange={(e) => setTypology(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">{t('add.form.technical.typologyPlaceholder')}</option>
                <option value="azenha">{t('taxonomy.typology.azenha')}</option>
                <option value="rodizio">{t('taxonomy.typology.rodizio')}</option>
                <option value="mare">{t('taxonomy.typology.mare')}</option>
                <option value="torre_fixa">{t('taxonomy.typology.torre_fixa')}</option>
                <option value="giratorio">{t('taxonomy.typology.giratorio')}</option>
                <option value="velas">{t('taxonomy.typology.velas')}</option>
                <option value="armacao">{t('taxonomy.typology.armacao')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access">{t('add.form.technical.access')}</Label>
              <select
                id="access"
                value={access}
                onChange={(e) => setAccess(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t('add.form.technical.accessPlaceholder')}</option>
                <option value="pedestrian">{t('taxonomy.access.pedestrian')}</option>
                <option value="car">{t('taxonomy.access.car')}</option>
                <option value="difficult_none">{t('taxonomy.access.difficult_none')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalProtection">{t('add.form.technical.legalProtection')}</Label>
              <select
                id="legalProtection"
                value={legalProtection}
                onChange={(e) => setLegalProtection(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t('add.form.technical.legalProtectionPlaceholder')}</option>
                <option value="inexistent">{t('taxonomy.legalProtection.inexistent')}</option>
                <option value="under_study">{t('taxonomy.legalProtection.under_study')}</option>
                <option value="classified">{t('taxonomy.legalProtection.classified')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyStatus">{t('add.form.technical.propertyStatus')}</Label>
              <select
                id="propertyStatus"
                value={propertyStatus}
                onChange={(e) => setPropertyStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t('add.form.technical.propertyStatusPlaceholder')}</option>
                <option value="private">{t('taxonomy.propertyStatus.private')}</option>
                <option value="public">{t('taxonomy.propertyStatus.public')}</option>
                <option value="unknown">{t('taxonomy.propertyStatus.unknown')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="epoch">{t('add.form.technical.epoch')}</Label>
              <select
                id="epoch"
                value={epoch}
                onChange={(e) => setEpoch(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t('add.form.technical.epochPlaceholder')}</option>
                <option value="pre_18th_c">{t('taxonomy.epoch.pre_18th_c')}</option>
                <option value="18th_c">{t('taxonomy.epoch.18th_c')}</option>
                <option value="19th_c">{t('taxonomy.epoch.19th_c')}</option>
                <option value="20th_c">{t('taxonomy.epoch.20th_c')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentUse">{t('add.form.technical.currentUse')}</Label>
              <select
                id="currentUse"
                value={currentUse}
                onChange={(e) => setCurrentUse(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t('add.form.technical.currentUsePlaceholder')}</option>
                <option value="milling">{t('taxonomy.currentUse.milling')}</option>
                <option value="housing">{t('taxonomy.currentUse.housing')}</option>
                <option value="tourism">{t('taxonomy.currentUse.tourism')}</option>
                <option value="ruin">{t('taxonomy.currentUse.ruin')}</option>
                <option value="museum">{t('taxonomy.currentUse.museum')}</option>
              </select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('add.form.submitting') : t('add.form.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
