// @ts-nocheck
/**
 * 🎬 AutoMontage Engine — v2.0
 *
 * Pipeline:
 *  1. COLLECT  → جمع كل الميديا (صور + فيديو) وتجاهل bg.webp / graph.webp
 *  2. ANALYZE  → Gemini Vision بالتوازي — كل أصل بـ API key مختلف
 *  3. PLAN     → Gemini يبني خطة شاملة: كليبات + SFX + نصوص + frames + transitions
 *  4. ASSEMBLE → تنفيذ الخطة على التايم لاين + الصوت لكل فيديو
 *  5. FINALIZE → تطبيق التأثيرات والماركات
 */

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { BrainInstance, AI4MONTAGE_MODELS } from "./ai4montage_brain";

// ─── الملفات المستثناة من التحليل ───────────────────────────────────────────
export const EXCLUDED_FILES = ['bg.png', 'graph.png', 'Chill_Beat.mp3', 'chill_beat.mp3'];

// ─── حجم أقصى لإرسال الفيديو inline (50MB) ────────────────────────────────
export const MAX_INLINE_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

// ─── نسبة الـ keys المحجوزة للخطة (50%) ──────────────────────────────────
export const KEYS_RESERVED_FOR_PLAN = 0.5;

// ─── قائمة الـ SFX المتاحة للـ AI ──────────────────────────────────────────
export const AVAILABLE_SFX = [
    { id: 'sfx_whoosh_1567', name: 'Slow Cinematic Whoosh', src: '/sfx/whoosh_slow.wav', duration: 1.5 },
    { id: 'sfx_whoosh_7528', name: 'Fast Swoosh', src: '/sfx/whoosh_fast.wav', duration: 0.4 },
    { id: 'sfx_boom_5917', name: 'Cinematic Impact', src: '/sfx/impact_cinematic.wav', duration: 2.0 },
    { id: 'sfx_boom_1387', name: 'Deep Sub Bass Drop', src: '/sfx/impact_deep.wav', duration: 3.0 },
    { id: 'sfx_ding_4790', name: 'Success Bell', src: '/sfx/chime_success.wav', duration: 1.5 },
    { id: 'sfx_ding_8370', name: 'Notification Alert', src: '/sfx/chime_notification.wav', duration: 1.0 },
    { id: 'sfx_riser_9975', name: 'Tension Build', src: '/sfx/riser_tension.wav', duration: 4.0 },
    { id: 'sfx_riser_8904', name: 'Short Riser', src: '/sfx/riser_short.wav', duration: 1.5 },
    { id: 'sfx_glitch_8860', name: 'Digital Glitch Fast', src: '/sfx/glitch_digital.wav', duration: 0.5 },
    { id: 'sfx_magic_2031', name: 'Fairy Dust Sparkle', src: '/sfx/magic_sparkle.wav', duration: 2.0 },
    { id: 'sfx_misc_7821', name: 'Camera Shutter', src: '/sfx/misc_camera.wav', duration: 0.2 },
    { id: 'sfx_meme_8405', name: 'Vine Boom', src: '/sfx/meme_vine_boom.wav', duration: 2.5 },
    { id: 'sfx_meme_5860', name: 'Record Scratch', src: '/sfx/meme_record_scratch.wav', duration: 0.4 },
];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MediaAsset {
    id: string;
    name: string;
    src: string;
    type: 'video' | 'image';
    duration?: number;
    fileRef?: File;         // مرجع الملف الأصلي لإرساله inline
    thumbnailBase64?: string;
    analysis?: AssetAnalysis;
}

export interface AssetAnalysis {
    contentType: string;
    mood: string;
    tags: string[];
    suggestedDuration: number;
    suggestedTrack: 'main' | 'overlay' | 'background' | 'broll';
    hasFace: boolean;
    quality: number;
    description: string;
}

export interface PlanItem {
    type: 'video' | 'image' | 'sfx' | 'text' | 'transition' | 'freeze';
    assetId?: string;       // for video/image
    src?: string;           // for sfx
    text?: string;          // for text overlays
    track: string;          // 'V1','V2','V3','A1','A2','T1'
    start: number;
    duration: number;
    effects?: string[];     // filter:cinematic, ken_burns, fade_in, etc.
    transition?: string;    // dissolve, wipe, zoom
    style?: string;         // for text: template style name
}

export interface MontagePlan {
    style: string;
    totalDuration: number;
    items: PlanItem[];
}
