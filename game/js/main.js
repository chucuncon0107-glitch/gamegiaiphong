document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');

    // Load Assets
    const assets = new AssetLoader();
    try {
        await assets.loadAll();
        console.log("Assets Loaded");
    } catch (e) {
        console.error(e);
        alert("Không thể tải tài nguyên game!");
        return;
    }

    const renderer = new Renderer(canvas, assets);
    renderer.resize();

    const game = new Game(assets, renderer);
    window.game = game;
    game.init();

    // Resize
    window.addEventListener('resize', () => renderer.resize());

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // ============ FLOATING ACTION BUTTONS ============

    // Dice Button (FAB)
    document.getElementById('fab-dice').addEventListener('click', () => {
        game.handleRoll();
    });

    // Question Button (FAB)
    document.getElementById('fab-question').addEventListener('click', () => {
        game.showQuestionModal();
    });

    // ============ SIDEBAR RANKINGS ============
    // Rankings are now displayed in sidebar, updated automatically

    // ============ MAP EDITOR REMOVED ============
    // Map coordinates are now loaded from js/map_path.json


    // ============ ANSWER BUTTONS ============
    document.querySelectorAll('.answer-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                game.handleAnswerClick(index);
            }
        });
    });

    // ============ EVENT MODAL ============
    document.getElementById('btn-event-ok').addEventListener('click', () => {
        game.hideEventModal();
    });

    // ============ GAME LOG TOGGLE ============
    const toggleLogBtn = document.getElementById('toggle-log');
    if (toggleLogBtn) {
        toggleLogBtn.addEventListener('click', () => {
            const logContainer = document.getElementById('game-log-container');
            const logList = document.querySelector('.game-log-list');
            if (logList.style.display === 'none') {
                logList.style.display = 'block';
                toggleLogBtn.textContent = '−';
            } else {
                logList.style.display = 'none';
                toggleLogBtn.textContent = '+';
            }
        });
    }

    // ============ MAP CLICK ============
    canvas.addEventListener('click', (e) => {
        const coords = renderer.getMapCoordinates(e.clientX, e.clientY);

        if (game.isEditorMode) {
            game.addNode(coords.x, coords.y, 'normal');
            game.log(`➕ Thêm ô ${game.mapNodes.length - 1} tại (${Math.round(coords.x)}, ${Math.round(coords.y)})`);
        } else if (game.canMoveTank) {
            game.handleMapClick(coords.x, coords.y);
        }
    });

    // ============ KEYBOARD SHORTCUTS ============
    document.addEventListener('keydown', (e) => {
        if (game.isEditorMode && e.key === 'z' && e.ctrlKey) {
            game.undoNode();
            game.log("↩️ Undo ô cuối");
        }
    });

    // Start Game
    game.start();
});
