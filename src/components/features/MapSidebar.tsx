'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface MapSidebarProps {
  availableDistricts: string[];
  locale: string;
}

/**
 * MapSidebar Component
 * 
 * Provides advanced filter controls for the mill map:
 * - Typology checkboxes (azenha, rodizio, mare)
 * - District dropdown/select
 * - Roof Material checkboxes
 * - Motive Apparatus checkboxes
 * - Clear Filters button
 * - Updates URL search params when filters change
 * 
 * @param availableDistricts - List of unique districts from published mills
 * @param locale - Current locale for i18n
 */
export const MapSidebar = ({ availableDistricts, locale }: MapSidebarProps) => {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Get current filter values from URL
  const typologyParams = searchParams.getAll('typology');
  const districtParam = searchParams.get('district');
  const roofMaterialParams = searchParams.getAll('roofMaterial');
  const roofShapeParams = searchParams.getAll('roofShape');
  const accessParams = searchParams.getAll('access');
  const motiveApparatusParams = searchParams.getAll('motiveApparatus');

  // Typology options (hydraulic mills only)
  const typologyOptions: Array<'azenha' | 'rodizio' | 'mare'> = ['azenha', 'rodizio', 'mare'];

  // Roof material options
  const roofMaterialOptions: Array<'tile' | 'zinc' | 'thatch' | 'slate' | 'stone'> = ['tile', 'zinc', 'thatch', 'slate', 'stone'];

  // Roof shape options
  const roofShapeOptions: Array<'conical' | 'gable' | 'lean_to' | 'inexistent' | 'false_dome'> = ['conical', 'gable', 'lean_to', 'inexistent', 'false_dome'];

  // Access options
  const accessOptions: Array<'pedestrian' | 'car' | 'difficult_none' | 'traditional_track'> = ['pedestrian', 'car', 'difficult_none', 'traditional_track'];

  // Motive apparatus options
  const motiveApparatusOptions: Array<'sails' | 'shells' | 'tail' | 'cap'> = ['sails', 'shells', 'tail', 'cap'];

  /**
   * Updates URL search params when a filter changes
   */
  const updateFilters = (key: string, value: string | null, isArray = false) => {
    const params = new URLSearchParams(searchParams.toString());

    if (isArray) {
      // Handle array params (typology, roofMaterial, motiveApparatus)
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
   * Toggles a checkbox filter (typology, roofMaterial, or motiveApparatus)
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
    motiveApparatusParams.length > 0;

  return (
    <div className="bg-white p-6 h-full overflow-y-auto">
      {hasActiveFilters && (
        <div className="flex items-center justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs"
          >
            {t('filter.clearAll')}
          </Button>
        </div>
      )}

      {/* Typology Section */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">{t('taxonomy.typology.label')}</Label>
        <div className="space-y-2">
          {typologyOptions.map((typology) => {
            const isChecked = typologyParams.includes(typology);
            return (
              <label
                key={typology}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleArrayFilterToggle('typology', typology)}
                />
                <span className="text-sm">{t(`taxonomy.typology.${typology}`)}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* District Section */}
      <div className="mb-6">
        <Label htmlFor="district-select" className="text-sm font-medium mb-3 block">
          {t('map.district')}
        </Label>
        <select
          id="district-select"
          value={districtParam || ''}
          onChange={(e) => handleDistrictChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Roof Material Section */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">{t('filter.materials')}</Label>
        <div className="space-y-2">
          {roofMaterialOptions.map((material) => {
            const isChecked = roofMaterialParams.includes(material);
            return (
              <label
                key={material}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleArrayFilterToggle('roofMaterial', material)}
                />
                <span className="text-sm">{t(`taxonomy.roofMaterial.${material}`)}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Roof Shape Section */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">{t('filter.roofShape')}</Label>
        <div className="space-y-2">
          {roofShapeOptions.map((shape) => {
            const isChecked = roofShapeParams.includes(shape);
            return (
              <label
                key={shape}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleArrayFilterToggle('roofShape', shape)}
                />
                <span className="text-sm">{t(`taxonomy.roofShape.${shape}`)}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Access Section */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">{t('filter.access')}</Label>
        <div className="space-y-2">
          {accessOptions.map((access) => {
            const isChecked = accessParams.includes(access);
            return (
              <label
                key={access}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleArrayFilterToggle('access', access)}
                />
                <span className="text-sm">{t(`taxonomy.access.${access}`)}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Motive Apparatus Section */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">{t('filter.mechanism')}</Label>
        <div className="space-y-2">
          {motiveApparatusOptions.map((apparatus) => {
            const isChecked = motiveApparatusParams.includes(apparatus);
            return (
              <label
                key={apparatus}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleArrayFilterToggle('motiveApparatus', apparatus)}
                />
                <span className="text-sm">{t(`taxonomy.motiveApparatus.${apparatus}`)}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

