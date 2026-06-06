// @ts-nocheck
import { 
    applyTemplate_SmartSandwich, applyTemplate_MahraganatSync, applyTemplate_NeonCaptions, 
    applyTemplate_GoldenHour, applyTemplate_SplitReaction,
    applyTemplate_WipeCamera, applyTemplate_TopTen, applyTemplate_Silhouette,
    applyTemplate_LoveStory, applyTemplate_RetroVHS, applyTemplate_GlowUp,
    applyTemplate_CyberpunkGlitch, applyTemplate_SimpleBlur, applyTemplate_Polaroid,
    applyTemplate_TTSNarrator
} from './template-functions';

export class TemplateManager {
    constructor() {
        this.templates = new Map();
        
        // Register native template functions
        this.register('smart-sandwich', applyTemplate_SmartSandwich);
        this.register('mahraganat-sync', applyTemplate_MahraganatSync);
        this.register('neon-captions', applyTemplate_NeonCaptions);
        this.register('golden-hour', applyTemplate_GoldenHour);
        this.register('split-reaction', applyTemplate_SplitReaction);
        this.register('wipe-camera', applyTemplate_WipeCamera);
        this.register('top-ten', applyTemplate_TopTen);
        this.register('silhouette', applyTemplate_Silhouette);
        this.register('love-story', applyTemplate_LoveStory);
        this.register('retro-vhs', applyTemplate_RetroVHS);
        this.register('glow-up', applyTemplate_GlowUp);
        this.register('cyberpunk-glitch', applyTemplate_CyberpunkGlitch);
        this.register('simple-blur', applyTemplate_SimpleBlur);
        this.register('polaroid', applyTemplate_Polaroid);
        this.register('tts-narrator', applyTemplate_TTSNarrator);
    }

    register(id: string, applyFn: Function) {
        this.templates.set(id, applyFn);
    }

    async applyTemplate(appInstance: any, templateId: string, mainClipId: string, secondaryClipId?: string, options: any = {}) {
        const applyFn = this.templates.get(templateId);
        if (!applyFn) {
            console.error(`Template ${templateId} not found`);
            if (appInstance.log) appInstance.log(`❌ لم يتم العثور على القالب: ${templateId}`);
            return false;
        }

        if (appInstance.log) appInstance.log(`⏳ جاري تطبيق قالب: ${templateId}...`);
        
        try {
            if (appInstance.saveState) appInstance.saveState(); // Save undo state before massive changes
            
            await applyFn(appInstance, mainClipId, secondaryClipId, options);
            
            if (appInstance.requestRedraw) appInstance.requestRedraw();
            if (appInstance.commitStateToReact) appInstance.commitStateToReact();
            
            if (appInstance.log) appInstance.log(`✅ تم تطبيق القالب بنجاح!`);
            return true;
        } catch (error) {
            console.error("Template execution failed:", error);
            if (appInstance.log) appInstance.log(`❌ فشل تطبيق القالب: ${error.message}`);
            return false;
        }
    }
}

// Inject into Engine
export function injectTemplateManager(app: any) {
    app.templateManager = new TemplateManager();
    app.applySmartTemplate = function(templateId: string, mainClipId: string, secondaryClipId?: string, options: any = {}) {
        return this.templateManager.applyTemplate(this, templateId, mainClipId, secondaryClipId, options);
    };
}
