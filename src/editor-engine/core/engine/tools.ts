// @ts-nocheck
import { useEditorStore } from '../../../store/useEditorStore';

export const injectEngineTools = () => {
    window.EditorApp.prototype.setToolUI = function(toolName: string) {
        document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active', 'text-accent'));
        let targetId = toolName === 'select' ? 'tool-select' : (toolName === 'razor' || toolName === 'cut' ? 'tool-cut' : '');
        const btn = document.getElementById(targetId);
        if(btn) btn.classList.add('active', 'text-accent');
    };

    window.EditorApp.prototype.setTool = function(tool: string) {
        this.activeTool = tool;
        const uiName = (tool === 'razor' || tool === 'cut') ? 'cut' : 'select';
        this.setToolUI(uiName); 
        if (uiName === 'cut') { this.activeTool = 'razor'; document.body.style.cursor = 'crosshair'; } 
        else { this.activeTool = 'select'; document.body.style.cursor = 'default'; }
        this.log(`Tool: ${this.activeTool.toUpperCase()}`);
        // FIX #7: Sync active tool to Zustand so React toolbar + ClipItem see correct state
        useEditorStore.setState({ activeTool: this.activeTool as any });
    };

    window.EditorApp.prototype.setupEditingTools = function() {
        this.projectState = { clips: [], tracks: [], history: [], settings: {} };
        this.activeTool = 'select';
        this.isDragging = false;
        if (this.timelineContent) {
            this.timelineContent.addEventListener('mousedown', this.handleInputDown.bind(this));
        }
    };

    window.EditorApp.prototype.handleInputDown = function(e: any) {
        if (e.target.closest('.track-label-fixed')) return; 
        if (!e.target.closest('.timeline-clip')) this.deselectAll();
    };

    // NOTE: updatePlayheadPosition is intentionally NOT defined here.
    // It is defined in video_preview.ts which loads after this file and
    // provides the full DOM + Zustand sync implementation.
};
