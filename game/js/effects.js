// =============================================
// EFFECTS.JS - Animations and Visual Effects
// =============================================

class Effects {
    constructor() {
        this.confettiContainer = document.getElementById('confetti-container');
    }

    // ========== CONFETTI ==========
    spawnConfetti(count = 100) {
        const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c'];

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = (Math.random() * 10 + 5) + 'px';
                confetti.style.height = (Math.random() * 10 + 5) + 'px';
                confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

                if (Math.random() > 0.5) {
                    confetti.style.borderRadius = '50%';
                }

                this.confettiContainer.appendChild(confetti);

                setTimeout(() => confetti.remove(), 4000);
            }, Math.random() * 500);
        }
    }

    // ========== SCREEN SHAKE ==========
    screenShake() {
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);
    }

    // ========== FLASH ==========
    flashScreen(color = 'rgba(231, 76, 60, 0.3)') {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${color};
            pointer-events: none;
            z-index: 9998;
            animation: flash-fade 0.5s ease-out forwards;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes flash-fade {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.remove();
            style.remove();
        }, 500);
    }

    // ========== VICTORY ==========
    victoryEffect() {
        this.spawnConfetti(200);

        // Multiple confetti waves
        setTimeout(() => this.spawnConfetti(100), 500);
        setTimeout(() => this.spawnConfetti(100), 1000);
    }

    // ========== HÚC CỔNG DINH ĐỘC LẬP ==========
    gateBreakEffect() {
        // 1. Strong screen shake - Rung màn hình mạnh
        this.screenShake();
        setTimeout(() => this.screenShake(), 200);
        setTimeout(() => this.screenShake(), 400);

        // 2. Flash golden light - Ánh sáng vàng rực
        this.flashScreen('rgba(255, 215, 0, 0.6)');
        setTimeout(() => this.flashScreen('rgba(255, 100, 0, 0.4)'), 300);

        // 3. Massive confetti celebration - Pháo hoa đặc biệt vàng đỏ
        const victoryColors = ['#FFD700', '#FF6B6B', '#FF4500', '#FFA500', '#FFFF00', '#DC143C'];

        // Wave 1 - Initial explosion
        this.spawnVictoryConfetti(300, victoryColors);

        // Wave 2, 3, 4 - Follow-up waves
        setTimeout(() => this.spawnVictoryConfetti(200, victoryColors), 500);
        setTimeout(() => this.spawnVictoryConfetti(200, victoryColors), 1000);
        setTimeout(() => this.spawnVictoryConfetti(150, victoryColors), 1500);
        setTimeout(() => this.spawnVictoryConfetti(100, victoryColors), 2000);
    }

    // Special confetti with custom colors for gate break
    spawnVictoryConfetti(count, colors) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = (Math.random() * 15 + 8) + 'px';
                confetti.style.height = (Math.random() * 15 + 8) + 'px';
                confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
                confetti.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';

                if (Math.random() > 0.3) {
                    confetti.style.borderRadius = '50%';
                }

                this.confettiContainer.appendChild(confetti);
                setTimeout(() => confetti.remove(), 5000);
            }, Math.random() * 800);
        }
    }
}

// =============================================
// 3D DICE CONTROLLER
// =============================================

class Dice3D {
    constructor() {
        this.container = document.getElementById('dice-3d-container');
        this.dice = document.getElementById('dice-3d');
        this.resultEl = document.getElementById('dice-result');

        // Face rotations for each number - FIXED: 2 and 5 were swapped!
        // To show a face, we rotate so that face points toward camera
        this.rotations = {
            1: { x: 0, y: 0 },       // Front face - no rotation needed
            2: { x: 90, y: 0 },      // Bottom face - rotate X positive to bring bottom to front
            3: { x: 0, y: -90 },     // Right face - rotate Y negative 
            4: { x: 0, y: 90 },      // Left face - rotate Y positive
            5: { x: -90, y: 0 },     // Top face - rotate X negative to bring top to front
            6: { x: 180, y: 0 }      // Back face - rotate 180 degrees
        };
    }

    show() {
        this.container.classList.remove('hidden');
        this.dice.classList.add('rolling');
        this.resultEl.textContent = '';
    }

    hide() {
        this.container.classList.add('hidden');
    }

    roll(targetNumber) {
        return new Promise(resolve => {
            this.show();

            // Roll for a bit
            setTimeout(() => {
                this.dice.classList.remove('rolling');

                const rot = this.rotations[targetNumber];
                // Add extra rotations for dramatic effect
                const extraX = 720;
                const extraY = 720;

                this.dice.style.transition = 'transform 1s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
                this.dice.style.transform = `rotateX(${extraX + rot.x}deg) rotateY(${extraY + rot.y}deg)`;

                setTimeout(() => {
                    this.resultEl.textContent = `🎲 ${targetNumber}`;

                    setTimeout(() => {
                        this.hide();
                        this.dice.style.transition = 'none';
                        this.dice.style.transform = '';
                        resolve(targetNumber);
                    }, 800);
                }, 1000);
            }, 800);
        });
    }
}

// =============================================
// CIRCULAR TIMER CONTROLLER
// =============================================

class CircularTimer {
    constructor() {
        this.circle = document.getElementById('timer-circle');
        this.text = document.getElementById('timer-text');
        this.circumference = 2 * Math.PI * 45; // r = 45

        if (this.circle) {
            this.circle.style.strokeDasharray = this.circumference;
        }
    }

    setProgress(timeLeft, totalTime) {
        if (!this.circle || !this.text) return;

        const progress = timeLeft / totalTime;
        const offset = this.circumference * (1 - progress);

        this.circle.style.strokeDashoffset = offset;
        this.text.textContent = timeLeft;

        // Urgent state
        if (timeLeft <= 10) {
            this.circle.classList.add('urgent');
        } else {
            this.circle.classList.remove('urgent');
        }
    }

    reset() {
        if (this.circle) {
            this.circle.style.strokeDashoffset = 0;
            this.circle.classList.remove('urgent');
        }
    }
}

// Initialize global instances
const effects = new Effects();
const dice3D = new Dice3D();
const circularTimer = new CircularTimer();
