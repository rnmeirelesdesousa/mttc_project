'use client';

import React, { useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface MapSidebarProps {
  availableDistricts: string[];
  locale: string;
}

/**
 * MapSidebar Component
 * 
 * Professional filter sidebar with collapsible sections for comprehensive mill filtering.
 * All filters are synced with URL search parameters.
 * 
 * @param availableDistricts - List of unique districts from published mills
 * @param locale - Current locale for i18n
 */
export const MapSidebar = ({ availableDistricts, locale }: MapSidebarProps) => {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Collapsible section state
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = (section: string) => {
    const newOpen = new Set(openSections);
    if (newOpen.has(section)) {
      newOpen.delete(section);
    } else {
      newOpen.add(section);
    }
    setOpenSections(newOpen);
  };

  // Get current filter values from URL
  const typologyParams = searchParams.getAll('typology');
  const districtParam = searchParams.get('district');
  const roofMaterialParams = searchParams.getAll('roofMaterial');
  const roofShapeParams = searchParams.getAll('roofShape');
  const accessParams = searchParams.getAll('access');
  const motiveApparatusParams = searchParams.getAll('motiveApparatus');
  const epochParams = searchParams.getAll('epoch');
  const currentUseParams = searchParams.getAll('currentUse');
  const settingParams = searchParams.getAll('setting');
  const legalProtectionParams = searchParams.getAll('legalProtection');
  const propertyStatusParams = searchParams.getAll('propertyStatus');
  const constructionTechniqueParams = searchParams.getAll('constructionTechnique');
  const planShapeParams = searchParams.getAll('planShape');
  const volumetryParams = searchParams.getAll('volumetry');
  const exteriorFinishParams = searchParams.getAll('exteriorFinish');

  // All enum options from schema
  const typologyOptions: Array<'azenha' | 'rodizio' | 'mare' | 'torre_fixa' | 'giratorio' | 'velas' | 'armacao'> =
    ['azenha', 'rodizio', 'mare', 'torre_fixa', 'giratorio', 'velas', 'armacao'];

  const roofMaterialOptions: Array<'tile' | 'zinc' | 'thatch' | 'slate' | 'stone'> =
    ['tile', 'zinc', 'thatch', 'slate', 'stone'];

  const roofShapeOptions: Array<'conical' | 'gable' | 'lean_to' | 'inexistent' | 'false_dome'> =
    ['conical', 'gable', 'lean_to', 'inexistent', 'false_dome'];

  const accessOptions: Array<'pedestrian' | 'car' | 'difficult_none' | 'traditional_track'> =
    ['pedestrian', 'car', 'difficult_none', 'traditional_track'];

  const motiveApparatusOptions: Array<'sails' | 'shells' | 'tail' | 'cap'> =
    ['sails', 'shells', 'tail', 'cap'];

  const epochOptions: Array<'pre_18th_c' | '18th_c' | '19th_c' | '20th_c'> =
    ['pre_18th_c', '18th_c', '19th_c', '20th_c'];

  const currentUseOptions: Array<'milling' | 'housing' | 'tourism' | 'ruin' | 'museum'> =
    ['milling', 'housing', 'tourism', 'ruin', 'museum'];

  const settingOptions: Array<'rural' | 'urban' | 'isolated' | 'riverbank'> =
    ['rural', 'urban', 'isolated', 'riverbank'];

  const legalProtectionOptions: Array<'inexistent' | 'under_study' | 'classified'> =
    ['inexistent', 'under_study', 'classified'];

  const propertyStatusOptions: Array<'private' | 'public' | 'unknown'> =
    ['private', 'public', 'unknown'];

  const constructionTechniqueOptions: Array<'dry_stone' | 'mortared_stone' | 'mixed_other'> =
    ['dry_stone', 'mortared_stone', 'mixed_other'];

  const planShapeOptions: Array<'circular' | 'quadrangular' | 'rectangular' | 'irregular'> =
    ['circular', 'quadrangular', 'rectangular', 'irregular'];

  const volumetryOptions: Array<'cylindrical' | 'conical' | 'prismatic_sq_rec'> =
    ['cylindrical', 'conical', 'prismatic_sq_rec'];

  const exteriorFinishOptions: Array<'exposed' | 'plastered' | 'whitewashed'> =
    ['exposed', 'plastered', 'whitewashed'];

  /**
   * Updates URL search params when a filter changes
   */
  const updateFilters = (key: string, value: string | null, isArray = false) => {
    const params = new URLSearchParams(searchParams.toString());

    if (isArray) {
      // Handle array params (typology, roofMaterial, etc.)
      if (!value) {
        return; // Safety check: should not happen
      }

      const currentValues = params.getAll(key);

      // Check if value already exists in the array
      if (currentValues.includes(value)) {
        // Remove it: delete all occurrences, then re-add the filtered list
        params.delete(key);
        currentValues
          .filter((v) => v !== value)
          .forEach((v) => params.append(key, v));
      } else {
        // Add it: append the new value
        params.append(key, value);
      }
    } else {
      // Handle single value params (district)
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    // Update URL without page reload
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  /**
   * Toggles a checkbox filter
   */
  const handleArrayFilterToggle = (key: string, value: string) => {
    updateFilters(key, value, true);
  };

  /**
   * Handles district selection change
   */
  const handleDistrictChange = (district: string) => {
    updateFilters('district', district === '' ? null : district, false);
  };

  /**
   * Clears all filters
   */
  const handleClearFilters = () => {
    router.push(pathname, { scroll: false });
  };

  // Check if any filters are active
  const hasActiveFilters =
    typologyParams.length > 0 ||
    districtParam !== null ||
    roofMaterialParams.length > 0 ||
    roofShapeParams.length > 0 ||
    accessParams.length > 0 ||
    motiveApparatusParams.length > 0 ||
    epochParams.length > 0 ||
    currentUseParams.length > 0 ||
    settingParams.length > 0 ||
    legalProtectionParams.length > 0 ||
    propertyStatusParams.length > 0 ||
    constructionTechniqueParams.length > 0 ||
    planShapeParams.length > 0 ||
    volumetryParams.length > 0 ||
    exteriorFinishParams.length > 0;

  // Render checkbox group helper
  const renderCheckboxGroup = (
    options: readonly string[],
    selectedValues: string[],
    filterKey: string,
    translationKey: string
  ) => {
    return (
      <div className="space-y-2">
        {options.map((option) => {
          const isChecked = selectedValues.includes(option);
          return (
            <label
              key={option}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => handleArrayFilterToggle(filterKey, option)}
              />
              <span className="text-xs text-gray-700">{t(`${translationKey}.${option}`)}</span>
            </label>
          );
        })}
      </div>
    );
  };

  // Render collapsible section helper
  const renderSection = (
    sectionKey: string,
    title: string,
    children: React.ReactNode
  ) => {
    const isOpen = openSections.has(sectionKey);
    return (
      <Card className="mb-4">
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {isOpen && <CardContent className="pt-0">{children}</CardContent>}
      </Card>
    );
  };

  return (
    <div className="bg-white p-4 h-full overflow-y-auto">
      {/* Header with Clear Button */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <h3 className="text-base font-semibold text-gray-900">{t('map.filters')}</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-[10px] h-7 px-2 text-gray-600 hover:text-gray-900"
          >
            <X className="h-3 w-3 mr-1" />
            {t('filter.clearAll')}
          </Button>
        )}
      </div>

      {/* Location Section */}
      {renderSection(
        'location',
        t('mill.sidebar.locationInfo'),
        <div className="space-y-4">
          <div>
            <Label htmlFor="district-select" className="text-xs font-medium mb-2 block">
              {t('mill.sidebar.district')}
            </Label>
            <select
              id="district-select"
              value={districtParam || ''}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">{t('map.allDistricts')}</option>
              {availableDistricts
                .filter((d) => d !== null && d !== '')
                .sort()
                .map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Typology Section */}
      {renderSection(
        'typology',
        t('taxonomy.typology.label'),
        renderCheckboxGroup(typologyOptions, typologyParams, 'typology', 'taxonomy.typology')
      )}

      {/* Characterization Section */}
      {renderSection(
        'characterization',
        t('mill.detail.characterization'),
        <div className="space-y-6">
          {/* Epoch */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('mill.detail.epoch')}</Label>
            {renderCheckboxGroup(epochOptions, epochParams, 'epoch', 'taxonomy.epoch')}
          </div>

          {/* Current Use */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('mill.detail.currentUse')}</Label>
            {renderCheckboxGroup(currentUseOptions, currentUseParams, 'currentUse', 'taxonomy.currentUse')}
          </div>

          {/* Setting */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('add.form.technical.setting')}</Label>
            {renderCheckboxGroup(settingOptions, settingParams, 'setting', 'taxonomy.setting')}
          </div>

          {/* Access */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('add.form.technical.access')}</Label>
            {renderCheckboxGroup(accessOptions, accessParams, 'access', 'taxonomy.access')}
          </div>

          {/* Legal Protection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('add.form.technical.legalProtection')}</Label>
            {renderCheckboxGroup(legalProtectionOptions, legalProtectionParams, 'legalProtection', 'taxonomy.legalProtection')}
          </div>

          {/* Property Status */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('add.form.technical.propertyStatus')}</Label>
            {renderCheckboxGroup(propertyStatusOptions, propertyStatusParams, 'propertyStatus', 'taxonomy.propertyStatus')}
          </div>
        </div>
      )}

      {/* Architecture Section */}
      {renderSection(
        'architecture',
        t('add.form.technical.architecture.title'),
        <div className="space-y-6">
          {/* Plan Shape */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('add.form.technical.architecture.planShape')}</Label>
            {renderCheckboxGroup(planShapeOptions, planShapeParams, 'planShape', 'taxonomy.planShape')}
          </div>

          {/* Volumetry */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('add.form.technical.architecture.volumetry')}</Label>
            {renderCheckboxGroup(volumetryOptions, volumetryParams, 'volumetry', 'taxonomy.volumetry')}
          </div>

          {/* Construction Technique */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('mill.sidebar.constructionTechnique')}</Label>
            {renderCheckboxGroup(constructionTechniqueOptions, constructionTechniqueParams, 'constructionTechnique', 'taxonomy.constructionTechnique')}
          </div>

          {/* Exterior Finish */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('add.form.technical.architecture.exteriorFinish')}</Label>
            {renderCheckboxGroup(exteriorFinishOptions, exteriorFinishParams, 'exteriorFinish', 'taxonomy.exteriorFinish')}
          </div>
        </div>
      )}

      {/* Roof Section */}
      {renderSection(
        'roof',
        t('mill.sidebar.roofDetail'),
        <div className="space-y-6">
          {/* Roof Shape */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('filter.roofShape')}</Label>
            {renderCheckboxGroup(roofShapeOptions, roofShapeParams, 'roofShape', 'taxonomy.roofShape')}
          </div>

          {/* Roof Material */}
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('filter.materials')}</Label>
            {renderCheckboxGroup(roofMaterialOptions, roofMaterialParams, 'roofMaterial', 'taxonomy.roofMaterial')}
          </div>
        </div>
      )}

      {/* Mechanism Section */}
      {renderSection(
        'mechanism',
        t('mill.detail.mechanism'),
        <div>
          <Label className="text-sm font-medium mb-3 block">{t('filter.mechanism')}</Label>
          {renderCheckboxGroup(motiveApparatusOptions, motiveApparatusParams, 'motiveApparatus', 'taxonomy.motiveApparatus')}
        </div>
      )}
    </div>
  );
};
