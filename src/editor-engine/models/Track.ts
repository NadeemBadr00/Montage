import { IntervalTree } from './IntervalTree';
import { Track as ITrack, Clip as IClip, AssetType } from '../../types/editor.types';

export class Track implements ITrack {
    id: number;
    name: string;
    type: AssetType | string;
    colorClass: string;
    role: string;
    clips: IClip[];
    tree: IntervalTree;
    isMuted: boolean;
    isSolo: boolean;
    height: number;
    defaultStyle: any;
    
    _topoIndex?: number;
    _topoType?: string;

    constructor(id: number, name: string, type: AssetType | string, colorClass: string, role = 'generic') {
        this.id = id;
        this.name = name;
        this.type = type; 
        this.colorClass = colorClass;
        this.role = role;
        this.clips = [];
        this.tree = new IntervalTree();
        this.isMuted = false;
        this.isSolo = false;
        this.height = type === 'subtitle' ? 16 : 24; // default heights
        this.defaultStyle = null;
    }

    addClip(clip: IClip): void {
        clip.trackId = String(this.id);
        this.clips.push(clip);
        this.rebuildTree();
    }

    removeClip(clipId: string): void {
        const index = this.clips.findIndex(c => c.id === clipId);
        if (index > -1) {
            this.clips.splice(index, 1);
            this.rebuildTree();
        }
    }

    clear(): void { 
        this.clips = []; 
        this.tree.clear(); 
    }
    
    rebuildTree(): void { 
        this.tree.clear(); 
        this.clips.forEach(clip => this.tree.insert(clip)); 
    }
    
    getClipsAtTime(time: number): IClip[] { 
        return this.tree.query(time); 
    }
}
