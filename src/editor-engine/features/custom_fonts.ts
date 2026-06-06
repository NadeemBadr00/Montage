// @ts-nocheck
// custom_fonts.ts — Custom Font Upload & Registration System

if (window.EditorApp && window.EditorApp.prototype) {

    // Storage for loaded custom fonts
    window._customFonts = window._customFonts || [];

    /**
     * Load a custom font from a File object or URL.
     */
    window.EditorApp.prototype.loadCustomFont = async function(fontFileOrUrl, fontName?: string) {
        let url, name;
        
        if (typeof fontFileOrUrl === 'string') {
            url = fontFileOrUrl;
            name = fontName || url.split('/').pop()?.replace(/\.\w+$/, '') || 'Custom Font';
        } else if (fontFileOrUrl instanceof File) {
            url = URL.createObjectURL(fontFileOrUrl);
            name = fontName || fontFileOrUrl.name.replace(/\.\w+$/, '');
        } else {
            this.log("❌ مدخل غير صحيح. مرر ملف خط أو رابط URL.");
            return;
        }

        // Check if already loaded
        if (window._customFonts.some(f => f.name === name)) {
            this.log(`⚠️ الخط "${name}" محمّل بالفعل.`);
            return;
        }

        try {
            this.log(`🔤 تحميل الخط: "${name}"...`);
            const fontFace = new FontFace(name, `url(${url})`);
            const loaded = await fontFace.load();
            document.fonts.add(loaded);
            
            window._customFonts.push({ name, url, fontFace: loaded });
            
            this.log(`✅ تم تحميل الخط "${name}" بنجاح!`);
            this.log(`💡 استخدم الخط في النصوص عبر اختياره من قائمة الخطوط.`);
            
            // Notify UI to refresh font list
            window.dispatchEvent(new CustomEvent('customFontsUpdated', { 
                detail: { fonts: window._customFonts.map(f => f.name) } 
            }));

            // Trigger redraw so existing text clips update
            this.requestRedraw();
            
        } catch (err) {
            this.log(`❌ فشل تحميل الخط "${name}": ${err.message}`);
        }
    };

    /**
     * Remove a custom font by name.
     */
    window.EditorApp.prototype.removeCustomFont = function(fontName) {
        const idx = window._customFonts.findIndex(f => f.name === fontName);
        if (idx === -1) {
            this.log(`❌ الخط "${fontName}" غير موجود.`);
            return;
        }
        const font = window._customFonts[idx];
        document.fonts.delete(font.fontFace);
        URL.revokeObjectURL(font.url);
        window._customFonts.splice(idx, 1);
        this.log(`🗑️ تم حذف الخط "${fontName}".`);
        window.dispatchEvent(new CustomEvent('customFontsUpdated', { 
            detail: { fonts: window._customFonts.map(f => f.name) } 
        }));
    };

    /**
     * List all loaded custom fonts.
     */
    window.EditorApp.prototype.listCustomFonts = function() {
        if (window._customFonts.length === 0) {
            this.log("📋 لا توجد خطوط مخصصة. استخدم /loadfont لتحميل خط.");
            return [];
        }
        this.log(`📋 الخطوط المحملة (${window._customFonts.length}):`);
        window._customFonts.forEach((f, i) => {
            this.log(`  ${i + 1}. "${f.name}"`);
        });
        return window._customFonts.map(f => f.name);
    };

    /**
     * Apply a font to selected text clips.
     */
    window.EditorApp.prototype.applyFontToSelected = function(fontName) {
        const ids = Array.from(this.selectedClipIds);
        let count = 0;
        this.tracks.forEach(t => t.clips.forEach(c => {
            if (ids.includes(c.id) && c.type === 'text') {
                c.textStyle = c.textStyle || {};
                c.textStyle.fontFamily = fontName;
                count++;
            }
        }));
        if (count > 0) {
            this.log(`✅ تم تطبيق خط "${fontName}" على ${count} كليب نصي.`);
            this.saveState();
            this.requestRedraw();
            this.commitStateToReact();
        } else {
            this.log("❌ لا توجد كليبات نصية محددة.");
        }
    };
}

/**
 * React hook helper: trigger font file picker dialog.
 */
export async function openFontFilePicker(): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ttf,.otf,.woff,.woff2';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0] || null;
            resolve(file);
        };
        input.click();
    });
}

/**
 * Get list of all available fonts (system + custom + built-in).
 */
export function getAllFonts(): string[] {
    const BUILTIN_FONTS = [
        'Cairo', 'Inter', 'Roboto', 'Open Sans', 'Montserrat',
        'Poppins', 'Lato', 'Raleway', 'Oswald', 'Merriweather',
        'Bebas Neue', 'Anton', 'Pacifico', 'Abril Fatface', 'Dancing Script',
        'IBM Plex Mono', 'Fira Code', 'Space Mono', 'Courier New',
        'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma',
        'IBM Plex Arabic', 'Tajawal', 'Almarai', 'Amiri', 'Scheherazade New'
    ];
    
    const customFontNames = (window._customFonts || []).map((f: any) => f.name);
    
    return [...customFontNames, ...BUILTIN_FONTS.filter(f => !customFontNames.includes(f))];
}
