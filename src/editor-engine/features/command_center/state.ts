// @ts-nocheck

export const injectCommandCenterState = () => {
    window.EditorApp.prototype.initCommandCenter = function() {
        this.commandBuffer = "";
        this.isCommandMode = false;
        this.isConsoleVisible = false; 
        this.isMinimized = false;
        this.isCmdFocused = false; 

        this.setupCommandConsoleUI();
        this.setupCommandListeners();

        this.log("✅ Command Center Module Loaded (Hidden by Default).");
    };

    window.EditorApp.prototype.updateCommandBuffer = function(char: string) {
        if (char === 'Backspace') {
            this.commandBuffer = this.commandBuffer.slice(0, -1);
        } else if (char.length === 1) {
            this.commandBuffer += char;
        }
        if (this.cmdBufferEl) this.cmdBufferEl.innerText = this.commandBuffer;
    };

    window.EditorApp.prototype.clearCommand = function() {
        this.commandBuffer = "";
        if (this.cmdBufferEl) this.cmdBufferEl.innerText = "";
    };
};
