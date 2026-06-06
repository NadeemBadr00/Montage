/**
 * assets/templates/index.ts
 * ─────────────────────────────────────────────────────────────────────
 * Barrel export for all image template categories.
 * Each sub-file stays ≤ 300 lines for easy editing.
 *
 * File map:
 *   image-templates-real-animals.ts       ← Real Dogs/Cats/Bears/Foxes (50)
 *   image-templates-real-humans.ts        ← Real Human Photos (15)
 *   image-templates-avatars.ts            ← DiceBear SVG Avatars (25)
 *   image-templates-emoji-animals.ts      ← Twemoji Animals A (25)
 *   image-templates-emoji-animals-b.ts    ← Twemoji Animals B (25)
 *   image-templates-3d-stickers.ts        ← 3D Characters + Utility Objects
 *   image-templates-3d-social.ts          ← 3D Social & Misc Stickers
 *   image-templates-backgrounds.ts        ← Unsplash Backgrounds A (12)
 *   image-templates-backgrounds-b.ts      ← Unsplash Backgrounds B (12)
 *   image-templates-backgrounds-extra-a.ts ← Picsum Backgrounds A (30)
 *   image-templates-backgrounds-extra-b.ts ← Picsum Backgrounds B (30)
 */

import { Asset } from '../../types/editor.types';

import { imageTplRealAnimals }       from './image-templates-real-animals';
import { imageTplRealHumans }        from './image-templates-real-humans';
import { imageTplAvatars }           from './image-templates-avatars';
import { imageTplEmojiAnimalsA }     from './image-templates-emoji-animals';
import { imageTplEmojiAnimalsB }     from './image-templates-emoji-animals-b';
import { imageTpl3dCharacters,
         imageTpl3dObjectsA }        from './image-templates-3d-stickers';
import { imageTpl3dObjectsB }        from './image-templates-3d-social';
import { imageTplBackgroundsA }      from './image-templates-backgrounds';
import { imageTplBackgroundsB }      from './image-templates-backgrounds-b';
import { imageTplBackgroundsExtraA } from './image-templates-backgrounds-extra-a';
import { imageTplBackgroundsExtraB } from './image-templates-backgrounds-extra-b';

// ── Named exports (for use by individual category) ───────────────────
export {
    imageTplRealAnimals,
    imageTplRealHumans,
    imageTplAvatars,
    imageTplEmojiAnimalsA,
    imageTplEmojiAnimalsB,
    imageTpl3dCharacters,
    imageTpl3dObjectsA,
    imageTpl3dObjectsB,
    imageTplBackgroundsA,
    imageTplBackgroundsB,
    imageTplBackgroundsExtraA,
    imageTplBackgroundsExtraB,
};

// ── Combined export — replaces the old imageTemplates array ──────────
export const allImageTemplates: Asset[] = [
    ...imageTplRealAnimals,
    ...imageTplRealHumans,
    ...imageTplAvatars,
    ...imageTplEmojiAnimalsA,
    ...imageTplEmojiAnimalsB,
    ...imageTpl3dCharacters,
    ...imageTpl3dObjectsA,
    ...imageTpl3dObjectsB,
    ...imageTplBackgroundsA,
    ...imageTplBackgroundsB,
    ...imageTplBackgroundsExtraA,
    ...imageTplBackgroundsExtraB,
];
