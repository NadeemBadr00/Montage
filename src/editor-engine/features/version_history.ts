// @ts-nocheck
// version_history.ts — Timeline Snapshot & Version History System

const VERSION_HISTORY_KEY_PREFIX = 'ai4montage_vhistory_';
const MAX_VERSIONS = 20;

if (window.EditorApp && window.EditorApp.prototype) {

    /**
     * Save a named snapshot of the current timeline state.
     */
    window.EditorApp.prototype.saveVersion = function(name?: string) {
        const projectId = (window as any).currentProjectId || 'default';
        const versionName = name || `Snapshot ${new Date().toLocaleTimeString('ar-EG')}`;
        
        const snapshot = {
            id: `v_${Date.now()}`,
            name: versionName,
            timestamp: Date.now(),
            tracks: JSON.parse(JSON.stringify(this.tracks)),
            duration: this.duration,
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            fps: this.fps,
            markers: JSON.parse(JSON.stringify(this.markers || [])),
        };

        // Load existing history
        const key = `${VERSION_HISTORY_KEY_PREFIX}${projectId}`;
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) { history = []; }

        // Add new snapshot at beginning
        history.unshift(snapshot);

        // Keep only MAX_VERSIONS
        if (history.length > MAX_VERSIONS) history = history.slice(0, MAX_VERSIONS);

        // Save back
        try {
            localStorage.setItem(key, JSON.stringify(history));
            this.log(`📸 تم حفظ نسخة: "${versionName}" (${history.length}/${MAX_VERSIONS})`);
        } catch (e) {
            this.log("❌ فشل حفظ النسخة: الذاكرة ممتلئة. احذف بعض النسخ القديمة.");
        }

        // Notify UI
        window.dispatchEvent(new CustomEvent('versionHistoryUpdated', { detail: { history } }));
        return snapshot.id;
    };

    /**
     * List all saved versions for current project.
     */
    window.EditorApp.prototype.listVersions = function() {
        const projectId = (window as any).currentProjectId || 'default';
        const key = `${VERSION_HISTORY_KEY_PREFIX}${projectId}`;
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) { history = []; }
        
        if (history.length === 0) {
            this.log("📋 لا توجد نسخ محفوظة. استخدم /saveversion لحفظ نسخة.");
            return [];
        }
        
        this.log(`📋 النسخ المحفوظة (${history.length}/${MAX_VERSIONS}):`);
        history.forEach((v, i) => {
            const date = new Date(v.timestamp).toLocaleString('ar-EG');
            const clipCount = v.tracks?.reduce((acc, t) => acc + (t.clips?.length || 0), 0) || 0;
            this.log(`  ${i + 1}. "${v.name}" — ${date} (${clipCount} كليب)`);
        });
        
        return history;
    };

    /**
     * Restore a version by index (1-based) or ID.
     */
    window.EditorApp.prototype.restoreVersion = function(indexOrId) {
        const projectId = (window as any).currentProjectId || 'default';
        const key = `${VERSION_HISTORY_KEY_PREFIX}${projectId}`;
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) { history = []; }
        
        if (history.length === 0) {
            this.log("❌ لا توجد نسخ للاستعادة.");
            return;
        }

        let version;
        if (typeof indexOrId === 'number') {
            version = history[indexOrId - 1]; // 1-based
        } else {
            version = history.find(v => v.id === indexOrId);
        }

        if (!version) {
            this.log(`❌ النسخة رقم ${indexOrId} غير موجودة.`);
            return;
        }

        // Save current state as an emergency backup before restoring
        this.saveVersion(`قبل الاستعادة (تلقائي)`);
        
        // Restore
        this.tracks = version.tracks;
        this.duration = version.duration;
        if (version.canvasWidth) this.canvasWidth = version.canvasWidth;
        if (version.canvasHeight) this.canvasHeight = version.canvasHeight;
        if (version.fps) this.fps = version.fps;
        if (version.markers) this.markers = version.markers;

        this.log(`✅ تم استعادة النسخة: "${version.name}"`);
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
    };

    /**
     * Delete a version by index or all versions.
     */
    window.EditorApp.prototype.deleteVersion = function(indexOrId) {
        const projectId = (window as any).currentProjectId || 'default';
        const key = `${VERSION_HISTORY_KEY_PREFIX}${projectId}`;
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) { history = []; }
        
        if (indexOrId === 'all') {
            localStorage.removeItem(key);
            this.log("🗑️ تم حذف جميع النسخ المحفوظة.");
            window.dispatchEvent(new CustomEvent('versionHistoryUpdated', { detail: { history: [] } }));
            return;
        }

        const idx = typeof indexOrId === 'number' ? indexOrId - 1 : history.findIndex(v => v.id === indexOrId);
        if (idx < 0 || idx >= history.length) {
            this.log(`❌ النسخة ${indexOrId} غير موجودة.`);
            return;
        }

        const deleted = history.splice(idx, 1)[0];
        localStorage.setItem(key, JSON.stringify(history));
        this.log(`🗑️ تم حذف النسخة: "${deleted.name}".`);
        window.dispatchEvent(new CustomEvent('versionHistoryUpdated', { detail: { history } }));
    };

    /**
     * Get version history for UI rendering.
     */
    window.EditorApp.prototype.getVersionHistory = function() {
        const projectId = (window as any).currentProjectId || 'default';
        const key = `${VERSION_HISTORY_KEY_PREFIX}${projectId}`;
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) {
            return [];
        }
    };

    // Auto-save a version every 5 minutes if changes were made
    let _autoVersionTimer = null;
    let _lastAutoVersionTime = 0;
    
    const originalSaveState = window.EditorApp.prototype.saveState;
    if (originalSaveState) {
        window.EditorApp.prototype.saveState = function() {
            originalSaveState.call(this);
            const now = Date.now();
            if (now - _lastAutoVersionTime > 5 * 60 * 1000) { // 5 minutes
                _lastAutoVersionTime = now;
                clearTimeout(_autoVersionTimer);
                _autoVersionTimer = setTimeout(() => {
                    this.saveVersion('حفظ تلقائي');
                }, 30000); // 30s delay after last change
            }
        };
    }
}

// Export helper for React components
export function getVersionHistory(projectId = 'default') {
    const key = `${VERSION_HISTORY_KEY_PREFIX}${projectId}`;
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        return [];
    }
}
