'use client';

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations, useLocale } from 'next-intl';

// Define a compatible type for the prop to avoid importing server code
interface MillPdfProps {
    mill: {
        id: string;
        slug: string;
        title: string | null;
        legacyId: string | null;

        // Location
        district: string | null;
        municipality: string | null;
        parish: string | null;
        place: string | null;
        address: string | null;
        lat: number;
        lng: number;

        // Main data
        typology: string;
        epoch: string | null;

        // Description
        description: string | null;

        // Images
        mainImage: string | null;
        galleryImages: string[] | null;

        // Technical Data keys
        access: string | null;
        legalProtection: string | null;
        propertyStatus: string | null;
        currentUse: string | null;
        setting: string | null;

        // Dimensions
        length: number | null;
        width: number | null;
        height: number | null;

        // Architecture
        planShape: string | null;
        volumetry: string | null;
        constructionTechnique: string | null;
        exteriorFinish: string | null;
        roofShape: string | null;
        roofMaterial: string | null;
        gableMaterialLusa: boolean;
        gableMaterialMarselha: boolean;
        gableMaterialMeiaCana: boolean;
        stoneTypeGranite: boolean;
        stoneTypeSchist: boolean;
        stoneTypeOther: boolean;
        stoneMaterialDescription: string | null;


        // Hydraulic
        motiveApparatus: string | null;
        captationType: string | null;
        conductionType: string | null;
        conductionState: string | null;
        admissionRodizio: string | null;
        admissionAzenha: string | null;
        wheelTypeRodizio: string | null;
        wheelTypeAzenha: string | null;
        rodizioQty: number | null;
        azenhaQty: number | null;

        // Grinding
        millstoneQuantity: number | null;
        millstoneDiameter: string | null;
        millstoneState: string | null;

        // Conservation
        ratingStructure: string | null;
        ratingRoof: string | null;
        ratingHydraulic: string | null;
        ratingMechanism: string | null;
        ratingOverall: string | null;

        // Observations
        observationsStructure: string | null;
        observationsRoof: string | null;
        observationsHydraulic: string | null;
        observationsMechanism: string | null;
        observationsGeneral: string | null;

        [key: string]: any; // Allow other fields
    };
}

export function MillPdfButton({ mill }: MillPdfProps) {
    const t = useTranslations();
    const locale = useLocale();
    const [isGenerating, setIsGenerating] = useState(false);

    // Helper to get translated value
    const getTranslatedValue = (category: string, key: string | null | undefined): string => {
        if (!key) return '';
        try {
            return t(`taxonomy.${category}.${key}`);
        } catch {
            return key;
        }
    };

    // Helper to load image as standardized JPEG base64 using Canvas
    const loadImage = (url: string): Promise<{ data: string, width: number, height: number } | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }
                // Draw white background first (for transparent PNGs/WebP)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                // Export as JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75); // 0.75 quality to save size
                resolve({
                    data: dataUrl,
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = (e) => {
                console.error("Failed to load PDF image", url, e);
                resolve(null);
            };
            img.src = url;
        });
    };

    const generatePdf = async () => {
        try {
            setIsGenerating(true);

            // --- 1. Prepare Data & Images ---
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

            const getFullUrl = (path: string) => {
                if (!path) return '';
                if (path.startsWith('http')) return path;
                return `${supabaseUrl}/storage/v1/object/public/constructions/${path}`;
            };

            const mainImageUrl = mill.mainImage ? getFullUrl(mill.mainImage) : null;
            const galleryUrls = mill.galleryImages?.map(getFullUrl) || [];

            // Load Main Image
            let mainImageData = null;
            if (mainImageUrl) {
                mainImageData = await loadImage(mainImageUrl);
            }

            // Load Gallery Images (limit to first 6 to keep size reasonable?)
            const galleryImagesData = await Promise.all(
                galleryUrls.map(url => loadImage(url))
            );
            const validGalleryImages = galleryImagesData.filter(Boolean) as { data: string, width: number, height: number }[];


            // --- 2. Initialize PDF ---
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            // --- Load Custom Font (Segoe UI) ---
            let fontName = 'helvetica'; // Default fallback
            try {
                const loadFontFile = async (filename: string, style: string) => {
                    const response = await fetch(`/fonts/${filename}`);
                    if (response.ok) {
                        const blob = await response.blob();
                        const reader = new FileReader();
                        return new Promise<string | null>((resolve) => {
                            reader.onloadend = () => {
                                const result = reader.result as string;
                                const base64 = result.split(',')[1];
                                resolve(base64 || null);
                            };
                            reader.onerror = () => resolve(null);
                            reader.readAsDataURL(blob);
                        });
                    }
                    return null;
                };

                const base64Normal = await loadFontFile('SegoeUI.ttf', 'normal');
                const base64Bold = await loadFontFile('SegoeUI-Bold.ttf', 'bold');

                if (base64Normal) {
                    doc.addFileToVFS('SegoeUI.ttf', base64Normal);
                    doc.addFont('SegoeUI.ttf', 'Segoe UI', 'normal');
                    fontName = 'Segoe UI';

                    if (base64Bold) {
                        doc.addFileToVFS('SegoeUI-Bold.ttf', base64Bold);
                        doc.addFont('SegoeUI-Bold.ttf', 'Segoe UI', 'bold');
                    } else {
                        // Fallback: Use normal font for bold if bold file missing (prevents errors)
                        doc.addFont('SegoeUI.ttf', 'Segoe UI', 'bold');
                    }
                }
            } catch (e) {
                console.warn('Could not load custom font, falling back to Helvetica', e);
            }

            // Document Metadata
            doc.setProperties({
                title: `Ficha Técnica - ${mill.title || mill.slug}`,
                subject: 'Inventário de Moinhos',
                author: 'MTTC - Moinhos em Pedra Seca',
                creator: 'MTTC Platform'
            });

            // --- 3. Header Function ---
            const drawHeader = (pageNo: number) => {
                doc.setFont(fontName, 'bold'); // Use dynamic font
                doc.setFontSize(10);
                doc.setTextColor(60, 60, 60);
                doc.text('MOINHOS EM PEDRA SECA', margin, 15);

                doc.setFont(fontName, 'normal');
                doc.setFontSize(8);
                doc.text('Inventário e Documentação', margin, 19);

                // Line
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, 22, pageWidth - margin, 22);
            };

            // --- 4. Footer Function ---
            const drawFooter = (pageNo: number) => {
                const footerY = pageHeight - 10;
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

                doc.setFont(fontName, 'normal'); // Set font for footer
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`ID: ${mill.id}`, margin, footerY);
                doc.text(`Page ${pageNo}`, pageWidth - margin - 10, footerY);

                const today = new Date().toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-US');
                doc.text(`Gerado em: ${today}`, pageWidth / 2, footerY, { align: 'center' });
            };

            // Start Logic
            drawHeader(1);
            let yPos = 35;

            // --- Title Section ---
            doc.setFont(fontName, 'bold');
            doc.setFontSize(22);
            doc.setTextColor(30, 30, 30);

            const title = mill.title || mill.slug;
            const titleLines = doc.splitTextToSize(title, contentWidth);
            doc.text(titleLines, margin, yPos);
            yPos += (titleLines.length * 8) + 5;

            // Location Subtitle
            doc.setFont(fontName, 'normal');
            doc.setFontSize(11);
            doc.setTextColor(80, 80, 80);

            let locationParts = [];
            if (mill.district) locationParts.push(mill.district);
            if (mill.municipality) locationParts.push(mill.municipality);
            if (mill.parish) locationParts.push(mill.parish);
            if (mill.place) locationParts.push(mill.place);
            const locString = locationParts.join(' > ');

            doc.text(locString, margin, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Lat/Long: ${mill.lat.toFixed(6)}, ${mill.lng.toFixed(6)}`, margin, yPos);
            if (mill.legacyId) {
                yPos += 5;
                doc.text(`${t('add.form.general.legacyId')}: ${mill.legacyId}`, margin, yPos);
            }
            yPos += 15;

            // --- General Data Table ---
            // We use 'plain' theme to remove table look, acting more like a clean list
            const sectionStyles = {
                theme: 'plain' as const,
                styles: {
                    font: fontName, // Use dynamic font
                    fontSize: 10,
                    cellPadding: 1.5,
                    overflow: 'linebreak' as const,
                    valign: 'top' as const
                },
                columnStyles: {
                    0: { fontStyle: 'bold' as const, textColor: [100, 100, 100] as [number, number, number], cellWidth: 55 }, // Label: Gray & Bold
                    1: { textColor: [20, 20, 20] as [number, number, number] } // Value: Dark
                },
            };

            const drawSectionTitle = (title: string, y: number) => {
                doc.setFontSize(12);
                doc.setFont(fontName, 'bold');
                doc.setTextColor(0); // Black
                doc.text(title.toUpperCase(), margin, y);
                // Underline
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, y + 2, pageWidth - margin, y + 2);
                return y + 7;
            };

            // Characterization
            const charData = [
                [t('mill.detail.typology'), getTranslatedValue('typology', mill.typology)],
                [t('mill.detail.epoch'), getTranslatedValue('epoch', mill.epoch)],
                [t('add.form.technical.setting'), getTranslatedValue('setting', mill.setting)],
                [t('mill.detail.currentUse'), getTranslatedValue('currentUse', mill.currentUse)],
                [t('add.form.technical.access'), getTranslatedValue('access', mill.access)],
                [t('add.form.technical.legalProtection'), getTranslatedValue('legalProtection', mill.legalProtection)],
                [t('add.form.technical.propertyStatus'), getTranslatedValue('propertyStatus', mill.propertyStatus)],
            ].filter(r => r[1]);

            if (charData.length > 0) {
                yPos = drawSectionTitle(t('mill.detail.characterization'), yPos);

                autoTable(doc, {
                    startY: yPos,
                    body: charData,
                    ...sectionStyles
                });
                yPos = (doc as any).lastAutoTable.finalY + 10;
            }

            // Architecture
            const archData = [
                [t('add.form.technical.architecture.planShape'), getTranslatedValue('planShape', mill.planShape)],
                [t('add.form.technical.architecture.volumetry'), getTranslatedValue('volumetry', mill.volumetry)],
                [t('mill.detail.constructionTechnique'), getTranslatedValue('constructionTechnique', mill.constructionTechnique)],
                [t('add.form.technical.architecture.exteriorFinish'), getTranslatedValue('exteriorFinish', mill.exteriorFinish)],
                [t('mill.detail.roofShape'), getTranslatedValue('roofShape', mill.roofShape)],
                [t('mill.detail.roofMaterial'), getTranslatedValue('roofMaterial', mill.roofMaterial)],
            ].filter(r => r[1]);

            // Stone materials
            const stoneMaterials = [];
            if (mill.stoneTypeGranite) stoneMaterials.push(t('add.form.technical.architecture.stoneTypeGranite'));
            if (mill.stoneTypeSchist) stoneMaterials.push(t('add.form.technical.architecture.stoneTypeSchist'));
            if (mill.stoneTypeOther) stoneMaterials.push(t('add.form.technical.architecture.stoneTypeOther'));
            if (mill.stoneMaterialDescription) stoneMaterials.push(mill.stoneMaterialDescription);
            if (stoneMaterials.length > 0) {
                archData.push([t('mill.sidebar.stoneMaterials'), stoneMaterials.join(', ')]);
            }

            // Dimensions
            if (mill.length || mill.width || mill.height) {
                const dims = [
                    mill.length ? `L: ${mill.length}m` : '',
                    mill.width ? `W: ${mill.width}m` : '',
                    mill.height ? `H: ${mill.height}m` : ''
                ].filter(Boolean).join(' x ');
                archData.unshift([t('mill.detail.dimensionsTitle'), dims]);
            }

            if (archData.length > 0) {
                if (yPos > pageHeight - 60) { doc.addPage(); drawHeader((doc as any).internal.getNumberOfPages()); yPos = 35; }
                yPos = drawSectionTitle(t('add.form.technical.architecture.title'), yPos);

                autoTable(doc, {
                    startY: yPos,
                    body: archData,
                    ...sectionStyles
                });
                yPos = (doc as any).lastAutoTable.finalY + 10;
            }

            // Mechanism
            const mechData = [
                [t('add.form.mechanism.wind.motiveApparatus'), getTranslatedValue('motiveApparatus', mill.motiveApparatus)],
                [t('add.form.mechanism.hydraulic.captationType'), getTranslatedValue('captationType', mill.captationType)],
                [t('add.form.mechanism.hydraulic.conductionType'), getTranslatedValue('conductionType', mill.conductionType)],
                [t('add.form.mechanism.hydraulic.conductionState'), getTranslatedValue('conductionState', mill.conductionState)],
                [t('add.form.mechanism.hydraulic.admissionRodizio'), getTranslatedValue('admissionRodizio', mill.admissionRodizio)],
                [t('add.form.mechanism.hydraulic.wheelTypeRodizio'), getTranslatedValue('wheelTypeRodizio', mill.wheelTypeRodizio)],
                mill.rodizioQty ? [t('add.form.mechanism.hydraulic.rodizioQty'), mill.rodizioQty.toString()] : null,
                mill.azenhaQty ? [t('add.form.mechanism.hydraulic.azenhaQty'), mill.azenhaQty.toString()] : null,
                mill.millstoneQuantity ? [t('add.form.mechanism.grinding.millstoneQuantity'), mill.millstoneQuantity.toString()] : null,
            ].filter(r => r && r[1]) as string[][];

            if (mechData.length > 0) {
                if (yPos > pageHeight - 60) { doc.addPage(); drawHeader((doc as any).internal.getNumberOfPages()); yPos = 35; }
                yPos = drawSectionTitle(t('mill.detail.mechanism'), yPos);

                autoTable(doc, {
                    startY: yPos,
                    body: mechData,
                    ...sectionStyles
                });
                yPos = (doc as any).lastAutoTable.finalY + 10;
            }

            // Conservation
            const consData = [
                [t('mill.detail.overallRating'), getTranslatedValue('conservation', mill.ratingOverall)],
                [t('mill.detail.structure'), getTranslatedValue('conservation', mill.ratingStructure)],
                [t('mill.detail.roof'), getTranslatedValue('conservation', mill.ratingRoof)],
            ].filter(r => r[1]);

            if (consData.length > 0) {
                if (yPos > pageHeight - 50) { doc.addPage(); drawHeader((doc as any).internal.getNumberOfPages()); yPos = 35; }
                yPos = drawSectionTitle(t('mill.detail.conservation'), yPos);

                autoTable(doc, {
                    startY: yPos,
                    body: consData,
                    ...sectionStyles
                });
                yPos = (doc as any).lastAutoTable.finalY + 12;
            }

            // --- Observations Text Blocks (MOVED HERE) ---
            const obsSections = [
                mill.description ? { title: t('mill.detail.description'), text: mill.description } : null,
                mill.observationsStructure ? { title: t('mill.sidebar.observationsStructure'), text: mill.observationsStructure } : null,
                mill.observationsRoof ? { title: t('mill.sidebar.observationsRoof'), text: mill.observationsRoof } : null,
                mill.observationsHydraulic ? { title: t('mill.sidebar.observationsHydraulic'), text: mill.observationsHydraulic } : null,
                mill.observationsMechanism ? { title: t('mill.sidebar.observationsMechanism'), text: mill.observationsMechanism } : null,
                mill.observationsGeneral ? { title: t('mill.sidebar.observationsGeneral'), text: mill.observationsGeneral } : null,
            ].filter(Boolean);

            if (obsSections.length > 0) {
                // Only if space is low, default to continuing on same page
                if (yPos > pageHeight - 60) {
                    doc.addPage();
                    drawHeader((doc as any).internal.getNumberOfPages());
                    yPos = 35;
                } else {
                    yPos += 5; // Little spacing after previous section
                }

                // Generic Title for Observations Section
                yPos = drawSectionTitle(t('mill.sidebar.observationsGeneral'), yPos);

                obsSections.forEach(obs => {
                    if (!obs) return;

                    // Title
                    if (yPos > pageHeight - 40) { doc.addPage(); drawHeader((doc as any).internal.getNumberOfPages()); yPos = 35; }
                    doc.setFontSize(10);
                    doc.setFont(fontName, 'bold');
                    doc.setTextColor(50);
                    doc.text(obs.title, margin, yPos);
                    yPos += 5;

                    // Text
                    doc.setFontSize(10);
                    doc.setFont(fontName, 'normal');
                    doc.setTextColor(20);
                    const splitText = doc.splitTextToSize(obs.text, contentWidth);

                    // Check if text fits, if not page break
                    if (yPos + (splitText.length * 5) > pageHeight - 20) {
                        doc.addPage();
                        drawHeader((doc as any).internal.getNumberOfPages());
                        yPos = 35;
                        // Reprint title
                        doc.setFontSize(10);
                        doc.setFont(fontName, 'bold');
                        doc.text(obs.title + ' (cont.)', margin, yPos);
                        yPos += 5;
                        doc.setFontSize(10);
                        doc.setFont(fontName, 'normal');
                    }

                    doc.text(splitText, margin, yPos);
                    yPos += (splitText.length * 5) + 10;
                });
            }

            // --- Photographic Record (Annex) ---
            if (mainImageData || validGalleryImages.length > 0) {
                doc.addPage();
                drawHeader((doc as any).internal.getNumberOfPages());
                yPos = 35;

                // Title
                doc.setFontSize(14);
                doc.setFont(fontName, 'bold');
                doc.setTextColor(0);
                doc.text(t('mill.detail.photographicRecord') || "Registo Fotográfico", margin, yPos);
                yPos += 15;

                // Main Image
                if (mainImageData) {
                    const maxHeight = pageHeight / 2;
                    // Calculate aspect ratio
                    const ratio = Math.min(contentWidth / mainImageData.width, maxHeight / mainImageData.height);
                    const w = mainImageData.width * ratio;
                    const h = mainImageData.height * ratio;

                    try {
                        doc.addImage(mainImageData.data, 'JPEG', margin, yPos, w, h);
                        doc.setFontSize(9);
                        doc.setTextColor(80);
                        doc.text(t('mill.detail.mainImage') || "Imagem Principal", margin, yPos + h + 5);
                        yPos += h + 20;
                    } catch (e) {
                        console.error("Error adding main image", e);
                    }
                }

                // Gallery Grid
                if (validGalleryImages.length > 0) {
                    // Force new page for Gallery if Main Image exists, as requested
                    if (mainImageData || yPos > pageHeight - 80) {
                        doc.addPage();
                        drawHeader((doc as any).internal.getNumberOfPages());
                        yPos = 35;
                    }

                    doc.setFontSize(11);
                    doc.setFont(fontName, 'bold');
                    doc.setTextColor(0);
                    doc.text(t('mill.detail.gallery') || "Galeria", margin, yPos);
                    yPos += 10;

                    const colWidth = (contentWidth - 10) / 2; // 2 columns
                    const rowHeight = 70;
                    let xPos = margin;

                    validGalleryImages.forEach((img, index) => {
                        // Check page break
                        if (yPos + rowHeight > pageHeight - 20) {
                            doc.addPage();
                            drawHeader((doc as any).internal.getNumberOfPages());
                            yPos = 35;
                            xPos = margin;
                        }

                        // Fit image in box
                        const ratio = Math.min(colWidth / img.width, (rowHeight - 10) / img.height);
                        const w = img.width * ratio;
                        const h = img.height * ratio;

                        // Center in cell
                        const xOffset = (colWidth - w) / 2;
                        const yOffset = (rowHeight - 10 - h) / 2;

                        try {
                            doc.addImage(img.data, 'JPEG', xPos + xOffset, yPos + yOffset, w, h);
                        } catch (e) { }

                        // Next cell
                        if (index % 2 === 0) {
                            xPos += colWidth + 10;
                        } else {
                            xPos = margin;
                            yPos += rowHeight;
                        }
                    });
                }
            }

            // Draw Footers on all pages
            const totalPages = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                drawFooter(i);
            }

            // Save
            doc.save(`${mill.slug}-technical-sheet.pdf`);

        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Error generating PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            onClick={generatePdf}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="gap-2"
        >
            {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            {t('common.download') || 'Download'} PDF
        </Button>
    );
}
