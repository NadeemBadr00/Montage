import React from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

const TEMPLATES = [
    { id: 'smart-sandwich', name: 'Podcast Split Screen', icon: 'fa-podcast', desc: 'Main video with blurred background and AI foreground.' },
    { id: 'simple-blur', name: 'Blur Background', icon: 'fa-droplet', desc: 'Center video with a blurred expanded background.' },
    { id: 'retro-vhs', name: 'Cinematic Black Bars', icon: 'fa-film', desc: 'Adds cinematic bars and color grading.' },
    { id: 'neon-captions', name: 'Neon Captions', icon: 'fa-font', desc: 'Adds glowing neon captions style.' },
    { id: 'mahraganat-sync', name: 'Mahraganat Sync', icon: 'fa-music', desc: 'Audio reactive effects matching the beat.' },
    { id: 'golden-hour', name: 'Golden Hour', icon: 'fa-sun', desc: 'Warm lighting and cinematic sun glow.' },
    { id: 'split-reaction', name: 'Split Reaction', icon: 'fa-masks-theater', desc: 'Perfect PIP layout for reaction videos.' },
    { id: 'wipe-camera', name: 'Wipe Camera', icon: 'fa-camera-rotate', desc: 'Smooth camera panning and wipe transitions.' },
    { id: 'top-ten', name: 'Top 10 List', icon: 'fa-list-ol', desc: 'Animated numbered list overlay.' },
    { id: 'silhouette', name: 'Silhouette', icon: 'fa-user-ninja', desc: 'Dark subject on a bright cinematic background.' },
    { id: 'love-story', name: 'Love Story', icon: 'fa-heart', desc: 'Romantic filter with soft focus.' },
    { id: 'glow-up', name: 'Glow Up', icon: 'fa-star', desc: 'Dramatic before/after transition effect.' },
    { id: 'cyberpunk-glitch', name: 'Cyberpunk Glitch', icon: 'fa-bolt', desc: 'Neon, VHS, and high-tech glitch effects.' },
    { id: 'polaroid', name: 'Vintage Polaroid', icon: 'fa-camera-retro', desc: 'Classic polaroid frame with vintage colors.' },
    { id: 'tts-narrator', name: 'TTS Narrator', icon: 'fa-microphone-lines', desc: 'Auto captions and AI voiceover setup.' },
];

export function TemplatesModal() {
    return (
        <div id="templates-modal" className="fixed inset-0 bg-black/80 z-[100] hidden items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] rounded-xl border border-gray-600 w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                <div className="p-4 bg-[#0a0f1d] border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-pink-400 flex items-center gap-2">
                        <i className="fa-solid fa-wand-magic-sparkles"></i> AI Video Templates
                    </h2>
                    <button onClick={() => document.getElementById('templates-modal')?.classList.add('hidden')} className="text-gray-400 hover:text-white transition-colors bg-gray-800 w-8 h-8 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    {TEMPLATES.map(tpl => (
                        <div key={tpl.id} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-pink-500 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center text-center group"
                            onClick={() => {
                                const app = (window as any).app;
                                if (app && app.applySmartTemplate) {
                                    const selectedIds = Array.from(useEditorStore.getState().selectedClipIds);
                                    if (selectedIds.length > 0) {
                                        app.applySmartTemplate(tpl.id, selectedIds[0]);
                                        document.getElementById('templates-modal')?.classList.add('hidden');
                                    } else {
                                        alert('Please select a video clip first!');
                                    }
                                }
                            }}>
                            <div className="w-12 h-12 rounded-full bg-pink-900/30 text-pink-400 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                                <i className={`fa-solid ${tpl.icon}`}></i>
                            </div>
                            <h3 className="text-sm font-bold text-white mb-1">{tpl.name}</h3>
                            <p className="text-[10px] text-gray-400">{tpl.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
