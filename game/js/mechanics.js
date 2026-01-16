class Mechanics {
    static rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }

    static calculateMovement(team, roll1, roll2 = 0) {
        let moves = roll1;
        let direction = 1; // 1: forward, -1: backward

        // 1. Broken Engine Rule
        if (team.isBroken('engine')) {
            // Roll 1-3 -> 1 step, 4-6 -> 2 steps
            // This overrides the raw roll value for distance
            if (roll1 <= 3) moves = 1;
            else moves = 2;
        }

        // 2. Broken Steering Rule
        if (team.isBroken('steering')) {
            // First roll (roll1) is steps (calculated above unless engine also broke?),
            // Wait, rules say: "Lần 1 quyết định số ô, lần 2 quyết định hướng"
            // If Engine is also broken, the "moves" is capped by Engine rule first?
            // "Nếu mất độ bền cả động cơ và vô lăng thì đội chơi sẽ chỉ đi được 1 ô, tiến hoặc lùi"

            if (team.isBroken('engine')) {
                moves = 1;
                // Random direction for dual break? Rules say "tiến hoặc lùi" -> implied random?
                // Let's use roll2 to decide: Odd=Back, Even=Forward
                direction = (roll2 % 2 !== 0) ? -1 : 1;
            } else {
                // Engine OK, Steering Broken
                // roll1 = steps (standard dice)
                moves = roll1;
                // roll2 = direction
                direction = (roll2 % 2 !== 0) ? -1 : 1;
            }
        }

        return { moves, direction };
    }

    static getTileEffect(nodeType) {
        // This would interact with the specific node logic in Game class
        // Just defining constants here
        return {
            'repair_one': 'Tổng tiến công',
            'damage_all': 'Hỗn chiến',
            'repair_all': 'Thời cơ',
            'swap': 'Nguỵ',
            'double_dice': 'Thần tốc',
            'immune': 'Gia cố',
            'skip_turn': 'Đóng băng lực lượng',
            'teleport': 'Đánh chiếm địa bàn',
            'mine': 'Mìn', // all 0
            'shortcut': 'Đường tắt'
        };
    }
}
