import { Asset } from '../types/editor.types';

export const framesTemplates: Asset[] = [
  {
    id: 'frame_smartphone_1',
    name: 'Smartphone Mockup',
    type: 'image',
    src: '/images/frame_phone.svg',
    duration: 5.0,
    thumbnail: '/images/frame_phone.svg',
    templateData: {
      properties: {
        scale: 40,
        positionX: 0,
        positionY: 0,
        rotation: 0
      }
    }
  },
  {
    id: 'frame_laptop_1',
    name: 'Laptop Mockup',
    type: 'image',
    src: '/images/frame_laptop.svg',
    duration: 5.0,
    thumbnail: '/images/frame_laptop.svg',
    templateData: {
      properties: {
        scale: 60,
        positionX: 0,
        positionY: 0,
        rotation: 0
      }
    }
  },
  {
    id: 'frame_monitor_1',
    name: 'PC Monitor Mockup',
    type: 'image',
    src: '/images/frame_monitor.svg',
    duration: 5.0,
    thumbnail: '/images/frame_monitor.svg',
    templateData: {
      properties: {
        scale: 70,
        positionX: 0,
        positionY: 0,
        rotation: 0
      }
    }
  },
  {
    id: 'frame_tv_1',
    name: 'Smart TV Mockup',
    type: 'image',
    src: '/images/frame_tv.svg',
    duration: 5.0,
    thumbnail: '/images/frame_tv.svg',
    templateData: {
      properties: {
        scale: 80,
        positionX: 0,
        positionY: 0,
        rotation: 0
      }
    }
  },
  {
    id: 'frame_tablet_1',
    name: 'Tablet Mockup',
    type: 'image',
    src: '/images/frame_tablet.svg',
    duration: 5.0,
    thumbnail: '/images/frame_tablet.svg',
    templateData: {
      properties: {
        scale: 50,
        positionX: 0,
        positionY: 0,
        rotation: 0
      }
    }
  },
  {
    id: 'frame_real_iphone_1',
    name: 'Real iPhone Mockup',
    type: 'image',
    src: '/images/frame_real_iphone.webp',
    duration: 5.0,
    thumbnail: '/images/frame_real_iphone.webp',
    templateData: { properties: { scale: 40, positionX: 0, positionY: 0, rotation: 0 } }
  },
  {
    id: 'frame_real_samsung_1',
    name: 'Real Android Mockup',
    type: 'image',
    src: '/images/frame_real_samsung.webp',
    duration: 5.0,
    thumbnail: '/images/frame_real_samsung.webp',
    templateData: { properties: { scale: 40, positionX: 0, positionY: 0, rotation: 0 } }
  },
  {
    id: 'frame_real_ipad_1',
    name: 'Real iPad Mockup',
    type: 'image',
    src: '/images/frame_real_ipad.webp',
    duration: 5.0,
    thumbnail: '/images/frame_real_ipad.webp',
    templateData: { properties: { scale: 50, positionX: 0, positionY: 0, rotation: 0 } }
  },
  {
    id: 'frame_real_laptop_1',
    name: 'Real MacBook Mockup',
    type: 'image',
    src: '/images/frame_real_laptop.webp',
    duration: 5.0,
    thumbnail: '/images/frame_real_laptop.webp',
    templateData: { properties: { scale: 60, positionX: 0, positionY: 0, rotation: 0 } }
  },
  {
    id: 'frame_real_monitor_1',
    name: 'Real PC Monitor Mockup',
    type: 'image',
    src: '/images/frame_real_monitor.webp',
    duration: 5.0,
    thumbnail: '/images/frame_real_monitor.webp',
    templateData: { properties: { scale: 70, positionX: 0, positionY: 0, rotation: 0 } }
  },
  {
    id: 'frame_real_ui_instagram_1',
    name: 'Instagram Reels Frame',
    type: 'image',
    src: '/images/frame_real_ui_instagram.webp',
    duration: 5.0,
    thumbnail: '/images/frame_real_ui_instagram.webp',
    templateData: { properties: { scale: 40, positionX: 0, positionY: 0, rotation: 0 } }
  },
  {
    id: 'frame_real_ui_tiktok_1',
    name: 'TikTok UI Frame',
    type: 'image',
    src: '/images/frame_real_ui_tiktok.webp',
    duration: 5.0,
    thumbnail: '/images/frame_real_ui_tiktok.webp',
    templateData: { properties: { scale: 40, positionX: 0, positionY: 0, rotation: 0 } }
  },
  {
    id: 'frame_real_ui_youtube_1',
    name: 'YouTube UI Frame',
    type: 'image',
    src: '/images/frame_real_ui_youtube.webp',
    duration: 5.0,
    thumbnail: '/images/frame_real_ui_youtube.webp',
    templateData: { properties: { scale: 70, positionX: 0, positionY: 0, rotation: 0 } }
  },

  // ─── Social Media Overlay (Animated Live Comments) ───────────────
  {
    id: 'overlay_tiktok_live',
    name: '🎵 TikTok Live Overlay',
    type: 'overlay',
    src: '__social_overlay__',
    duration: 30.0,
    thumbnail: '/images/frame_real_ui_tiktok.webp',
    templateData: {
      properties: { scale: 100, positionX: 0, positionY: 0, rotation: 0, opacity: 100 },
      effects: { socialOverlay: { enabled: true, platform: 'tiktok', showLive: true } }
    }
  },
  {
    id: 'overlay_instagram_live',
    name: '📸 Instagram Live Overlay',
    type: 'overlay',
    src: '__social_overlay__',
    duration: 30.0,
    thumbnail: '/images/frame_real_ui_instagram.webp',
    templateData: {
      properties: { scale: 100, positionX: 0, positionY: 0, rotation: 0, opacity: 100 },
      effects: { socialOverlay: { enabled: true, platform: 'instagram', showLive: true } }
    }
  },
  {
    id: 'overlay_youtube_live',
    name: '▶️ YouTube Live Overlay',
    type: 'overlay',
    src: '__social_overlay__',
    duration: 30.0,
    thumbnail: '/images/frame_real_ui_youtube.webp',
    templateData: {
      properties: { scale: 100, positionX: 0, positionY: 0, rotation: 0, opacity: 100 },
      effects: { socialOverlay: { enabled: true, platform: 'youtube', showLive: true } }
    }
  },
];
