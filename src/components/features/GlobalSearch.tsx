'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getSearchableMills, type SearchableMill } from '@/actions/public';

interface GlobalSearchProps {
  locale: string;
}

/**
 * GlobalSearch Component
 * 
 * Provides a global search bar that searches across:
 * - Names (title)
 * - Materials (roofMaterial)
 * - Typologies (typology)
 * - Districts (district)
 * 
 * On selection, navigates to map page and triggers flyTo animation.
 */
export const GlobalSearch = ({ locale }: GlobalSearchProps) => {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [mills, setMills] = useState<SearchableMill[]>([]);
  const [filteredMills, setFilteredMills] = useState<(SearchableMill & { displayTitle?: string | null; displayLangCode?: string | null })[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all searchable mills on mount
  useEffect(() => {
    const fetchMills = async () => {
      setLoading(true);
      const result = await getSearchableMills(locale);
      if (result.success) {
        setMills(result.data);
      }
      setLoading(false);
    };
    fetchMills();
  }, [locale]);

  // Filter mills based on search query - cross-language search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMills([]);
      setIsOpen(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = mills
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
        
        // Search in location data
        const districtMatch = mill.district?.toLowerCase().includes(query);
        const municipalityMatch = mill.municipality?.toLowerCase().includes(query);
        const parishMatch = mill.parish?.toLowerCase().includes(query);
        const placeMatch = mill.place?.toLowerCase().includes(query); // Phase 5.9.20.10: Lugar field
        const addressMatch = mill.address?.toLowerCase().includes(query);
        
        if (districtMatch || municipalityMatch || parishMatch || placeMatch || addressMatch) {
          matched = true;
        }
        
        // Search in typology (need to translate)
        let typologyMatch = mill.typology?.toLowerCase().includes(query);
        if (!typologyMatch && mill.typology) {
          try {
            typologyMatch = t(`taxonomy.typology.${mill.typology}`).toLowerCase().includes(query);
          } catch {
            // Translation key not found, skip translated search
          }
        }
        
        // Search in roofMaterial (need to translate)
        let roofMaterialMatch = mill.roofMaterial?.toLowerCase().includes(query);
        if (!roofMaterialMatch && mill.roofMaterial) {
          try {
            roofMaterialMatch = t(`taxonomy.roofMaterial.${mill.roofMaterial}`).toLowerCase().includes(query);
          } catch {
            // Translation key not found, skip translated search
          }
        }
        
        // Search in motiveApparatus (need to translate)
        let motiveApparatusMatch = mill.motiveApparatus?.toLowerCase().includes(query);
        if (!motiveApparatusMatch && mill.motiveApparatus) {
          try {
            motiveApparatusMatch = t(`taxonomy.motiveApparatus.${mill.motiveApparatus}`).toLowerCase().includes(query);
          } catch {
            // Translation key not found, skip translated search
          }
        }

        if (typologyMatch || roofMaterialMatch || motiveApparatusMatch) {
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

    setFilteredMills(filtered.slice(0, 10)); // Limit to 10 results
    setIsOpen(filtered.length > 0);
  }, [searchQuery, mills, t]);

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

  const handleSelectMill = (mill: SearchableMill & { displayTitle?: string | null; displayLangCode?: string | null }) => {
    setSearchQuery('');
    setIsOpen(false);
    
    // Navigate to home page (which now serves the map) with millId param
    const homePath = `/${locale}`;
    const isOnHomePage = pathname === homePath || pathname === `/${locale}/map`;
    
    if (isOnHomePage) {
      // If already on home/map page, update URL with millId
      const params = new URLSearchParams();
      params.set('millId', mill.id);
      router.push(`${homePath}?${params.toString()}`, { scroll: false });
    } else {
      // Navigate to home page with millId
      router.push(`${homePath}?millId=${mill.id}`);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getDisplayName = (mill: SearchableMill & { displayTitle?: string | null; displayLangCode?: string | null }) => {
    // Use displayTitle if available (from matched language), otherwise fallback to title
    return mill.displayTitle || mill.title || mill.slug;
  };

  const getMatchText = (mill: SearchableMill & { displayTitle?: string | null; displayLangCode?: string | null }) => {
    const parts: string[] = [];
    if (mill.district) parts.push(mill.district);
    if (mill.typology) {
      try {
        parts.push(t(`taxonomy.typology.${mill.typology}`));
      } catch {
        parts.push(mill.typology);
      }
    }
    // Show language indicator if title is from a different language
    if (mill.displayLangCode && mill.displayLangCode !== locale) {
      parts.push(`(${mill.displayLangCode.toUpperCase()})`);
    }
    return parts.join(' • ');
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
            if (filteredMills.length > 0) {
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
      {isOpen && filteredMills.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1200] max-h-80 overflow-y-auto">
          {filteredMills.map((mill) => (
            <button
              key={mill.id}
              onClick={() => handleSelectMill(mill)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-sm text-gray-900">
                {getDisplayName(mill)}
              </div>
              {getMatchText(mill) && (
                <div className="text-xs text-gray-500 mt-1">
                  {getMatchText(mill)}
                </div>
              )}
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
