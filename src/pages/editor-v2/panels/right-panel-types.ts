// ─── RightPanel Types & Shared Constants ──────────────────────────────────────
// Extracted from RightPanel.tsx for shared use across panel sub-components

export interface ChatMessage {
  id: number;
  role: 'user' | 'ai' | 'cmd' | 'error';
  text: string;
}

export interface SuggestionItem {
  cmd: string;
  desc: string;
  color: string;
  category: string;
  icon: string;
}

export const EXAMPLES = [
  'اقطع الفيديو عند الثانية 30 على V1',
  'كبّر الكليب الأول 150%',
  'احذف الكليب المحدد',
  'أضف تراك صوت جديد',
  'ارجع للخطوة السابقة',
];
