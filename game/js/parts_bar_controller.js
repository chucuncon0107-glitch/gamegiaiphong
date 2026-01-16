// =============================================
// PARTS BAR CONTROLLER - Resize Only (No Drag)
// =============================================

class PartsBarController {
    constructor() {
        this.bar = document.getElementById('permanent-parts-bar');
        this.currentScale = 1.0;

        if (!this.bar) return;

        this.loadSettings();
        this.initResize();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('partsBarScale');
            if (saved) {
                this.currentScale = parseFloat(saved);
                this.applyScale();
            }
        } catch (e) {
            console.log('Failed to load parts bar scale:', e);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('partsBarScale', this.currentScale.toString());
        } catch (e) {
            console.log('Failed to save parts bar scale:', e);
        }
    }

    applyScale() {
        // Apply scale with centered transform
        this.bar.style.transform = `translateX(-50%) scale(${this.currentScale})`;
        this.bar.style.transformOrigin = 'bottom center';
    }

    initResize() {
        const buttons = this.bar?.querySelectorAll('.parts-btn-resize');
        if (!buttons) return;

        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;

                if (action === 'grow') {
                    this.currentScale = Math.min(this.currentScale + 0.15, 2.0);
                } else if (action === 'shrink') {
                    this.currentScale = Math.max(this.currentScale - 0.15, 0.5);
                }

                this.applyScale();
                this.saveSettings();
            });
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('permanent-parts-bar')) {
        window.partsBarController = new PartsBarController();
        console.log('✅ Parts bar resize enabled (fixed at bottom center)');
    }
});
