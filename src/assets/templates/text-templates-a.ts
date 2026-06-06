import { Asset } from '../../types/editor.types';

export const textTemplatesA: Asset[] = [
    // === 🎬 VIRAL & YOUTUBE STYLES (أشهر ستايلات اليوتيوب والريلز) ===
    {
        id: 'tpl_mrbeast',
        name: 'MrBeast Sub',
        type: 'text',
        src: 'SUBSCRIBE NOW',
        duration: 3,
        templateData: {
            textStyle: { fontFamily: 'Impact', fontWeight: 'bold', fontStyle: 'normal', color: '#ffcc00', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 10, shadowBlur: 10, padding: 0, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'pop', out: 'pop', duration: 0.2 },
            properties: { positionX: 0, positionY: 350, scale: 130, rotation: -3, opacity: 100 }
        }
    },
    {
        id: 'tpl_hormozi',
        name: 'Hormozi Pop',
        type: 'text',
        src: 'SECRET',
        duration: 2,
        templateData: {
            textStyle: { fontFamily: 'Arial Black', fontWeight: 'bold', fontStyle: 'italic', color: '#ffffff', backgroundColor: '#ff0000', backgroundOpacity: 100, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 5, padding: 15, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'zoomIn', out: 'fade', duration: 0.1 },
            properties: { positionX: 0, positionY: 0, scale: 200, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_ali_abdaal',
        name: 'Ali Abdaal Vlog',
        type: 'text',
        src: 'Productivity',
        duration: 5,
        templateData: {
            textStyle: { fontFamily: 'Inter', fontWeight: 'bold', fontStyle: 'normal', color: '#000000', backgroundColor: '#ffffff', backgroundOpacity: 100, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 10, padding: 25, textAlign: 'center', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'slideUp', out: 'fade', duration: 0.4 },
            properties: { positionX: -500, positionY: -350, scale: 80, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_gaming_neon',
        name: 'Gaming Neon',
        type: 'text',
        src: 'HEADSHOT',
        duration: 4,
        templateData: {
            textStyle: { fontFamily: 'Impact', fontWeight: 'normal', fontStyle: 'italic', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#ff00ff', strokeWidth: 4, shadowBlur: 20, padding: 10, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'pop', out: 'zoomOut', duration: 0.3 },
            properties: { positionX: 0, positionY: 0, scale: 220, rotation: -5, opacity: 100 }
        }
    },

    // === 🎥 CINEMATIC & DOCUMENTARY (وثائقي وسينمائي) ===
    {
        id: 'tpl_netflix',
        name: 'Netflix Title',
        type: 'text',
        src: 'A NETFLIX ORIGINAL',
        duration: 6,
        templateData: {
            textStyle: { fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', color: '#e50914', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 5, padding: 10, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'zoomIn', out: 'fade', duration: 1.5 },
            properties: { positionX: 0, positionY: 0, scale: 80, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_cinematic_epic',
        name: 'Epic Trailer',
        type: 'text',
        src: 'IN A WORLD...',
        duration: 6,
        templateData: {
            textStyle: { fontFamily: 'Times New Roman', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 30, padding: 10, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'fade', out: 'fade', duration: 2 },
            properties: { positionX: 0, positionY: 0, scale: 120, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_typewriter_doc',
        name: 'Doc Typewriter',
        type: 'text',
        src: 'CLASSIFIED DATA\n12-05-1998',
        duration: 5,
        templateData: {
            textStyle: { fontFamily: 'Courier New', fontWeight: 'bold', fontStyle: 'normal', color: '#00ffcc', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 10, padding: 10, textAlign: 'left', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'typewriter', out: 'fade', duration: 1.5 },
            properties: { positionX: -500, positionY: 350, scale: 90, rotation: 0, opacity: 100 }
        }
    },

    // === 📰 LOWER THIRDS & NEWS (تعريفيات وأخبار احترافية) ===
    {
        id: 'tpl_news_bbc',
        name: 'BBC Lower Third',
        type: 'text',
        src: 'JOHN SMITH\nSenior Analyst',
        duration: 6,
        templateData: {
            textStyle: { fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#cc0000', backgroundOpacity: 100, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 0, padding: 25, textAlign: 'left', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'slideRight', out: 'slideLeft', duration: 0.5 },
            properties: { positionX: -600, positionY: 350, scale: 100, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_news_aljazeera',
        name: 'Aljazeera Banner',
        type: 'text',
        src: 'تغطية خاصة | أحداث اليوم',
        duration: 8,
        templateData: {
            textStyle: { fontFamily: 'Cairo', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#b30000', backgroundOpacity: 100, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 0, padding: 20, textAlign: 'right', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'slideLeft', out: 'slideRight', duration: 0.7 },
            properties: { positionX: 400, positionY: 420, scale: 120, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_modern_name',
        name: 'Apple Style Name',
        type: 'text',
        src: 'Craig Federighi',
        duration: 6,
        templateData: {
            textStyle: { fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 30, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 10, padding: 15, textAlign: 'center', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'slideUp', out: 'fade', duration: 0.6 },
            properties: { positionX: 0, positionY: 350, scale: 80, rotation: 0, opacity: 100 }
        }
    },

    // === 📱 SOCIAL MEDIA & CREATORS (صناع المحتوى والسوشيال ميديا) ===
    {
        id: 'tpl_tiktok_handle',
        name: 'TikTok @User',
        type: 'text',
        src: '@tiktok_creator',
        duration: 10,
        templateData: {
            textStyle: { fontFamily: 'Inter', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 80, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 5, padding: 12, textAlign: 'center', textTransform: 'lowercase', textDecoration: 'none' },
            transitions: { in: 'pop', out: 'fade', duration: 0.3 },
            properties: { positionX: 0, positionY: -420, scale: 90, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_ig_aesthetic',
        name: 'IG Aesthetic',
        type: 'text',
        src: 'vibes only ✨',
        duration: 5,
        templateData: {
            textStyle: { fontFamily: 'Times New Roman', fontWeight: 'normal', fontStyle: 'italic', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 15, padding: 0, textAlign: 'center', textTransform: 'lowercase', textDecoration: 'none' },
            transitions: { in: 'fade', out: 'fade', duration: 1.5 },
            properties: { positionX: 0, positionY: 0, scale: 100, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_meme_impact',
        name: 'Classic Meme',
        type: 'text',
        src: 'WHEN YOU REALIZE',
        duration: 5,
        templateData: {
            textStyle: { fontFamily: 'Impact', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 6, shadowBlur: 0, padding: 10, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'none', out: 'none', duration: 0 },
            properties: { positionX: 0, positionY: -400, scale: 150, rotation: 0, opacity: 100 }
        }
    },

    // === ✨ CREATIVE & AESTHETIC (فني ومبتكر) ===
    {
        id: 'tpl_cyberpunk',
        name: 'Cyberpunk 2077',
        type: 'text',
        src: 'WAKE UP',
        duration: 4,
        templateData: {
            textStyle: { fontFamily: 'Arial Black', fontWeight: 'bold', fontStyle: 'normal', color: '#fcee0a', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#00ffff', strokeWidth: 4, shadowBlur: 20, padding: 10, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'pop', out: 'zoomOut', duration: 0.2 },
            properties: { positionX: 0, positionY: 0, scale: 250, rotation: 2, opacity: 100 }
        }
    },
    {
        id: 'tpl_vhs_retro',
        name: 'VHS Retro Date',
        type: 'text',
        src: 'REC  •  12:00 AM',
        duration: 15,
        templateData: {
            textStyle: { fontFamily: 'Courier New', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 10, padding: 10, textAlign: 'left', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'fade', out: 'fade', duration: 0.1 },
            properties: { positionX: -650, positionY: 420, scale: 90, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_arabic_poetry',
        name: 'Arabic Poetry',
        type: 'text',
        src: 'وما نيل المطالب بالتمني',
        duration: 7,
        templateData: {
            textStyle: { fontFamily: 'Cairo', fontWeight: 'normal', fontStyle: 'italic', color: '#f3f4f6', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 15, padding: 10, textAlign: 'center', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'slideUp', out: 'fade', duration: 1.2 },
            properties: { positionX: 0, positionY: 0, scale: 120, rotation: 0, opacity: 100 }
        }
    },

    // === 🎯 SUBTITLES (الترجمة السفلية القياسية) ===
    {
        id: 'tpl_sub_yellow',
        name: 'Yellow Subtitle',
        type: 'text',
        src: 'This is a yellow subtitle.',
        duration: 4,
        templateData: {
            textStyle: { fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', color: '#ffff00', backgroundColor: '#000000', backgroundOpacity: 80, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 0, padding: 12, textAlign: 'center', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'none', out: 'none', duration: 0 },
            properties: { positionX: 0, positionY: 420, scale: 85, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_sub_white',
        name: 'White Clean Sub',
        type: 'text',
        src: 'Standard white subtitle.',
        duration: 4,
        templateData: {
            textStyle: { fontFamily: 'Inter', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 50, strokeColor: '#000000', strokeWidth: 1, shadowBlur: 5, padding: 10, textAlign: 'center', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'none', out: 'none', duration: 0 },
            properties: { positionX: 0, positionY: 420, scale: 80, rotation: 0, opacity: 100 }
        }
    },
];
