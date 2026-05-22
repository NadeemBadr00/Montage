// Shared types for Analysis and StyleTransfer pages

export interface ChunkCard {
  id: number;
  start: number;
  end: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  result: string;
  error?: string;
  execTime?: number;
  key?: string;
}

export interface ChunkRange { start: number; end: number; }

export interface ProcessChunkOptions {
  chunk: ChunkRange;
  id: number;
  apiKeys: string[];
  modelName: string;
  file: File;
  transcript: string;
  onUpdate: (id: number, update: Partial<ChunkCard>) => void;
  onLog: (msg: string) => void;
  mode: 'analysis' | 'style-transfer';
  styleRef?: string;
}
