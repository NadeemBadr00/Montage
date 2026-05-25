// @ts-nocheck
export interface GridGalleryLayoutCell {
    x: number;
    y: number;
    w: number;
    h: number;
    slotIndex: number;
}

export interface GridGalleryAsset {
    type: 'video' | 'image';
    el: HTMLVideoElement | HTMLImageElement;
}

export interface GridGalleryProperties {
    enabled: boolean;
    durationMode: 'manual' | 'auto';
    speed: number;
    pattern: string;
    shape: string;
    gap: number;
    spreadX: number;
    spreadY: number;
    activeScale: number;
    passiveScale: number;
    shrinkPassive: boolean;
    entryAnim: string;
    bgColor: string;
    bgOpacity: number;
    focusEffect: string;
    borderWidth: number;
    borderColor: string;
    activeBorderColor: string;
    showMain: boolean;
    showLabels: boolean;
    assets: GridGalleryAsset[];
    labels: string[];
    order: number[];
    layout: GridGalleryLayoutCell[] | null;
}
