// @ts-nocheck
import { GridGalleryProperties } from './types';

export const syncGridOrder = (clip: any) => {
    const g: GridGalleryProperties = clip.gridGallery;
    const baseCount = g.showMain ? 1 : 0;
    const assetsCount = g.assets ? g.assets.length : 0;
    const totalItems = baseCount + assetsCount;

    if (g.order.length !== totalItems) {
        g.order = Array.from({length: totalItems}, (_, i) => i);
    }
    
    if (g.labels.length < totalItems) {
        for(let i = g.labels.length; i < totalItems; i++) {
            if (g.showMain && i === 0) g.labels[i] = "Main";
            else g.labels[i] = `Item ${i + 1}`;
        }
    } else if (g.labels.length > totalItems) {
        g.labels = g.labels.slice(0, totalItems);
    }
};

export const ensureGridProperties = (clip: any) => {
    if (!clip.gridGallery) {
        clip.gridGallery = {
            enabled: false,
            durationMode: 'manual', 
            speed: 2,
            pattern: 'grid', 
            shape: 'circle', 
            gap: 10,
            spreadX: 1.0,
            spreadY: 1.0,
            activeScale: 1.3,   
            passiveScale: 0.8,  
            shrinkPassive: true, 
            entryAnim: 'pop', 
            bgColor: '#1e293b',
            bgOpacity: 100,
            focusEffect: 'none', 
            borderWidth: 0,
            borderColor: '#ffffff',
            activeBorderColor: '#ffd700', 
            showMain: true,
            showLabels: false,
            assets: [], 
            labels: [], 
            order: [],
            layout: null
        } as GridGalleryProperties;
    }

    const g = clip.gridGallery;
    if (g.showMain === undefined) g.showMain = true;
    if (!g.pattern) g.pattern = 'grid';
    if (!g.shape) g.shape = 'circle';
    if (!g.focusEffect) g.focusEffect = 'none';
    if (g.borderWidth === undefined) g.borderWidth = 0;
    if (!g.borderColor) g.borderColor = '#ffffff';
    if (!g.activeBorderColor) g.activeBorderColor = '#ffd700';
    if (!g.entryAnim) g.entryAnim = 'pop';
    if (!g.labels) g.labels = [];
    if (g.bgOpacity === undefined) g.bgOpacity = 100;
    if (!g.bgColor) g.bgColor = '#1e293b';
    
    if (g.activeScale === undefined) g.activeScale = 1.3;
    if (g.passiveScale === undefined) g.passiveScale = 0.8;
    if (g.shrinkPassive === undefined) g.shrinkPassive = true;

    syncGridOrder(clip);
};
