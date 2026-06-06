// video_export_audio.ts — Audio buffer fetching and offline AudioContext mixdown

/**
 * Performs a full offline audio mixdown for the given app/options.
 * Fetches all audio/video clip sources in parallel (concurrency = 4),
 * schedules them into an OfflineAudioContext with per-clip volume/keyframes,
 * and returns the rendered AudioBuffer (or null if the timeline has no audio).
 */
export async function mixdownAudio(app: any, options: any): Promise<AudioBuffer | null> {
    const duration = isNaN(app.duration) || app.duration === 0 ? 5 : app.duration;
    const sampleRate = 44100;
    const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
        2,
        Math.ceil(duration * sampleRate),
        sampleRate
    );

    const audioBuffers = new Map<string, AudioBuffer>();
    let hasAudio = false;

    // ✅ Compute anySolo locally (same as we do in the preview renderer)
    const anySolo = app.tracks.some((t: any) => t.isSolo);

    // Collect all unique audio/video clip srcs that need decoding
    const audioClipsToSchedule: any[] = [];
    const uniqueSrcs = new Set<string>();
    for (const track of app.tracks) {
        if (track.isMuted || (anySolo && !track.isSolo)) continue;
        for (const clip of track.clips) {
            if (clip.type === 'audio' || clip.type === 'video') {
                hasAudio = true;
                audioClipsToSchedule.push(clip);
                uniqueSrcs.add(clip.src);
            }
        }
    }

    // ⚡ Phase 2c: Parallel fetch + decode with concurrency limit = 4
    const audioFetchQueue = Array.from(uniqueSrcs);
    const AUDIO_CONCURRENCY = 4;
    const runAudioBatch = async (srcs: string[]) => {
        await Promise.all(srcs.map(async (src) => {
            try {
                const res = await fetch(src);
                const arrayBuffer = await res.arrayBuffer();
                const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
                audioBuffers.set(src, audioBuffer);
            } catch (e) {
                console.error('[Export] Failed to decode audio for', src, e);
            }
        }));
    };
    for (let i = 0; i < audioFetchQueue.length; i += AUDIO_CONCURRENCY) {
        await runAudioBatch(audioFetchQueue.slice(i, i + AUDIO_CONCURRENCY));
    }

    // Schedule all clips into the OfflineAudioContext
    for (const clip of audioClipsToSchedule) {
        if (!audioBuffers.has(clip.src)) continue;
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffers.get(clip.src)!;
        const gain = offlineCtx.createGain();
        if (clip.keyframes?.volume?.length > 0) {
            const keys = [...clip.keyframes.volume].sort((a: any, b: any) => a.t - b.t);
            const startVol = keys[0].t <= 0 ? keys[0].v : (clip.properties.volume ?? 100);
            gain.gain.setValueAtTime(startVol / 100, clip.start);
            for (const k of keys) {
                gain.gain.linearRampToValueAtTime(k.v / 100, clip.start + k.t);
            }
        } else {
            gain.gain.value = (clip.properties.volume ?? 100) / 100;
        }
        source.connect(gain);
        gain.connect(offlineCtx.destination);
        source.start(clip.start, clip.sourceIn || 0, clip.duration);
    }

    if (!hasAudio) return null;
    return offlineCtx.startRendering();
}
