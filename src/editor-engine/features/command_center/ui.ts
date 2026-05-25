// @ts-nocheck

export const injectCommandCenterUI = () => {
    window.EditorApp.prototype.setupCommandConsoleUI = function() {
        let consoleEl = document.getElementById('cmd-console');
        this.cmdContainer = consoleEl;
        this.cmdBufferEl = document.getElementById('cmd-buffer');
        this.cmdMinimized = document.getElementById('cmd-minimized');
        this.cmdHeader = document.getElementById('cmd-header');
        this.cmdCursor = this.cmdContainer ? this.cmdContainer.querySelector('.animate-pulse') : null;

        if (this.cmdContainer && this.cmdHeader) {
            this.setupDraggable(this.cmdContainer, this.cmdHeader);
            
            this.cmdContainer.addEventListener('mousedown', (e: any) => {
                if (e.target.closest('button')) return;
                this.isCmdFocused = true;
                this.updateConsoleVisuals();
                e.stopPropagation(); 
            });
        }
        
        document.addEventListener('mousedown', (e: any) => {
            if (this.cmdContainer && !this.cmdContainer.contains(e.target) && !e.target.closest('#cmd-minimized')) {
                this.isCmdFocused = false;
                this.updateConsoleVisuals();
            }
        });

        if (this.cmdMinimized) {
            this.setupDraggable(this.cmdMinimized, this.cmdMinimized);
        }
        
        if(this.isConsoleVisible) this.cmdContainer.classList.remove('hidden');
        else this.cmdContainer.classList.add('hidden');
        
        this.updateConsoleVisuals(); 
    };

    window.EditorApp.prototype.updateConsoleVisuals = function() {
        if (!this.cmdContainer) return;

        if (this.isCmdFocused) {
            this.cmdContainer.classList.add('border-green-500', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
            this.cmdContainer.classList.remove('border-green-500/30');
            this.cmdContainer.style.opacity = '1';
            if(this.cmdCursor) this.cmdCursor.style.display = 'inline-block';
        } else {
            this.cmdContainer.classList.remove('border-green-500', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
            this.cmdContainer.classList.add('border-green-500/30');
            this.cmdContainer.style.opacity = '0.9'; 
            if(this.cmdCursor) this.cmdCursor.style.display = 'none'; 
        }
    };

    window.EditorApp.prototype.setupDraggable = function(element: HTMLElement, handle: HTMLElement) {
        let isDragging = false;
        let startX: number, startY: number, initialLeft: number, initialTop: number;

        handle.addEventListener('mousedown', (e: any) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            this.isCmdFocused = true;
            this.updateConsoleVisuals();
            
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            element.style.bottom = 'auto';
            element.style.right = 'auto';
            element.style.left = `${initialLeft}px`;
            element.style.top = `${initialTop}px`;
            
            handle.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e: any) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                handle.style.cursor = 'move';
            }
        });
    };

    window.EditorApp.prototype.toggleCommandConsole = function() {
        this.isConsoleVisible = !this.isConsoleVisible;
        if (this.cmdContainer) {
            if (this.isConsoleVisible) {
                this.isMinimized = false;
                this.cmdContainer.classList.remove('hidden');
                if(this.cmdMinimized) this.cmdMinimized.classList.add('hidden');
                this.isCmdFocused = true;
                this.updateConsoleVisuals();
            }
            else {
                this.cmdContainer.classList.add('hidden');
                if(this.cmdMinimized) this.cmdMinimized.classList.add('hidden');
                this.isCmdFocused = false;
            }
        }
    };

    window.EditorApp.prototype.minimizeConsole = function() {
        this.isMinimized = true;
        if(this.cmdContainer) this.cmdContainer.classList.add('hidden');
        if(this.cmdMinimized) this.cmdMinimized.classList.remove('hidden');
        this.isCmdFocused = false;
    };

    window.EditorApp.prototype.restoreConsole = function() {
        this.isMinimized = false;
        this.isConsoleVisible = true;
        if(this.cmdContainer) this.cmdContainer.classList.remove('hidden');
        if(this.cmdMinimized) this.cmdMinimized.classList.add('hidden');
        this.isCmdFocused = true;
        this.updateConsoleVisuals();
    };

    window.EditorApp.prototype.setupCommandListeners = function() {
        window.addEventListener('keydown', (e: any) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

            const key = e.key.toLowerCase();

            if (this.isCmdFocused) {
                if (e.key === 'Escape') {
                    this.isCmdFocused = false;
                    this.updateConsoleVisuals();
                    this.clearCommand();
                    return;
                }
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    this.executeCommand();
                    return;
                }
                if (e.key === 'Backspace') {
                    this.updateCommandBuffer('Backspace');
                    e.stopPropagation();
                    return;
                }
                // FIX #5: Block Space from being added to buffer (and block play/pause)
                if (e.code === 'Space') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return;
                }
                if (e.key.length === 1) {
                    this.updateCommandBuffer(e.key);
                    e.stopPropagation(); 
                    e.stopImmediatePropagation();
                    return;
                }
                return; 
            }

            if (key === 'c' && !e.ctrlKey && !e.metaKey) {
                this.setTool('razor');
                e.preventDefault();
                return;
            }
            if (key === 'v' && !e.ctrlKey && !e.metaKey) {
                this.setTool('select');
                e.preventDefault();
                return;
            }
            if (key === 'delete' || key === 'backspace') {
                if(e.shiftKey) this.rippleDelete();
                else this.deleteSelectedClips();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); this.undo(); return; }
            if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); this.redo(); return; }

        }, true); 
    };
};
