// @ts-nocheck
import { GridGalleryProperties, GridGalleryLayoutCell } from './types';

export const calculateLayout = (w: number, h: number, gap: number, count: number, props: GridGalleryProperties): GridGalleryLayoutCell[] => {
    const { pattern, spreadX, spreadY, shape } = props;
    const layout: GridGalleryLayoutCell[] = [];
    if (count === 0) return layout;

    const centerX = w / 2;
    const centerY = h / 2;
    
    let itemAspect = 1; 
    if (shape === 'strip_h') itemAspect = 16/9;
    if (shape === 'strip_v') itemAspect = 9/16;

    if (pattern === 'grid') {
        let bestCols = 1, bestRows = 1, maxSize = 0;
        for (let c = 1; c <= count; c++) {
            const r = Math.ceil(count / c);
            const availW = (w - (gap * (c + 1))) / c;
            const availH = (h - (gap * (r + 1))) / r;
            
            let itemW, itemH;
            if (availW / itemAspect <= availH) {
                itemW = availW; itemH = itemW / itemAspect;
            } else {
                itemH = availH; itemW = itemH * itemAspect;
            }
            if (itemW > maxSize) {
                maxSize = itemW; bestCols = c; bestRows = r;
            }
        }
        
        const cellW = maxSize;
        const cellH = maxSize / itemAspect;
        const gridTotalW = (bestCols * cellW) + ((bestCols - 1) * gap);
        const gridTotalH = (bestRows * cellH) + ((bestRows - 1) * gap);
        const startX = centerX - (gridTotalW / 2) + (cellW / 2);
        const startY = centerY - (gridTotalH / 2) + (cellH / 2);

        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / bestCols);
            const col = i % bestCols;
            let rowOffsetX = 0;
            const isLastRow = row === bestRows - 1;
            const itemsInLastRow = count % bestCols || bestCols;
            if (isLastRow && itemsInLastRow < bestCols) {
                const empty = bestCols - itemsInLastRow;
                rowOffsetX = (empty * (cellW + gap)) / 2;
            }
            const baseX = startX + (col * (cellW + gap)) + rowOffsetX;
            const baseY = startY + (row * (cellH + gap));
            const vecX = baseX - centerX;
            const vecY = baseY - centerY;

            layout.push({
                x: centerX + (vecX * spreadX),
                y: centerY + (vecY * spreadY),
                w: cellW, h: cellH, slotIndex: i
            });
        }
    } 
    else if (pattern === 'circle') {
        const radius = (Math.min(w, h) / 3) * Math.max(spreadX, spreadY);
        const circumference = 2 * Math.PI * radius;
        const itemSize = Math.min(w/4, (circumference / count) - gap);
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - (Math.PI / 2);
            layout.push({
                x: centerX + (Math.cos(angle) * radius * spreadX),
                y: centerY + (Math.sin(angle) * radius * spreadY),
                w: itemSize, h: itemSize / itemAspect, slotIndex: i
            });
        }
    }
    else if (pattern === 'line_h' || pattern === 'line_v') {
        const isH = pattern === 'line_h';
        const itemSize = isH ? w / Math.max(2, count) : h / Math.max(2, count);
        const totalLen = (count * itemSize) + ((count - 1) * gap);
        const start = (isH ? centerX : centerY) - (totalLen / 2) + (itemSize / 2);

        for (let i = 0; i < count; i++) {
            const pos = start + (i * (itemSize + gap));
            layout.push({
                x: isH ? (centerX - (centerX - pos) * spreadX) : centerX,
                y: isH ? centerY : (centerY - (centerY - pos) * spreadY),
                w: itemSize, h: itemSize / itemAspect, slotIndex: i
            });
        }
    }
    else if (pattern === 'scatter') {
        const pseudoRandom = (seed: number) => {
            const x = Math.sin(seed * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };
        const itemSize = Math.min(w, h) / 4;
        for (let i = 0; i < count; i++) {
            const rndX = (pseudoRandom(i) - 0.5) * 2; 
            const rndY = (pseudoRandom(i + 100) - 0.5) * 2; 
            layout.push({
                x: centerX + (rndX * (w/2.5) * spreadX),
                y: centerY + (rndY * (h/2.5) * spreadY),
                w: itemSize, h: itemSize / itemAspect, slotIndex: i
            });
        }
    }
    return layout;
};
