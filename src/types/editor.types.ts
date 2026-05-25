export type AssetType = 'video' | 'audio' | 'image' | 'text' | 'subtitle' | 'overlay';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  src: string;
  duration?: number;
  templateData?: any; // Pre-configured data for templates (textStyle, transitions, properties)
}

export interface ClipProperties {
  scale: number;
  scaleX?: number;
  scaleY?: number;
  positionX: number;
  positionY: number;
  rotation: number;
  opacity: number;
  volume: number;
  forcedWidth?: number;
  forcedHeight?: number;
  playbackSpeed?: number;
  flipX?: boolean;
  flipY?: boolean;
}

export interface ClipKeyframes {
  scale: any[];
  positionX: any[];
  positionY: any[];
  rotation: any[];
  opacity: any[];
  volume: any[];
  [key: string]: any[];
}

export interface ClipTextStyle {
  fontFamily: string;
  fontWeight: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  textTransform?: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  shadowBlur: number;
  backgroundColor: string;
  backgroundOpacity: number;
  padding: number;
}

export interface Transitions {
  in: string;
  out: string;
  duration: number;
}

export interface ChromaKey {
  enabled: boolean;
  color: string;
  threshold: number;
}

export interface AiSegmentation {
  enabled: boolean;
  loading: boolean;
}

export interface SandwichMode {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface LogoRemover {
  id: string;
  x: number; // Center X in percentage (-50 to 50 or similar, but let's use 0 to 100 or actual pixels. We'll use 0-100 percentage)
  y: number; // Center Y in percentage
  width: number; // Width in percentage
  height: number; // Height in percentage
  mode: 'blur' | 'pixelate' | 'interpolate' | 'clone';
  strength: number; // 0 to 100
  cloneX: number; // Offset for cloning
  cloneY: number;
}

export interface Clip {
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
  text?: string;
  logoRemovers?: LogoRemover[];
  groupId?: string;
  
  // Instance methods
  readonly end: number;
  getPropertyValue(prop: keyof ClipProperties | string, timeRelative: number): number;
  addKeyframe(prop: string, time: number, value: number): void;
}

export interface Transition {
  id: string;
  type: string; // 'cross_dissolve', 'fade', 'wipe', etc.
  cutTime: number; // The absolute global time of the cut point
  inOffset: number; // How much it encroaches into Clip B (incoming)
  outOffset: number; // How much it encroaches into Clip A (outgoing)
  alignment: 'center' | 'start' | 'end';
}

export interface Track {
  id: number;
  name: string;
  type: AssetType | string;
  colorClass: string;
  role: string;
  clips: Clip[];
  transitions: Transition[];
  isMuted: boolean;
  isSolo: boolean;
  height: number;
  defaultStyle: any | null;

  // Instance methods
  addClip(clip: Clip): void;
  removeClip(clipId: string): void;
  getClipsAtTime(time: number): Clip[];
}

export interface EditorSettings {
  videoName: string;
  mode: string;
  hasSRT: boolean;
  autoTranscribe: boolean;
}
