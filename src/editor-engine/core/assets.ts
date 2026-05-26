// @ts-nocheck
// assets.js
/**
 * 📂 Assets Manager (assets.js)
 * ترتيب التراكات المنطقي لحل مشكلة الطبقات.
 * T1 (Top) -> V4 -> V3 (Speaker) -> V2 (BG) -> V1 (Ref)
 */

window.EditorApp.prototype.assetsList = [
    { id: 'a1', name: 'bg.png', type: 'image', src: '/bg.png' },
    { id: 'a2', name: 'Graph.png', type: 'image', src: 'https://placehold.co/800x450/10b981/fff?text=Graph+Data' },
    { id: 'a4', name: 'Chill_Beat.mp3', type: 'audio', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }
];

function parseSRTTime(timeString) {
    if(!timeString) return 0;
    const parts = timeString.trim().split(':');
    const secondsParts = parts[2].split(',');
    return (parseInt(parts[0], 10) * 3600) + (parseInt(parts[1], 10) * 60) + parseInt(secondsParts[0], 10) + (parseInt(secondsParts[1], 10) / 1000);
}

window.parseSRTToClips = function(srtData) {
    const clips = [];
    const blocks = srtData.replace(/\r\n/g, '\n').split('\n\n'); 
    blocks.forEach((block, index) => {
        const lines = block.split('\n').filter(line => line.trim() !== '');
        if (lines.length >= 3) {
            const timeLineIndex = lines.findIndex(l => l.includes('-->'));
            if (timeLineIndex !== -1) {
                const timeLine = lines[timeLineIndex];
                const times = timeLine.split(' --> ');
                const start = parseSRTTime(times[0]);
                const end = parseSRTTime(times[1]);
                clips.push(new Clip(`sub_${Date.now()}_${index}`, lines.slice(timeLineIndex + 1).join(' '), start, end - start, 'text', lines.slice(timeLineIndex + 1).join(' ')));
            }
        }
    });
    return clips;
}

window.EditorApp.prototype.initProject = async function(file, mode, autoTranscribe) {
    this.init(); 
    const videoUrl = URL.createObjectURL(file);
    const fileName = file.name;

    // Await video duration to avoid hardcoding to 100s
    let defaultDuration = 100;
    try {
        defaultDuration = await new Promise((resolve) => {
            const el = document.createElement('video');
            el.src = videoUrl;
            el.onloadedmetadata = () => resolve(el.duration || 100);
            el.onerror = () => resolve(100);
        });
    } catch(e) {
        console.error("Failed to read video duration", e);
    }

    const newAsset = { id: `main_vid_${Date.now()}`, name: fileName, type: 'video', src: videoUrl };
    this.assetsList.push(newAsset);
    
    // Sync ALL assets (including pre-existing defaults) with React Store
    try {
        const { useEditorStore } = await import('../../store/useEditorStore');
        this.assetsList.forEach(a => useEditorStore.getState().addAsset(a));
    } catch(e) {
        console.error('Failed to sync assets to store:', e);
    }
    
    this.log(`🚀 Starting Project: ${mode.toUpperCase()} Mode`);

    // --- TRACK LAYOUT (Top to Bottom) ---
    
    // 1. T1: Transcript
    const tSub = new Track(10, "T1: Transcript", "subtitle", "bg-yellow-600", "subtitle");
    this.tracks.push(tSub);

    // 2. V4: Frames
    const tFrame = new Track(9, "V4: Frames & HUD", "overlay", "bg-blue-600", "overlay");
    this.tracks.push(tFrame);

    if (mode === 'sandwich') {
        // 🔥 3. V3: AI Speaker (المسار الذكي)
        // Role: 'speaker' هو المفتاح لتفعيل Sandwich Mode
        const tAiVideo = new Track(4, "V3: AI Speaker", "video", "bg-blue-600", "speaker");
        const aiClip = new Clip("c_v_ai", `${fileName} [AI]`, 0, defaultDuration, "video", videoUrl);
        
        // إعدادات البداية
        aiClip.aiSegmentation = { enabled: true, loading: false }; 
        aiClip.sandwich = { scale: 100, offsetX: 0, offsetY: 0 }; 
        
        tAiVideo.addClip(aiClip);
        this.tracks.push(tAiVideo);

        if (this.initAIModel) setTimeout(() => this.initAIModel(), 500);

        // 4. V2: Backgrounds (تظهر خلف المتحدث)
        const tOverlay = new Track(3, "V2: Backgrounds", "overlay", "bg-blue-600", "overlay");
        tOverlay.addClip(new Clip("c_bg1", "bg.png", 0, 10, "image", "/bg.png"));
        this.tracks.push(tOverlay);

        // 5. V1: Source (مرجع فقط)
        const tVideo = new Track(2, "V1: Source Footage", "main", "bg-blue-600", "main");
        tVideo.addClip(new Clip("c_v_main", `${fileName} [Raw]`, 0, defaultDuration, "video", videoUrl));
        // tVideo.isMuted = true; 
        this.tracks.push(tVideo);

    } else {
        const tVideo = new Track(2, "V1: Main Video", "video", "bg-blue-600", "main");
        tVideo.addClip(new Clip("c_v_main", fileName, 0, defaultDuration, "video", videoUrl));
        this.tracks.push(tVideo);
    }

    // A1: Audio
    const tAudio = new Track(1, "A1: Master Audio", "audio", "bg-green-600", "audio");
    tAudio.addClip(new Clip("c_a_main", `${fileName} [Audio]`, 0, defaultDuration, "audio", videoUrl));
    this.tracks.push(tAudio);

    // Sync Tracks with React Store
    try {
        const { useEditorStore } = await import('../../store/useEditorStore');
        this.tracks.forEach(track => {
            useEditorStore.getState().addTrack(track);
        });
    } catch(e) {
        console.error('Failed to sync tracks to store:', e);
    }

    this.renderAssetsLibrary();
    this.setupFileUpload();
    // FIX #3: Rename tracks from "V1: Main Video" → "V1" immediately so
    // CMD commands can find them by short name from the very first frame.
    if (this.refreshProjectTopology) this.refreshProjectTopology();
    this.renderAll();

    if (autoTranscribe && window.aiManager) {
        this.log("⏳ Starting AI Transcription...");
        setTimeout(() => window.aiManager.generateSubtitles(file), 1000);
    } else {
        this.log("✅ Project Ready.");
    }
};

window.EditorApp.prototype.renderAssetsLibrary = function() {
    // DOM logic has been migrated to React (AssetsPanel.tsx)
};

window.EditorApp.prototype.setupFileUpload = function() {
    const input = document.getElementById('file-upload');
    if(input) {
        input.onchange = async (e) => {
            const { useEditorStore } = await import('../../store/useEditorStore').catch(() => ({ useEditorStore: null }));
            Array.from(e.target.files).forEach(f => {
                const type = f.type.startsWith('image') ? 'image' : (f.type.startsWith('audio') ? 'audio' : 'video');
                const asset = { id: `loc_${Date.now()}_${Math.random()}`, name: f.name, type, src: URL.createObjectURL(f) };
                this.assetsList.push(asset);
                // Sync with Zustand store
                if (useEditorStore) useEditorStore.getState().addAsset(asset);
            });
            this.renderAssetsLibrary();
        };
    }
};
