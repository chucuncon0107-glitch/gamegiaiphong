// =============================================
// SOUND MANAGER - Simple Version
// Only: Victory, Correct, Wrong, Dice Roll
// =============================================

class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.6;
        this.diceSound = null;

        // Military-themed sounds with CDN fallback
        this.soundUrls = {
            correct: 'assets/sounds/correct.mp3',
            wrong: 'assets/sounds/wrong.mp3',
            dice: 'assets/sounds/dice.mp3',
            victory: 'assets/sounds/victory.mp3',
            fanfare: 'assets/sounds/fanfare.mp3',
            drumroll: 'assets/sounds/drumroll.mp3',
            tankMove: 'assets/sounds/tank_move.mp3',
            checkpoint: 'assets/sounds/checkpoint.mp3'
        };

        // CDN fallback URLs (military-themed)
        this.cdnFallback = {
            correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
            wrong: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
            dice: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
            victory: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3', // Epic victory
            fanfare: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Trumpet fanfare
            drumroll: 'https://assets.mixkit.co/active_storage/sfx/2010/2010-preview.mp3', // Drum roll
            tankMove: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Engine rumble
            checkpoint: 'https://assets.mixkit.co/active_storage/sfx/1993/1993-preview.mp3' // Achievement sound
        };

        this.loadSounds();
    }

    async loadSounds() {
        for (const [name, localUrl] of Object.entries(this.soundUrls)) {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = this.volume;

            // Try local first, fallback to CDN
            try {
                audio.src = localUrl;
                await new Promise((resolve, reject) => {
                    audio.oncanplaythrough = resolve;
                    audio.onerror = reject;
                    setTimeout(resolve, 1500);
                });
            } catch (e) {
                if (this.cdnFallback[name]) {
                    audio.src = this.cdnFallback[name];
                }
            }

            this.sounds[name] = audio;
        }
        console.log('🔊 Sound System initialized');
    }

    play(soundName, volumeMultiplier = 1.0) {
        if (!this.enabled || !this.sounds[soundName]) return;

        try {
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = Math.min(this.volume * volumeMultiplier, 1.0);
            sound.play().catch(e => { });
        } catch (e) { }
    }

    // Play dice sound with loop during animation
    playDiceRoll(duration = 2000) {
        if (!this.enabled || !this.sounds['dice']) return;

        try {
            this.stopDiceRoll();
            this.diceSound = this.sounds['dice'].cloneNode();
            this.diceSound.volume = Math.min(this.volume * 1.5, 1.0);
            this.diceSound.loop = true;
            this.diceSound.play().catch(e => { });

            setTimeout(() => this.stopDiceRoll(), duration);
        } catch (e) { }
    }

    stopDiceRoll() {
        if (this.diceSound) {
            this.diceSound.pause();
            this.diceSound.currentTime = 0;
            this.diceSound = null;
        }
    }

    // Convenience methods - military themed
    playQuestionStart() { this.play('drumroll', 0.5); }
    playCheckpoint() { this.play('checkpoint', 0.9); }
    playCombo(count) { this.play('correct', 0.9); }
    playTankMove() { this.play('tankMove', 0.4); }
    playFreeze() { this.play('wrong', 0.6); }
    playSwap() { this.play('wrong', 0.7); }
    playLevelUp() { this.play('fanfare', 0.8); }
    playCoin() { this.play('correct', 0.5); }
    playStep() { }
    playTurnStart() { this.play('drumroll', 0.3); }
    playUrgentTick() { }

    // Victory celebration sequence
    playVictoryCelebration() {
        this.play('fanfare', 1.0);
        setTimeout(() => this.play('victory', 1.0), 500);
    }

    toggle() {
        this.enabled = !this.enabled;
        console.log('🔊 Sound:', this.enabled ? 'ON' : 'OFF');
        return this.enabled;
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
}

// Global sound manager instance
const soundManager = new SoundManager();
