// @ts-nocheck
import { PlanItem } from './types';
import { extractSRTChunkRange } from './parser';

const PLAN_CHUNK_DURATION = 60;
const PLAN_OVERLAP = 5;

export const generatePlanForChunk = async (srtChunk: string, startTime: number, endTime: number, W: number, H: number, safeX: number, safeY: number, index: number, customStyle: string): Promise<PlanItem[]> => {
    const styleInstruction = customStyle ? `"${customStyle}"` : "MINIMALIST & CLEAN";
    
    const prompt = `
        Act as an elite Video Editor with a **${styleInstruction}** style.
        🎥 **Canvas Context:**
        - Size: ${W}x${H} pixels.
        - **Center is (0,0)**.
        - Bottom Edge Y is approx +${H/2}px.
        - Safe Bottom Y for Speaker: **${safeY}px**.
        - Safe X Range: -${safeX}px (Left) to +${safeX}px (Right).

        📜 **Transcript Segment:**
        (${startTime}s to ${endTime}s)
        ${srtChunk}

        🧠 **CRITICAL EDITING RULES (STRICT):**
        
        0. **STYLE:** Strictly follow the user's requested style: ${styleInstruction}. Adjust pacing and visuals accordingly.

        1. **V2 (Backgrounds) - QUALITY OVER QUANTITY:** - **DO NOT** spam images every 2-3 seconds. This is forbidden.
           - **ALLOW GAPS:** It is perfectly fine to have NO background (empty V2) for 5-10 seconds if the text is generic or transitional.
           - Aim for longer visual durations (e.g., 5s to 12s) to let the viewer breathe.

        2. **V4 (Overlays) - SPARSE:** - Only use for **Critical Keywords** or specific visual punchlines. 
           - Do not caption every word.

        3. **V3 (Speaker) - ONE-TIME STATIC SETUP:** - **RULE:** Only generate a 'modify' command for V3 **IF AND ONLY IF** the start time is **0s** (The very beginning).
           - **IF START > 0s:** **DO NOT** include any V3 commands. DO NOT move, scale, or touch the speaker layer. He must remain exactly where he was placed at 0s for the entire video.
           - **AT 0s ONLY:** Place him fixed at Y=${safeY}px (Bottom) with 'sc100'.

        🎛️ **CLI COMMANDS (IMPORTANT: Use 'c' separator, NOT '%'):**
        - **Move:** 'mv[X]x[Y]y' (e.g., 'mv-${safeX}x${safeY}y' for Left, 'mv0x${safeY}y' for Center).
        - **Scale:** 'sc80' (Small/80%), 'sc100' (Normal/100%). NEVER use sc80% — always sc80 without %.
        - **Combined example:** 'mv0x${safeY}y sc100' means center-bottom at 100% scale.

        📤 **JSON Output Structure:**
        [
            { 
              "action": "upload",
              "track_id": 2, 
              "start": 0.5, 
              "end": 5.5, 
              "desc": "Short description", 
              "asset_query": "Specific search term OR none", 
              "cli_cmd": "mv... sc..." 
            }
        ]
        
        **IMPORTANT:** 1. Return ONLY the JSON array. 
        2. Valid JSON (RFC 8259). 
        3. **NO comments** (like // or /*) inside the JSON.
        4. Escape special characters in strings.
    `;

    try {
        const responseText = await window.geminiChat.queryGemini(prompt);
        const jsonStart = responseText.indexOf('[');
        const jsonEnd = responseText.lastIndexOf(']') + 1;
        
        if (jsonStart === -1) {
            console.warn(`⚠️ Chunk ${index}: No JSON found.`);
            return [];
        }

        let jsonString = responseText.substring(jsonStart, jsonEnd);
        jsonString = jsonString.replace(/,\s*]/g, ']');

        let chunkPlan = JSON.parse(jsonString) as PlanItem[];
        
        chunkPlan = chunkPlan.map(item => {
            if (item.start < startTime) item.start = startTime;
            if (item.end > endTime + 5) item.end = endTime; 
            if (item.start >= item.end) item.end = item.start + 5;

            item.track_id = parseInt(item.track_id as any) || 2;
            
            if (item.asset_query && item.asset_query !== 'none') {
                const words = item.asset_query.split(' ');
                if (words.length > 6) item.asset_query = words.slice(0, 6).join(' ');
            }
            if (item.desc && item.desc.length > 50) item.desc = item.desc.substring(0, 50) + "..";

            return item;
        });

        return chunkPlan.filter(item => item.start >= startTime - 5 && item.start <= endTime + 5);

    } catch (e) {
        console.error(`⚠️ Plan chunk ${index} failed:`, e);
        return [];
    }
};
