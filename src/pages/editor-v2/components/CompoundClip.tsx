// Phase 27: Compound Clip — groups multiple clips into a nested clip
// Right-click selection → "Group to Compound Clip"
// This file adds the engine method and a visual badge on compound clips

import React from 'react';

/** Badge shown on compound clips in the timeline */
export function CompoundClipBadge({ clip, onClick }: { clip: any; onClick: () => void }) {
  if (!clip.isCompound) return null;
  return (
    <div
      className="absolute top-1 left-1 z-30 flex items-center gap-0.5 cursor-pointer"
      onClick={e => { e.stopPropagation(); onClick(); }}
      title="Compound Clip — double-click to expand"
    >
      <div
        className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-bold"
        style={{ background: 'rgba(139,92,246,0.8)', color: '#fff', border: '1px solid rgba(167,139,250,0.6)' }}
      >
        <i className="fa-solid fa-layer-group text-[6px]" />
        <span>NEST</span>
      </div>
    </div>
  );
}

/** Engine method: group selected clips into a compound clip */
export function injectCompoundClipEngine() {
  const EditorApp = (window as any).EditorApp;
  if (!EditorApp || EditorApp.prototype.groupToCompound) return;

  EditorApp.prototype.groupToCompound = function() {
    this.saveState();
    const ids = Array.from(this.selectedClipIds) as string[];
    if (ids.length < 2) {
      this.log('❌ Select 2+ clips to group');
      return;
    }

    // Collect all selected clips from all tracks
    const collected: { clip: any; track: any }[] = [];
    this.tracks.forEach((track: any) => {
      track.clips.forEach((clip: any) => {
        if (ids.includes(clip.id)) collected.push({ clip, track });
      });
    });

    if (collected.length < 2) return;

    // Find bounding box
    const minStart = Math.min(...collected.map(c => c.clip.start));
    const maxEnd   = Math.max(...collected.map(c => c.clip.start + c.clip.duration));
    const duration = maxEnd - minStart;

    // Remove original clips from their tracks
    collected.forEach(({ clip, track }) => {
      track.clips = track.clips.filter((c: any) => c.id !== clip.id);
    });

    // Create compound clip on the first track found
    const targetTrack = collected[0].track;
    const compound = {
      id: 'compound_' + Date.now(),
      name: 'Compound Clip',
      type: collected[0].clip.type,
      src: collected[0].clip.src,
      start: minStart,
      duration,
      isCompound: true,
      nestedClips: collected.map(({ clip }) => ({ ...clip, start: clip.start - minStart })),
      properties: {},
    };

    targetTrack.clips.push(compound);
    targetTrack.clips.sort((a: any, b: any) => a.start - b.start);

    this.selectedClipIds = new Set([compound.id]);
    this.log(`📦 Grouped ${collected.length} clips into Compound Clip`);
    if (this.renderTracks) this.renderTracks();
    this.requestRedraw();
    this.commitStateToReact();
  };

  EditorApp.prototype.ungroupCompound = function(clipId: string) {
    this.saveState();
    let found: any = null;
    let foundTrack: any = null;
    this.tracks.forEach((track: any) => {
      const clip = track.clips.find((c: any) => c.id === clipId && c.isCompound);
      if (clip) { found = clip; foundTrack = track; }
    });
    if (!found) return;

    // Remove compound, restore nested clips
    foundTrack.clips = foundTrack.clips.filter((c: any) => c.id !== clipId);
    found.nestedClips.forEach((nc: any) => {
      foundTrack.clips.push({ ...nc, start: nc.start + found.start, id: nc.id || 'ungroup_' + Date.now() });
    });
    foundTrack.clips.sort((a: any, b: any) => a.start - b.start);

    this.log(`📂 Ungrouped Compound Clip into ${found.nestedClips.length} clips`);
    if (this.renderTracks) this.renderTracks();
    this.requestRedraw();
    this.commitStateToReact();
  };
}
