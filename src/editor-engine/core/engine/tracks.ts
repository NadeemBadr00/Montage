// @ts-nocheck
import { Track } from '../../models/Track';
import { useEditorStore } from '../../../store/useEditorStore';

export const injectEngineTracks = () => {
    window.EditorApp.prototype.refreshProjectTopology = function() {
        if (!this.tracks) return;

        const videoTracks = this.tracks.filter((t: any) => t.type === 'video' || t.type === 'main' || t.type === 'overlay');
        const audioTracks = this.tracks.filter((t: any) => t.type === 'audio');
        const subTracks = this.tracks.filter((t: any) => t.type === 'subtitle');

        let vCurrent = videoTracks.length; 
        videoTracks.forEach((track: any) => {
            track.name = `V${vCurrent}`;
            track._topoIndex = vCurrent;
            track._topoType = 'v';
            vCurrent--;
        });

        let tCurrent = subTracks.length;
        subTracks.forEach((track: any) => {
            track.name = `T${tCurrent}`;
            track._topoIndex = tCurrent;
            track._topoType = 't';
            tCurrent--;
        });

        let aCount = 1;
        audioTracks.forEach((track: any) => {
            track.name = `A${aCount}`;
            track._topoIndex = aCount;
            track._topoType = 'a';
            aCount++;
        });

        let maxEndTime = 0;
        this.tracks.forEach((track: any) => {
            const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
            sortedClips.forEach((clip: any, index: number) => {
                const clipIndex = index + 1;
                clip.name = `${clipIndex}${track._topoType}${track._topoIndex}`;
                
                const clipEnd = clip.start + clip.duration;
                if (clipEnd > maxEndTime) {
                    maxEndTime = clipEnd;
                }
            });
        });
        
        // Dynamically update project duration based on the last clip's end time
        // Minimum 1 second if timeline is empty, so user has space to work.
        this.duration = Math.max(1, maxEndTime);
        
        // Ensure playback doesn't get stuck past the new duration
        if (this.currentTime > this.duration) {
            this.currentTime = this.duration;
            if (this.updatePlayheadPosition) this.updatePlayheadPosition();
        }
        
        // Sync duration to Zustand store
        if (window.useEditorStore) {
            window.useEditorStore.setState({ duration: this.duration });
        }
    };

    window.EditorApp.prototype.handleSmartTrackInsertion = function(index: number) {
        const prevTrack = this.tracks[index - 1];
        const nextTrack = this.tracks[index];

        let newType = 'video';
        let ambiguous = false;

        if (prevTrack && prevTrack.type === 'audio') {
            newType = 'audio';
        }
        else if (nextTrack && nextTrack.type === 'subtitle') {
            newType = 'subtitle'; 
        }
        else if (prevTrack && prevTrack.type === 'subtitle' && nextTrack && nextTrack.type !== 'subtitle') {
            ambiguous = true;
            this.showTrackChoiceModal(index, 'subtitle_video');
            return;
        }
        else if (prevTrack && (prevTrack.type === 'video' || prevTrack.type === 'overlay' || prevTrack.type === 'main') && 
                 nextTrack && nextTrack.type === 'audio') {
            ambiguous = true;
            this.showTrackChoiceModal(index, 'video_audio');
            return;
        }
        else {
            newType = 'video';
        }

        if (!ambiguous) {
            this.addNewTrack(newType, index);
        }
    };

    window.EditorApp.prototype.showTrackChoiceModal = function(index: number, mode: string) {
        const modalId = 'track-choice-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = "fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center backdrop-blur-sm";
        
        let btn1: any, btn2: any;
        if (mode === 'subtitle_video') {
            btn1 = { label: 'Transcript Track (T)', type: 'subtitle', icon: 'fa-closed-captioning', color: 'bg-orange-600' };
            btn2 = { label: 'Video Track (V)', type: 'video', icon: 'fa-video', color: 'bg-purple-600' };
        } else {
            btn1 = { label: 'Video Track (V)', type: 'video', icon: 'fa-video', color: 'bg-purple-600' };
            btn2 = { label: 'Audio Track (A)', type: 'audio', icon: 'fa-music', color: 'bg-green-600' };
        }

        modal.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-xl border border-gray-600 shadow-2xl text-center animate-fade-in-up">
                <h3 class="text-white font-bold text-lg mb-4">Choose Track Type</h3>
                <div class="flex gap-4">
                    <button id="choice-btn-1" class="${btn1.color} hover:brightness-110 text-white px-4 py-3 rounded-lg flex flex-col items-center gap-2 w-32 transition-transform hover:scale-105">
                        <i class="fa-solid ${btn1.icon} text-2xl"></i>
                        <span class="text-xs font-bold">${btn1.label}</span>
                    </button>
                    <button id="choice-btn-2" class="${btn2.color} hover:brightness-110 text-white px-4 py-3 rounded-lg flex flex-col items-center gap-2 w-32 transition-transform hover:scale-105">
                        <i class="fa-solid ${btn2.icon} text-2xl"></i>
                        <span class="text-xs font-bold">${btn2.label}</span>
                    </button>
                </div>
                <button id="choice-cancel" class="mt-4 text-gray-400 text-xs hover:text-white underline">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);

        (document.getElementById('choice-btn-1') as any).onclick = () => { this.addNewTrack(btn1.type, index); modal.remove(); };
        (document.getElementById('choice-btn-2') as any).onclick = () => { this.addNewTrack(btn2.type, index); modal.remove(); };
        (document.getElementById('choice-cancel') as any).onclick = () => { modal.remove(); };
    };

    window.EditorApp.prototype.addNewTrack = function(type: string, atIndex: number | null = null, role = 'generic') {
        this.saveState(); 
        const id = Date.now();
        let trackName = "New Track"; 
        let colorClass = "";
        
        if (type === 'video') { colorClass = "bg-blue-600"; } 
        else if (type === 'audio') { colorClass = "bg-green-600"; }
        else if (type === 'subtitle') { colorClass = "bg-yellow-600"; }

        const newTrack = new (window as any).Track(id, trackName, type, colorClass, role);
        
        if (atIndex !== null && atIndex >= 0 && atIndex <= this.tracks.length) {
            this.tracks.splice(atIndex, 0, newTrack);
        } else {
            if (type === 'subtitle') {
                this.tracks.unshift(newTrack); 
            } else if (type === 'video' || type === 'overlay') {
                let lastVidIdx = -1;
                this.tracks.forEach((t: any, i: number) => { if(t.type !== 'audio') lastVidIdx = i; });
                this.tracks.splice(lastVidIdx + 1, 0, newTrack);
            } 
            else { this.tracks.push(newTrack); }
        }

        this.refreshProjectTopology(); 
        this.log(`➕ New Track Added`);
        if (this.renderTracks) this.renderTracks();
        if (this.syncOverlays) this.syncOverlays();
        this.requestRedraw();
        this.commitStateToReact();
    };

    window.EditorApp.prototype.moveTrack = function(sourceTrackId: number, targetTrackId: number) {
        if (sourceTrackId === targetTrackId) return;
        this.saveState();
        const sourceIndex = this.tracks.findIndex((t: any) => t.id == sourceTrackId);
        const targetIndex = this.tracks.findIndex((t: any) => t.id == targetTrackId);
        if (sourceIndex === -1 || targetIndex === -1) return;
        const [movedTrack] = this.tracks.splice(sourceIndex, 1);
        this.tracks.splice(targetIndex, 0, movedTrack);
        this.refreshProjectTopology(); 
        this.log(`🔃 Track Reordered`);
        if (this.renderTracks) this.renderTracks();
        if (this.syncOverlays) this.syncOverlays();
        this.requestRedraw();
        this.commitStateToReact();
    };

    window.EditorApp.prototype.deleteTrack = function(trackId: number) {
        this.saveState(); 
        const index = this.tracks.findIndex((t: any) => t.id === trackId);
        if (index > -1) {
            this.tracks.splice(index, 1);
            this.refreshProjectTopology(); 
            if (this.renderTracks) this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            this.requestRedraw();
            this.commitStateToReact();
        }
    };

    window.EditorApp.prototype.toggleTrackMute = function(trackId: number) {
        const track = this.tracks.find((t: any) => t.id === trackId);
        if(track) {
            track.isMuted = !track.isMuted;
            if(track.isMuted) track.isSolo = false; 
            if (this.renderTracks) this.renderTracks();
            if(this.syncOverlays) this.syncOverlays();
            this.requestRedraw();
            this.commitStateToReact();
        }
    };

    window.EditorApp.prototype.toggleTrackSolo = function(trackId: number) {
        const track = this.tracks.find((t: any) => t.id === trackId);
        if(track) {
            track.isSolo = !track.isSolo;
            if(track.isSolo) track.isMuted = false;
            if (this.renderTracks) this.renderTracks();
            if(this.syncOverlays) this.syncOverlays();
            this.requestRedraw();
            this.commitStateToReact();
        }
    };
};
