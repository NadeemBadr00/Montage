import { Asset } from '../../types/editor.types';

export const textTemplatesB: Asset[] = [
    // === 📑 MULTI-LINE & DIVERSE (قوالب متعددة الأسطر ومتنوعة) ===
    {
        id: 'tpl_end_credits',
        name: 'End Credits',
        type: 'text',
        src: 'DIRECTED BY\nChristopher Nolan\n\nPRODUCED BY\nEmma Thomas\n\nSTARRING\nLeonardo DiCaprio\nTom Hardy\nCillian Murphy',
        duration: 10,
        templateData: {
            textStyle: { fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 10, padding: 10, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'slideUp', out: 'fade', duration: 3.0 },
            properties: { positionX: 0, positionY: 0, scale: 70, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_bullet_points',
        name: 'Tutorial List',
        type: 'text',
        src: '📋 TODAY\'S LESSON:\n\n• First Step\n• Second Step\n• Final Conclusion',
        duration: 8,
        templateData: {
            textStyle: { fontFamily: 'Inter', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#1e293b', backgroundOpacity: 90, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 0, padding: 25, textAlign: 'left', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'slideRight', out: 'slideLeft', duration: 0.6 },
            properties: { positionX: -400, positionY: 0, scale: 85, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_code_snippet',
        name: 'Code Snippet',
        type: 'text',
        src: 'function helloWorld() {\n  console.log(\"Welcome!\");\n  return true;\n}',
        duration: 6,
        templateData: {
            textStyle: { fontFamily: 'Courier New', fontWeight: 'bold', fontStyle: 'normal', color: '#00ffcc', backgroundColor: '#000000', backgroundOpacity: 95, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 15, padding: 30, textAlign: 'left', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'typewriter', out: 'fade', duration: 2.0 },
            properties: { positionX: 0, positionY: 0, scale: 90, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_warning_sign',
        name: 'Warning Sign',
        type: 'text',
        src: '⚠️ WARNING ⚠️\n\nDo not attempt this at home.\nProfessional drivers on a closed course.',
        duration: 5,
        templateData: {
            textStyle: { fontFamily: 'Impact', fontWeight: 'normal', fontStyle: 'normal', color: '#000000', backgroundColor: '#ffcc00', backgroundOpacity: 100, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 0, padding: 30, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'pop', out: 'zoomOut', duration: 0.3 },
            properties: { positionX: 0, positionY: 0, scale: 100, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_long_quote',
        name: 'Long Quote',
        type: 'text',
        src: '"The only limit to our realization\nof tomorrow will be our doubts of today."\n\n- Franklin D. Roosevelt',
        duration: 8,
        templateData: {
            textStyle: { fontFamily: 'Times New Roman', fontWeight: 'normal', fontStyle: 'italic', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 50, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 10, padding: 40, textAlign: 'center', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'fade', out: 'fade', duration: 1.5 },
            properties: { positionX: 0, positionY: 0, scale: 80, rotation: 0, opacity: 100 }
        }
    },

    // === 🎙️ PODCAST & INTERVIEWS (البودكاست والمقابلات) ===
    {
        id: 'tpl_podcast_guest',
        name: 'Podcast Guest',
        type: 'text',
        src: 'GUEST NAME\nCEO at Company',
        duration: 8,
        templateData: {
            textStyle: { fontFamily: 'Inter', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#111827', backgroundOpacity: 85, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 15, padding: 20, textAlign: 'left', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'slideRight', out: 'fade', duration: 0.8 },
            properties: { positionX: -550, positionY: 350, scale: 90, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_interview_question',
        name: 'Interview Q&A',
        type: 'text',
        src: 'Q: How did you build\nyour first million?',
        duration: 6,
        templateData: {
            textStyle: { fontFamily: 'Georgia', fontWeight: 'bold', fontStyle: 'italic', color: '#facc15', backgroundColor: '#000000', backgroundOpacity: 0, strokeColor: '#000000', strokeWidth: 2, shadowBlur: 15, padding: 10, textAlign: 'center', textTransform: 'none', textDecoration: 'none' },
            transitions: { in: 'fade', out: 'fade', duration: 1.0 },
            properties: { positionX: 0, positionY: -350, scale: 100, rotation: 0, opacity: 100 }
        }
    },

    // === 🏙️ VLOG & LIFESTYLE (فلوجات ولايف ستايل) ===
    {
        id: 'tpl_vlog_location',
        name: 'Vlog Location',
        type: 'text',
        src: '📍 TOKYO, JAPAN\nDay 1',
        duration: 5,
        templateData: {
            textStyle: { fontFamily: 'Inter', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: 30, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 20, padding: 15, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'zoomIn', out: 'fade', duration: 0.5 },
            properties: { positionX: 0, positionY: -380, scale: 90, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_fitness_workout',
        name: 'Fitness Title',
        type: 'text',
        src: 'WORKOUT 1\nPush-ups (4 Sets)',
        duration: 5,
        templateData: {
            textStyle: { fontFamily: 'Impact', fontWeight: 'bold', fontStyle: 'italic', color: '#ffffff', backgroundColor: '#ea580c', backgroundOpacity: 100, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 0, padding: 25, textAlign: 'left', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'slideLeft', out: 'slideRight', duration: 0.4 },
            properties: { positionX: 500, positionY: -400, scale: 110, rotation: 0, opacity: 100 }
        }
    },

    // === 💰 COMMERCIAL & PROMO (إعلانات وعقارات) ===
    {
        id: 'tpl_real_estate',
        name: 'Real Estate Villa',
        type: 'text',
        src: 'LUXURY VILLA\n$4,500,000',
        duration: 7,
        templateData: {
            textStyle: { fontFamily: 'Times New Roman', fontWeight: 'normal', fontStyle: 'normal', color: '#fbbf24', backgroundColor: '#000000', backgroundOpacity: 60, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 10, padding: 30, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'fade', out: 'fade', duration: 2.0 },
            properties: { positionX: 0, positionY: 0, scale: 120, rotation: 0, opacity: 100 }
        }
    },
    {
        id: 'tpl_promo_offer',
        name: 'Promo Offer',
        type: 'text',
        src: 'ONLY $99.99\nLimited Time Offer 🔥',
        duration: 4,
        templateData: {
            textStyle: { fontFamily: 'Arial Black', fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff', backgroundColor: '#dc2626', backgroundOpacity: 100, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 15, padding: 20, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'pop', out: 'zoomOut', duration: 0.3 },
            properties: { positionX: 0, positionY: 350, scale: 110, rotation: 5, opacity: 100 }
        }
    },

    // === 🗣️ ENGAGEMENT (تفاعل شورتس وريلز) ===
    {
        id: 'tpl_shorts_question',
        name: 'Shorts Engagement',
        type: 'text',
        src: 'WHAT DO YOU THINK?\nLet me know in the comments 👇',
        duration: 5,
        templateData: {
            textStyle: { fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', color: '#000000', backgroundColor: '#fbbf24', backgroundOpacity: 100, strokeColor: '#000000', strokeWidth: 0, shadowBlur: 5, padding: 20, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'none' },
            transitions: { in: 'slideUp', out: 'slideDown', duration: 0.4 },
            properties: { positionX: 0, positionY: 380, scale: 95, rotation: 0, opacity: 100 }
        }
    },
];
