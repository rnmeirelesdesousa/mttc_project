'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';

interface MapSidebarProps {
  availableDistricts: string[];
  locale: string;
}

/**
 * MapSidebar Component
 * 
 * Provides filter controls for the mill map:
 * - Typology checkboxes (azenha, rodizio, mare)
 * - District dropdown/select
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

  // Typology options (hydraulic mills only as per spec)
  const typologyOptions: Array<'azenha' | 'rodizio' | 'mare'> = ['azenha', 'rodizio', 'mare'];

  /**
   * Updates URL search params when a filter changes
   */
  const updateFilters = (key: string, value: string | null, isArray = false) => {
    const params = new URLSearchParams(searchParams.toString());

    if (isArray) {
      // Handle array params (typology)
      const currentValues = params.getAll(key);
      if (value && !currentValues.includes(value)) {
        params.append(key, value);
      } else if (value) {
        // Remove if already present
        params.delete(key);
        currentValues
          .filter((v) => v !== value)
          .forEach((v) => params.append(key, v));
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
   * Toggles a typology checkbox
   */
  const handleTypologyToggle = (typology: 'azenha' | 'rodizio' | 'mare') => {
    const isChecked = typologyParams.includes(typology);
    updateFilters('typology', isChecked ? null : typology, true);
  };

  /**
   * Handles district selection change
   */
  const handleDistrictChange = (district: string) => {
    updateFilters('district', district === '' ? null : district, false);
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-300 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">{t('map.filters')}</h2>

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
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleTypologyToggle(typology)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
    </div>
  );
};

