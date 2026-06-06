// @ts-nocheck
import { Track } from '../../models/Track';
import { Clip } from '../../models/Clip';
import { useEditorStore } from '../../../store/useEditorStore';

export const injectEngineState = () => {
    window.EditorApp.prototype.saveState = function() {
        if (!this.history) this.history = [];
        if (!this.redoStack) this.redoStack = [];
        const state = JSON.stringify(this.tracks);
        this.history.push(state);
        if (this.history.length > this.maxHistory) this.history.shift();
        this.redoStack = []; 
    };

    window.EditorApp.prototype.undo = function() {
        if (this.history.length === 0) return;
        this.redoStack.push(JSON.stringify(this.tracks));
        this.restoreState(this.history.pop());
        this.log("↪️ Undone");
    };

    window.EditorApp.prototype.redo = function() {
        if (this.redoStack.length === 0) return;
        this.history.push(JSON.stringify(this.tracks));
        this.restoreState(this.redoStack.pop());
        this.log("↪️ Redone");
    };

    window.EditorApp.prototype.restoreState = function(jsonState: string | undefined) {
        if (!jsonState) return;
        const plainTracks = JSON.parse(jsonState);
        this.tracks = plainTracks.map((tData: any) => {
            const track = new Track(tData.id, tData.name, tData.type, tData.colorClass, tData.role || 'generic');
            track.isMuted = tData.isMuted || false;
            track.isSolo = tData.isSolo || false;
            // FIX #1: restore track height so resize is preserved on undo
            track.height = tData.height || (tData.type === 'subtitle' ? 16 : 24);
            // FIX #2: restore transitions so undo doesn't erase them
            track.transitions = tData.transitions ? tData.transitions.map((t: any) => ({ ...t })) : [];
            track.clips = tData.clips.map((cData: any) => {
                const clip = new Clip(cData.id, cData.name, cData.start, cData.duration, cData.type, cData.src);
                clip.trackId = tData.id;
                clip.sourceIn = cData.sourceIn || 0;
                if (cData.groupId) clip.groupId = cData.groupId;
                
                if(cData.properties) clip.properties = cData.properties;
                if(cData.aiSegmentation) clip.aiSegmentation = cData.aiSegmentation;
                if(cData.sandwich) clip.sandwich = cData.sandwich;
                if(cData.mask) clip.mask = cData.mask;
                if(cData.blendMode) clip.blendMode = cData.blendMode;
                if(cData.textStyle) clip.textStyle = cData.textStyle;
                if(cData.effects) clip.effects = cData.effects;
                if(cData.transitions) clip.transitions = cData.transitions;
                if(cData.keyframes) clip.keyframes = cData.keyframes;

                return clip;
            });
            track.rebuildTree();
            return track;
        });
        // Removed forceful legacy auto-group logic to allow manual ungrouping

        this.refreshProjectTopology();
        this.deselectAll();
        if (this.renderTracks) this.renderTracks();
        if (this.syncOverlays) this.syncOverlays();
        this.requestRedraw();
        this.commitStateToReact();
    };
};
