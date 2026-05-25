// @ts-nocheck
export const ensureFrameProperties = (clip: any) => {
    if (!clip.frame) {
        clip.frame = {
            type: 'none', 
            color: '#151515', 
            thickness: 40,
            orientation: 'vertical', 
            assets: [],
            animSpeed: 50,
            transition: 'zoom', 
            durationMode: 'auto', 
            slideDuration: 3 
        };
    }
    if (!clip.frame.orientation) clip.frame.orientation = 'vertical';
    if (clip.frame.animSpeed === undefined) clip.frame.animSpeed = 50;
    if (!clip.frame.transition) clip.frame.transition = 'zoom';
    if (!clip.frame.durationMode) clip.frame.durationMode = 'auto';
    if (!clip.frame.slideDuration) clip.frame.slideDuration = 3;
    
    if (clip.frame.type === 'polaroid' && clip.frame.color === '#151515') {
        clip.frame.color = '#f8f8f8';
    }
};
