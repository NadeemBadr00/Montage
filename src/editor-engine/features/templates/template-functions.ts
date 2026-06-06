// @ts-nocheck
import { detectBeats } from '../audio/beat-detector';

// 1. Smart Sandwich Enhanced
export async function applyTemplate_SmartSandwich(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    // Enable AI Segmentation and Sandwich mode
    clip.properties.sandwichMode = 'enhanced';
    clip.sandwich = { 
        bgScale: 120, 
        bgBlur: 15, 
        fgScale: 90, 
        fgPositionY: app.canvasHeight * 0.6, 
        offsetX: 0, 
        offsetY: 0 
    };
    
    // Request segmentation if available
    clip.aiSegmentation = { enabled: true, edgeSmoothing: 0.5 };
}

// 2. Neon Word-by-Word Captions
export async function applyTemplate_NeonCaptions(app: any, mainClipId: string, secondaryClipId?: string, options: any = {}) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    // Auto-Caption needs to run first. We assume Gemini actions are available
    if (!clip.captions || clip.captions.length === 0) {
        if (app.log) app.log("🤖 جاري توليد النصوص عبر Gemini...");
        // This invokes the same logic from F1: Auto Captions
        // For now, if we don't have a direct function, we can dispatch the command
        // But assuming app.aiEngine or similar exists from our F1 implementation:
        try {
            await (window as any).executeAICmd(`caption ${mainClipId}`);
            // Wait a bit for the subtitles to be generated and added to the timeline
            await new Promise(r => setTimeout(r, 2000)); 
        } catch (e) {
            throw new Error("Failed to generate captions: " + e.message);
        }
    }
    
    // Now find the subtitle track and apply Neon styles
    const subTrack = app.tracks.find(t => t.type === 'subtitle');
    if (subTrack) {
        subTrack.clips.forEach(c => {
            if (c.start >= clip.start && c.end <= clip.end) {
                c.textStyle = {
                    fontFamily: 'Cairo',
                    fontWeight: '900',
                    color: '#ffffff',
                    shadowBlur: 25,
                    strokeColor: options.color || '#ff00ff', // Pink/Neon
                    strokeWidth: 4,
                    textTransform: 'uppercase'
                };
                c.animation = {
                    in: 'pop',
                    out: 'fadeOut'
                };
            }
        });
    }
    
    clip.properties.colorGrading = { brightness: 0.8, contrast: 1.2 }; // Darken video slightly to make neon pop
}

// 3. Mahraganat Beat Sync Cut
export async function applyTemplate_MahraganatSync(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Video Clip not found");
    
    // Find audio track to sync with
    const audioTrack = app.tracks.find(t => t.type === 'audio');
    if (!audioTrack || audioTrack.clips.length === 0) throw new Error("No audio track found for Beat Sync");
    
    const audioClip = audioTrack.clips[0]; // Sync to first audio clip
    
    if (app.log) app.log("🎧 جاري تحليل إيقاعات الصوت (Beat Detection)...");
    const res = await fetch(audioClip.src);
    const arrayBuffer = await res.arrayBuffer();
    
    // Extract Beats
    const beats = await detectBeats(arrayBuffer, app.audioCtx);
    
    if (app.log) app.log(`⚡ تم العثور على ${beats.length} إيقاع! جاري تطبيق الاهتزازات...`);
    
    // Instead of cutting the video (which destroys edits), we apply scale/brightness keyframes at each beat!
    // We will simulate it using clip.keyframes
    if (!clip.keyframes) clip.keyframes = { scale: [], brightness: [] };
    
    const scaleAnim = clip.keyframes.scale || [];
    const brightAnim = clip.keyframes.brightness || [];
    
    beats.forEach(beat => {
        // Only apply if beat is within video clip time
        if (beat >= clip.start && beat <= clip.end) {
            const relTime = beat - clip.start;
            // Pop effect
            scaleAnim.push({ time: relTime - 0.05, value: 100 });
            scaleAnim.push({ time: relTime, value: 125, easing: 'easeOutBack' });
            scaleAnim.push({ time: relTime + 0.1, value: 100, easing: 'easeInOut' });
            
            // Flash effect
            brightAnim.push({ time: relTime - 0.05, value: 1.0 });
            brightAnim.push({ time: relTime, value: 2.0 }); // Flash
            brightAnim.push({ time: relTime + 0.1, value: 1.0 });
        }
    });
    
    clip.keyframes.scale = scaleAnim.sort((a,b) => a.time - b.time);
    clip.keyframes.brightness = brightAnim.sort((a,b) => a.time - b.time);
}

// 4. Cinematic Golden Hour
export async function applyTemplate_GoldenHour(app: any, mainClipId: string, textOptions?: any) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    // Apply Cinematic Color Grading (Sepia, Saturation, Warmth)
    clip.properties.colorGrading = {
        sepia: 0.3,
        saturation: 1.4,
        hueRotate: -10,
        brightness: 1.05,
        contrast: 1.15
    };
    
    // Add Cinematic Bars (Scale Y down)
    clip.properties.scaleY = 85; 
    
    // Add VLOG Location Text
    const textTrack = app.tracks.find(t => t.type === 'subtitle') || app.addNewTrack('subtitle');
    const txtClip = new (window as any).Clip(`c_golden_${Date.now()}`, "Vlog Text", clip.start, 4, 'subtitle', textOptions?.text || "CAIRO, EGYPT");
    txtClip.textStyle = {
        fontFamily: 'Tajawal',
        fontWeight: 'normal',
        color: 'rgba(255,255,255,0.9)',
        shadowBlur: 5,
        textTransform: 'uppercase'
    };
    txtClip.properties = {
        positionY: 400,
        scale: 80
    };
    txtClip.animation = { in: 'fadeIn', out: 'fadeOut' };
    
    textTrack.addClip(txtClip);
}

// 5. Split Screen Reaction
export async function applyTemplate_SplitReaction(app: any, mainClipId: string, reactionClipId?: string) {
    const mainClip = app.findClipById(mainClipId);
    if (!mainClip) throw new Error("Main clip not found");
    
    let reactClip;
    if (reactionClipId) {
        reactClip = app.findClipById(reactionClipId);
    } else {
        // Try to find the second video track and its first clip
        const vTracks = app.tracks.filter(t => t.type === 'video' || t.type === 'overlay');
        if (vTracks.length > 1 && vTracks[1].clips.length > 0) {
            reactClip = vTracks[1].clips[0];
        }
    }
    
    if (!reactClip) throw new Error("Reaction clip not found. Please place two clips on different tracks.");
    
    // Split screen logic
    // Main video on top
    mainClip.properties.positionY = - (app.canvasHeight / 4);
    mainClip.properties.scale = 100;
    
    // Reaction video on bottom
    reactClip.properties.positionY = (app.canvasHeight / 4);
    reactClip.properties.scale = 100;
    
    // Add divider line
    const textTrack = app.tracks.find(t => t.type === 'subtitle') || app.addNewTrack('subtitle');
    const divider = new (window as any).Clip(`c_div_${Date.now()}`, "Divider", Math.min(mainClip.start, reactClip.start), Math.max(mainClip.end, reactClip.end), 'subtitle', " ");
    divider.textStyle = {
        backgroundColor: '#ffffff',
        backgroundOpacity: 100,
        padding: app.canvasWidth,
    };
    divider.properties = { positionY: 0, scaleY: 2, scaleX: 100 };
    textTrack.addClip(divider);
}

// 6. Wait, Let Me Wipe the Camera
export async function applyTemplate_WipeCamera(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    // Split the clip in half and add a wipe transition
    const midPoint = clip.start + (clip.duration / 2);
    
    // We assume the engine has a split function, or we duplicate and adjust
    if (app.log) app.log("📹 جاري تطبيق انتقال المسح (Wipe Transition)...");
    
    // For simplicity without calling complex engine split logic, we just add a transition to the clip
    // if there is a next clip, otherwise we just simulate a wipe filter
    clip.transitions = {
        in: { type: 'none', duration: 0 },
        out: { type: 'wipe', duration: 0.4 }
    };
}

// 7. My Top Ten Countdown
export async function applyTemplate_TopTen(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    const textTrack = app.tracks.find((t: any) => t.type === 'subtitle') || app.addNewTrack('subtitle');
    
    // Add 10 numbers descending
    const interval = clip.duration / 10;
    for (let i = 10; i >= 1; i--) {
        const tStart = clip.start + ((10 - i) * interval);
        const txtClip = new (window as any).Clip(`c_tt_${i}_${Date.now()}`, `Number ${i}`, tStart, interval, 'subtitle', `${i}`);
        
        txtClip.textStyle = {
            fontFamily: 'Arial Black',
            fontWeight: '900',
            fontSize: 250,
            color: '#ffffff',
            strokeColor: '#000000',
            strokeWidth: 10,
            shadowBlur: 20
        };
        txtClip.animation = { in: 'pop', out: 'zoomOut' };
        textTrack.addClip(txtClip);
    }
}

// 8. Silhouette Challenge Segmentation
export async function applyTemplate_Silhouette(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    // Remove Background
    clip.aiSegmentation = { enabled: true, edgeSmoothing: 0.8 };
    
    // Turn the person black
    clip.properties.colorGrading = { brightness: 0, contrast: 2.0 };
    
    // Add red background behind the person
    const bgTrack = app.tracks.find((t: any) => t.type === 'main') || app.addNewTrack('main');
    const bgClip = new (window as any).Clip(`c_silbg_${Date.now()}`, "Red BG", clip.start, clip.duration, 'image', 'color');
    bgClip.properties = { ...bgClip.properties, backgroundColor: '#8b0000' }; // Dark Red
    
    // Note: To truly place it behind, the bgClip should be in a lower track or rendered first.
    // Assuming 'main' track renders first.
    bgTrack.addClip(bgClip);
    // Sort tracks if needed, but usually 'main' is bottom.
}

// 9. Love Story Gradient Reveal
export async function applyTemplate_LoveStory(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    // Add romantic text
    const textTrack = app.tracks.find((t: any) => t.type === 'subtitle') || app.addNewTrack('subtitle');
    const txtClip = new (window as any).Clip(`c_love_${Date.now()}`, "Love Text", clip.start, clip.duration, 'subtitle', "قِصة حُب");
    txtClip.textStyle = {
        fontFamily: 'Almarai, sans-serif',
        fontSize: 100,
        color: '#ffffff',
        shadowBlur: 15,
        shadowColor: '#ff69b4'
    };
    txtClip.animation = { in: 'fadeIn', out: 'fadeOut' };
    textTrack.addClip(txtClip);
    
    // Add gradient overlay (Pink to Orange)
    const overlayTrack = app.tracks.find((t: any) => t.type === 'overlay') || app.addNewTrack('overlay');
    const gradClip = new (window as any).Clip(`c_grad_${Date.now()}`, "Gradient", clip.start, clip.duration, 'image', 'gradient');
    gradClip.properties = { 
        gradientColors: ['rgba(255,105,180,0.4)', 'rgba(255,165,0,0.4)'],
        blendMode: 'overlay' 
    };
    overlayTrack.addClip(gradClip);
}

// 10. Retro VHS Dither
export async function applyTemplate_RetroVHS(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    // Add VHS effects
    if (!clip.effects) clip.effects = {};
    clip.effects.noise = { enabled: true, intensity: 0.15 };
    clip.effects.rgbSplit = { enabled: true, distance: 3 };
    clip.properties.colorGrading = { saturation: 0.7, contrast: 1.2, hueRotate: 5 };
    
    // Add Date Text Overlay
    const textTrack = app.tracks.find((t: any) => t.type === 'subtitle') || app.addNewTrack('subtitle');
    const d = new Date();
    const dateStr = `PLAY\n${d.toLocaleString('en-US', {month: 'short', day: '2-digit', year: 'numeric'}).toUpperCase()}\n${d.getHours()}:${d.getMinutes()} AM`;
    const txtClip = new (window as any).Clip(`c_vhs_${Date.now()}`, "VHS Text", clip.start, clip.duration, 'subtitle', dateStr);
    txtClip.textStyle = {
        fontFamily: 'Courier New, monospace',
        fontSize: 36,
        color: '#ffffff',
        textAlign: 'left'
    };
    txtClip.properties = {
        positionX: - (app.canvasWidth / 2) + 100,
        positionY: (app.canvasHeight / 2) - 100
    };
    textTrack.addClip(txtClip);
}

// 11. Glow Up Segmentation
export async function applyTemplate_GlowUp(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    clip.aiSegmentation = { enabled: true, edgeSmoothing: 0.5 };
    if (!clip.effects) clip.effects = {};
    
    // Outer glow effect
    clip.effects.dropShadow = { enabled: true, color: '#00ffff', blur: 30, offsetX: 0, offsetY: 0 };
    clip.properties.scale = 105; // slight pop
}

// 12. Glitch / Cyberpunk Intro
export async function applyTemplate_CyberpunkGlitch(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    clip.properties.colorGrading = { hueRotate: 270, saturation: 1.5, contrast: 1.2 };
    if (!clip.effects) clip.effects = {};
    
    clip.effects.rgbSplit = { 
        enabled: true, 
        animations: [{time:0, value:30}, {time:0.5, value:2}, {time:0.6, value:0}] 
    };
    clip.effects.noise = { enabled: true, intensity: 0.2 };
}

// 13. Simple Background Blur
export async function applyTemplate_SimpleBlur(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    clip.properties.sandwichMode = 'simple';
    clip.sandwich = { bgScale: 130, bgBlur: 20, fgScale: 100, fgPositionY: 0, offsetX: 0, offsetY: 0 };
}

// 14. Polaroid Frame Album
export async function applyTemplate_Polaroid(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    // Add Polaroid Frame as an overlay
    const overlayTrack = app.tracks.find((t: any) => t.type === 'overlay') || app.addNewTrack('overlay');
    // Using an existing frames template source
    const frameSrc = 'https://raw.githubusercontent.com/NadeemBadr00/Montage/main/assets/polaroid_frame.png'; 
    const frameClip = new (window as any).Clip(`c_pol_${Date.now()}`, "Polaroid", clip.start, clip.duration, 'image', frameSrc);
    
    // Scale and rotate both video and frame
    const angle = (Math.random() * 10) - 5;
    clip.properties.scale = 60;
    clip.properties.rotation = angle;
    
    frameClip.properties.scale = 65;
    frameClip.properties.rotation = angle;
    
    overlayTrack.addClip(frameClip);
}

// 15. Text-to-Speech Narrator
export async function applyTemplate_TTSNarrator(app: any, mainClipId: string) {
    const clip = app.findClipById(mainClipId);
    if (!clip) throw new Error("Clip not found");
    
    if (app.log) app.log("🗣️ جاري تحضير راوي الذكاء الاصطناعي...");
    
    const textTrack = app.tracks.find((t: any) => t.type === 'subtitle') || app.addNewTrack('subtitle');
    const story = "هذه هي القصة التي يقرأها الراوي الآلي.";
    
    const txtClip = new (window as any).Clip(`c_tts_${Date.now()}`, "Narrator Text", clip.start, clip.duration, 'subtitle', story);
    txtClip.textStyle = {
        fontFamily: 'Tajawal',
        fontSize: 48,
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20
    };
    txtClip.animation = { in: 'typewriter', out: 'fadeOut' };
    textTrack.addClip(txtClip);
    
    // Try executing the TTS command if the engine supports it
    try {
        await (window as any).executeAICmd(`tts "${story}"`);
    } catch (e) {
        console.warn("TTS engine not directly accessible via command. Text added only.");
    }
}
