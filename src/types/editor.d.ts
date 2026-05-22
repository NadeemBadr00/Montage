// Global Type Declarations for the Legacy Editor Engine

interface Window {
  EditorApp: any;
  app: any;
  FileStore: any;
  _geminiAPIKey?: string;
  geminiChat?: any;
  geminiPlan?: any;
  aiManager?: any;
  TimelineRenderer?: any;
  VideoPreviewRenderer?: any;
  CommandCenter?: any;
  XMLExporter?: any;
  
  // Audio context and other things
  AudioContext: typeof AudioContext;
  webkitAudioContext: typeof AudioContext;
}

declare class EditorApp {
  constructor();
  init(): void;
  initProject(videoFile: any, mode: string, autoTranscribe: boolean): void;
  // Will be extended by features
  [key: string]: any; 
}
