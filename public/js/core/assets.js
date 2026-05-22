// assets.js
/**
 * 📂 Assets Manager (assets.js)
 * ترتيب التراكات المنطقي لحل مشكلة الطبقات.
 * T1 (Top) -> V4 -> V3 (Speaker) -> V2 (BG) -> V1 (Ref)
 */

EditorApp.prototype.assetsList = [
    { id: 'a1', name: 'Intro_Slide.jpg', type: 'image', src: 'https://placehold.co/800x450/8b5cf6/fff?text=Slide+1' },
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

EditorApp.prototype.initProject = async function(file, mode, autoTranscribe) {
    this.init(); 
    const videoUrl = URL.createObjectURL(file);
    const fileName = file.name;
    const defaultDuration = 100;

    this.assetsList.push({ id: `main_vid_${Date.now()}`, name: fileName, type: 'video', src: videoUrl });
    this.log(`🚀 Starting Project: ${mode.toUpperCase()} Mode`);

    // --- TRACK LAYOUT (Top to Bottom) ---
    
    // 1. T1: Transcript
    const tSub = new Track(10, "T1: Transcript", "subtitle", "bg-orange-500", "subtitle");
    this.tracks.push(tSub);

    // 2. V4: Frames
    const tFrame = new Track(9, "V4: Frames & HUD", "overlay", "bg-indigo-500", "overlay");
    this.tracks.push(tFrame);

    if (mode === 'sandwich') {
        // 🔥 3. V3: AI Speaker (المسار الذكي)
        // Role: 'speaker' هو المفتاح لتفعيل Sandwich Mode
        const tAiVideo = new Track(4, "V3: AI Speaker", "video", "bg-pink-600", "speaker");
        const aiClip = new Clip("c_v_ai", `${fileName} [AI]`, 0, defaultDuration, "video", videoUrl);
        
        // إعدادات البداية
        aiClip.aiSegmentation = { enabled: true, loading: false }; 
        aiClip.sandwich = { scale: 50, offsetX: 0, offsetY: 0 }; 
        
        tAiVideo.addClip(aiClip);
        this.tracks.push(tAiVideo);

        if (this.initAIModel) setTimeout(() => this.initAIModel(), 500);

        // 4. V2: Backgrounds (تظهر خلف المتحدث)
        const tOverlay = new Track(3, "V2: Backgrounds", "overlay", "bg-purple-600", "overlay");
        tOverlay.addClip(new Clip("c_bg1", "Intro_Slide.jpg", 0, 10, "image", this.assetsList[0].src));
        this.tracks.push(tOverlay);

        // 5. V1: Source (مرجع فقط)
        const tVideo = new Track(2, "V1: Source Footage", "main", "bg-slate-700", "main");
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

    this.renderAssetsLibrary();
    this.setupFileUpload();
    this.renderAll();

    if (autoTranscribe && window.aiManager) {
        this.log("⏳ Starting AI Transcription...");
        setTimeout(() => window.aiManager.generateSubtitles(file), 1000);
    } else {
        this.log("✅ Project Ready.");
    }
};

EditorApp.prototype.renderAssetsLibrary = function() {
    const grid = document.getElementById('assets-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this.assetsList.forEach(asset => {
        const item = document.createElement('div');
        item.className = "asset-item group relative aspect-square bg-gray-900 rounded-lg border border-gray-700 overflow-hidden cursor-grab hover:border-primary transition-colors";
        item.draggable = true;
        item.ondragstart = (e) => { e.dataTransfer.setData('application/json', JSON.stringify(asset)); item.classList.add('dragging'); };
        item.ondragend = () => { item.classList.remove('dragging'); };
        
        let content = asset.type === 'image' 
            ? `<img src="${asset.src}" class="w-full h-full object-cover opacity-70 group-hover:opacity-100 pointer-events-none">`
            : `<div class="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 pointer-events-none"><i class="fa-solid fa-${asset.type === 'audio' ? 'music' : 'video'} text-2xl"></i></div>`;
        
        item.innerHTML = `${content}<div class="absolute bottom-0 w-full bg-black/80 text-[9px] p-1 text-center text-gray-300 truncate pointer-events-none">${asset.name}</div>`;
        grid.appendChild(item);
    });
};

EditorApp.prototype.setupFileUpload = function() {
    const input = document.getElementById('file-upload');
    if(input) {
        input.onchange = (e) => {
            Array.from(e.target.files).forEach(f => {
                const type = f.type.startsWith('image') ? 'image' : (f.type.startsWith('audio') ? 'audio' : 'video');
                this.assetsList.push({ id: `loc_${Date.now()}`, name: f.name, type: type, src: URL.createObjectURL(f) });
            });
            this.renderAssetsLibrary();
        };
    }
};