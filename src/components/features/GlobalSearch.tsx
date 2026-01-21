'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getSearchableMills, getSearchableWaterLines, getSearchablePocas, type SearchableMill, type SearchableWaterLine, type SearchablePoca } from '@/actions/public';
import { getPublicUrl } from '@/lib/storage';

interface GlobalSearchProps {
  locale: string;
}

/**
 * GlobalSearch Component
 * 
 * Provides a global search bar that searches across:
 * - Mills: All construction fields, hydraulic systems, grinding mechanisms, etc.
 * - Water Lines (Levadas): Names and descriptions in all languages
 * - Poças: Titles, descriptions, and associated water line names
 * 
 * On selection, navigates to the appropriate detail page or map.
 */
export const GlobalSearch = ({ locale }: GlobalSearchProps) => {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [mills, setMills] = useState<SearchableMill[]>([]);
  const [waterLines, setWaterLines] = useState<SearchableWaterLine[]>([]);
  const [pocas, setPocas] = useState<SearchablePoca[]>([]);
  const [filteredResults, setFilteredResults] = useState<Array<{
    type: 'mill' | 'waterLine' | 'poca';
    id: string;
    slug: string;
    displayName: string;
    displayLangCode?: string | null;
    subtitle?: string;
    imageUrl?: string | null;
  }>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all searchable data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [millsResult, waterLinesResult, pocasResult] = await Promise.all([
        getSearchableMills(locale),
        getSearchableWaterLines(locale),
        getSearchablePocas(locale),
      ]);
      
      if (millsResult.success) {
        setMills(millsResult.data);
      }
      if (waterLinesResult.success) {
        setWaterLines(waterLinesResult.data);
      }
      if (pocasResult.success) {
        setPocas(pocasResult.data);
      }
      setLoading(false);
    };
    fetchData();
  }, [locale]);

  // Filter all items based on search query - cross-language search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults([]);
      setIsOpen(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results: Array<{
      type: 'mill' | 'waterLine' | 'poca';
      id: string;
      slug: string;
      displayName: string;
      displayLangCode?: string | null;
      subtitle?: string;
    }> = [];

    // Search mills
    const filteredMills = mills
      .map((mill) => {
        let matched = false;
        let matchedTitle: string | null = null;
        let matchedLangCode: string | null = null;

        // Search in all translations (cross-language)
        for (const translation of mill.translations || []) {
          const titleMatch = translation.title?.toLowerCase().includes(query);
          const descriptionMatch = translation.description?.toLowerCase().includes(query);
          
          if (titleMatch || descriptionMatch) {
            matched = true;
            // Use the title from the language that matched
            if (titleMatch && !matchedTitle) {
              matchedTitle = translation.title;
              matchedLangCode = translation.langCode;
            }
          }
        }
        
        // Search in legacy ID
        if (mill.legacyId?.toLowerCase().includes(query)) {
          matched = true;
        }
        
        // Search in location data
        const districtMatch = mill.district?.toLowerCase().includes(query);
        const municipalityMatch = mill.municipality?.toLowerCase().includes(query);
        const parishMatch = mill.parish?.toLowerCase().includes(query);
        const placeMatch = mill.place?.toLowerCase().includes(query);
        const addressMatch = mill.address?.toLowerCase().includes(query);
        
        if (districtMatch || municipalityMatch || parishMatch || placeMatch || addressMatch) {
          matched = true;
        }
        
        // Helper function to search translated enum fields
        // Searches both the raw enum value and the translated text in current locale
        const searchTranslatedField = (value: string | null, translationKey: string): boolean => {
          if (!value) return false;
          // Search raw enum value (works for both languages)
          if (value.toLowerCase().includes(query)) return true;
          try {
            // Search translated text in current locale
            const translatedText = t(`${translationKey}.${value}`).toLowerCase();
            if (translatedText.includes(query)) return true;
            // Also try common English/Portuguese terms that might be in the translation
            // This helps when users search in a different language than their locale
            const commonTerms: Record<string, string[]> = {
              'azenha': ['vertical', 'water', 'wheel'],
              'rodizio': ['horizontal', 'water', 'wheel'],
              'mare': ['tide', 'maré'],
              'granite': ['granito'],
              'schist': ['xisto'],
            };
            const terms = commonTerms[value] || [];
            return terms.some(term => term.toLowerCase().includes(query));
          } catch {
            return false;
          }
        };
        
        // Search in all enum fields with translations (both languages)
        const typologyMatch = searchTranslatedField(mill.typology, 'taxonomy.typology');
        const roofMaterialMatch = searchTranslatedField(mill.roofMaterial, 'taxonomy.roofMaterial');
        const roofShapeMatch = searchTranslatedField(mill.roofShape, 'taxonomy.roofShape');
        const accessMatch = searchTranslatedField(mill.access, 'taxonomy.access');
        const motiveApparatusMatch = searchTranslatedField(mill.motiveApparatus, 'taxonomy.motiveApparatus');
        const epochMatch = searchTranslatedField(mill.epoch, 'taxonomy.epoch');
        const currentUseMatch = searchTranslatedField(mill.currentUse, 'taxonomy.currentUse');
        const settingMatch = searchTranslatedField(mill.setting, 'taxonomy.setting');
        const legalProtectionMatch = searchTranslatedField(mill.legalProtection, 'taxonomy.legalProtection');
        const propertyStatusMatch = searchTranslatedField(mill.propertyStatus, 'taxonomy.propertyStatus');
        const constructionTechniqueMatch = searchTranslatedField(mill.constructionTechnique, 'taxonomy.constructionTechnique');
        const planShapeMatch = searchTranslatedField(mill.planShape, 'taxonomy.planShape');
        const volumetryMatch = searchTranslatedField(mill.volumetry, 'taxonomy.volumetry');
        const exteriorFinishMatch = searchTranslatedField(mill.exteriorFinish, 'taxonomy.exteriorFinish');
        
        // Hydraulic System fields
        const captationTypeMatch = searchTranslatedField(mill.captationType, 'taxonomy.captationType');
        const conductionTypeMatch = searchTranslatedField(mill.conductionType, 'taxonomy.conductionType');
        const conductionStateMatch = searchTranslatedField(mill.conductionState, 'taxonomy.conductionState');
        const admissionRodizioMatch = searchTranslatedField(mill.admissionRodizio, 'taxonomy.admissionRodizio');
        const admissionAzenhaMatch = searchTranslatedField(mill.admissionAzenha, 'taxonomy.admissionAzenha');
        const wheelTypeRodizioMatch = searchTranslatedField(mill.wheelTypeRodizio, 'taxonomy.wheelTypeRodizio');
        const wheelTypeAzenhaMatch = searchTranslatedField(mill.wheelTypeAzenha, 'taxonomy.wheelTypeAzenha');
        
        // Grinding Mechanism
        const millstoneStateMatch = searchTranslatedField(mill.millstoneState, 'taxonomy.millstoneState');
        const millstoneDiameterMatch = mill.millstoneDiameter?.toLowerCase().includes(query) || false;
        const millstoneQtyMatch = mill.millstoneQuantity?.toString().includes(query) || false;
        
        // Grinding components (boolean fields - search by component name)
        const hasTremonhaMatch = mill.hasTremonha && (
          query.includes('tremonha') || 
          t('taxonomy.grindingComponent.tremonha').toLowerCase().includes(query) ||
          (locale === 'en' ? 'hopper' : '').includes(query)
        );
        const hasQuelhaMatch = mill.hasQuelha && (
          query.includes('quelha') || 
          t('taxonomy.grindingComponent.quelha').toLowerCase().includes(query)
        );
        const hasUrreiroMatch = mill.hasUrreiro && (
          query.includes('urreiro') || 
          t('taxonomy.grindingComponent.urreiro').toLowerCase().includes(query)
        );
        const hasAliviadouroMatch = mill.hasAliviadouro && (
          query.includes('aliviadouro') || 
          t('taxonomy.grindingComponent.aliviadouro').toLowerCase().includes(query)
        );
        const hasFarinaleiroMatch = mill.hasFarinaleiro && (
          query.includes('farinaleiro') || 
          t('taxonomy.grindingComponent.farinaleiro').toLowerCase().includes(query)
        );
        
        // Epigraphy
        const epigraphyLocationMatch = searchTranslatedField(mill.epigraphyLocation, 'taxonomy.epigraphyLocation');
        const epigraphyTypeMatch = searchTranslatedField(mill.epigraphyType, 'taxonomy.epigraphyType');
        const epigraphyDescriptionMatch = mill.epigraphyDescription?.toLowerCase().includes(query) || false;
        const epigraphyPresenceMatch = mill.epigraphyPresence && (
          query.includes('epigraf') || query.includes('epigraph') || query.includes('inscriç') || query.includes('inscription')
        );
        
        // Conservation Ratings
        const ratingStructureMatch = searchTranslatedField(mill.ratingStructure, 'taxonomy.conservation');
        const ratingRoofMatch = searchTranslatedField(mill.ratingRoof, 'taxonomy.conservation');
        const ratingHydraulicMatch = searchTranslatedField(mill.ratingHydraulic, 'taxonomy.conservation');
        const ratingMechanismMatch = searchTranslatedField(mill.ratingMechanism, 'taxonomy.conservation');
        const ratingOverallMatch = searchTranslatedField(mill.ratingOverall, 'taxonomy.conservation');
        
        // Annexes (boolean fields - search by annex name)
        const hasOvenMatch = mill.hasOven && (
          query.includes('forno') || query.includes('oven') || 
          t('taxonomy.annex.oven').toLowerCase().includes(query)
        );
        const hasMillerHouseMatch = mill.hasMillerHouse && (
          query.includes('casa') || query.includes('house') || 
          t('taxonomy.annex.miller_house').toLowerCase().includes(query)
        );
        const hasStableMatch = mill.hasStable && (
          query.includes('estreb') || query.includes('stable') || 
          t('taxonomy.annex.stable').toLowerCase().includes(query)
        );
        const hasFullingMillMatch = mill.hasFullingMill && (
          query.includes('pisão') || query.includes('fulling') || 
          t('taxonomy.annex.fulling_mill').toLowerCase().includes(query)
        );
        
        // Stone Materials (boolean fields - search by stone type)
        const stoneGraniteMatch = mill.stoneTypeGranite && (
          query.includes('granit') || query.includes('granito')
        );
        const stoneSchistMatch = mill.stoneTypeSchist && (
          query.includes('schist') || query.includes('xisto')
        );
        const stoneOtherMatch = mill.stoneTypeOther && (
          query.includes('outro') || query.includes('other')
        );
        const stoneDescriptionMatch = mill.stoneMaterialDescription?.toLowerCase().includes(query) || false;
        
        // Gable Materials (boolean fields)
        const gableLusaMatch = mill.gableMaterialLusa && (
          query.includes('lusa') || t('taxonomy.gableMaterial.lusa').toLowerCase().includes(query)
        );
        const gableMarselhaMatch = mill.gableMaterialMarselha && (
          query.includes('marselha') || query.includes('marseille') || 
          t('taxonomy.gableMaterial.marselha').toLowerCase().includes(query)
        );
        const gableMeiaCanaMatch = mill.gableMaterialMeiaCana && (
          query.includes('meia') || query.includes('cana') || 
          t('taxonomy.gableMaterial.meiaCana').toLowerCase().includes(query)
        );
        
        // Dimensions (search as numbers)
        const lengthMatch = mill.length?.toString().includes(query) || false;
        const widthMatch = mill.width?.toString().includes(query) || false;
        const heightMatch = mill.height?.toString().includes(query) || false;
        
        // Rodizio/Azenha quantities
        const rodizioQtyMatch = mill.rodizioQty?.toString().includes(query) || false;
        const azenhaQtyMatch = mill.azenhaQty?.toString().includes(query) || false;

        if (typologyMatch || roofMaterialMatch || roofShapeMatch || accessMatch || 
            motiveApparatusMatch || epochMatch || currentUseMatch || settingMatch ||
            legalProtectionMatch || propertyStatusMatch || constructionTechniqueMatch ||
            planShapeMatch || volumetryMatch || exteriorFinishMatch ||
            captationTypeMatch || conductionTypeMatch || conductionStateMatch ||
            admissionRodizioMatch || admissionAzenhaMatch || wheelTypeRodizioMatch || wheelTypeAzenhaMatch ||
            millstoneStateMatch || millstoneDiameterMatch || millstoneQtyMatch ||
            hasTremonhaMatch || hasQuelhaMatch || hasUrreiroMatch || hasAliviadouroMatch || hasFarinaleiroMatch ||
            epigraphyLocationMatch || epigraphyTypeMatch || epigraphyDescriptionMatch || epigraphyPresenceMatch ||
            ratingStructureMatch || ratingRoofMatch || ratingHydraulicMatch || ratingMechanismMatch || ratingOverallMatch ||
            hasOvenMatch || hasMillerHouseMatch || hasStableMatch || hasFullingMillMatch ||
            stoneGraniteMatch || stoneSchistMatch || stoneOtherMatch || stoneDescriptionMatch ||
            gableLusaMatch || gableMarselhaMatch || gableMeiaCanaMatch ||
            lengthMatch || widthMatch || heightMatch || rodizioQtyMatch || azenhaQtyMatch) {
          matched = true;
        }

        if (!matched) {
          return null;
        }

        // Return mill with the matched title (or fallback to default title)
        return {
          ...mill,
          displayTitle: matchedTitle || mill.title,
          displayLangCode: matchedLangCode || mill.titleLangCode,
        };
      })
      .filter((mill): mill is SearchableMill & { displayTitle: string | null; displayLangCode: string | null } => mill !== null);

    // Add mills to results
    filteredMills.forEach((mill) => {
      const subtitle = [
        mill.district,
        mill.typology ? t(`taxonomy.typology.${mill.typology}`) : null,
      ].filter(Boolean).join(' • ');
      
      const imageUrl = mill.mainImage ? getPublicUrl(mill.mainImage) : null;
      
      results.push({
        type: 'mill',
        id: mill.id,
        slug: mill.slug,
        displayName: mill.displayTitle || mill.title || mill.slug,
        displayLangCode: mill.displayLangCode || mill.titleLangCode,
        subtitle,
        imageUrl,
      });
    });

    // Search water lines
    const filteredWaterLines = waterLines
      .map((wl) => {
        let matched = false;
        let matchedName: string | null = null;
        let matchedLangCode: string | null = null;

        // Search in all translations (cross-language)
        for (const translation of wl.translations || []) {
          const nameMatch = translation.name?.toLowerCase().includes(query);
          const descriptionMatch = translation.description?.toLowerCase().includes(query);
          
          if (nameMatch || descriptionMatch) {
            matched = true;
            if (nameMatch && !matchedName) {
              matchedName = translation.name;
              matchedLangCode = translation.langCode;
            }
          }
        }

        // Search in slug
        if (wl.slug.toLowerCase().includes(query)) {
          matched = true;
        }

        if (!matched) {
          return null;
        }

        return {
          ...wl,
          displayName: matchedName || wl.name || wl.slug,
          displayLangCode: matchedLangCode || wl.nameLangCode,
        };
      })
      .filter((wl): wl is SearchableWaterLine & { displayName: string | null; displayLangCode: string | null } => wl !== null);

    // Add water lines to results
    filteredWaterLines.forEach((wl) => {
      results.push({
        type: 'waterLine',
        id: wl.id,
        slug: wl.slug,
        displayName: wl.displayName || wl.name || wl.slug,
        displayLangCode: wl.displayLangCode || wl.nameLangCode,
        subtitle: t('inventory.type.levada'),
        imageUrl: null, // Water lines don't have images
      });
    });

    // Search pocas
    const filteredPocas = pocas
      .map((poca) => {
        let matched = false;
        let matchedTitle: string | null = null;
        let matchedLangCode: string | null = null;

        // Search in all translations (cross-language)
        for (const translation of poca.translations || []) {
          const titleMatch = translation.title?.toLowerCase().includes(query);
          const descriptionMatch = translation.description?.toLowerCase().includes(query);
          
          if (titleMatch || descriptionMatch) {
            matched = true;
            if (titleMatch && !matchedTitle) {
              matchedTitle = translation.title;
              matchedLangCode = translation.langCode;
            }
          }
        }

        // Search in water line name
        if (poca.waterLineName?.toLowerCase().includes(query)) {
          matched = true;
        }

        if (!matched) {
          return null;
        }

        return {
          ...poca,
          displayTitle: matchedTitle || poca.title || poca.slug,
          displayLangCode: matchedLangCode || poca.titleLangCode,
        };
      })
      .filter((poca): poca is SearchablePoca & { displayTitle: string | null; displayLangCode: string | null } => poca !== null);

    // Add pocas to results
    filteredPocas.forEach((poca) => {
      const subtitle = [
        poca.waterLineName ? `${t('inventory.type.levada')}: ${poca.waterLineName}` : null,
        t('inventory.type.poca'),
      ].filter(Boolean).join(' • ');
      
      results.push({
        type: 'poca',
        id: poca.id,
        slug: poca.slug,
        displayName: poca.displayTitle || poca.title || poca.slug,
        displayLangCode: poca.displayLangCode || poca.titleLangCode,
        subtitle,
        imageUrl: null, // Pocas don't have images
      });
    });

    setFilteredResults(results.slice(0, 10)); // Limit to 10 results
    setIsOpen(results.length > 0);
  }, [searchQuery, mills, waterLines, pocas, t, locale]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectItem = (item: {
    type: 'mill' | 'waterLine' | 'poca';
    id: string;
    slug: string;
  }) => {
    setSearchQuery('');
    setIsOpen(false);
    
    const homePath = `/${locale}`;
    const isOnHomePage = pathname === homePath || pathname === `/${locale}/map`;
    
    if (item.type === 'mill') {
      // Navigate to home page (which now serves the map) with millId param
      if (isOnHomePage) {
        const params = new URLSearchParams();
        params.set('millId', item.id);
        router.push(`${homePath}?${params.toString()}`, { scroll: false });
      } else {
        router.push(`${homePath}?millId=${item.id}`);
      }
    } else if (item.type === 'waterLine') {
      // Navigate to water line detail page
      router.push(`/${locale}/levada/${item.slug}`);
    } else if (item.type === 'poca') {
      // For pocas, navigate to map with poca selected (similar to mills)
      // TODO: Create public poca detail page if needed
      if (isOnHomePage) {
        const params = new URLSearchParams();
        params.set('pocaId', item.id);
        router.push(`${homePath}?${params.toString()}`, { scroll: false });
      } else {
        router.push(`${homePath}?pocaId=${item.id}`);
      }
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getTypeLabel = (type: 'mill' | 'waterLine' | 'poca'): string => {
    switch (type) {
      case 'mill':
        return t('inventory.type.mill');
      case 'waterLine':
        return t('inventory.type.levada');
      case 'poca':
        return t('inventory.type.poca');
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={t('search.placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (filteredResults.length > 0) {
              setIsOpen(true);
            }
          }}
          className="pl-10 pr-10 h-10"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && filteredResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1200] max-h-80 overflow-y-auto">
          {filteredResults.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleSelectItem(item)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-start gap-3"
            >
              {/* Image thumbnail - only for mills */}
              {item.type === 'mill' && (
                <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-200 border border-gray-300">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.displayName || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Replace with placeholder on error
                        e.currentTarget.style.display = 'none';
                        const placeholder = e.currentTarget.nextElementSibling;
                        if (placeholder) {
                          (placeholder as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${item.imageUrl ? 'hidden' : ''}`}>
                    <span className="text-gray-500 text-[8px] leading-tight text-center px-1 font-medium">
                      No Picture
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {item.displayName}
                    </div>
                    {item.subtitle && (
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                      {getTypeLabel(item.type)}
                    </span>
                  </div>
                </div>
                {item.displayLangCode && item.displayLangCode !== locale && (
                  <div className="text-xs text-gray-400 mt-1">
                    ({item.displayLangCode.toUpperCase()})
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && searchQuery && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1200] p-4 text-center text-sm text-gray-500">
          {t('common.loading')}
        </div>
      )}
    </div>
  );
};
