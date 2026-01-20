'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createMillConstruction, updateMillConstruction, getConstructionByIdForEdit } from '@/actions/admin';
import { uploadStoneworkImage } from '@/actions/storage';
import { getWaterLinesList, getMapData, type WaterLineListItem } from '@/actions/public';
import { Upload, X, Image as ImageIcon, GripVertical } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
 * Sortable Gallery Item Component
 * 
 * Wraps a gallery image with drag-and-drop functionality
 */
interface SortableGalleryItemProps {
  id: string;
  path: string;
  index: number;
  getImageUrl: (path: string) => string;
  onRemove: (index: number) => void;
}

function SortableGalleryItem({ id, path, index, getImageUrl, onRemove }: SortableGalleryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <img
        src={getImageUrl(path)}
        alt={`Gallery image ${index + 1}`}
        className="w-full h-48 object-cover rounded-md border border-input"
      />
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 bg-white/90 backdrop-blur-sm rounded cursor-grab active:cursor-grabbing hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-gray-600" />
      </div>
      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Remove gallery image ${index + 1}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Add New Mill Construction Page (Inner Component)
 * 
 * Multi-step form for creating a new mill construction entry.
 * Uses Tabs to separate: General Info, Location, and Technical Specs.
 * 
 * Security: Should be protected by middleware/auth (researcher or admin only)
 */
function AddMillPageContent() {
  const t = useTranslations();
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();
  const searchParams = useSearchParams();

  // Edit mode state
  const editId = searchParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(!!editId);
  const [isLoadingData, setIsLoadingData] = useState(!!editId);
  const [constructionId, setConstructionId] = useState<string | null>(editId);

  // Form state
  const [activeTab, setActiveTab] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [legacyId, setLegacyId] = useState('');

  // Location
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [district, setDistrict] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [parish, setParish] = useState('');
  const [address, setAddress] = useState('');
  const [drainageBasin, setDrainageBasin] = useState('');

  // Technical Specs / Characterization
  const [typology, setTypology] = useState<string>('');
  const [access, setAccess] = useState<string>('');
  const [legalProtection, setLegalProtection] = useState<string>('');
  const [propertyStatus, setPropertyStatus] = useState<string>('');
  const [epoch, setEpoch] = useState<string>('');
  const [setting, setSetting] = useState<string>('');
  const [currentUse, setCurrentUse] = useState<string>('');

  // Architecture
  const [planShape, setPlanShape] = useState<string>('');
  const [volumetry, setVolumetry] = useState<string>('');
  const [constructionTechnique, setConstructionTechnique] = useState<string>('');
  const [exteriorFinish, setExteriorFinish] = useState<string>('');
  const [roofShape, setRoofShape] = useState<string>('');
  const [roofMaterial, setRoofMaterial] = useState<string>('');

  // Physical Dimensions (Phase 5.9.3.10)
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');

  // Construction Technique - Other Description
  const [otherTechniqueDescription, setOtherTechniqueDescription] = useState<string>('');

  // Stone Material (new fields)
  const [stoneTypeGranite, setStoneTypeGranite] = useState(false);
  const [stoneTypeSchist, setStoneTypeSchist] = useState(false);
  const [stoneTypeOther, setStoneTypeOther] = useState(false);
  const [materialDescription, setMaterialDescription] = useState<string>('');

  // Consolidated Roof (new fields)
  const [roofType, setRoofType] = useState<string>(''); // 'fake_dome' | 'stone' | 'gable'
  const [gableRoofMaterialLusa, setGableRoofMaterialLusa] = useState(false);
  const [gableRoofMaterialMarselha, setGableRoofMaterialMarselha] = useState(false);
  const [gableRoofMaterialMeiaCana, setGableRoofMaterialMeiaCana] = useState(false);

  // Mechanism - Hydraulic
  const [captationType, setCaptationType] = useState<string>('');
  const [conductionType, setConductionType] = useState<string>('');
  const [conductionState, setConductionState] = useState<string>('');
  const [admissionRodizio, setAdmissionRodizio] = useState<string>('');
  const [admissionAzenha, setAdmissionAzenha] = useState<string>('');
  const [wheelTypeRodizio, setWheelTypeRodizio] = useState<string>('');
  const [wheelTypeAzenha, setWheelTypeAzenha] = useState<string>('');
  const [rodizioQty, setRodizioQty] = useState<string>('');
  const [azenhaQty, setAzenhaQty] = useState<string>('');
  const [waterLineId, setWaterLineId] = useState<string>('');
  
  // Water lines list for selector
  const [waterLines, setWaterLines] = useState<WaterLineListItem[]>([]);
  const [loadingWaterLines, setLoadingWaterLines] = useState(true);
  
  // Phase 5.9.3: Map data for contextual creation layer
  const [mapData, setMapData] = useState<{ mills: any[]; waterLines: any[] } | null>(null);
  const [loadingMapData, setLoadingMapData] = useState(true);

  // Mechanism - Wind
  const [motiveApparatus, setMotiveApparatus] = useState<string>('');

  // Mechanism - Grinding
  const [millstoneQuantity, setMillstoneQuantity] = useState<string>('');
  const [millstoneDiameter, setMillstoneDiameter] = useState<string>('');
  const [millstoneState, setMillstoneState] = useState<string>('');
  const [hasTremonha, setHasTremonha] = useState(false);
  const [hasQuelha, setHasQuelha] = useState(false);
  const [hasUrreiro, setHasUrreiro] = useState(false);
  const [hasAliviadouro, setHasAliviadouro] = useState(false);
  const [hasFarinaleiro, setHasFarinaleiro] = useState(false);

  // Epigraphy
  const [epigraphyPresence, setEpigraphyPresence] = useState(false);
  const [epigraphyLocation, setEpigraphyLocation] = useState<string>('');
  const [epigraphyType, setEpigraphyType] = useState<string>('');
  const [epigraphyDescription, setEpigraphyDescription] = useState('');

  // Conservation
  const [ratingStructure, setRatingStructure] = useState<string>('');
  const [ratingRoof, setRatingRoof] = useState<string>('');
  const [ratingHydraulic, setRatingHydraulic] = useState<string>('');
  const [ratingMechanism, setRatingMechanism] = useState<string>('');
  const [ratingOverall, setRatingOverall] = useState<string>('');
  const [observationsStructure, setObservationsStructure] = useState('');
  const [observationsRoof, setObservationsRoof] = useState('');
  const [observationsHydraulic, setObservationsHydraulic] = useState('');
  const [observationsMechanism, setObservationsMechanism] = useState('');
  const [observationsGeneral, setObservationsGeneral] = useState('');

  // Annexes
  const [hasOven, setHasOven] = useState(false);
  const [hasMillerHouse, setHasMillerHouse] = useState(false);
  const [hasStable, setHasStable] = useState(false);
  const [hasFullingMill, setHasFullingMill] = useState(false);

  // Images
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Fetch water lines list on mount
  useEffect(() => {
    const fetchWaterLines = async () => {
      setLoadingWaterLines(true);
      try {
        const result = await getWaterLinesList(locale, { publishedOnly: true });
        if (result.success) {
          setWaterLines(result.data);
        } else {
          console.error('[AddMillPage]: Failed to fetch water lines:', result.error);
        }
      } catch (err) {
        console.error('[AddMillPage]: Error fetching water lines:', err);
      } finally {
        setLoadingWaterLines(false);
      }
    };

    fetchWaterLines();
  }, [locale]);

  // Phase 5.9.3: Fetch map data for contextual creation layer
  useEffect(() => {
    const fetchMapData = async () => {
      setLoadingMapData(true);
      try {
        const result = await getMapData(locale);
        if (result.success) {
          setMapData(result.data);
        } else {
          console.error('[AddMillPage]: Failed to fetch map data:', result.error);
        }
      } catch (err) {
        console.error('[AddMillPage]: Error fetching map data:', err);
      } finally {
        setLoadingMapData(false);
      }
    };

    fetchMapData();
  }, [locale]);

  // Fetch existing construction data if in edit mode
  useEffect(() => {
    const fetchConstructionData = async () => {
      if (!editId || !isEditMode) return;

      setIsLoadingData(true);
      setError(null);

      try {
        const result = await getConstructionByIdForEdit(editId, locale);
        
        if (result.success) {
          const data = result.data;
          setConstructionId(data.id);
          
          // Populate all form fields
          setTitle(data.title || '');
          setDescription(data.description || '');
          setLegacyId(data.legacyId || '');
          
          // Location
          setLatitude(data.lat.toString());
          setLongitude(data.lng.toString());
          setDistrict(data.district || '');
          setMunicipality(data.municipality || '');
          setParish(data.parish || '');
          setAddress(data.address || '');
          setDrainageBasin(data.drainageBasin || '');
          
          // Technical Specs
          setTypology(data.typology);
          setAccess(data.access || '');
          setLegalProtection(data.legalProtection || '');
          setPropertyStatus(data.propertyStatus || '');
          setEpoch(data.epoch || '');
          setSetting(data.setting || '');
          setCurrentUse(data.currentUse || '');
          
          // Architecture
          setPlanShape(data.planShape || '');
          setVolumetry(data.volumetry || '');
          setConstructionTechnique(data.constructionTechnique || '');
          setExteriorFinish(data.exteriorFinish || '');
          setRoofShape(data.roofShape || '');
          setRoofMaterial(data.roofMaterial || '');
          
          // Physical Dimensions (Phase 5.9.3.10)
          setLength(data.length?.toString() || '');
          setWidth(data.width?.toString() || '');
          setHeight(data.height?.toString() || '');
          
          // Mechanism - Hydraulic
          setCaptationType(data.captationType || '');
          setConductionType(data.conductionType || '');
          setConductionState(data.conductionState || '');
          setAdmissionRodizio(data.admissionRodizio || '');
          setAdmissionAzenha(data.admissionAzenha || '');
          setWheelTypeRodizio(data.wheelTypeRodizio || '');
          setWheelTypeAzenha(data.wheelTypeAzenha || '');
          setRodizioQty(data.rodizioQty?.toString() || '');
          setAzenhaQty(data.azenhaQty?.toString() || '');
          setWaterLineId(data.waterLineId || '');
          
          // Mechanism - Wind
          setMotiveApparatus(data.motiveApparatus || '');
          
          // Mechanism - Grinding
          setMillstoneQuantity(data.millstoneQuantity?.toString() || '');
          setMillstoneDiameter(data.millstoneDiameter || '');
          setMillstoneState(data.millstoneState || '');
          setHasTremonha(data.hasTremonha);
          setHasQuelha(data.hasQuelha);
          setHasUrreiro(data.hasUrreiro);
          setHasAliviadouro(data.hasAliviadouro);
          setHasFarinaleiro(data.hasFarinaleiro);
          
          // Epigraphy
          setEpigraphyPresence(data.epigraphyPresence);
          setEpigraphyLocation(data.epigraphyLocation || '');
          setEpigraphyType(data.epigraphyType || '');
          setEpigraphyDescription(data.epigraphyDescription || '');
          
          // Conservation
          setRatingStructure(data.ratingStructure || '');
          setRatingRoof(data.ratingRoof || '');
          setRatingHydraulic(data.ratingHydraulic || '');
          setRatingMechanism(data.ratingMechanism || '');
          setRatingOverall(data.ratingOverall || '');
          setObservationsStructure(data.observationsStructure || '');
          setObservationsRoof(data.observationsRoof || '');
          setObservationsHydraulic(data.observationsHydraulic || '');
          setObservationsMechanism(data.observationsMechanism || '');
          setObservationsGeneral(data.observationsGeneral || '');
          
          // Annexes
          setHasOven(data.hasOven);
          setHasMillerHouse(data.hasMillerHouse);
          setHasStable(data.hasStable);
          setHasFullingMill(data.hasFullingMill);
          
          // Images
          setMainImage(data.mainImage);
          setGalleryImages(data.galleryImages || []);
          
          // Determine roof type from roofShape and roofMaterial
          if (data.roofShape === 'false_dome') {
            setRoofType('fake_dome');
          } else if (data.roofShape === 'conical' && data.roofMaterial === 'stone') {
            setRoofType('stone');
          } else if (data.roofShape === 'gable' && data.roofMaterial === 'tile') {
            setRoofType('gable');
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('[AddMillPage]: Error fetching construction data:', err);
        setError('Failed to load construction data');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchConstructionData();
  }, [editId, isEditMode, locale]);

  // Generate slug from title for image organization
  const getSlugForImages = (): string => {
    if (title.trim()) {
      return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    return 'untitled';
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMain(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slug', getSlugForImages());
      formData.append('prefix', 'main');

      const result = await uploadStoneworkImage(formData);
      if (result.success) {
        setMainImage(result.data.path);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[handleMainImageUpload]:', err);
      setError('Failed to upload main image');
    } finally {
      setUploadingMain(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingGallery(true);
    try {
      const slug = getSlugForImages();
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('slug', slug);

        const result = await uploadStoneworkImage(formData);
        if (result.success) {
          return result.data.path;
        }
        return null;
      });

      const paths = await Promise.all(uploadPromises);
      const validPaths = paths.filter((path): path is string => path !== null);
      setGalleryImages((prev) => [...prev, ...validPaths]);
    } catch (err) {
      console.error('[handleGalleryUpload]:', err);
      setError('Failed to upload gallery images');
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeMainImage = () => {
    setMainImage(null);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for gallery reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setGalleryImages((items) => {
        const oldIndex = items.findIndex((_, index) => `gallery-${index}` === active.id);
        const newIndex = items.findIndex((_, index) => `gallery-${index}` === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Generate public URL for image preview (client-side)
  const getImageUrl = (path: string): string => {
    if (!path) return '';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const baseUrl = supabaseUrl.replace(/\/$/, '');
    return `${baseUrl}/storage/v1/object/public/constructions/${path}`;
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'review') => {
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

      // Prepare form data
      const formData = {
        title: title.trim(),
        description: description.trim() || undefined,
        legacyId: legacyId.trim() || undefined,
        locale,
        mainImage: mainImage || undefined,
        galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
        latitude: latNum,
        longitude: lngNum,
        district: district.trim() || undefined,
        municipality: municipality.trim() || undefined,
        parish: parish.trim() || undefined,
        address: address.trim() || undefined,
        drainageBasin: drainageBasin.trim() || undefined,
        // Characterization
        typology: typology as 'azenha' | 'rodizio' | 'mare' | 'torre_fixa' | 'giratorio' | 'velas' | 'armacao',
        epoch: epoch || undefined,
        setting: setting || undefined,
        currentUse: currentUse || undefined,
        // Access & Legal
        access: access || undefined,
        legalProtection: legalProtection || undefined,
        propertyStatus: propertyStatus || undefined,
        // Architecture
        planShape: planShape || undefined,
        volumetry: volumetry || undefined,
        constructionTechnique: constructionTechnique || undefined,
        exteriorFinish: exteriorFinish || undefined,
        roofShape: roofShape || undefined,
        roofMaterial: roofMaterial || undefined,
        // Physical Dimensions (Phase 5.9.3.10)
        length: length ? parseFloat(length) : undefined,
        width: width ? parseFloat(width) : undefined,
        height: height ? parseFloat(height) : undefined,
        // Mechanism - Hydraulic
        captationType: captationType || undefined,
        conductionType: conductionType || undefined,
        conductionState: conductionState || undefined,
        admissionRodizio: admissionRodizio || undefined,
        admissionAzenha: admissionAzenha || undefined,
        wheelTypeRodizio: wheelTypeRodizio || undefined,
        wheelTypeAzenha: wheelTypeAzenha || undefined,
        rodizioQty: rodizioQty ? parseInt(rodizioQty, 10) : undefined,
        azenhaQty: azenhaQty ? parseInt(azenhaQty, 10) : undefined,
        // Hydraulic Infrastructure (Phase 5.9.2.3)
        waterLineId: waterLineId.trim() || undefined,
        // Mechanism - Wind
        motiveApparatus: motiveApparatus || undefined,
        // Mechanism - Grinding
        millstoneQuantity: millstoneQuantity ? parseInt(millstoneQuantity, 10) : undefined,
        millstoneDiameter: millstoneDiameter || undefined,
        millstoneState: millstoneState || undefined,
        hasTremonha,
        hasQuelha,
        hasUrreiro,
        hasAliviadouro,
        hasFarinaleiro,
        // Epigraphy
        epigraphyPresence,
        epigraphyLocation: epigraphyLocation || undefined,
        epigraphyType: epigraphyType || undefined,
        epigraphyDescription: epigraphyDescription.trim() || undefined,
        // Conservation
        ratingStructure: ratingStructure || undefined,
        ratingRoof: ratingRoof || undefined,
        ratingHydraulic: ratingHydraulic || undefined,
        ratingMechanism: ratingMechanism || undefined,
        ratingOverall: ratingOverall || undefined,
        // Data Transition: Stone Material - Direct mapping to new boolean columns
        stoneTypeGranite,
        stoneTypeSchist,
        stoneTypeOther,
        stoneMaterialDescription: materialDescription.trim() || undefined,
        // Data Transition: Gable Roof Materials - Direct mapping to new boolean columns
        gableMaterialLusa: gableRoofMaterialLusa,
        gableMaterialMarselha: gableRoofMaterialMarselha,
        gableMaterialMeiaCana: gableRoofMaterialMeiaCana,
        // Observations now only store actual text from textareas (no packing)
        observationsStructure: (() => {
          // Include construction technique "other" description if provided
          const techniqueNote = constructionTechnique === 'mixed_other' && otherTechniqueDescription.trim()
            ? `Construction Technique (Other): ${otherTechniqueDescription.trim()}. ` 
            : '';
          
          const existingObs = observationsStructure.trim();
          const combined = (techniqueNote + existingObs).trim();
          return combined || undefined;
        })(),
        observationsRoof: observationsRoof.trim() || undefined,
        observationsHydraulic: observationsHydraulic.trim() || undefined,
        observationsMechanism: observationsMechanism.trim() || undefined,
        observationsGeneral: observationsGeneral.trim() || undefined,
        // Annexes
        hasOven,
        hasMillerHouse,
        hasStable,
        hasFullingMill,
        // Phase 5.9.7.1: Status for workflow
        status,
      };

      // Call appropriate server action (create or update)
      const result = isEditMode && constructionId
        ? await updateMillConstruction({
            ...formData,
            id: constructionId,
          })
        : await createMillConstruction(formData);

      if (result.success) {
        // Redirect to dashboard with success message
        const successKey = status === 'draft' ? 'savedDraft' : 'submittedForReview';
        router.push(`/${locale}/dashboard?success=${successKey}`);
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

      <form onSubmit={(e) => e.preventDefault()}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">{t('add.tabs.general')}</TabsTrigger>
            <TabsTrigger value="location">{t('add.tabs.location')}</TabsTrigger>
            <TabsTrigger value="technical">{t('add.tabs.technical')}</TabsTrigger>
            <TabsTrigger value="mechanism">{t('add.tabs.mechanism')}</TabsTrigger>
            <TabsTrigger value="conservation">{t('add.tabs.conservation')}</TabsTrigger>
            <TabsTrigger value="images">{t('add.tabs.images')}</TabsTrigger>
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
              <Label htmlFor="legacyId">{t('add.form.general.legacyId')}</Label>
              <Input
                id="legacyId"
                type="text"
                value={legacyId}
                onChange={(e) => setLegacyId(e.target.value)}
                placeholder={t('add.form.general.legacyIdPlaceholder')}
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
            {/* Interactive Map Picker */}
            <div className="space-y-2">
              <Label>{t('add.form.location.mapPicker')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('add.form.location.mapPickerDescription')}
              </p>
              <DynamicLocationPickerMap
                latitude={latitude ? parseFloat(latitude) : null}
                longitude={longitude ? parseFloat(longitude) : null}
                onLocationSelect={(lat, lng) => {
                  setLatitude(lat.toString());
                  setLongitude(lng.toString());
                }}
                existingMills={mapData?.mills || []}
                existingWaterLines={mapData?.waterLines || []}
              />
            </div>

            {/* Manual Coordinate Input */}
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
                <option value="traditional_track">{t('taxonomy.access.traditional_track')}</option>
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

            <div className="space-y-2">
              <Label htmlFor="setting">{t('add.form.technical.setting')}</Label>
              <select
                id="setting"
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t('add.form.technical.settingPlaceholder')}</option>
                <option value="rural">{t('taxonomy.setting.rural')}</option>
                <option value="urban">{t('taxonomy.setting.urban')}</option>
                <option value="isolated">{t('taxonomy.setting.isolated')}</option>
                <option value="riverbank">{t('taxonomy.setting.riverbank')}</option>
              </select>
            </div>

            <div className="pt-4 border-t space-y-4">
              <h3 className="text-lg font-semibold">{t('add.form.technical.architecture.title')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planShape">{t('add.form.technical.architecture.planShape')}</Label>
                  <select
                    id="planShape"
                    value={planShape}
                    onChange={(e) => setPlanShape(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.technical.architecture.planShapePlaceholder')}</option>
                    <option value="circular">{t('taxonomy.planShape.circular')}</option>
                    <option value="rectangular">{t('taxonomy.planShape.rectangular')}</option>
                    <option value="square">{t('taxonomy.planShape.square')}</option>
                    <option value="polygonal">{t('taxonomy.planShape.polygonal')}</option>
                    <option value="irregular">{t('taxonomy.planShape.irregular')}</option>
                    <option value="circular_tower">{t('taxonomy.planShape.circular_tower')}</option>
                    <option value="quadrangular">{t('taxonomy.planShape.quadrangular')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volumetry">{t('add.form.technical.architecture.volumetry')}</Label>
                  <select
                    id="volumetry"
                    value={volumetry}
                    onChange={(e) => setVolumetry(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.technical.architecture.volumetryPlaceholder')}</option>
                    <option value="cylindrical">{t('taxonomy.volumetry.cylindrical')}</option>
                    <option value="conical">{t('taxonomy.volumetry.conical')}</option>
                    <option value="prismatic_sq_rec">{t('taxonomy.volumetry.prismatic_sq_rec')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exteriorFinish">{t('add.form.technical.architecture.exteriorFinish')}</Label>
                <select
                  id="exteriorFinish"
                  value={exteriorFinish}
                  onChange={(e) => setExteriorFinish(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{t('add.form.technical.architecture.exteriorFinishPlaceholder')}</option>
                  <option value="exposed">{t('taxonomy.exteriorFinish.exposed')}</option>
                  <option value="plastered">{t('taxonomy.exteriorFinish.plastered')}</option>
                  <option value="whitewashed">{t('taxonomy.exteriorFinish.whitewashed')}</option>
                </select>
              </div>

              {/* Physical Dimensions (Phase 5.9.3.10) */}
              <div className="pt-4 border-t space-y-4">
                <h3 className="text-lg font-semibold">{t('add.form.technical.architecture.dimensionsTitle')}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="length">{t('add.form.technical.architecture.length')}</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.01"
                      min="0"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder={t('add.form.technical.architecture.lengthPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="width">{t('add.form.technical.architecture.width')}</Label>
                    <Input
                      id="width"
                      type="number"
                      step="0.01"
                      min="0"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder={t('add.form.technical.architecture.widthPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">{t('add.form.technical.architecture.height')}</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.01"
                      min="0"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder={t('add.form.technical.architecture.heightPlaceholder')}
                    />
                  </div>
                </div>
              </div>

              {/* Construction Technique Section */}
              <div className="space-y-4">
                <Label>{t('add.form.technical.architecture.constructionTechnique')}</Label>
                <RadioGroup
                  value={constructionTechnique}
                  onValueChange={(value) => {
                    setConstructionTechnique(value);
                    // Clear other technique description if switching away from mixed_other
                    if (value !== 'mixed_other') {
                      setOtherTechniqueDescription('');
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dry_stone" id="construction-dry-stone" />
                    <Label htmlFor="construction-dry-stone" className="font-normal cursor-pointer">
                      {t('taxonomy.constructionTechnique.dry_stone')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mortared_stone" id="construction-mortared-stone" />
                    <Label htmlFor="construction-mortared-stone" className="font-normal cursor-pointer">
                      {t('taxonomy.constructionTechnique.mortared_stone')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mixed_other" id="construction-mixed-other" />
                    <Label htmlFor="construction-mixed-other" className="font-normal cursor-pointer">
                      {t('taxonomy.constructionTechnique.mixed_other')}
                    </Label>
                  </div>
                </RadioGroup>

                {/* Other Technique Description - Conditional on "Mixed/Other" */}
                {constructionTechnique === 'mixed_other' && (
                  <div className="ml-6 mt-3 space-y-2">
                    <Label htmlFor="otherTechniqueDescription">{t('add.form.technical.architecture.otherTechniqueDescription')}</Label>
                    <Input
                      id="otherTechniqueDescription"
                      type="text"
                      value={otherTechniqueDescription}
                      onChange={(e) => setOtherTechniqueDescription(e.target.value)}
                      placeholder={t('add.form.technical.architecture.otherTechniqueDescriptionPlaceholder')}
                    />
                  </div>
                )}

                {/* Stone Type - Conditional on Construction Technique */}
                {constructionTechnique && (
                  <div className="ml-6 mt-3 space-y-3">
                    <Label>{t('add.form.technical.architecture.stoneType')}</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="stoneTypeGranite"
                          checked={stoneTypeGranite}
                          onCheckedChange={(checked) => setStoneTypeGranite(checked === true)}
                        />
                        <Label htmlFor="stoneTypeGranite" className="font-normal cursor-pointer">
                          {t('add.form.technical.architecture.stoneTypeGranite')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="stoneTypeSchist"
                          checked={stoneTypeSchist}
                          onCheckedChange={(checked) => setStoneTypeSchist(checked === true)}
                        />
                        <Label htmlFor="stoneTypeSchist" className="font-normal cursor-pointer">
                          {t('add.form.technical.architecture.stoneTypeSchist')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="stoneTypeOther"
                          checked={stoneTypeOther}
                          onCheckedChange={(checked) => setStoneTypeOther(checked === true)}
                        />
                        <Label htmlFor="stoneTypeOther" className="font-normal cursor-pointer">
                          {t('add.form.technical.architecture.stoneTypeOther')}
                        </Label>
                      </div>
                    </div>
                    
                    {/* Material Description - Conditional on "Other" */}
                    {stoneTypeOther && (
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="materialDescription">{t('add.form.technical.architecture.materialDescription')}</Label>
                        <Input
                          id="materialDescription"
                          type="text"
                          value={materialDescription}
                          onChange={(e) => setMaterialDescription(e.target.value)}
                          placeholder={t('add.form.technical.architecture.materialDescriptionPlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Consolidated Roof Section */}
              <div className="space-y-4">
                <Label>{t('add.form.technical.architecture.roof')}</Label>
                <RadioGroup
                  value={roofType}
                  onValueChange={(value) => {
                    setRoofType(value);
                    // Map consolidated roof type to roofShape and roofMaterial
                    if (value === 'fake_dome') {
                      setRoofShape('false_dome');
                      setRoofMaterial('');
                      // Clear gable roof materials if switching away
                      setGableRoofMaterialLusa(false);
                      setGableRoofMaterialMarselha(false);
                      setGableRoofMaterialMeiaCana(false);
                    } else if (value === 'stone') {
                      setRoofShape('conical');
                      setRoofMaterial('stone');
                      // Clear gable roof materials if switching away
                      setGableRoofMaterialLusa(false);
                      setGableRoofMaterialMarselha(false);
                      setGableRoofMaterialMeiaCana(false);
                    } else if (value === 'gable') {
                      setRoofShape('gable');
                      setRoofMaterial('tile');
                    } else {
                      setRoofShape('');
                      setRoofMaterial('');
                      // Clear gable roof materials
                      setGableRoofMaterialLusa(false);
                      setGableRoofMaterialMarselha(false);
                      setGableRoofMaterialMeiaCana(false);
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fake_dome" id="roof-fake-dome" />
                    <Label htmlFor="roof-fake-dome" className="font-normal cursor-pointer">
                      {t('add.form.technical.architecture.roofTypeFakeDome')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="stone" id="roof-stone" />
                    <Label htmlFor="roof-stone" className="font-normal cursor-pointer">
                      {t('add.form.technical.architecture.roofTypeStone')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gable" id="roof-gable" />
                    <Label htmlFor="roof-gable" className="font-normal cursor-pointer">
                      {t('add.form.technical.architecture.roofTypeGable')}
                    </Label>
                  </div>
                </RadioGroup>

                {/* Gable Roof Materials - Conditional on "Gable Roof" */}
                {roofType === 'gable' && (
                  <div className="ml-6 mt-3 space-y-3">
                    <Label>{t('add.form.technical.architecture.gableRoofMaterials')}</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gableRoofMaterialLusa"
                          checked={gableRoofMaterialLusa}
                          onCheckedChange={(checked) => setGableRoofMaterialLusa(checked === true)}
                        />
                        <Label htmlFor="gableRoofMaterialLusa" className="font-normal cursor-pointer">
                          {t('add.form.technical.architecture.gableRoofMaterialLusa')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gableRoofMaterialMarselha"
                          checked={gableRoofMaterialMarselha}
                          onCheckedChange={(checked) => setGableRoofMaterialMarselha(checked === true)}
                        />
                        <Label htmlFor="gableRoofMaterialMarselha" className="font-normal cursor-pointer">
                          {t('add.form.technical.architecture.gableRoofMaterialMarselha')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gableRoofMaterialMeiaCana"
                          checked={gableRoofMaterialMeiaCana}
                          onCheckedChange={(checked) => setGableRoofMaterialMeiaCana(checked === true)}
                        />
                        <Label htmlFor="gableRoofMaterialMeiaCana" className="font-normal cursor-pointer">
                          {t('add.form.technical.architecture.gableRoofMaterialMeiaCana')}
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('add.form.technical.architecture.annexes')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hasMillerHouse}
                      onChange={(e) => setHasMillerHouse(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>{t('taxonomy.annex.miller_house')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hasOven}
                      onChange={(e) => setHasOven(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>{t('taxonomy.annex.oven')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hasStable}
                      onChange={(e) => setHasStable(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>{t('taxonomy.annex.stable')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hasFullingMill}
                      onChange={(e) => setHasFullingMill(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>{t('taxonomy.annex.fulling_mill')}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <h3 className="text-lg font-semibold">{t('add.form.technical.epigraphy.title')}</h3>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={epigraphyPresence}
                    onChange={(e) => setEpigraphyPresence(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>{t('add.form.technical.epigraphy.presence')}</span>
                </label>
              </div>

              {epigraphyPresence && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="epigraphyLocation">{t('add.form.technical.epigraphy.location')}</Label>
                      <select
                        id="epigraphyLocation"
                        value={epigraphyLocation}
                        onChange={(e) => setEpigraphyLocation(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">{t('add.form.technical.epigraphy.locationPlaceholder')}</option>
                        <option value="door_jambs">{t('taxonomy.epigraphyLocation.door_jambs')}</option>
                        <option value="interior_walls">{t('taxonomy.epigraphyLocation.interior_walls')}</option>
                        <option value="millstones">{t('taxonomy.epigraphyLocation.millstones')}</option>
                        <option value="other">{t('taxonomy.epigraphyLocation.other')}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="epigraphyType">{t('add.form.technical.epigraphy.type')}</Label>
                      <select
                        id="epigraphyType"
                        value={epigraphyType}
                        onChange={(e) => setEpigraphyType(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">{t('add.form.technical.epigraphy.typePlaceholder')}</option>
                        <option value="dates">{t('taxonomy.epigraphyType.dates')}</option>
                        <option value="initials">{t('taxonomy.epigraphyType.initials')}</option>
                        <option value="religious_symbols">{t('taxonomy.epigraphyType.religious_symbols')}</option>
                        <option value="counting_marks">{t('taxonomy.epigraphyType.counting_marks')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="epigraphyDescription">{t('add.form.technical.epigraphy.description')}</Label>
                    <textarea
                      id="epigraphyDescription"
                      value={epigraphyDescription}
                      onChange={(e) => setEpigraphyDescription(e.target.value)}
                      placeholder={t('add.form.technical.epigraphy.descriptionPlaceholder')}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Mechanism Tab */}
          <TabsContent value="mechanism" className="space-y-6 mt-6">
            {/* Hydraulic fields - only show for hydraulic typologies */}
            {['azenha', 'rodizio', 'mare'].includes(typology) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('add.form.mechanism.hydraulic.title')}</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="captationType">{t('add.form.mechanism.hydraulic.captationType')}</Label>
                <select
                  id="captationType"
                  value={captationType}
                  onChange={(e) => setCaptationType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{t('add.form.mechanism.hydraulic.captationTypePlaceholder')}</option>
                  <option value="weir">{t('taxonomy.captationType.weir')}</option>
                  <option value="pool">{t('taxonomy.captationType.pool')}</option>
                  <option value="direct">{t('taxonomy.captationType.direct')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conductionType">{t('add.form.mechanism.hydraulic.conductionType')}</Label>
                <select
                  id="conductionType"
                  value={conductionType}
                  onChange={(e) => setConductionType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{t('add.form.mechanism.hydraulic.conductionTypePlaceholder')}</option>
                  <option value="levada">{t('taxonomy.conductionType.levada')}</option>
                  <option value="modern_pipe">{t('taxonomy.conductionType.modern_pipe')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conductionState">{t('add.form.mechanism.hydraulic.conductionState')}</Label>
                <select
                  id="conductionState"
                  value={conductionState}
                  onChange={(e) => setConductionState(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{t('add.form.mechanism.hydraulic.conductionStatePlaceholder')}</option>
                  <option value="operational_clean">{t('taxonomy.conductionState.operational_clean')}</option>
                  <option value="clogged">{t('taxonomy.conductionState.clogged')}</option>
                  <option value="damaged_broken">{t('taxonomy.conductionState.damaged_broken')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admissionRodizio">{t('add.form.mechanism.hydraulic.admissionRodizio')}</Label>
                  <select
                    id="admissionRodizio"
                    value={admissionRodizio}
                    onChange={(e) => setAdmissionRodizio(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.mechanism.hydraulic.admissionRodizioPlaceholder')}</option>
                    <option value="cubo">{t('taxonomy.admissionRodizio.cubo')}</option>
                    <option value="calha">{t('taxonomy.admissionRodizio.calha')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admissionAzenha">{t('add.form.mechanism.hydraulic.admissionAzenha')}</Label>
                  <select
                    id="admissionAzenha"
                    value={admissionAzenha}
                    onChange={(e) => setAdmissionAzenha(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.mechanism.hydraulic.admissionAzenhaPlaceholder')}</option>
                    <option value="calha_superior">{t('taxonomy.admissionAzenha.calha_superior')}</option>
                    <option value="canal_inferior">{t('taxonomy.admissionAzenha.canal_inferior')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wheelTypeRodizio">{t('add.form.mechanism.hydraulic.wheelTypeRodizio')}</Label>
                  <select
                    id="wheelTypeRodizio"
                    value={wheelTypeRodizio}
                    onChange={(e) => setWheelTypeRodizio(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.mechanism.hydraulic.wheelTypeRodizioPlaceholder')}</option>
                    <option value="penas">{t('taxonomy.wheelTypeRodizio.penas')}</option>
                    <option value="colheres">{t('taxonomy.wheelTypeRodizio.colheres')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wheelTypeAzenha">{t('add.form.mechanism.hydraulic.wheelTypeAzenha')}</Label>
                  <select
                    id="wheelTypeAzenha"
                    value={wheelTypeAzenha}
                    onChange={(e) => setWheelTypeAzenha(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.mechanism.hydraulic.wheelTypeAzenhaPlaceholder')}</option>
                    <option value="copeira">{t('taxonomy.wheelTypeAzenha.copeira')}</option>
                    <option value="dezio_palas">{t('taxonomy.wheelTypeAzenha.dezio_palas')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rodizioQty">{t('add.form.mechanism.hydraulic.rodizioQty')}</Label>
                  <Input
                    id="rodizioQty"
                    type="number"
                    min="0"
                    value={rodizioQty}
                    onChange={(e) => setRodizioQty(e.target.value)}
                    placeholder={t('add.form.mechanism.hydraulic.rodizioQtyPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="azenhaQty">{t('add.form.mechanism.hydraulic.azenhaQty')}</Label>
                  <Input
                    id="azenhaQty"
                    type="number"
                    min="0"
                    value={azenhaQty}
                    onChange={(e) => setAzenhaQty(e.target.value)}
                    placeholder={t('add.form.mechanism.hydraulic.azenhaQtyPlaceholder')}
                  />
                </div>
              </div>

              {/* Hydraulic Infrastructure Section (Phase 5.9.2.3) */}
              <div className="pt-4 border-t space-y-4">
                <h3 className="text-lg font-semibold">{t('add.form.mechanism.hydraulic.infrastructure.title')}</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="waterLineId">{t('add.form.mechanism.hydraulic.infrastructure.waterLine')}</Label>
                  <select
                    id="waterLineId"
                    value={waterLineId}
                    onChange={(e) => setWaterLineId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loadingWaterLines}
                  >
                    <option value="">{t('add.form.mechanism.hydraulic.infrastructure.selectWaterLine')}</option>
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
                    <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.infrastructure.noWaterLine')}</p>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Wind fields - only show for wind typologies */}
            {['torre_fixa', 'giratorio', 'velas', 'armacao'].includes(typology) && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">{t('add.form.mechanism.wind.title')}</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="motiveApparatus">{t('add.form.mechanism.wind.motiveApparatus')}</Label>
                <select
                  id="motiveApparatus"
                  value={motiveApparatus}
                  onChange={(e) => setMotiveApparatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{t('add.form.mechanism.wind.motiveApparatusPlaceholder')}</option>
                  <option value="sails">{t('taxonomy.motiveApparatus.sails')}</option>
                  <option value="shells">{t('taxonomy.motiveApparatus.shells')}</option>
                  <option value="tail">{t('taxonomy.motiveApparatus.tail')}</option>
                  <option value="cap">{t('taxonomy.motiveApparatus.cap')}</option>
                </select>
              </div>
            </div>
            )}

            {/* Grinding Mechanism - shown for all typologies */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">{t('add.form.mechanism.grinding.title')}</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="millstoneQuantity">{t('add.form.mechanism.grinding.millstoneQuantity')}</Label>
                  <Input
                    id="millstoneQuantity"
                    type="number"
                    min="0"
                    value={millstoneQuantity}
                    onChange={(e) => setMillstoneQuantity(e.target.value)}
                    placeholder={t('add.form.mechanism.grinding.millstoneQuantityPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="millstoneDiameter">{t('add.form.mechanism.grinding.millstoneDiameter')}</Label>
                  <Input
                    id="millstoneDiameter"
                    type="text"
                    value={millstoneDiameter}
                    onChange={(e) => setMillstoneDiameter(e.target.value)}
                    placeholder={t('add.form.mechanism.grinding.millstoneDiameterPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="millstoneState">{t('add.form.mechanism.grinding.millstoneState')}</Label>
                  <select
                    id="millstoneState"
                    value={millstoneState}
                    onChange={(e) => setMillstoneState(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.mechanism.grinding.millstoneStatePlaceholder')}</option>
                    <option value="complete">{t('taxonomy.millstoneState.complete')}</option>
                    <option value="disassembled">{t('taxonomy.millstoneState.disassembled')}</option>
                    <option value="fragmented">{t('taxonomy.millstoneState.fragmented')}</option>
                    <option value="missing">{t('taxonomy.millstoneState.missing')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('add.form.mechanism.grinding.components')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hasTremonha}
                      onChange={(e) => setHasTremonha(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>{t('taxonomy.grindingComponent.tremonha')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hasQuelha}
                      onChange={(e) => setHasQuelha(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>{t('taxonomy.grindingComponent.quelha')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hasUrreiro}
                      onChange={(e) => setHasUrreiro(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>{t('taxonomy.grindingComponent.urreiro')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hasAliviadouro}
                      onChange={(e) => setHasAliviadouro(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>{t('taxonomy.grindingComponent.aliviadouro')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hasFarinaleiro}
                      onChange={(e) => setHasFarinaleiro(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>{t('taxonomy.grindingComponent.farinaleiro')}</span>
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Conservation Tab */}
          <TabsContent value="conservation" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('add.form.conservation.title')}</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ratingStructure">{t('add.form.conservation.ratingStructure')}</Label>
                  <select
                    id="ratingStructure"
                    value={ratingStructure}
                    onChange={(e) => setRatingStructure(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.conservation.ratingPlaceholder')}</option>
                    <option value="very_good">{t('taxonomy.conservation.very_good')}</option>
                    <option value="good">{t('taxonomy.conservation.good')}</option>
                    <option value="reasonable">{t('taxonomy.conservation.reasonable')}</option>
                    <option value="bad">{t('taxonomy.conservation.bad')}</option>
                    <option value="very_bad_ruin">{t('taxonomy.conservation.very_bad_ruin')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observationsStructure">{t('add.form.conservation.observationsStructure')}</Label>
                  <textarea
                    id="observationsStructure"
                    value={observationsStructure}
                    onChange={(e) => setObservationsStructure(e.target.value)}
                    placeholder={t('add.form.conservation.observationsPlaceholder')}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ratingRoof">{t('add.form.conservation.ratingRoof')}</Label>
                  <select
                    id="ratingRoof"
                    value={ratingRoof}
                    onChange={(e) => setRatingRoof(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.conservation.ratingPlaceholder')}</option>
                    <option value="very_good">{t('taxonomy.conservation.very_good')}</option>
                    <option value="good">{t('taxonomy.conservation.good')}</option>
                    <option value="reasonable">{t('taxonomy.conservation.reasonable')}</option>
                    <option value="bad">{t('taxonomy.conservation.bad')}</option>
                    <option value="very_bad_ruin">{t('taxonomy.conservation.very_bad_ruin')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observationsRoof">{t('add.form.conservation.observationsRoof')}</Label>
                  <textarea
                    id="observationsRoof"
                    value={observationsRoof}
                    onChange={(e) => setObservationsRoof(e.target.value)}
                    placeholder={t('add.form.conservation.observationsPlaceholder')}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ratingHydraulic">{t('add.form.conservation.ratingHydraulic')}</Label>
                  <select
                    id="ratingHydraulic"
                    value={ratingHydraulic}
                    onChange={(e) => setRatingHydraulic(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.conservation.ratingPlaceholder')}</option>
                    <option value="very_good">{t('taxonomy.conservation.very_good')}</option>
                    <option value="good">{t('taxonomy.conservation.good')}</option>
                    <option value="reasonable">{t('taxonomy.conservation.reasonable')}</option>
                    <option value="bad">{t('taxonomy.conservation.bad')}</option>
                    <option value="very_bad_ruin">{t('taxonomy.conservation.very_bad_ruin')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observationsHydraulic">{t('add.form.conservation.observationsHydraulic')}</Label>
                  <textarea
                    id="observationsHydraulic"
                    value={observationsHydraulic}
                    onChange={(e) => setObservationsHydraulic(e.target.value)}
                    placeholder={t('add.form.conservation.observationsPlaceholder')}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ratingMechanism">{t('add.form.conservation.ratingMechanism')}</Label>
                  <select
                    id="ratingMechanism"
                    value={ratingMechanism}
                    onChange={(e) => setRatingMechanism(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.conservation.ratingPlaceholder')}</option>
                    <option value="very_good">{t('taxonomy.conservation.very_good')}</option>
                    <option value="good">{t('taxonomy.conservation.good')}</option>
                    <option value="reasonable">{t('taxonomy.conservation.reasonable')}</option>
                    <option value="bad">{t('taxonomy.conservation.bad')}</option>
                    <option value="very_bad_ruin">{t('taxonomy.conservation.very_bad_ruin')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observationsMechanism">{t('add.form.conservation.observationsMechanism')}</Label>
                  <textarea
                    id="observationsMechanism"
                    value={observationsMechanism}
                    onChange={(e) => setObservationsMechanism(e.target.value)}
                    placeholder={t('add.form.conservation.observationsPlaceholder')}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ratingOverall">{t('add.form.conservation.ratingOverall')}</Label>
                  <select
                    id="ratingOverall"
                    value={ratingOverall}
                    onChange={(e) => setRatingOverall(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t('add.form.conservation.ratingPlaceholder')}</option>
                    <option value="very_good">{t('taxonomy.conservation.very_good')}</option>
                    <option value="good">{t('taxonomy.conservation.good')}</option>
                    <option value="reasonable">{t('taxonomy.conservation.reasonable')}</option>
                    <option value="bad">{t('taxonomy.conservation.bad')}</option>
                    <option value="very_bad_ruin">{t('taxonomy.conservation.very_bad_ruin')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observationsGeneral">{t('add.form.conservation.observationsGeneral')}</Label>
                  <textarea
                    id="observationsGeneral"
                    value={observationsGeneral}
                    onChange={(e) => setObservationsGeneral(e.target.value)}
                    placeholder={t('add.form.conservation.observationsPlaceholder')}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6 mt-6">
            <div className="space-y-6">
              {/* Main Image Upload */}
              <div className="space-y-4">
                <div>
                  <Label>{t('add.form.images.mainImage')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('add.form.images.mainImageDescription')}
                  </p>
                </div>

                {mainImage ? (
                  <div className="relative inline-block">
                    <img
                      src={getImageUrl(mainImage)}
                      alt="Main image preview"
                      className="max-w-md h-auto rounded-md border border-input"
                    />
                    <button
                      type="button"
                      onClick={removeMainImage}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                      aria-label="Remove main image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-input rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleMainImageUpload}
                      disabled={uploadingMain}
                      className="hidden"
                      id="main-image-upload"
                    />
                    <label
                      htmlFor="main-image-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploadingMain
                          ? t('add.form.images.uploading')
                          : t('add.form.images.selectMainImage')}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Gallery Images Upload */}
              <div className="space-y-4">
                <div>
                  <Label>{t('add.form.images.gallery')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('add.form.images.galleryDescription')}
                  </p>
                </div>

                {/* Gallery Preview Grid with Drag-and-Drop */}
                {galleryImages.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={galleryImages.map((_, index) => `gallery-${index}`)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {galleryImages.map((path, index) => (
                          <SortableGalleryItem
                            key={`gallery-${index}`}
                            id={`gallery-${index}`}
                            path={path}
                            index={index}
                            getImageUrl={getImageUrl}
                            onRemove={removeGalleryImage}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {/* Gallery Upload Button */}
                <div className="border-2 border-dashed border-input rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleGalleryUpload}
                    disabled={uploadingGallery}
                    multiple
                    className="hidden"
                    id="gallery-upload"
                  />
                  <label
                    htmlFor="gallery-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploadingGallery
                        ? t('add.form.images.uploading')
                        : t('add.form.images.selectGalleryImages')}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end gap-4">
          {!isEditMode && (
            <>
              <Button 
                type="button" 
                variant="outline"
                onClick={(e) => handleSubmit(e, 'draft')} 
                disabled={isSubmitting || isLoadingData}
              >
                {isSubmitting 
                  ? t('add.form.savingDraft')
                  : t('add.form.saveAsDraft')}
              </Button>
              <Button 
                type="button"
                onClick={(e) => handleSubmit(e, 'review')} 
                disabled={isSubmitting || isLoadingData}
              >
                {isSubmitting 
                  ? t('add.form.submittingForReview')
                  : t('add.form.submitForReview')}
              </Button>
            </>
          )}
          {isEditMode && (
            <Button 
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')} 
              disabled={isSubmitting || isLoadingData}
            >
              {isSubmitting 
                ? t('add.form.updating')
                : t('add.form.update')}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * Add New Mill Construction Page (Wrapper with Suspense)
 * 
 * Wraps the content in Suspense to support useSearchParams()
 */
export default function AddMillPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AddMillPageContent />
    </Suspense>
  );
}
