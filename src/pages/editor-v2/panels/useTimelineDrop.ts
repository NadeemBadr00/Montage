// @ts-nocheck
import React from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

export function useTimelineDrop() {
  const [dropPreview, setDropPreview] = React.useState<{ trackId: number, start: number, duration: number } | null>(null);

  const handleDragOver = (e: React.DragEvent, trackId: number) => {
      e.preventDefault();
      e.currentTarget.classList.add('bg-gray-700');
      
      const containerRect = document.getElementById('timeline-scroll-area')?.getBoundingClientRect();
      const scrollLeft = document.getElementById('timeline-scroll-area')?.scrollLeft || 0;
      if (containerRect) {
         const currentHeaderWidth = useEditorStore.getState().headerWidth || 140;
         const relativeX = (e.clientX - containerRect.left) + scrollLeft - currentHeaderWidth;
         const pps = (window as any).app?.pixelsPerSecond || 20;
         let dropTime = Math.max(0, relativeX / pps);
         
         // Apply Magnetic Snap
         if ((window as any).app?.getSnapPoint) {
            const snap = (window as any).app.getSnapPoint(dropTime);
            if (snap !== null) dropTime = snap;
         }

         // Fetch actual duration from dragged asset if available
         const asset = useEditorStore.getState().draggedAsset;
         const duration = asset && (asset as any).duration ? (asset as any).duration : 5;
         
         setDropPreview({ trackId, start: dropTime, duration: duration });
      }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.currentTarget.classList.remove('bg-gray-700');
      setDropPreview(null);
  };

  const handleDrop = (e: React.DragEvent, trackId: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-gray-700');
    setDropPreview(null);

    // Support both: HTML5 dataTransfer (external drag) and AssetsPanel custom mousedown drag
    let rawData = e.dataTransfer.getData('application/json');
    let asset: any = null;
    if (rawData) {
        try { asset = JSON.parse(rawData); } catch (_) {}
    }
    // Fallback: AssetsPanel uses custom mousedown drag and sets draggedAsset in the store
    if (!asset) {
        asset = useEditorStore.getState().draggedAsset;
    }

    if (asset && (window as any).app) {
      try {
        const containerRect = document.getElementById('timeline-scroll-area')?.getBoundingClientRect();
        const scrollLeft = document.getElementById('timeline-scroll-area')?.scrollLeft || 0;
        if (containerRect) {
          const currentHeaderWidth = useEditorStore.getState().headerWidth || 140;
          const relativeX = (e.clientX - containerRect.left) + scrollLeft - currentHeaderWidth;
          const pps = (window as any).app.pixelsPerSecond || 20;
          let dropTime = Math.max(0, relativeX / pps);
          
          if ((window as any).app?.getSnapPoint) {
             const snap = (window as any).app.getSnapPoint(dropTime);
             if (snap !== null) dropTime = snap;
          }
          
          const addClipWithDuration = (duration: number) => {
            const groupId = asset.type === 'video' ? `group_${Date.now()}` : undefined;
            const newClip = new (window as any).Clip(`drop_${Date.now()}`, asset.name, dropTime, duration, asset.type, asset.src);
            if (groupId) newClip.groupId = groupId;
            
            const targetTrack = (window as any).app.tracks.find((t: any) => t.id === trackId);
            if (targetTrack) {
              targetTrack.addClip(newClip);
              if ((window as any).app.resolveCollisions) {
                (window as any).app.resolveCollisions(targetTrack.id, newClip);
              }
            }
            if (asset.type === 'video') {
              const audioTrack = (window as any).app.tracks.find((t: any) => t.type === 'audio');
              if (audioTrack) {
                const audioClip = new (window as any).Clip(`drop_a_${Date.now()}`, `${asset.name} [Audio]`, dropTime, duration, 'audio', asset.src);
                audioClip.groupId = groupId;
                audioTrack.addClip(audioClip);
                if ((window as any).app.resolveCollisions) {
                  (window as any).app.resolveCollisions(audioTrack.id, audioClip);
                }
              }
            }
            // saveState AFTER mutation so undo correctly removes the dropped clip
            if ((window as any).app?.saveState) (window as any).app.saveState();
            if ((window as any).app.commitStateToReact) (window as any).app.commitStateToReact();
            if ((window as any).app.requestRedraw) (window as any).app.requestRedraw(); // Phase 61: Fix Canvas update on Drop
          };

          if (asset.type === 'transition') {
            if ((window as any).app.addTransition) {
              (window as any).app.addTransition(trackId, dropTime, asset.transitionType || 'cross_dissolve');
            }
          } else if (asset.duration) {
              addClipWithDuration(asset.duration);
          } else if (asset.type === 'video' || asset.type === 'audio') {
            const el = document.createElement(asset.type);
            el.src = asset.src;
            el.onloadedmetadata = () => addClipWithDuration(el.duration || 10);
            el.onerror = () => addClipWithDuration(10);
          } else {
            addClipWithDuration(5);
          }
        }
      } catch (err) {
        console.error("Drop error", err);
      }
    }
  };

  return { handleDragOver, handleDragLeave, handleDrop, dropPreview };
}
