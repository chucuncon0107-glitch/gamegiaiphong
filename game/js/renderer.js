class Renderer {
    constructor(canvas, assets) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assets = assets;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Particle system
        this.particles = [];

        // Animation state
        this.animatingTeams = new Map();

        // Tank sprite data (from tanks.png ~640x190)
        // Green T-34: x 20-185, Gray: x 305-490
        // Tank sprite data (will be loaded from JSON)
        this.tankSprites = {};
    }

    setSpriteData(data) {
        if (data && data.frames) {
            // Flatten the structure for easier internal access
            this.tankSprites = {};
            for (const [key, value] of Object.entries(data.frames)) {
                this.tankSprites[key] = value.frame;
                // Optional: Store anchor/pivot if needed later
                // this.tankSprites[key].anchor = value.anchor;
            }
            // console.log("Renderer: Sprite data updated", this.tankSprites);
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        // Gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(gameState) {
        this.clear();

        // Draw Map
        const mapImg = this.assets.get('map');
        if (mapImg) {
            const imgRatio = mapImg.width / mapImg.height;
            const screenRatio = this.canvas.width / this.canvas.height;

            let drawWidth, drawHeight;
            if (screenRatio > imgRatio) {
                drawWidth = this.canvas.width;
                drawHeight = drawWidth / imgRatio;
            } else {
                drawHeight = this.canvas.height;
                drawWidth = drawHeight * imgRatio;
            }

            this.offsetX = (this.canvas.width - drawWidth) / 2;
            this.offsetY = (this.canvas.height - drawHeight) / 2;
            this.scale = drawWidth / mapImg.width;

            // Shadow under map
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 30;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 10;

            this.ctx.drawImage(mapImg, this.offsetX, this.offsetY, drawWidth, drawHeight);

            this.ctx.shadowColor = 'transparent';
        }

        // Draw nodes (Editor Mode)
        if (gameState.isEditorMode) {
            this.drawNodes(gameState.mapNodes);
        }

        // Draw teams
        this.drawTeams(gameState.teams, gameState.mapNodes, gameState.currentTurn);

        // Draw particles
        this.updateAndDrawParticles();

        // Draw leaderboard only at game end
        if (gameState.showLeaderboard) {
            this.drawLeaderboard(gameState.teams, gameState.mapNodes);
        }

        // Draw stage indicator
        this.drawStageIndicator(gameState);
    }

    drawNodes(nodes) {
        // Draw connecting path first
        if (nodes.length > 1) {
            // Draw animated path
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#f39c12'; // Gold path
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([15, 10]); // Dash pattern
            // Animate line drift
            const offset = (Date.now() / 50) % 25;
            this.ctx.lineDashOffset = -offset;

            this.ctx.moveTo(this.transformX(nodes[0].x), this.transformY(nodes[0].y));
            for (let i = 1; i < nodes.length; i++) {
                // Curved lines for smoother look (optional, keeping straight for now but styled)
                this.ctx.lineTo(this.transformX(nodes[i].x), this.transformY(nodes[i].y));
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw nodes
        nodes.forEach((node, index) => {
            const x = this.transformX(node.x);
            const y = this.transformY(node.y);

            // Glow effect for special nodes
            if (node.type !== 'normal') {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 22, 0, Math.PI * 2); // Larger glow
                const glow = this.ctx.createRadialGradient(x, y, 8, x, y, 22);
                glow.addColorStop(0, this.getNodeColor(node.type));
                glow.addColorStop(0.6, this.getNodeColor(node.type));
                glow.addColorStop(1, 'transparent');
                this.ctx.fillStyle = glow;
                this.ctx.fill();
            }

            // Node circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, 16, 0, Math.PI * 2);
            this.ctx.fillStyle = '#2c3e50'; // Dark node center
            this.ctx.fill();

            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = this.getNodeColor(node.type); // Colored border
            this.ctx.stroke();

            // Index
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = 'bold 11px Roboto';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(index, x, y);
        });
    }

    getNodeColor(type) {
        const colors = {
            'normal': 'rgba(255, 215, 0, 0.8)',
            'mine': '#e74c3c',
            'repair_one': '#3498db',
            'repair_all': '#2ecc71',
            'damage_all': '#e67e22',
            'skip_turn': '#9b59b6',
            'immune': '#1abc9c',
            'double_dice': '#f39c12',
            'teleport': '#00bcd4',
            'swap': '#ff5722',
            'shortcut': '#795548'
        };
        return colors[type] || colors['normal'];
    }

    drawTeams(teams, mapNodes, currentTurn) {
        if (!mapNodes || mapNodes.length === 0) return;

        // Sort teams by position for staging area display (highest rank first)
        const sortedTeams = [...teams].sort((a, b) => b.position - a.position);

        teams.forEach((team, index) => {
            let displayX, displayY;

            // Get 3D tank image for this team
            const tankImg = team.tankType ? this.assets.get(team.tankType) : this.assets.get('tank');

            // Check if tank is on map (position >= 0)
            if (team.position >= 0) {
                // Tank is ON THE MAP
                const anim = this.animatingTeams.get(index);
                if (anim) {
                    // Animating between nodes
                    const startNode = mapNodes[anim.startNode];
                    const endNode = mapNodes[anim.endNode];
                    if (startNode && endNode) {
                        const sx = this.transformX(startNode.x);
                        const sy = this.transformY(startNode.y);
                        const ex = this.transformX(endNode.x);
                        const ey = this.transformY(endNode.y);

                        displayX = sx + (ex - sx) * anim.progress;
                        displayY = sy + (ey - sy) * anim.progress;

                        // Dust particles
                        if (Math.random() < 0.4) {
                            this.spawnDust(displayX, displayY + 20);
                        }
                    }
                } else {
                    // Static at node
                    const nodeIndex = Math.min(team.position, mapNodes.length - 1);
                    const node = mapNodes[nodeIndex];
                    if (!node) return;
                    displayX = this.transformX(node.x);
                    displayY = this.transformY(node.y);
                }

                if (displayX !== undefined) {
                    // Offset for multiple teams on same node (reduced from 35 to 15)
                    const offsetAngle = (index / teams.length) * Math.PI * 2 - Math.PI / 2;
                    const offsetDist = 15;
                    displayX += Math.cos(offsetAngle) * offsetDist;
                    displayY += Math.sin(offsetAngle) * offsetDist;
                }
            } else {
                // Tank in STAGING AREA (RIGHT side)
                const rankIndex = sortedTeams.indexOf(team);

                const stagingX = this.canvas.width - 80; // Right side
                const stagingStartY = 100;
                const spacing = 75;

                displayX = stagingX;
                displayY = stagingStartY + rankIndex * spacing;
            }

            if (displayX === undefined) return;

            // Current team glow
            if (index === currentTurn) {
                this.ctx.beginPath();
                this.ctx.arc(displayX, displayY, 30, 0, Math.PI * 2);
                const glow = this.ctx.createRadialGradient(displayX, displayY, 15, displayX, displayY, 30);
                glow.addColorStop(0, team.color);
                glow.addColorStop(0.5, team.color + '80');
                glow.addColorStop(1, 'transparent');
                this.ctx.fillStyle = glow;
                this.ctx.fill();
            }

            // Draw Tank
            const tankSize = 50;
            const radius = 22;

            if (tankImg) {
                // Outer ring
                this.ctx.beginPath();
                this.ctx.arc(displayX, displayY, radius + 3, 0, Math.PI * 2);
                this.ctx.fillStyle = team.color;
                this.ctx.fill();

                // Inner circle
                this.ctx.beginPath();
                this.ctx.arc(displayX, displayY, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#fff';
                this.ctx.fill();

                // Draw image
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(displayX, displayY, radius - 1, 0, Math.PI * 2);
                this.ctx.clip();

                const scale = tankSize / Math.max(tankImg.width, tankImg.height);
                const tankW = tankImg.width * scale;
                const tankH = tankImg.height * scale;
                this.ctx.drawImage(tankImg, displayX - tankW / 2, displayY - tankH / 2, tankW, tankH);
                this.ctx.restore();

                // Rank Badge
                this.ctx.beginPath();
                this.ctx.arc(displayX + radius - 3, displayY + radius - 3, 11, 0, Math.PI * 2);
                this.ctx.fillStyle = team.color;
                this.ctx.fill();
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 10px Roboto';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                const rankIndex = sortedTeams.indexOf(team);
                this.ctx.fillText(rankIndex + 1, displayX + radius - 3, displayY + radius - 3);
            }
        });
    }

    // --- ANIMATION ---
    startMoveAnimation(teamIndex, startNode, endNode, duration = 400) {
        return new Promise(resolve => {
            const startTime = performance.now();

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);

                this.animatingTeams.set(teamIndex, { startNode, endNode, progress: eased });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.animatingTeams.delete(teamIndex);
                    resolve();
                }
            };
            animate();
        });
    }

    // --- PARTICLES ---
    spawnDust(x, y) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 25,
                y: y + Math.random() * 10,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 1.5,
                life: 1,
                decay: 0.025,
                size: 4 + Math.random() * 5,
                color: 'rgba(160, 140, 120, ',
                type: 'dust'
            });
        }
    }

    spawnExplosion(x, y) {
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02,
                size: 6 + Math.random() * 12,
                color: Math.random() > 0.3 ? 'rgba(255, 100, 0, ' : 'rgba(255, 200, 50, ',
                type: 'explosion'
            });
        }
    }

    spawnSparkle(x, y, color = '255, 215, 0') {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1,
                decay: 0.02,
                size: 4 + Math.random() * 6,
                color: `rgba(${color}, `,
                type: 'sparkle'
            });
        }
    }

    updateAndDrawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.type === 'dust' || p.type === 'explosion') {
                p.vy += 0.08;
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color + (p.life * 0.8) + ')';
            this.ctx.fill();
        }
    }

    // --- LEADERBOARD ---
    drawLeaderboard(teams, mapNodes) {
        if (mapNodes.length === 0) return;

        const sorted = [...teams].sort((a, b) => b.position - a.position);

        const x = 15;
        const y = 15;
        const width = 200;
        const height = 35 + sorted.length * 32;

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.roundRect(x, y, width, height, 12);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Title
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = 'bold 13px Roboto';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('🏆 BẢNG XẾP HẠNG', x + 12, y + 24);

        // Teams
        sorted.forEach((team, i) => {
            const ty = y + 52 + i * 32;

            // Rank medal
            const rankColors = ['#f1c40f', '#bdc3c7', '#cd7f32'];
            this.ctx.fillStyle = rankColors[i] || '#888';
            this.ctx.font = 'bold 14px Roboto';
            this.ctx.fillText(`${i + 1}`, x + 12, ty);

            // Color circle
            this.ctx.beginPath();
            this.ctx.arc(x + 40, ty - 4, 10, 0, Math.PI * 2);
            this.ctx.fillStyle = team.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Name
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Roboto';
            this.ctx.fillText(team.name, x + 58, ty);

            // Position
            this.ctx.fillStyle = '#aaa';
            this.ctx.textAlign = 'right';
            this.ctx.font = 'bold 12px Roboto';
            this.ctx.fillText(`Ô ${team.position}`, x + width - 12, ty);
            this.ctx.textAlign = 'left';
        });
    }

    // --- STAGE INDICATOR ---
    drawStageIndicator(gameState) {
        // Title text removed as per user request
        return;
    }

    // Helper  
    roundRect(x, y, w, h, r) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.closePath();
    }

    getMapCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.offsetX) / this.scale,
            y: (clientY - rect.top - this.offsetY) / this.scale
        };
    }

    transformX(mapX) { return mapX * this.scale + this.offsetX; }
    transformY(mapY) { return mapY * this.scale + this.offsetY; }
}
