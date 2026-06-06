import React, { useState } from 'react';
import { textTemplates } from '../../../assets/textTemplates';
import { sfxTemplates } from '../../../assets/sfxTemplates';
import { imageTemplates } from '../../../assets/imageTemplates';
import { framesTemplates } from '../../../assets/framesTemplates';
import { smartTemplates } from '../../../assets/smartTemplates';
import { lutsTemplates } from '../../../assets/lutsTemplates';
import { generatorsTemplates } from '../../../assets/generatorsTemplates';
export function TemplatesTab({ handleAssetDrag, gridCols }: { handleAssetDrag: any, gridCols: 2|3|4 }) {
  const [templateMode, setTemplateMode] = useState<'smart' | 'text' | 'sfx' | 'image' | 'frame' | 'favorites' | 'lut' | 'generator'>('smart');
  const [searchQuery, setSearchQuery] = useState('');
  const [subCategory, setSubCategory] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const getSubCategories = () => {
      switch (templateMode) {
          case 'text': return ['all', 'titles', 'lower thirds', 'subtitles'];
          case 'smart': return ['all', 'vlogs', 'gaming', 'cinematic', 'social'];
          case 'sfx': return ['all', 'transitions', 'ui', 'ambient'];
          case 'frame': return ['all', 'mobile', 'browser', 'overlay'];
          case 'lut': return ['all', 'cinematic', 'vintage', 'bnw', 'vibrant'];
          case 'generator': return ['all', 'motion graphics', 'news', 'typewriter'];
          default: return ['all'];
      }
  };

  const currentList = templateMode === 'favorites' ? 
                      [...smartTemplates, ...textTemplates, ...imageTemplates, ...framesTemplates, ...sfxTemplates, ...lutsTemplates, ...generatorsTemplates].filter(t => favorites.has(t.id)) :
                      templateMode === 'smart' ? smartTemplates : 
                      templateMode === 'text' ? textTemplates : 
                      templateMode === 'image' ? imageTemplates : 
                      templateMode === 'lut' ? lutsTemplates : 
                      templateMode === 'generator' ? generatorsTemplates : 
                      templateMode === 'frame' ? framesTemplates : sfxTemplates;

  const filteredList = currentList.filter(tpl => {
      if (searchQuery && !tpl.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (subCategory !== 'all') {
          // Fake filtering for mock templates without real tags
          if (!tpl.name.toLowerCase().includes(subCategory) && !(tpl as any).type?.includes(subCategory)) return false;
      }
      return true;
  });

  return (
    <div className="flex flex-col h-full">
        {/* Template Search Bar */}
        <div className="px-1 mb-2">
            <div className="relative">
                <i className="fa-solid fa-search absolute left-2 top-2 text-gray-500 text-[10px]"></i>
                <input 
                    type="text" 
                    placeholder={`Search ${templateMode} templates...`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1e293b] border border-gray-700 rounded text-[10px] pl-6 pr-2 py-1.5 focus:border-red-500 outline-none text-white" 
                />
            </div>
        </div>
        <div className="grid grid-cols-4 gap-1 mb-2 mt-1 px-1">
            <button 
                onClick={() => setTemplateMode('favorites')} 
                className={`w-full py-1.5 text-[9px] font-bold rounded border truncate px-1 ${templateMode === 'favorites' ? 'bg-pink-600/20 text-pink-500 border-pink-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
            >
                <i className="fa-solid fa-heart mr-1"></i> Faves
            </button>
            <button 
                onClick={() => setTemplateMode('smart')} 
                className={`w-full py-1.5 text-[9px] font-bold rounded border truncate px-1 ${templateMode === 'smart' ? 'bg-yellow-600/20 text-yellow-500 border-yellow-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
            >
                <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> Smart
            </button>
            <button 
                onClick={() => setTemplateMode('text')} 
                className={`w-full py-1.5 text-[9px] font-bold rounded border truncate px-1 ${templateMode === 'text' ? 'bg-red-600/20 text-red-500 border-red-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
            >
                <i className="fa-solid fa-font mr-1"></i> Texts
            </button>
            <button 
                onClick={() => setTemplateMode('image')} 
                className={`w-full py-1.5 text-[9px] font-bold rounded border truncate px-1 ${templateMode === 'image' ? 'bg-green-600/20 text-green-500 border-green-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
            >
                <i className="fa-solid fa-image mr-1"></i> Images
            </button>
            <button 
                onClick={() => setTemplateMode('frame')} 
                className={`w-full py-1.5 text-[9px] font-bold rounded border truncate px-1 ${templateMode === 'frame' ? 'bg-purple-600/20 text-purple-500 border-purple-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
            >
                <i className="fa-solid fa-mobile-screen mr-1"></i> Frames
            </button>
            <button 
                onClick={() => setTemplateMode('sfx')} 
                className={`w-full py-1.5 text-[9px] font-bold rounded border truncate px-1 ${templateMode === 'sfx' ? 'bg-blue-600/20 text-blue-500 border-blue-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
            >
                <i className="fa-solid fa-bolt mr-1"></i> SFX
            </button>
            <button 
                onClick={() => setTemplateMode('lut')} 
                className={`w-full py-1.5 text-[9px] font-bold rounded border truncate px-1 ${templateMode === 'lut' ? 'bg-cyan-600/20 text-cyan-500 border-cyan-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
            >
                <i className="fa-solid fa-palette mr-1"></i> LUTs
            </button>
            <button 
                onClick={() => setTemplateMode('generator')} 
                className={`w-full py-1.5 text-[9px] font-bold rounded border truncate px-1 ${templateMode === 'generator' ? 'bg-orange-600/20 text-orange-500 border-orange-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
            >
                <i className="fa-solid fa-layer-group mr-1"></i> Generators
            </button>
        </div>

        {/* Sub-categories */}
        {getSubCategories().length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 mb-3 pb-1 border-b border-gray-800">
                {getSubCategories().map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setSubCategory(cat)}
                        className={`text-[9px] px-2 py-1 rounded-full whitespace-nowrap capitalize border ${subCategory === cat ? 'bg-gray-700 text-white border-gray-500' : 'bg-transparent text-gray-500 border-gray-700 hover:text-gray-300'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        )}

        <div className={`grid gap-2 pb-10 ${gridCols === 2 ? 'grid-cols-2' : gridCols === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {filteredList.flatMap((tpl, idx, arr) => {
                const isFav = favorites.has(tpl.id);
                const card = (
            <div 
                key={tpl.id}
                className={`relative bg-[#0f172a] rounded overflow-hidden border cursor-grab active:cursor-grabbing flex flex-col group transition-all duration-300 ${
                    tpl.type === 'overlay'
                        ? 'border-pink-600/40 hover:border-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.15)]'
                        : 'border-gray-700 hover:border-red-500'
                }`}
                onMouseDown={(e) => handleAssetDrag(e, tpl)}
                onMouseEnter={() => { 
                    if (tpl.type === 'audio') {
                        if ((window as any).previewAudio) {
                            (window as any).previewAudio.pause();
                        }
                        const audio = new Audio(tpl.src);
                        audio.volume = 0.6;
                        audio.play().catch(e => console.log('Audio preview blocked', e));
                        (window as any).previewAudio = audio;
                    } else if ((window as any).app) { 
                        (window as any).app.hoveredTemplate = tpl; 
                        (window as any).app.hoverStartTime = Date.now();
                        if (!(window as any).app.hoverAnimFrame) {
                            const loop = () => {
                                if ((window as any).app.hoveredTemplate) {
                                    (window as any).app.requestRedraw();
                                    (window as any).app.hoverAnimFrame = requestAnimationFrame(loop);
                                } else {
                                    cancelAnimationFrame((window as any).app.hoverAnimFrame);
                                    (window as any).app.hoverAnimFrame = null;
                                }
                            };
                            loop();
                        }
                    }
                    // Phase 67: LUT Live Preview Hover
                    if (tpl.type === 'lut' && (window as any).app) {
                        const app = (window as any).app;
                        const mainVid = app.tracks.find((t: any) => t.type === 'main')?.clips[0];
                        if (mainVid && tpl.templateData?.properties) {
                            // Backup original
                            if (!app.originalLutBackup) app.originalLutBackup = { ...mainVid.properties };
                            // Apply LUT
                            Object.entries(tpl.templateData.properties).forEach(([k, v]) => {
                                if (!mainVid.properties) mainVid.properties = {};
                                mainVid.properties[k] = v;
                            });
                            app.requestRedraw();
                        }
                    }
                }}
                onMouseLeave={() => { 
                    if (tpl.type === 'audio') {
                        if ((window as any).previewAudio) {
                            (window as any).previewAudio.pause();
                            (window as any).previewAudio = null;
                        }
                    } else if ((window as any).app) { 
                        (window as any).app.hoveredTemplate = null; 
                        
                        if ((window as any).app.hoverAnimFrame) {
                            cancelAnimationFrame((window as any).app.hoverAnimFrame);
                            (window as any).app.hoverAnimFrame = null;
                        }

                        // Phase 67: Restore LUT Live Preview
                        if (tpl.type === 'lut' && (window as any).app.originalLutBackup) {
                            const mainVid = (window as any).app.tracks.find((t: any) => t.type === 'main')?.clips[0];
                            if (mainVid) {
                                mainVid.properties = { ...(window as any).app.originalLutBackup };
                            }
                            (window as any).app.originalLutBackup = null;
                        }

                        (window as any).app.requestRedraw(); 
                    } 
                }}
                onDoubleClick={() => {
                    if ((window as any).app) {
                        if (tpl.type === 'smart') {
                            // Find the first selected main clip or just the first clip in the main track
                            const mainTrack = (window as any).app.tracks.find((t: any) => t.type === 'main');
                            if (!mainTrack || mainTrack.clips.length === 0) {
                                alert("Please add a video clip to the main track first!");
                                return;
                            }
                            const mainClipId = mainTrack.clips[0].id;
                            
                            if ((window as any).app.applySmartTemplate) {
                                (window as any).app.applySmartTemplate(tpl.templateData.action, mainClipId);
                            }
                            return;
                        }

                        if ((window as any).app.tracks) {
                            const targetType = tpl.type === 'audio' ? 'audio' : (tpl.type === 'image' ? 'main' : 'subtitle');
                            const targetTrack = (window as any).app.tracks.find((t: any) => t.type === targetType);
                            if (targetTrack) {
                                const newClip = new (window as any).Clip(`c_${Date.now()}`, tpl.name, (window as any).app.currentTime || 0, tpl.duration || 5, tpl.type, tpl.src);
                                if (tpl.templateData) {
                                    if (tpl.templateData.textStyle) newClip.textStyle = JSON.parse(JSON.stringify(tpl.templateData.textStyle));
                                    if (tpl.templateData.properties) newClip.properties = JSON.parse(JSON.stringify(tpl.templateData.properties));
                                    if (tpl.templateData.transitions) newClip.transitions = JSON.parse(JSON.stringify(tpl.templateData.transitions));
                                    if (tpl.templateData.effects) newClip.effects = JSON.parse(JSON.stringify(tpl.templateData.effects));
                                }
                                targetTrack.addClip(newClip);
                                if ((window as any).app.resolveCollisions) (window as any).app.resolveCollisions(targetTrack.id, newClip);
                                if ((window as any).app.saveState) (window as any).app.saveState();
                                (window as any).app.requestRedraw();
                                (window as any).app.commitStateToReact();
                            } else {
                                if (tpl.type === 'audio') {
                                    (window as any).app.addNewTrack('audio');
                                    const newTarget = (window as any).app.tracks.find((t: any) => t.type === 'audio');
                                    if (newTarget) {
                                        const newClip = new (window as any).Clip(`c_${Date.now()}`, tpl.name, (window as any).app.currentTime || 0, tpl.duration || 5, 'audio', tpl.src);
                                        newTarget.addClip(newClip);
                                        if ((window as any).app.saveState) (window as any).app.saveState();
                                        (window as any).app.requestRedraw();
                                        (window as any).app.commitStateToReact();
                                    }
                                }
                            }
                        }
                    }
                }}
            >
                {tpl.type === 'audio' ? (
                    <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden bg-black">
                        <img src={tpl.thumbnail || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=300"} alt="SFX" className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-red-600/80 w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 backdrop-blur-md">
                                <i className="fa-solid fa-music text-white text-lg"></i>
                            </div>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-white font-mono z-20 pointer-events-none border border-white/20">
                            {tpl.duration}s
                        </div>
                    </div>
                ) : tpl.type === 'overlay' ? (
                    <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden bg-black/90">
                        {/* Background thumbnail */}
                        {tpl.thumbnail && <img src={tpl.thumbnail} alt={tpl.name} className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none" />}
                        {/* Dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                        {/* Live badge */}
                        <div className="absolute top-1.5 right-1.5 z-20 pointer-events-none">
                            <div className={`text-[7px] font-black px-1.5 py-0.5 rounded text-white shadow-lg ${
                                tpl.id.includes('tiktok') ? 'bg-[#fe2c55]' :
                                tpl.id.includes('instagram') ? 'bg-gradient-to-r from-purple-600 to-pink-500' :
                                'bg-[#ff0000]'
                            }`}>● LIVE</div>
                        </div>
                        {/* Fake comment bubbles */}
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 pointer-events-none space-y-0.5">
                            {[{u:'Ahmed_Pro',t:'🔥🔥🔥',c:'#fe2c55'},{u:'Sara_M',t:'❤️ جامد',c:'#ffa502'},{u:'user123',t:'👏👏👏',c:'#2ed573'}].map((c,i) => (
                                <div key={i} className="flex items-center gap-1 opacity-90">
                                    <div className="bg-black/60 text-[6px] rounded-full px-1.5 py-0.5 flex items-center gap-1 backdrop-blur-sm">
                                        <span style={{color: c.c}} className="font-bold">{c.u}</span>
                                        <span className="text-white">{c.t}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Stats mock on right */}
                        <div className="absolute top-5 right-1.5 flex flex-col gap-0.5 pointer-events-none">
                            <div className="text-[6px] text-white/80 font-bold">👁 12.5K</div>
                            <div className="text-[6px] text-[#fe2c55] font-bold">❤️ 48.2K</div>
                        </div>
                        {/* Overlay indicator */}
                        <div className="absolute bottom-1 left-1 z-20 pointer-events-none">
                            <div className="text-[6px] bg-pink-600/80 text-white px-1 py-0.5 rounded font-bold backdrop-blur-sm">
                                💬 OVERLAY
                            </div>
                        </div>
                    </div>
                ) : tpl.type === 'smart' ? (
                    <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden bg-black group">
                        <img src={tpl.thumbnail} alt={tpl.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                            <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-[8px] font-black shadow-lg">
                                DOUBLE CLICK TO APPLY
                            </div>
                        </div>
                        
                        <div className="absolute bottom-1 left-1 flex flex-wrap gap-1 pointer-events-none pr-1">
                            {tpl.templateData?.badges?.map((b: string, i: number) => (
                                <div key={i} className="text-[6px] bg-white/20 text-white px-1 py-0.5 rounded font-bold backdrop-blur-sm shadow border border-white/10">
                                    {b}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : tpl.type === 'image' ? (
                    <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAOklEQVQYV2NkYGAwYkAD////Z8SRAaYIE2RYgDCAUgwjO4xXGHE6n2QzGGkG49bA0EGGp+x4Mh22CQBM5A81T+uOBAAAAABJRU5ErkJggg==')]">
                        <div className="absolute inset-0 bg-black/60 z-0"></div>
                        <img 
                            src={tpl.thumbnail || tpl.src} 
                            alt={tpl.name} 
                            className="relative z-10 w-auto h-auto max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110 pointer-events-none" 
                        />
                    </div>
                ) : (
                    <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAOklEQVQYV2NkYGAwYkAD////Z8SRAaYIE2RYgDCAUgwjO4xXGHE6n2QzGGkG49bA0EGGp+x4Mh22CQBM5A81T+uOBAAAAABJRU5ErkJggg==')]">
                        <div className="absolute inset-0 bg-black/60 z-0"></div>
                        
                        <div className="absolute z-10 w-full h-full pointer-events-none" style={{
                            transform: `translate(calc(${((tpl.templateData?.properties?.positionX || 0) / 1920) * 100}%), calc(${((tpl.templateData?.properties?.positionY || 0) / 1080) * 100}%))`
                        }}>
                            <div className="absolute left-1/2 top-1/2" style={{ transform: 'translate(-50%, -50%)' }}>
                                <div className="transition-transform duration-500 group-hover:scale-110" style={{
                                    transform: `scale(${(tpl.templateData?.properties?.scale || 100) / 100}) rotate(${tpl.templateData?.properties?.rotation || 0}deg)`,
                                    transformOrigin: 'center center'
                                }}>
                                    <div className={`inline-block ${gridCols === 4 ? 'text-[4px]' : gridCols === 3 ? 'text-[6px]' : 'text-[8px]'} whitespace-pre`} style={{
                                        fontFamily: tpl.templateData?.textStyle?.fontFamily || 'Inter',
                                        fontWeight: tpl.templateData?.textStyle?.fontWeight || 'bold',
                                        fontStyle: tpl.templateData?.textStyle?.fontStyle || 'normal',
                                        color: tpl.templateData?.textStyle?.color || '#ffffff',
                                        textShadow: tpl.templateData?.textStyle?.shadowBlur > 0 ? `0px 0px ${tpl.templateData.textStyle.shadowBlur}px ${tpl.templateData.textStyle.color}` : 'none',
                                        textTransform: (tpl.templateData?.textStyle?.textTransform === 'none' ? undefined : tpl.templateData?.textStyle?.textTransform) as any,
                                        backgroundColor: (tpl.templateData?.textStyle?.backgroundOpacity || 0) > 0 ? tpl.templateData?.textStyle?.backgroundColor : 'transparent',
                                        padding: (tpl.templateData?.textStyle?.backgroundOpacity || 0) > 0 ? `${(tpl.templateData?.textStyle?.padding || 10) / 4}px ${(tpl.templateData?.textStyle?.padding || 10) / 2}px` : '0',
                                        borderRadius: '2px',
                                        border: tpl.templateData?.textStyle?.strokeWidth > 0 ? `${tpl.templateData.textStyle.strokeWidth / 2}px solid ${tpl.templateData.textStyle.strokeColor}` : 'none'
                                    }}>
                                        {tpl.src}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="p-2 flex flex-col gap-0.5 bg-[#151c2e]">
                    <div className="text-[10px] text-gray-200 font-bold truncate pr-4">{tpl.name}</div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const next = new Set(favorites);
                            if (isFav) next.delete(tpl.id); else next.add(tpl.id);
                            setFavorites(next);
                        }}
                        className={`absolute bottom-2 right-2 text-[10px] z-50 ${isFav ? 'text-pink-500' : 'text-gray-600 hover:text-pink-400'} transition-colors`}
                    >
                        <i className="fa-solid fa-heart"></i>
                    </button>
                    {tpl.type === 'smart' ? (
                        <div className="text-[7px] text-gray-400 line-clamp-2 leading-tight mt-0.5">
                            {tpl.templateData?.description}
                        </div>
                    ) : (
                        <div className="text-[7px] text-gray-500 uppercase flex gap-1">
                            {tpl.type === 'overlay' ? <span className="text-pink-500/80">💬 Live Comments + Stats</span> : (tpl.templateData?.properties?.positionY < -200 ? 'Top' : tpl.templateData?.properties?.positionY > 200 ? 'Bottom' : 'Center')}
                        </div>
                    )}
                </div>
                </div>
                );
                if (templateMode === 'frame' && tpl.type === 'overlay' && arr[idx-1]?.type !== 'overlay') {
                    const divider = (
                        <div key={`overlay-hdr-${idx}`} className="col-span-full flex items-center gap-2 pt-2 pb-1">
                            <div className="h-px flex-1 bg-gradient-to-r from-pink-600/40 to-transparent"></div>
                            <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest flex items-center gap-1.5">
                                <i className="fa-solid fa-comments text-[8px]"></i>
                                Social Media Overlay
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-l from-pink-600/40 to-transparent"></div>
                        </div>
                    );
                    return [divider, card];
                }
                return [card];
            })}
        </div>
    </div>
  );
}
