// @ts-nocheck
/**
 * 📤 XML Exporter (xml_exporter.js)
 * الكود النهائي المختصر (Trust the Engine Mode).
 * 🔧 FIX: Removed Tolerance Bug. Now uses Frame-Center Sampling for precise detection.
 * 🔧 FIX: Correctly generates keyframes when images start mid-clip.
 * 🔧 FIX: Matches WebGL Preview logic exactly (No black bars).
 * 🔥 HOTFIX: Pre-load images to ensure correct dimensions.
 * ✨ NEW: Exports Position, Rotation, and Full Opacity.
 * 🐛 BUG FIX: V4 (and V1) properties are now correctly exported (Universal Track Logic).
 */

window.EditorApp.prototype.downloadXML = async function() {
    this.log("⏳ Exporting Project 43 to XML (Premiere Pro Optimized)...");
    
    // إعدادات السيكونس الأساسية
    const FPS = 30;
    const timebase = 30;
    const ntsc = "TRUE";
    
    // أبعاد المشروع (Project Dimensions)
    let projectW = 1052; 
    let projectH = 1920;

    // تحديد أبعاد المشروع من الفيديو الأساسي لضبط الهيدر فقط
    const sourceVideo = document.getElementById('source-video-a');
    if (sourceVideo && sourceVideo.videoWidth && sourceVideo.videoHeight) {
        projectW = sourceVideo.videoWidth;
        projectH = sourceVideo.videoHeight;
        
        // تصحيح: فرض الوضع الطولي (Vertical) إذا كان الفيديو بالعرض (لتيك توك)
        if (projectW > projectH) {
             projectW = 1052;
             projectH = 1920;
        }
        this.log(`📏 XML Sequence Resolution: ${projectW}x${projectH}`);
    }

    const getFrame = (sec) => Math.round(sec * FPS);
    const formatTime = (seconds) => {
        const date = new Date(0); 
        date.setSeconds(seconds);
        return date.toISOString().substr(11, 8); 
    };

    // =========================================================
    // 🟢 1. تحديد التراكات
    // =========================================================
    let aiVideoType = 'normal'; 
    
    // Robust Track Finding
    const trackBg = this.tracks.find(t => t.id === 2 || t.name === 'V1' || t.name === 'Main');
    const trackImages = this.tracks.find(t => t.id === 3 || t.name === 'V2' || t.name === 'Overlay'); // B-Roll
    const trackAi = this.tracks.find(t => t.id === 4 || t.name === 'V3' || t.role === 'speaker' || (t.name && t.name.includes('AI'))); // Speaker
    
    // 🔥 PRE-LOAD IMAGES FOR DIMENSION CHECK (Fixes the Zoom Bug) 🔥
    // نقوم بفحص كل التراكات المرئية لضمان تحميل أبعاد الصور، ليس فقط V2
    const allVisualClips = [];
    this.tracks.forEach(t => {
        if (t.type === 'video' || t.type === 'overlay' || t.type === 'main') {
            t.clips.forEach(c => {
                if (c.type === 'image') allVisualClips.push(c);
            });
        }
    });

    if (allVisualClips.length > 0) {
        const missingImages = allVisualClips.filter(clip => 
            (!this.imgCache || !this.imgCache.has(clip.src) || !this.imgCache.get(clip.src).naturalWidth)
        );

        if (missingImages.length > 0) {
            this.log(`⏳ Pre-loading ${missingImages.length} images for accurate scaling...`);
            if (!this.imgCache) this.imgCache = new Map();

            await Promise.all(missingImages.map(clip => new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "Anonymous"; // Crucial for canvas/dimensions
                img.src = clip.src;
                img.onload = () => {
                    this.imgCache.set(clip.src, img);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load dimensions for XML: ${clip.src}`);
                    resolve(); 
                };
            })));
        }
    }

    if (trackAi && trackAi.clips.length > 0) {
        const isTransparent = confirm(
            "🤖 AI Video Export Settings:\n" +
            "تم اكتشاف ملفات في تراك الذكاء الاصطناعي. كيف تريد تصديرها في الـ XML؟\n\n" +
            "✅ اضغط OK  <-  لخلفية شفافة (Transparent - .mov)\n" +
            "❎ اضغط Cancel  <-  لخلفية خضراء (Green Screen - .mp4)"
        );
        aiVideoType = isTransparent ? 'transparent' : 'greenscreen';
    }

    // =========================================================
    // 🟢 2. تنظيف أسماء الملفات
    // =========================================================
    const getCleanFilename = (clip, trackId) => {
        let name = clip.name || "unknown.mp4";
        
        if (this.assetsList && this.assetsList.length > 0) {
            const originalAsset = this.assetsList.find(a => a.src === clip.src);
            if (originalAsset && originalAsset.name) name = originalAsset.name;
        }

        try { name = decodeURIComponent(name); } catch(e) {}
        name = name.split('/').pop().split('\\').pop().split('?')[0]; 
        name = name.replace(/\s*\[.*?\]/g, '').trim();

        const lastDot = name.lastIndexOf('.');
        let baseName = lastDot !== -1 ? name.substring(0, lastDot) : name;
        let extension = lastDot !== -1 ? name.substring(lastDot) : '';

        if (!extension || extension.length < 2) {
            extension = (clip.type === 'image' ? '.jpg' : '.mp4');
        }

        const isAiTrack = (trackAi && trackId === trackAi.id);
        if (isAiTrack) {
            return baseName + "_ai" + (aiVideoType === 'transparent' ? ".mov" : ".mp4");
        }
        
        return baseName + extension;
    };

    const usedFiles = new Map(); 
    const assetDownloadMap = new Map(); 
    let hasSubtitles = false;

    // =========================================================
    // 🎥 3. Core Motion Logic (Direct Properties)
    // =========================================================
    const generateMotionFilter = (clip, track) => {
        const isAiTrack = (trackAi && track.id === trackAi.id);
        
        let finalScaleKeys = [];
        let finalCenterKeys = [];
        let finalRotationKeys = []; 

        // 🔥 FIX: Logic restructuring
        // إذا كان التراك هو AI Track -> طبق منطق الساندوتش
        // إذا كان أي تراك آخر (V1, V2, V4...) -> طبق المنطق القياسي (Standard Transform)
        
        // --- A. AI Track (Speaker) - Sandwich Logic ---
        if (isAiTrack) {
            let targetScale = 50;
            let targetX_px = projectW * 0.333; 
            let targetY_px = projectH * 0.256; 

            if (clip.sandwich) {
                const s = clip.sandwich._rawScale !== undefined ? clip.sandwich._rawScale : clip.sandwich.scale;
                const x = clip.sandwich._rawOffsetX !== undefined ? clip.sandwich._rawOffsetX : clip.sandwich.offsetX;
                const y = clip.sandwich._rawOffsetY !== undefined ? clip.sandwich._rawOffsetY : clip.sandwich.offsetY;

                if (s !== undefined) targetScale = parseFloat(s);
                if (x !== undefined) targetX_px = parseFloat(x);
                if (y !== undefined) targetY_px = parseFloat(y);
            }

            const normX = targetX_px / projectW;
            const normY = targetY_px / projectH;

            const SCALE_NORMAL = 100; 
            const SCALE_SMALL = targetScale;
            const POS_NORMAL = { horiz: 0, vert: 0 };
            const POS_CORNER = { horiz: normX, vert: normY }; 
            const TRANSITION = 15; 

            let criticalPoints = new Set([0, Math.round((clip.end - clip.start) * FPS)]);
            if (trackImages && trackImages.clips.length > 0) {
                trackImages.clips.forEach(img => {
                    let s = Math.max(clip.start, img.start);
                    let e = Math.min(clip.end, img.end);
                    if (e > s) {
                        criticalPoints.add(Math.round((s - clip.start) * FPS));
                        criticalPoints.add(Math.round((e - clip.start) * FPS));
                    }
                });
            }
            
            const durationFrames = Math.round((clip.end - clip.start) * FPS);
            const sortedPoints = Array.from(criticalPoints)
                .filter(p => p >= 0 && p <= durationFrames)
                .sort((a,b) => a - b);

            const hasImageAt = (relFrame) => {
                const time = clip.start + (relFrame / FPS) + (0.5 / FPS); 
                return trackImages.clips.some(img => time >= img.start && time < img.end);
            };

            const startHasImage = hasImageAt(0);
            if (startHasImage) {
                finalScaleKeys.push({ frame: 0, val: SCALE_SMALL });
                finalCenterKeys.push({ frame: 0, ...POS_CORNER });
            } else {
                finalScaleKeys.push({ frame: 0, val: SCALE_NORMAL });
                finalCenterKeys.push({ frame: 0, ...POS_NORMAL });
            }

            for (let i = 0; i < sortedPoints.length; i++) {
                const t = sortedPoints[i];
                if (t === 0) continue; 

                const hasImage = hasImageAt(t); 
                const hadImage = hasImageAt(t - 1); 

                if (hasImage && !hadImage) {
                    finalScaleKeys.push({ frame: t, val: SCALE_NORMAL });
                    finalCenterKeys.push({ frame: t, ...POS_NORMAL });
                    
                    const endT = Math.min(t + TRANSITION, durationFrames);
                    finalScaleKeys.push({ frame: endT, val: SCALE_SMALL });
                    finalCenterKeys.push({ frame: endT, ...POS_CORNER });
                } 
                else if (!hasImage && hadImage) {
                    const startT = Math.max(0, t - TRANSITION);
                    finalScaleKeys.push({ frame: startT, val: SCALE_SMALL });
                    finalCenterKeys.push({ frame: startT, ...POS_CORNER });
                    
                    finalScaleKeys.push({ frame: t, val: SCALE_NORMAL });
                    finalCenterKeys.push({ frame: t, ...POS_NORMAL });
                }
            }
            finalRotationKeys.push({ frame: 0, val: 0 });
        }
        
        // 🔥🔥🔥 B. All Other Tracks (V1, V2, V4...) - SMART ASPECT FILL + FULL TRANSFORMS 🔥🔥🔥
        // هذا الجزء الآن يطبق على أي تراك ليس هو تراك الذكاء الاصطناعي
        else {
            // 1. Determine Dimensions
            let srcW = 1920; 
            let srcH = 1080;
            
            if (clip.type === 'image' && this.imgCache && this.imgCache.has(clip.src)) {
                const img = this.imgCache.get(clip.src);
                if (img.naturalWidth) {
                    srcW = img.naturalWidth;
                    srcH = img.naturalHeight;
                }
            } else if (clip.type === 'video') {
                 const player = this.players ? this.players.find(p => p.getAttribute('src') === clip.src) : null;
                 if(player && player.videoWidth) {
                     srcW = player.videoWidth;
                     srcH = player.videoHeight;
                 }
            }

            // 2. Calculate Cover Ratio
            const scaleX = projectW / srcW;
            const scaleY = projectH / srcH;
            const coverRatio = Math.max(scaleX, scaleY);

            // 3. Convert to Premiere Scale
            const userScaleMult = (clip.properties.scale || 100) / 100;
            const finalScale = (coverRatio * 100) * userScaleMult;
            
            const userX = clip.properties.positionX || 0;
            const userY = clip.properties.positionY || 0;
            
            const userRot = clip.properties.rotation || 0;

            finalScaleKeys.push({ frame: 0, val: finalScale });
            finalCenterKeys.push({ frame: 0, horiz: userX / projectW, vert: userY / projectH });
            finalRotationKeys.push({ frame: 0, val: userRot });
        }

        const filterDupes = (arr) => {
            arr.sort((a,b) => a.frame - b.frame);
            return arr.filter((item, index, self) => 
                index === 0 || item.frame !== self[index-1].frame
            );
        };

        finalScaleKeys = filterDupes(finalScaleKeys);
        finalCenterKeys = filterDupes(finalCenterKeys);
        finalRotationKeys = filterDupes(finalRotationKeys);

        let scaleParamsXML = "";
        let kfsScale = "";
        finalScaleKeys.forEach(kf => {
             kfsScale += `<keyframe><when>${kf.frame}</when><value>${kf.val}</value></keyframe>`;
        });
        scaleParamsXML = `<parameter><parameterid>scale</parameterid><name>Scale</name><valuemin>0</valuemin><valuemax>1000</valuemax>${kfsScale}</parameter>`;

        let centerParamsXML = "";
        let kfsCenter = "";
        finalCenterKeys.forEach(kf => {
             kfsCenter += `<keyframe><when>${kf.frame}</when><value><horiz>${kf.horiz.toFixed(5)}</horiz><vert>${kf.vert.toFixed(5)}</vert></value></keyframe>`;
        });
        centerParamsXML = `<parameter><parameterid>center</parameterid><name>Center</name>${kfsCenter}</parameter>`;

        let rotationParamsXML = "";
        let kfsRotation = "";
        let initialRot = 0;
        if(finalRotationKeys.length > 0) initialRot = finalRotationKeys[0].val;

        finalRotationKeys.forEach(kf => {
             kfsRotation += `<keyframe><when>${kf.frame}</when><value>${kf.val}</value></keyframe>`;
        });
        
        rotationParamsXML = `<parameter authoringApp="PremierePro"><parameterid>rotation</parameterid><name>Rotation</name><valuemin>-8640</valuemin><valuemax>8640</valuemax><value>${initialRot}</value>${kfsRotation}</parameter>`;

        return `<filter><effect><name>Basic Motion</name><effectid>basic</effectid>${scaleParamsXML}${centerParamsXML}${rotationParamsXML}</effect></filter>`;
    };

    // 🔥 Generate Opacity Filter (Premiere Pro Compatible)
    const generateOpacityFilter = (clip) => {
        let keyframesXML = "";
        let staticValue = 100;

        if (clip.properties && clip.properties.opacity !== undefined) {
            staticValue = clip.properties.opacity;
        }

        if (clip.keyframes && clip.keyframes.opacity && clip.keyframes.opacity.length > 0) {
            const sortedKfs = [...clip.keyframes.opacity].sort((a,b) => a.t - b.t);
            sortedKfs.forEach(k => {
                const frame = Math.round(k.t * FPS);
                keyframesXML += `<keyframe><when>${frame}</when><value>${k.v}</value></keyframe>`;
            });
        } 
        else {
            if (staticValue >= 100) return ""; 
            keyframesXML = `<value>${staticValue}</value>`;
        }

        return `
        <filter>
            <effect>
                <name>Opacity</name>
                <effectid>opacity</effectid>
                <effectcategory>motion</effectcategory>
                <effecttype>motion</effecttype>
                <mediatype>video</mediatype>
                <pproBypass>false</pproBypass>
                <parameter authoringApp="PremierePro">
                    <parameterid>opacity</parameterid>
                    <name>opacity</name>
                    <valuemin>0</valuemin>
                    <valuemax>100</valuemax>
                    ${keyframesXML}
                </parameter>
            </effect>
        </filter>`;
    };

    // =========================================================
    // 🔄 4. إنشاء XML للتراك
    // =========================================================
    const createTrackXML = (track, isAudio = false) => {
        if (!track || track.type === 'subtitle') {
            if(track && track.type === 'subtitle') hasSubtitles = true;
            return `<track></track>`;
        }
        
        if (!track.clips || !track.clips.length) return `<track></track>`;
        
        let clipsXML = "";
        
        track.clips.forEach((clip, idx) => {
            const startF = getFrame(clip.start);
            const endF = getFrame(clip.end);
            const sourceInF = getFrame(clip.sourceIn || 0);
            const sourceOutF = sourceInF + (endF - startF);
            
            const filename = getCleanFilename(clip, track.id);
            
            if (clip.src) {
                const isAiFile = (trackAi && track.id === trackAi.id);
                assetDownloadMap.set(filename, { src: clip.src, isAI: isAiFile, originalName: filename });
            }

            const usageInfo = `${formatTime(clip.start)} -> ${formatTime(clip.end)}`;
            if (!usedFiles.has(filename)) usedFiles.set(filename, [usageInfo]);
            else usedFiles.get(filename).push(usageInfo);

            let filtersXML = "";
            
            // 1. Motion Filter (Scale, Pos, Rot) - Includes Sandwich Logic
            if (!isAudio) {
                filtersXML += generateMotionFilter(clip, track);
            }

            // 2. Opacity Filter (Supports Keyframes & Static < 100)
            if (!isAudio) {
                filtersXML += generateOpacityFilter(clip);
            }

            const fileId = `file-${isAudio ? 'a' : 'v'}-${track.id}-${idx}`; 
            const clipId = `clip-${isAudio ? 'a' : 'v'}-${track.id}-${idx}`;

            let mediaTypeXML = isAudio 
                ? `<audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>2</channelcount></audio>`
                : `<video><samplecharacteristics><width>${projectW}</width><height>${projectH}</height>${(trackAi && track.id === trackAi.id && aiVideoType === 'transparent') ? '<alpha>straight</alpha>' : ''}</samplecharacteristics></video>`;

            const fileNode = `
                    <file id="${fileId}">
                        <name>${filename}</name>
                        <pathurl>${filename}</pathurl>
                        <rate><timebase>${timebase}</timebase></rate>
                        <media>${mediaTypeXML}</media>
                    </file>`;

            const alphaTypeTag = (trackAi && track.id === trackAi.id && aiVideoType === 'transparent') ? '<alphatype>straight</alphatype>' : '';

            clipsXML += `
                <clipitem id="${clipId}">
                    <name>${filename}</name>
                    <rate><timebase>${timebase}</timebase><ntsc>${ntsc}</ntsc></rate>
                    <start>${startF}</start>
                    <end>${endF}</end>
                    <in>${sourceInF}</in>
                    <out>${sourceOutF}</out>
                    ${alphaTypeTag}
                    ${fileNode}
                    ${filtersXML}
                    ${isAudio ? '<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>' : ''}
                </clipitem>`;
        });

        return `<track>${clipsXML}</track>`;
    };

    // =========================================================
    // 🧱 5. التجميع النهائي
    // =========================================================
    
    // 🔥 FIX: تأكدنا من تصدير التراكات بالترتيب الصحيح
    // الـ V1 و V2 و V4 كلها ستمر الآن عبر "المنطق القياسي" وتصدر بشكل صحيح
    const v1XML = createTrackXML(trackBg); 
    const v2XML = createTrackXML(trackImages); 
    const v3XML = createTrackXML(trackAi); 
    
    // محاولة العثور على V4 بشكل مرن
    const trackV4 = this.tracks.find(t => t.id === 5 || t.name === 'V4' || (t.name && t.name.startsWith('V4')));
    const v4XML = createTrackXML(trackV4 || {clips:[]}); 

    let a1XML = "<track></track>";
    const audioTrack = this.tracks.find(t => t.type === 'audio');
    if (audioTrack) a1XML = createTrackXML(audioTrack, true);

    const finalXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
<sequence>
    <name>Project_43_Final_Props</name>
    <rate><timebase>${timebase}</timebase><ntsc>${ntsc}</ntsc></rate>
    <media>
        <video>
            <format>
                <samplecharacteristics>
                    <rate><timebase>${timebase}</timebase><ntsc>${ntsc}</ntsc></rate>
                    <width>${projectW}</width>
                    <height>${projectH}</height>
                    <pixelaspectratio>square</pixelaspectratio>
                </samplecharacteristics>
            </format>
            ${v1XML} 
            ${v2XML} 
            ${v3XML} 
            ${v4XML} 
        </video>
        <audio>
            ${a1XML} 
        </audio>
    </media>
</sequence>
</xmeml>`;

    // =========================================================
    // 💾 6. التنزيل
    // =========================================================
    
    let readmeContent = "Project 43 - XML Export\n";
    usedFiles.forEach((usages, filename) => { readmeContent += `📄 ${filename}\n`; });

    const exportModalContent = document.querySelector('#export-modal > div');
    const existingList = document.getElementById('export-assets-list');
    if(existingList) existingList.remove();

    if (assetDownloadMap.size > 0) {
        const assetsContainer = document.createElement('div');
        assetsContainer.id = 'export-assets-list';
        assetsContainer.className = 'mb-4 border-t border-gray-700 pt-4';
        let html = `<div class="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar bg-gray-900/50 p-2 rounded border border-gray-700">`;
        assetDownloadMap.forEach((data, filename) => {
             html += `
                <div class="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700">
                    <span class="text-xs text-gray-200 truncate font-mono">${filename}</span>
                    <button onclick="window.app.downloadAsset('${data.src}', '${filename}')" class="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 py-1 rounded">Download</button>
                </div>`;
        });
        html += `</div>`;
        assetsContainer.innerHTML = html;
        if(exportModalContent) {
            exportModalContent.insertBefore(assetsContainer, exportModalContent.lastElementChild);
        }
    }

    if(document.getElementById('export-modal')) {
        document.getElementById('export-modal').classList.remove('hidden');
    }

    const blobXML = new Blob([finalXML], { type: 'text/xml' });
    const urlXML = URL.createObjectURL(blobXML);

    const linkXML = document.getElementById('download-link');
    if(linkXML) {
        linkXML.href = urlXML;
        linkXML.download = `Project_43_Final_Props.xml`;
        linkXML.click();
        this.log("✅ XML Generated & Downloaded.");
    } else {
        const tempLink = document.createElement('a');
        tempLink.href = urlXML;
        tempLink.download = `Project_43_Final_Props.xml`;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
    }
};

window.EditorApp.prototype.downloadAsset = async function(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
