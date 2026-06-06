/**
 * imageTemplates.ts
 * ─────────────────────────────────────────────────────────────────────
 * THIS FILE IS A BARREL — do NOT add data here directly.
 *
 * All image template data is split into focused files under:
 *   src/assets/templates/
 *
 * To add new images → edit the relevant category file:
 *   templates/image-templates-real-animals.ts     ← Dogs, Cats, Bears, Foxes
 *   templates/image-templates-real-humans.ts      ← Real Human Photos
 *   templates/image-templates-avatars.ts          ← DiceBear Avatars
 *   templates/image-templates-emoji-animals.ts    ← Twemoji Animals A
 *   templates/image-templates-emoji-animals-b.ts  ← Twemoji Animals B
 *   templates/image-templates-3d-stickers.ts      ← 3D Characters + Objects
 *   templates/image-templates-3d-social.ts        ← 3D Social Stickers
 *   templates/image-templates-backgrounds.ts      ← Unsplash Backgrounds A
 *   templates/image-templates-backgrounds-b.ts    ← Unsplash Backgrounds B
 *   templates/image-templates-backgrounds-extra-a.ts ← Picsum Backgrounds A
 *   templates/image-templates-backgrounds-extra-b.ts ← Picsum Backgrounds B
 */

import { Asset } from '../types/editor.types';
import { allImageTemplates } from './templates/index';

// Re-export as `imageTemplates` to maintain backward compatibility
export const imageTemplates: Asset[] = allImageTemplates;
