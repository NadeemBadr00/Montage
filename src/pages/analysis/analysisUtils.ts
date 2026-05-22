import type { ChunkCard, ChunkRange, ProcessChunkOptions } from './types';

// ── Chunk splitting ──────────────────────────────────────────────────────────
export function splitIntoChunks(duration: number, chunkSize: number, overlap: number): ChunkRange[] {
  const chunks: ChunkRange[] = [];
  let start = 0;
  while (start < duration) {
    const end = Math.min(start + chunkSize + overlap, duration);
    chunks.push({ start, end });
    start += chunkSize;
  }
  return chunks;
}

// ── SRT parsing ──────────────────────────────────────────────────────────────
export function parseSRT(data: string): { start: number; end: number; text: string }[] {
  const blocks = data.replace(/\r\n/g, '\n').trim().split(/\n\n+/);
  return blocks.flatMap(block => {
    const lines = block.split('\n');
    const tiIdx = lines.findIndex(l => l.includes('-->'));
    if (tiIdx < 0) return [];
    const [s, e] = lines[tiIdx].split(' --> ');
    const text   = lines.slice(tiIdx + 1).join(' ').trim();
    return [{ start: srtToSec(s), end: srtToSec(e), text }];
  });
}

function srtToSec(t: string): number {
  const [time, ms] = t.trim().split(',');
  const [h, m, s]  = time.split(':').map(Number);
  return h * 3600 + m * 60 + s + parseInt(ms || '0', 10) / 1000;
}

export function getTranscriptSegment(entries: { start: number; end: number; text: string }[], s: number, e: number) {
  return entries.filter(x => x.end > s && x.start < e).map(x => x.text).join(' ');
}

// ── Gemini API ───────────────────────────────────────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

export async function uploadFileToGemini(file: File, key: string, onProgress?: (p: number) => void): Promise<string> {
  const initRes = await fetch(`${GEMINI_BASE}/upload/v1beta/files?uploadType=resumable&key=${key}`, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(file.size), 'X-Goog-Upload-Header-Content-Type': file.type, 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: { display_name: file.name } }),
  });
  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL') || '';

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0', 'Content-Type': file.type },
    body: file,
  });
  onProgress?.(100);
  const json = await uploadRes.json();
  return json.file?.uri || '';
}

export async function waitForFileActive(uri: string, key: string): Promise<void> {
  const name = uri.split('/').pop();
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${GEMINI_BASE}/v1beta/${name}?key=${key}`).then(r => r.json());
    if (r.state === 'ACTIVE') return;
    await sleep(3000);
  }
}

export async function callGemini(key: string, fileUri: string, start: number, end: number, transcript: string, modelName: string, mode: 'analysis' | 'style-transfer', styleRef?: string): Promise<string> {
  const prompt = mode === 'analysis' ? analysisPrompt(start, end, transcript) : styleTransferPrompt(start, end, transcript, styleRef || '');
  const body = {
    contents: [{ parts: [{ fileData: { mimeType: 'video/mp4', fileUri } }, { text: prompt }] }],
    safetySettings: ['HARM_CATEGORY_HATE_SPEECH','HARM_CATEGORY_DANGEROUS_CONTENT','HARM_CATEGORY_HARASSMENT','HARM_CATEGORY_SEXUALLY_EXPLICIT']
      .map(c => ({ category: c, threshold: 'BLOCK_NONE' })),
  };
  const r = await fetch(`${GEMINI_BASE}/v1beta/models/${modelName}:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await r.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function analysisPrompt(s: number, e: number, transcript: string): string {
  return `حلّل مقطع الفيديو من ${formatTime(s)} إلى ${formatTime(e)}.\n${transcript ? `النص: ${transcript}` : ''}\nاستخرج: إيقاع المونتاج، أنواع القطعات، الحركة، الألوان، الأنماط البصرية. أجب بالعربية.`;
}

function styleTransferPrompt(s: number, e: number, transcript: string, styleRef: string): string {
  return `طبّق الستايل التالي على مقطع الفيديو من ${formatTime(s)} إلى ${formatTime(e)}.\nالستايل المرجعي:\n${styleRef}\n${transcript ? `النص: ${transcript}` : ''}\nأنتج خطة مونتاج تفصيلية (الوقت | الأمر | الشرح). أجب بالعربية.`;
}

// ── Main processor ───────────────────────────────────────────────────────────
const uriCache = new Map<string, string>();

export async function processChunkWithRetry(opts: ProcessChunkOptions): Promise<void> {
  const { chunk, id, apiKeys, modelName, file, transcript, onUpdate, onLog, mode, styleRef } = opts;
  const parsedSRT = parseSRT(transcript);
  const seg       = getTranscriptSegment(parsedSRT, chunk.start, chunk.end);

  onUpdate(id, { status: 'processing', progress: 10 });

  for (let attempt = 0; attempt < apiKeys.length * 2; attempt++) {
    const key = apiKeys[attempt % apiKeys.length];
    try {
      if (!uriCache.has(key)) {
        onLog(`📤 رفع الفيديو (مفتاح ${attempt % apiKeys.length + 1})...`);
        onUpdate(id, { progress: 30, key: `key-${attempt % apiKeys.length + 1}` });
        const uri = await uploadFileToGemini(file, key);
        uriCache.set(key, uri);
        await waitForFileActive(uri, key);
      }
      const uri = uriCache.get(key)!;
      onUpdate(id, { progress: 60 });
      const t0  = Date.now();
      const result = await callGemini(key, uri, chunk.start, chunk.end, seg, modelName, mode, styleRef);
      onUpdate(id, { status: 'done', progress: 100, result, execTime: (Date.now() - t0) / 1000 });
      onLog(`✅ Chunk ${id} اكتمل`);
      return;
    } catch (err: unknown) {
      const msg = String(err);
      onLog(`⚠️ Chunk ${id} خطأ: ${msg.slice(0, 60)}`);
      if (msg.includes('quota') || msg.includes('429')) await sleep(10000);
      else if (msg.includes('403')) { uriCache.delete(key); }
    }
  }
  onUpdate(id, { status: 'error', error: 'فشل بعد عدة محاولات' });
}

// ── Report download ──────────────────────────────────────────────────────────
export function downloadReport(chunks: ChunkCard[], filename: string) {
  const done = chunks.filter(c => c.result).sort((a, b) => a.start - b.start);
  const text = done.map(c => `=== [${formatTime(c.start)} → ${formatTime(c.end)}] ===\n${c.result}`).join('\n\n');
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function formatTime(s: number): string {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function log(msg: string) { console.log(msg); }
