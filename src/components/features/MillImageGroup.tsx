'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// --- Types ---
type ImageItem = {
    src: string;
    alt: string;
};

type MillImageContextType = {
    images: ImageItem[];
    openLightbox: (index: number) => void;
};

// --- Context ---
const MillImageContext = createContext<MillImageContextType | null>(null);

const useMillImages = () => {
    const context = useContext(MillImageContext);
    if (!context) {
        throw new Error('useMillImages must be used within a MillImageProvider');
    }
    return context;
};

// --- Components ---

interface MillImageProviderProps {
    images: ImageItem[];
    children: React.ReactNode;
}

export function MillImageProvider({ images, children }: MillImageProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const openLightbox = useCallback((index: number) => {
        setCurrentIndex(index);
        setIsOpen(true);
    }, []);

    const closeLightbox = useCallback(() => {
        setIsOpen(false);
    }, []);

    const nextImage = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const prevImage = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeLightbox, nextImage, prevImage]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <MillImageContext.Provider value={{ images, openLightbox }}>
            {children}
            {isOpen && (
                <Lightbox
                    image={images[currentIndex]}
                    onClose={closeLightbox}
                    onNext={nextImage}
                    onPrev={prevImage}
                    hasMultiple={images.length > 1}
                    currentIndex={currentIndex}
                    totalImages={images.length}
                />
            )}
        </MillImageContext.Provider>
    );
}

interface LightboxProps {
    image: ImageItem;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    hasMultiple: boolean;
    currentIndex: number;
    totalImages: number;
}

function Lightbox({ image, onClose, onNext, onPrev, hasMultiple, currentIndex, totalImages }: LightboxProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(image.src);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            // Extract filename from URL or default
            const filename = image.src.split('/').pop() || `mill-image-${Date.now()}.jpg`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed', error);
            // Fallback: open in new tab
            window.open(image.src, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">

            {/* Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
                <Button
                    variant="ghost"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10"
                    title="Download original"
                >
                    <Download className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    onClick={onClose}
                    className="p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10"
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* Counter */}
            {hasMultiple && (
                <div className="absolute top-6 left-6 text-white/50 font-mono text-sm z-50">
                    {currentIndex + 1} / {totalImages}
                </div>
            )}

            {/* Navigation - Left */}
            {hasMultiple && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
                    aria-label="Previous image"
                >
                    <ChevronLeft className="h-10 w-10" />
                </button>
            )}

            {/* Image Container */}
            <div
                className="relative w-full h-full p-4 md:p-12 flex items-center justify-center"
                onClick={onClose} // Close when clicking background
            >
                <div
                    className="relative max-w-full max-h-full"
                    onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
                >
                    {/* We use a regular img tag here for the full resolution to avoid Next.js Image optimizing it down again unless we set unoptimized */}
                    {/* However, Next.js Image is still better for loading states. ensuring 'unoptimized' or 'quality={100}' */}
                    <div className="relative w-auto h-auto">
                        <img
                            src={image.src}
                            alt={image.alt}
                            className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-sm selection:bg-none"
                            draggable={false}
                        />
                    </div>
                    <div className="mt-2 text-center">
                        <p className="text-white/80 text-sm font-medium">{image.alt}</p>
                    </div>
                </div>
            </div>

            {/* Navigation - Right */}
            {hasMultiple && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
                    aria-label="Next image"
                >
                    <ChevronRight className="h-10 w-10" />
                </button>
            )}
        </div>,
        document.body
    );
}

// --- Trigger Components ---

interface TriggerProps {
    className?: string; // wrapper class
}

export function MillMainImage({ className }: TriggerProps) {
    const { images, openLightbox } = useMillImages();

    if (images.length === 0) return null;

    const mainImage = images[0];

    return (
        <div className={`relative group cursor-zoom-in ${className}`} onClick={() => openLightbox(0)}>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 flex items-center justify-center">
                <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
            </div>
            <Image
                src={mainImage.src}
                alt={mainImage.alt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
                quality={50} // Low quality for initial load
                sizes="(max-width: 1024px) 100vw, 40vw"
            />
        </div>
    );
}

export function MillGalleryGrid() {
    const { images, openLightbox } = useMillImages();

    // Gallery images are everything after index 0 (assuming index 0 is Main)
    const galleryImages = images.slice(1);

    if (galleryImages.length === 0) return null;

    return (
        <>
            {galleryImages.map((img, idx) => {
                // The actual index in the global list is idx + 1
                const globalIndex = idx + 1;
                return (
                    <div
                        key={globalIndex}
                        className="relative aspect-square bg-gray-200 overflow-hidden border border-gray-300 group cursor-zoom-in"
                        onClick={() => openLightbox(globalIndex)}
                    >
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 flex items-center justify-center">
                            <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md h-5 w-5" />
                        </div>
                        <Image
                            src={img.src}
                            alt={img.alt}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            quality={40} // Low quality thumbnails
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                    </div>
                );
            })}
        </>
    );
}
