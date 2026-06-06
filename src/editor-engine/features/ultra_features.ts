// @ts-nocheck
/**
 * 🌟 AI4Montage Ultra Features — Bootstrap
 * تم تقسيم هذا الملف إلى 5 وحدات منفصلة في مجلد ultra/
 * هذا الملف يستورد الوحدات بالترتيب الصحيح
 *
 * الترتيب مهم — كل وحدة تُضاف على window.EditorApp.prototype
 * ولا يجب تغيير ترتيب الـ imports
 */

// 1. AI model init, worker results, predictive caching, mask export
import './ultra/ultra-ai-segmentation';

// 2. WebGL context, GLSL shaders, texture setup and image cache
import './ultra/ultra-webgl-init';

// 3. WebGL composition rendering, layer drawing, transitions, masks
import './ultra/ultra-webgl-renderer';

// 4. Effect Controls panel HTML generation, AI toggle, property updates
import './ultra/ultra-effect-controls';

// 5. Social media frame overlay UI (TikTok/YouTube/Instagram) + fitMediaToFrame
import './ultra/ultra-frame-overlay';
