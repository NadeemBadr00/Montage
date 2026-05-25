import { 
  Clip as IClip, 
  AssetType, 
  ClipProperties, 
  ClipKeyframes, 
  ClipTextStyle, 
  Transitions, 
  ChromaKey, 
  AiSegmentation, 
  SandwichMode 
} from '../../types/editor.types';

export class Clip implements IClip {
    id: string;
    name: string;
    start: number;
    duration: number;
    type: AssetType | string;
    src: string;
    trackId: string | null;
    sourceIn: number;
    sourceDuration?: number;
    
    properties: ClipProperties;
    keyframes: ClipKeyframes;
    textStyle: ClipTextStyle;
    transitions: Transitions;
    chromaKey: ChromaKey;
    aiSegmentation: AiSegmentation;
    mask: any;
    blendMode: string;
    sandwich: SandwichMode;
    effects?: any;
    logoRemovers: any[];
    groupId?: string;

    constructor(id: string, name: string, start: number, duration: number, type: AssetType | string, src: string) {
        this.id = id;
        this.name = name;
        this.start = start; 
        this.duration = duration; 
        this.type = type; 
        this.src = src;
        this.trackId = null;
        this.sourceIn = 0;
        if (type === 'video' || type === 'audio') {
            this.sourceDuration = duration;
        }
        
        this.properties = { scale: 100, positionX: 0, positionY: 0, rotation: 0, opacity: 100, volume: 100 };
        this.keyframes = { scale: [], positionX: [], positionY: [], rotation: [], opacity: [], volume: [] };
        this.textStyle = { fontFamily: 'Cairo', fontWeight: 'bold', color: '#ffffff', strokeColor: '#000000', strokeWidth: 0, shadowBlur: 0, backgroundColor: '#000000', backgroundOpacity: 0, padding: 20 };
        this.transitions = { in: 'none', out: 'none', duration: 1.0 };
        this.chromaKey = { enabled: false, color: '#00ff00', threshold: 50 };
        this.aiSegmentation = { enabled: false, loading: false };
        this.mask = null;
        this.blendMode = 'source-over';
        this.sandwich = { scale: 50, offsetX: 0, offsetY: 0 };
        this.logoRemovers = [];
    }

    get end(): number { return this.start + this.duration; }
    
    getPropertyValue(prop: keyof ClipProperties | string, timeRelative: number): number {
        if (!this.keyframes[prop] || this.keyframes[prop].length === 0) {
            return (this.properties as any)[prop] !== undefined ? (this.properties as any)[prop] : (prop === 'scale' ? 100 : 0);
        }
        const keys = this.keyframes[prop].sort((a: any, b: any) => a.t - b.t);
        if (timeRelative <= keys[0].t) return keys[0].v;
        if (timeRelative >= keys[keys.length - 1].t) return keys[keys.length - 1].v;
        for (let i = 0; i < keys.length - 1; i++) {
            const k1 = keys[i];
            const k2 = keys[i+1];
            if (timeRelative >= k1.t && timeRelative < k2.t) {
                const ratio = (timeRelative - k1.t) / (k2.t - k1.t);
                return k1.v + (k2.v - k1.v) * ratio;
            }
        }
        return (this.properties as any)[prop];
    }

    addKeyframe(prop: string, time: number, value: number): void {
        if(!this.keyframes[prop]) this.keyframes[prop] = [];
        this.keyframes[prop] = this.keyframes[prop].filter((k: any) => Math.abs(k.t - time) > 0.01);
        this.keyframes[prop].push({ t: time, v: parseFloat(value as any) });
    }
}
