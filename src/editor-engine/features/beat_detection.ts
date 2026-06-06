// @ts-nocheck
// beat_detection.ts — AI Beat Detection & Timeline Sync using Web Audio API

if (window.EditorApp && window.EditorApp.prototype) {

    /**
     * Analyzes an audio/video clip and detects musical beats using Web Audio API.
     * Places markers at beat positions for easy cutting.
     */
    window.EditorApp.prototype.executeBeatDetection = async function(trackName?: string) {
        this.log("🎵 بدء كشف البيتات (Beat Detection)...");

        // Find audio source clip
        let sourceClip = null;
        let sourceFile = null;

        const audioTrack = this.tracks.find(t => t.type === 'audio');
        const mainTrack  = this.tracks.find(t => t.type === 'main' || t.type === 'video');
        
        const candidateTrack = audioTrack || mainTrack;
        if (!candidateTrack || !candidateTrack.clips.length) {
            this.log("❌ لم يتم العثور على مسار صوتي. أضف مقطعاً صوتياً أو فيديو أولاً.");
            return;
        }

        sourceClip = candidateTrack.clips[0];
        this.log(`📻 تحليل: "${sourceClip.name || 'مقطع صوتي'}"...`);

        try {
            // Get audio buffer from file store or file element
            let arrayBuffer;
            const projectId = (window as any).currentProjectId || 'p43';
            
            // Try IndexedDB first
            const fileFromDB = await this._getFileFromDB(`${projectId}_video`).catch(() => null);
            if (fileFromDB) {
                arrayBuffer = await fileFromDB.arrayBuffer();
                this.log("📂 تحميل الصوت من الذاكرة المحلية...");
            } else if (window.videoFile) {
                arrayBuffer = await window.videoFile.arrayBuffer();
            } else {
                // Fallback: decode from video element
                const videoEl = document.getElementById('preview-video') || document.querySelector('video');
                if (!videoEl || !videoEl.src) {
                    this.log("❌ لا يوجد ملف صوتي. سيتم وضع بيتات تجريبية.");
                    this._placeMockBeats(sourceClip.start, sourceClip.start + (sourceClip.duration || 30));
                    return;
                }
                const resp = await fetch(videoEl.src);
                arrayBuffer = await resp.arrayBuffer();
            }

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.log("⏳ فك تشفير الصوت (Decoding)...");
            
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            this.log(`✅ تم فك التشفير: ${audioBuffer.duration.toFixed(1)}s | ${audioBuffer.sampleRate}Hz | ${audioBuffer.numberOfChannels}ch`);

            // Beat detection algorithm using energy-based onset detection
            const beats = this._detectBeatsFromBuffer(audioBuffer, sourceClip.start || 0);
            
            if (beats.length === 0) {
                this.log("⚠️ لم يتم اكتشاف بيتات واضحة. المقطع قد يكون هادئاً جداً.");
                this._placeMockBeats(sourceClip.start, sourceClip.start + (sourceClip.duration || 30));
                return;
            }

            // Place markers at beat positions
            this.markers = this.markers || [];
            const existingMarkerTimes = new Set(this.markers.map(m => m.time.toFixed(2)));
            let added = 0;
            for (const beatTime of beats) {
                const key = beatTime.toFixed(2);
                if (!existingMarkerTimes.has(key)) {
                    this.markers.push({ 
                        time: beatTime, 
                        label: `Beat`, 
                        color: '#f59e0b' 
                    });
                    existingMarkerTimes.add(key);
                    added++;
                }
            }

            this.log(`🥁 تم اكتشاف ${beats.length} بيتة! تم إضافة ${added} علامة جديدة.`);
            this.log(`💡 استخدم CTRL+B للقطع عند كل علامة لمزامنة الكليبات مع الموسيقى.`);
            
            this.saveState();
            this.requestRedraw();
            this.commitStateToReact();
            audioCtx.close();

        } catch (err) {
            this.log(`❌ فشل تحليل الصوت: ${err.message}`);
            this.log("⚠️ تطبيق بيتات تجريبية بدلاً من ذلك...");
            this._placeMockBeats(sourceClip.start, sourceClip.start + (sourceClip.duration || 30));
        }
    };

    /**
     * Energy-based beat detection algorithm.
     * Returns array of beat timestamps in seconds (offset by clipStart).
     */
    window.EditorApp.prototype._detectBeatsFromBuffer = function(audioBuffer, clipStart) {
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Window size: ~11.6ms (512 samples at 44100Hz)
        const windowSize = 512;
        const hopSize = 256; // 50% overlap
        
        // Compute energy envelope
        const energies = [];
        for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
            let energy = 0;
            for (let j = 0; j < windowSize; j++) {
                const sample = channelData[i + j];
                energy += sample * sample;
            }
            energies.push(energy / windowSize);
        }

        // Adaptive threshold: local average with multiplier
        const localWindow = 43; // ~0.5s of context
        const threshold = 1.5; // local energy must be 1.5x the average
        const beats = [];
        
        let lastBeatSample = -Infinity;
        const minBeatGap = (sampleRate / hopSize) * 0.3; // min 300ms between beats
        
        for (let i = localWindow; i < energies.length - localWindow; i++) {
            // Local average
            let localSum = 0;
            for (let j = i - localWindow; j <= i + localWindow; j++) {
                localSum += energies[j];
            }
            const localAvg = localSum / (2 * localWindow + 1);
            
            // Peak detection: current energy > threshold * local average
            // AND it's a local maximum (greater than neighbors)
            const isPeak = energies[i] > threshold * localAvg &&
                           energies[i] > energies[i - 1] &&
                           energies[i] > energies[i + 1];
            
            if (isPeak && (i - lastBeatSample) > minBeatGap) {
                const timeInSeconds = (i * hopSize) / sampleRate;
                beats.push(clipStart + timeInSeconds);
                lastBeatSample = i;
            }
        }

        // Limit to reasonable amount (max 200 beats for a 3min song)
        return beats.slice(0, 200);
    };

    /**
     * Place evenly-spaced mock beats when real detection fails.
     */
    window.EditorApp.prototype._placeMockBeats = function(startTime, endTime) {
        const bpm = 120; // assume 120 BPM
        const beatInterval = 60 / bpm;
        this.markers = this.markers || [];
        let added = 0;
        for (let t = startTime; t < endTime; t += beatInterval) {
            this.markers.push({ time: t, label: 'Beat', color: '#f59e0b' });
            added++;
        }
        this.log(`🥁 تم وضع ${added} بيتة تجريبية بمعدل 120 BPM.`);
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
    };

    /**
     * Helper: get file from IndexedDB.
     */
    window.EditorApp.prototype._getFileFromDB = function(key) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('p43_file_store', 1);
            req.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('files')) { resolve(null); return; }
                const tx = db.transaction('files', 'readonly');
                const store = tx.objectStore('files');
                const r = store.get(key);
                r.onsuccess = (ev) => resolve(ev.target.result || null);
                r.onerror = () => resolve(null);
            };
            req.onerror = () => resolve(null);
        });
    };

    /**
     * Cut at every beat marker on a specific track (auto-sync to beat).
     */
    window.EditorApp.prototype.executeBeatSync = function(trackName?: string) {
        const beatMarkers = (this.markers || []).filter(m => m.label === 'Beat');
        if (beatMarkers.length === 0) {
            this.log("❌ لا توجد بيتات. شغّل /beatdetect أولاً.");
            return;
        }
        
        // Find target track
        let targetTrack = trackName 
            ? this.tracks.find(t => t.name === trackName)
            : this.tracks.find(t => t.type === 'video' || t.type === 'main');
            
        if (!targetTrack) {
            this.log("❌ لم يتم إيجاد مسار فيديو. حدد اسم المسار.");
            return;
        }

        this.log(`✂️ قطع المسار "${targetTrack.name}" عند ${beatMarkers.length} بيتة...`);
        
        // Sort by time descending to cut from end to start (avoids index shifting)
        const sortedBeats = [...beatMarkers].sort((a, b) => b.time - a.time);
        
        let cutCount = 0;
        for (const beat of sortedBeats) {
            // Check if there's a clip covering this beat time
            const hasClip = targetTrack.clips.some(c => 
                c.start < beat.time && (c.start + c.duration) > beat.time
            );
            if (hasClip) {
                this.executeCutCommand(beat.time, targetTrack.name);
                cutCount++;
            }
        }
        
        this.log(`✅ تم القطع عند ${cutCount} بيتة!`);
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
    };

    /**
     * Clear all beat markers from the timeline.
     */
    window.EditorApp.prototype.executeClearBeats = function() {
        const before = (this.markers || []).length;
        this.markers = (this.markers || []).filter(m => m.label !== 'Beat');
        const after = this.markers.length;
        this.log(`🗑️ تم حذف ${before - after} علامة بيتة.`);
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
    };
}
