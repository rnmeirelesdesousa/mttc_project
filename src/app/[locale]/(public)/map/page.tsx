import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    locale: string;
  };
  searchParams: {
    typology?: string | string[];
    district?: string;
    roofMaterial?: string | string[];
    roofShape?: string | string[];
    access?: string | string[];
    motiveApparatus?: string | string[];
    millId?: string;
  };
}

/**
 * Map Page Redirect
 * 
 * Redirects to the home page to maintain SEO and preserve URL parameters.
 * The map is now served from the home page as the primary entry point.
 */
export default async function MapPage({ params, searchParams }: PageProps) {
  // Build query string from search params
  const queryParams = new URLSearchParams();
  
  if (searchParams.typology) {
    const typologies = Array.isArray(searchParams.typology)
      ? searchParams.typology
      : [searchParams.typology];
    typologies.forEach((t) => queryParams.append('typology', t));
  }
  
  if (searchParams.district) {
    queryParams.set('district', searchParams.district);
  }
  
  if (searchParams.roofMaterial) {
    const materials = Array.isArray(searchParams.roofMaterial)
      ? searchParams.roofMaterial
      : [searchParams.roofMaterial];
    materials.forEach((m) => queryParams.append('roofMaterial', m));
  }
  
  if (searchParams.roofShape) {
    const shapes = Array.isArray(searchParams.roofShape)
      ? searchParams.roofShape
      : [searchParams.roofShape];
    shapes.forEach((s) => queryParams.append('roofShape', s));
  }
  
  if (searchParams.access) {
    const accesses = Array.isArray(searchParams.access)
      ? searchParams.access
      : [searchParams.access];
    accesses.forEach((a) => queryParams.append('access', a));
  }
  
  if (searchParams.motiveApparatus) {
    const apparatus = Array.isArray(searchParams.motiveApparatus)
      ? searchParams.motiveApparatus
      : [searchParams.motiveApparatus];
    apparatus.forEach((a) => queryParams.append('motiveApparatus', a));
  }
  
  if (searchParams.millId) {
    queryParams.set('millId', searchParams.millId);
  }

  const queryString = queryParams.toString();
  const redirectUrl = `/${params.locale}${queryString ? `?${queryString}` : ''}`;
  
  redirect(redirectUrl);
}

