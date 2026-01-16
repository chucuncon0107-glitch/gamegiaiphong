class AssetLoader {
    constructor() {
        this.images = {};
        this.toLoad = {
            map: 'assets/map.png',
            icons: 'assets/icons.png',
            tank: 'assets/tank.png',
            engine: 'assets/engine.png',
            tire: 'assets/tire.png',
            steering: 'assets/steering.png',
            // 3D Icons
            icon_bomb: 'assets/icon_bomb_3d.png',
            icon_danger: 'assets/icon_danger_3d.png',
            icon_battle: 'assets/icon_battle_3d.png',
            icon_speed: 'assets/icon_speed_3d.png',
            icon_shield: 'assets/icon_shield_3d.png',
            icon_tank: 'assets/icon_tank_3d.png',
            icon_freeze: 'assets/icon_freeze_3d.png',
            icon_attack: 'assets/icon_attack_3d.png',
            icon_tire: 'assets/icon_tire_3d.png',
            icon_steering: 'assets/icon_steering_3d.png',
            icon_engine: 'assets/icon_engine_3d.png',
            icon_repair: 'assets/icon_repair_3d.png',
            icon_teleport: 'assets/icon_teleport_3d.png',
            icon_double_dice: 'assets/icon_double_dice_3d.png',
            icon_skip_turn: 'assets/icon_skip_turn_3d.png',
            // 3D Tanks for each team
            tank_red: 'assets/tank_red_3d.png',
            tank_blue: 'assets/tank_blue_3d.png',
            tank_green: 'assets/tank_green_3d.png',
            tank_orange: 'assets/tank_orange_3d.png',
            tank_purple: 'assets/tank_purple_3d.png',
            tank_teal: 'assets/tank_teal_3d.png'
        };
        this.loadedCount = 0;
        this.totalCount = Object.keys(this.toLoad).length;
    }

    async loadAll() {
        return new Promise((resolve, reject) => {
            for (let name in this.toLoad) {
                const img = new Image();
                img.src = this.toLoad[name];
                img.onload = () => {
                    this.loadedCount++;
                    if (this.loadedCount === this.totalCount) {
                        resolve(this.images);
                    }
                };
                img.onerror = () => {
                    reject(`Failed to load image: ${this.toLoad[name]}`);
                };
                this.images[name] = img;
            }
        });
    }

    get(name) {
        return this.images[name];
    }
}
