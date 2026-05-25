// @ts-nocheck
import { PlanItem } from './types';

export const timeStringToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [p1, p2] = timeStr.split(',');
    const ms = p2 ? parseInt(p2) : 0;
    const parts = p1.split(':');
    let h = 0, m = 0, s = 0;
    if (parts.length === 3) { h = parseInt(parts[0]); m = parseInt(parts[1]); s = parseInt(parts[2]); }
    else if (parts.length === 2) { m = parseInt(parts[0]); s = parseInt(parts[1]); }
    return (h * 3600) + (m * 60) + s + (ms / 1000);
};

export const getSRTDuration = (srtContent: string): number => {
    const blocks = srtContent.trim().split(/\n\s*\n/);
    if (blocks.length === 0) return 0;
    const lastBlock = blocks[blocks.length - 1];
    const lines = lastBlock.split('\n');
    const timeLine = lines.find(l => l.includes('-->'));
    if (timeLine) {
        const endStr = timeLine.split('-->')[1].trim();
        return timeStringToSeconds(endStr);
    }
    return 0;
};

export const extractSRTChunkRange = (srtContent: string, startSec: number, endSec: number): string => {
    if (!srtContent) return "";
    const blocks = srtContent.trim().split(/\n\s*\n/);
    let chunk = "";
    for (const block of blocks) {
        const lines = block.split('\n');
        const timeLine = lines.find(l => l.includes('-->'));
        if (timeLine) {
            const rangeStr = timeLine.split('-->');
            const s = timeStringToSeconds(rangeStr[0].trim());
            if (s >= startSec && s < endSec) {
                chunk += block + "\n\n";
            }
        }
    }
    return chunk;
};

export const stitchPlanResults = (chunksArrays: any[][]): PlanItem[] => {
    let allItems: PlanItem[] = [];
    const seenStarts = new Set<string>(); 
    chunksArrays.forEach(chunk => {
        if (Array.isArray(chunk)) {
            chunk.forEach(item => {
                const key = `${Math.floor(item.start)}_${item.track_id}`; 
                if (!seenStarts.has(key)) {
                    allItems.push(item);
                    seenStarts.add(key);
                }
            });
        }
    });
    allItems.sort((a, b) => a.start - b.start || a.track_id - b.track_id);
    return allItems;
};
