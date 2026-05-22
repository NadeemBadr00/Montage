// ─── User ───────────────────────────────────────────────────────────────────
export interface UserData {
  name:     string;
  email:    string;
  photo:    string;
  uid?:     string;
}

// ─── Project / Timeline ─────────────────────────────────────────────────────
export interface TimelineClip {
  id:        string;
  src:       string;
  start:     number;
  end:       number;
  duration:  number;
  track:     number;
  name?:     string;
  type?:     'video' | 'audio' | 'image';
}

export interface Project {
  id:         string;
  name:       string;
  mode:       'manual' | 'sandwich';
  clips:      TimelineClip[];
  createdAt:  number;
  updatedAt:  number;
}

// ─── AI / Gemini ─────────────────────────────────────────────────────────────
export interface GeminiMessage {
  role:    'user' | 'model';
  content: string;
}

export interface AnalysisResult {
  style:       string;
  rules:       string[];
  transitions: string[];
  pacing:      string;
  raw:         string;
}

// ─── Editor ──────────────────────────────────────────────────────────────────
export interface EditorState {
  projectName:    string;
  mode:           'manual' | 'sandwich';
  clips:          TimelineClip[];
  selectedClipId: string | null;
  currentTime:    number;
  duration:       number;
  isPlaying:      boolean;
  zoom:           number;
}

// ─── SRT ─────────────────────────────────────────────────────────────────────
export interface SrtEntry {
  index:    number;
  start:    string;
  end:      string;
  text:     string;
}

// ─── Feature Flags ───────────────────────────────────────────────────────────
export type PlanTier = 'free' | 'pro' | 'ultra';

export interface AppConfig {
  geminiApiKey: string;
  plan:         PlanTier;
  userId:       string;
}
