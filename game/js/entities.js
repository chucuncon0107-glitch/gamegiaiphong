class Team {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.position = 0;

        // Durability: Engine 3, Tires 2, Steering 4
        this.stats = { engine: 3, tires: 2, steering: 4 };
        this.maxStats = { engine: 3, tires: 2, steering: 4 };

        // Status Effects
        this.isFrozen = false;      // Đóng băng - mất lượt
        this.immuneTurns = 0;       // Gia cố - số lượt không mất độ bền
        this.immuneNextTurn = false; // Flag đánh dấu sẽ được miễn nhiễm vào lượt sau
        this.hasDoubleDice = false; // Thần tốc - x2 xúc xắc

        // Stats
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.combo = 0;  // Combo trả lời đúng liên tiếp
    }

    damage(part, amount) {
        if (this.stats[part] > 0) {
            this.stats[part] = Math.max(0, this.stats[part] - amount);
        }
    }

    repair(part) {
        this.stats[part] = this.maxStats[part];
    }

    repairAll(amount) {
        ['engine', 'tires', 'steering'].forEach(part => {
            this.stats[part] = Math.min(this.maxStats[part], this.stats[part] + amount);
        });
    }

    damageAll(amount) {
        ['engine', 'tires', 'steering'].forEach(part => {
            this.stats[part] = Math.max(0, this.stats[part] - amount);
        });
    }

    restoreAll() {
        this.stats.engine = this.maxStats.engine;
        this.stats.tires = this.maxStats.tires;
        this.stats.steering = this.maxStats.steering;
    }

    isBroken(part) {
        return this.stats[part] <= 0;
    }
}
