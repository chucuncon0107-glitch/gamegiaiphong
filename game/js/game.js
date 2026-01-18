class Game {
    constructor(assets, renderer) {
        this.assets = assets;
        this.renderer = renderer;
        this.isEditorMode = false;

        // Game State
        this.mapNodes = [];
        this.teams = [];
        this.currentTurn = 0;

        // Question System
        this.questionData = null;
        this.currentQuestion = null;
        this.questionTimer = null;
        this.timeLeft = 30;
        this.currentQuestionIndex = 0; // Track sequential question index

        // Turn Phase
        this.turnPhase = 'question';
        this.canRoll = false;
        this.canQuestion = true; // Cho phép bấm nút câu hỏi
        this.showLeaderboard = false; // Only show at game end

        // Chế độ di chuyển tank bằng chuột
        this.canMoveTank = false; // Cho phép click để di chuyển
        this.pendingMoves = 0; // Số ô được phép di chuyển

        // Stages (node indices for checkpoints) - Theo luật F1.txt
        // 4 chặng: Phước Long, Tây Nguyên, Huế - Đà Nẵng, Sài Gòn
        this.stageCheckpoints = [13, 20, 31, 40]; // 4 checkpoint trên bản đồ
        this.stageNames = ['Xuất phát', 'Phước Long', 'Tây Nguyên', 'Huế - Đà Nẵng', 'Sài Gòn', 'Dinh Độc Lập'];

        // Thiết lập đường đi mặc định (không sử dụng editor)
        this.initDefaultPath();

        this.initTeams();
        this.renderTeamsList();
        this.updateUI();
    }

    async init() {
        console.log("Game Initializing...");
        await this.loadMapPath();
        await this.loadQuestions();
        await this.loadSpriteData();
        console.log("Game Initialized!");
    }

    // Xóa và reset đường đi
    clearPath() {
        if (confirm('Bạn có chắc muốn reset đường đi về mặc định?')) {
            this.mapNodes = [];
            this.initDefaultPath();
            this.log('🗑️ Đã reset đường đi về mặc định!');
            alert('Đã reset đường đi!');
            console.log('clearPath: Reset completed, mapNodes length:', this.mapNodes.length);
        }
    }

    // Load đường đi từ file JSON
    async loadMapPath() {
        try {
            // Add cache-busting to force reload
            const cacheBuster = '?v=' + Date.now();
            const response = await fetch('./js/map_path.json' + cacheBuster);
            if (response.ok) {
                this.mapNodes = await response.json();
                console.log(`✅ Loaded ${this.mapNodes.length} map nodes from JSON`);

                // DEBUG: Log tile types at positions 2 and 16
                console.log(`📍 Ô thứ 2 (index 2): type = ${this.mapNodes[2]?.type}`);
                console.log(`📍 Ô thứ 16 (index 16): type = ${this.mapNodes[16]?.type}`);

                return;
            }
        } catch (error) {
            console.warn('Could not load map_path.json:', error.message);
        }

        // Fallback: tạo đường đi mặc định rỗng
        console.log('⚠️ No map_path.json found. Using empty path.');
        console.log('👉 Use the Map Editor to draw a path and save it!');
        this.mapNodes = [];
    }

    // Đường đi mặc định - giờ chỉ gọi loadMapPath
    initDefaultPath() {
        // Không hardcode nữa, sẽ load từ JSON trong start()
        if (this.mapNodes.length === 0) {
            console.log('initDefaultPath: mapNodes is empty, will be loaded from JSON');
        }
    }

    async loadQuestions() {
        // Thử load từ file JSON trước
        try {
            const response = await fetch('./js/questions.json');
            if (response.ok) {
                const jsonData = await response.json();

                // Convert JSON format to game format
                const convertedQuestions = jsonData.questions.map(q => {
                    // Remove "A. ", "B. ", "C. ", "D. " prefix from options
                    const answers = q.options.map(opt => opt.replace(/^[A-D]\.\s*/, ''));

                    // Convert letter answer to index
                    const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                    const correct = letterToIndex[q.answer.toUpperCase()] || 0;

                    return {
                        id: q.id,
                        stage: Math.ceil(q.id / 10),
                        question: q.question,
                        answers: answers,
                        correct: correct
                    };
                });

                // Sort by ID
                convertedQuestions.sort((a, b) => a.id - b.id);

                this.questionData = { questions: convertedQuestions };
                console.log(`✅ Loaded ${convertedQuestions.length} questions from JSON`);
                return;
            }
        } catch (error) {
            console.warn('Could not load JSON:', error.message);
        }

        // FALLBACK: Inline questions nếu không load được JSON
        console.log('📋 Using inline fallback questions');
        this.questionData = {
            questions: [
                { id: 1, stage: 1, question: "Chủ đề của Đại hội X là gì?", answers: ["Đẩy mạnh công nghiệp hóa đất nước", "Phát huy dân chủ xã hội chủ nghĩa", "Nâng cao năng lực lãnh đạo và sức chiến đấu của Đảng", "Xây dựng Nhà nước pháp quyền xã hội chủ nghĩa"], correct: 2 },
                { id: 2, stage: 1, question: "Một trong những nhiệm vụ quan trọng của Đại hội X là gì?", answers: ["Ban hành Hiến pháp mới", "Sửa đổi, bổ sung Điều lệ Đảng", "Thành lập Chính phủ mới", "Bầu Chủ tịch nước"], correct: 1 },
                { id: 3, stage: 1, question: "Đại hội X đã bổ sung đặc trưng nào của chủ nghĩa xã hội?", answers: ["Kinh tế thị trường", "Nhà nước pháp quyền xã hội chủ nghĩa", "Hội nhập quốc tế", "Công nghiệp hóa"], correct: 1 },
                { id: 4, stage: 1, question: "Ai là Tổng Bí thư được bầu tại Đại hội X (2006)?", answers: ["Đồng chí Nông Đức Mạnh", "Đồng chí Lê Khả Phiêu", "Đồng chí Nguyễn Phú Trọng", "Đồng chí Đỗ Mười"], correct: 0 },
                { id: 5, stage: 1, question: "Đại hội Đảng đầu tiên trong thế kỷ XXI là đại hội lần thứ mấy?", answers: ["Đại hội VII", "Đại hội VIII", "Đại hội IX", "Đại hội X"], correct: 2 },
                { id: 6, stage: 1, question: "Động lực chủ yếu để phát triển đất nước theo Đại hội IX là?", answers: ["Khoa học – công nghệ", "Công nghiệp hóa, hiện đại hóa", "Đại đoàn kết toàn dân", "Hội nhập kinh tế quốc tế"], correct: 2 },
                { id: 7, stage: 1, question: "Mô hình kinh tế tổng quát trong thời kỳ quá độ lên CNXH là gì?", answers: ["Kinh tế kế hoạch hóa tập trung", "Kinh tế thị trường tự do", "Kinh tế thị trường định hướng XHCN", "Kinh tế hỗn hợp"], correct: 2 },
                { id: 8, stage: 1, question: "Bộ Chính trị khóa X có bao nhiêu ủy viên?", answers: ["15 ủy viên", "14 ủy viên", "17 ủy viên", "16 ủy viên"], correct: 1 },
                { id: 9, stage: 1, question: "Nhiệm vụ then chốt theo quan điểm Đại hội IX là:", answers: ["Phát triển kinh tế", "Hội nhập quốc tế", "Xây dựng Đảng", "Phát triển văn hóa"], correct: 2 },
                { id: 10, stage: 1, question: "Một kết quả nổi bật sau Đại hội X là Việt Nam:", answers: ["Gia nhập WTO", "Trở thành nước phát triển", "Thoát khỏi nhóm nước nghèo", "Trở thành trung tâm tài chính khu vực"], correct: 2 }
            ]
        };
        console.log(`✅ Loaded ${this.questionData.questions.length} fallback questions`);
    }

    async loadSpriteData() {
        try {
            const response = await fetch('./js/sprites.json');
            if (response.ok) {
                const data = await response.json();
                this.renderer.setSpriteData(data);
                console.log('✅ Loaded sprite data from JSON');
            }
        } catch (error) {
            console.warn('Could not load sprites.json:', error.message);
        }
    }

    initTeams() {
        const teamData = [
            { name: 'Đội Đỏ', color: '#e74c3c', tankType: 'tank_red' },
            { name: 'Đội Xanh', color: '#3498db', tankType: 'tank_blue' },
            { name: 'Đội Lá', color: '#2ecc71', tankType: 'tank_green' },
            { name: 'Đội Cam', color: '#e67e22', tankType: 'tank_orange' },
            { name: 'Đội Tím', color: '#9b59b6', tankType: 'tank_purple' },
            { name: 'Đội Ngọc', color: '#1abc9c', tankType: 'tank_teal' },
            { name: 'Đội Hồng', color: '#e91e63', tankType: 'tank_red' }
        ];

        for (let i = 0; i < 7; i++) {
            const team = new Team(i, teamData[i].name, teamData[i].color);
            team.position = -1; // -1 = chưa vào game, ở vùng tập kết
            team.tankType = teamData[i].tankType; // 3D tank asset name
            this.teams.push(team);
        }
    }

    // Render team status popup (new FAB UI) - HORIZONTAL LAYOUT
    renderTeamStatusPopup() {
        const container = document.getElementById('team-status-list');
        if (!container) return;

        container.innerHTML = '';

        this.teams.forEach((team, index) => {
            const item = document.createElement('div');
            item.className = 'team-status-item' + (index === this.currentTurn ? ' current' : '');

            const enginePercent = (team.stats.engine / team.maxStats.engine) * 100;
            const tiresPercent = (team.stats.tires / team.maxStats.tires) * 100;
            const steeringPercent = (team.stats.steering / team.maxStats.steering) * 100;

            // 3D IMAGE ICONS
            const engineIcon = `<img class="stat-img-icon" src="assets/icon_engine_3d.png" alt="Engine" />`;
            const tireIcon = `<img class="stat-img-icon" src="assets/icon_tire_3d.png" alt="Tire" />`;
            const steeringIcon = `<img class="stat-img-icon" src="assets/icon_steering_3d.png" alt="Steering" />`;

            item.innerHTML = `
                <div class="team-color-dot" style="background: ${team.color}"></div>
                <span class="team-status-name">${team.name}</span>
                <div class="team-stats-mini">
                    <div class="stat-bar-mini" title="Động cơ">
                        ${engineIcon}
                        <div class="stat-bar-track">
                            <div class="stat-bar-fill engine" style="width: ${enginePercent}%"></div>
                        </div>
                        <span class="stat-value">${team.stats.engine}/${team.maxStats.engine}</span>
                    </div>
                    <div class="stat-bar-mini" title="Bánh xe">
                        ${tireIcon}
                        <div class="stat-bar-track">
                            <div class="stat-bar-fill tires" style="width: ${tiresPercent}%"></div>
                        </div>
                        <span class="stat-value">${team.stats.tires}/${team.maxStats.tires}</span>
                    </div>
                    <div class="stat-bar-mini" title="Vô lăng">
                        ${steeringIcon}
                        <div class="stat-bar-track">
                            <div class="stat-bar-fill steering" style="width: ${steeringPercent}%"></div>
                        </div>
                        <span class="stat-value">${team.stats.steering}/${team.maxStats.steering}</span>
                    </div>
                </div>
            `;

            container.appendChild(item);
        });
    }

    // Old renderTeamsList - kept for compatibility but simplified
    renderTeamsList() {
        // Update current turn badge instead
        const badge = document.getElementById('turn-team-name');
        if (badge) {
            const team = this.teams[this.currentTurn];
            badge.textContent = team.name;
            badge.style.color = team.color;
        }

        // Also update popup if open
        const popup = document.getElementById('team-status-popup');
        if (popup && !popup.classList.contains('hidden')) {
            this.renderTeamStatusPopup();
        }

        // Update permanent parts bar
        this.renderPermanentPartsBar();
    }

    // Render permanent parts bar at the top
    renderPermanentPartsBar() {
        const container = document.getElementById('parts-bar-teams');
        if (!container) return;

        container.innerHTML = '';

        this.teams.forEach((team, index) => {
            const isActive = index === this.currentTurn;

            const enginePercent = (team.stats.engine / team.maxStats.engine) * 100;
            const tiresPercent = (team.stats.tires / team.maxStats.tires) * 100;
            const steeringPercent = (team.stats.steering / team.maxStats.steering) * 100;

            const card = document.createElement('div');
            card.className = 'parts-team-card' + (isActive ? ' active' : '');

            card.innerHTML = `
                <div class="parts-team-name" style="color: ${team.color}">
                    ${team.name}
                </div>
                <div class="parts-stat-row">
                    <img class="parts-stat-icon" src="assets/icon_engine_3d.png" alt="Engine" />
                    <div class="parts-stat-bar-bg">
                        <div class="parts-stat-bar-fill engine" style="width: ${enginePercent}%"></div>
                    </div>
                    <span class="parts-stat-value">${team.stats.engine}/${team.maxStats.engine}</span>
                </div>
                <div class="parts-stat-row">
                    <img class="parts-stat-icon" src="assets/icon_tire_3d.png" alt="Tires" />
                    <div class="parts-stat-bar-bg">
                        <div class="parts-stat-bar-fill tires" style="width: ${tiresPercent}%"></div>
                    </div>
                    <span class="parts-stat-value">${team.stats.tires}/${team.maxStats.tires}</span>
                </div>
                <div class="parts-stat-row">
                    <img class="parts-stat-icon" src="assets/icon_steering_3d.png" alt="Steering" />
                    <div class="parts-stat-bar-bg">
                        <div class="parts-stat-bar-fill steering" style="width: ${steeringPercent}%"></div>
                    </div>
                    <span class="parts-stat-value">${team.stats.steering}/${team.maxStats.steering}</span>
                </div>
            `;

            container.appendChild(card);
        });
    }

    async start() {
        console.log("Game Started");
        this.log("🚀 Trò chơi bắt đầu!");

        // Load map path from JSON
        await this.loadMapPath();

        // Wait for questions to load
        await this.loadQuestions();

        this.log(`Lượt: ${this.teams[0].name}`);
        this.log("👆 Bấm nút CÂU HỎI để bắt đầu!");
        this.enableQuestionButton();
        this.loop();
    }

    // ========== STAGE SYSTEM ==========
    getCurrentStage(position) {
        for (let i = 0; i < this.stageCheckpoints.length; i++) {
            if (position < this.stageCheckpoints[i]) return i + 1;
        }
        return 5; // Dinh Độc Lập
    }

    getStageName(position) {
        const stageIndex = this.getCurrentStage(position);
        return this.stageNames[stageIndex] || 'Dinh Độc Lập';
    }

    // Kiểm tra vị trí có phải là checkpoint không
    isAtCheckpoint(position) {
        return this.stageCheckpoints.includes(position);
    }

    // Lấy checkpoint tiếp theo từ vị trí hiện tại
    getNextCheckpoint(position) {
        for (const checkpoint of this.stageCheckpoints) {
            if (checkpoint > position) {
                return checkpoint;
            }
        }
        // Nếu không còn checkpoint, trả về điểm cuối bản đồ
        return this.mapNodes.length - 1;
    }

    // ========== QUESTION SYSTEM ==========
    getQuestionForStage(stageNum) {
        if (!this.questionData || !this.questionData.questions) return null;

        // Filter questions by stage
        const stageQuestions = this.questionData.questions.filter(q => q.stage === stageNum);
        if (stageQuestions.length === 0) {
            // Fallback to any question
            const all = this.questionData.questions;
            return all[Math.floor(Math.random() * all.length)];
        }
        return stageQuestions[Math.floor(Math.random() * stageQuestions.length)];
    }

    showQuestionModal() {
        // Disable nút câu hỏi ngay khi bấm
        this.disableQuestionButton();

        const team = this.teams[this.currentTurn];

        // CHECK ĐÓNG BĂNG: Nếu đội bị đóng băng, không cho trả lời câu hỏi
        if (team.isFrozen) {
            this.log(`❄️ ${team.name} bị ĐÓNG BĂNG! Mất lượt này.`);
            this.showEventModal('❄️', 'ĐÓNG BĂNG', `${team.name} bị đóng băng và mất lượt này!`);
            team.isFrozen = false; // Reset sau khi mất lượt

            // Đợi 1.5s rồi kết thúc lượt
            setTimeout(() => {
                this.hideEventModal();
                this.endTurn();
            }, 1500);
            return;
        }

        // Play question start sound
        if (typeof soundManager !== 'undefined') soundManager.playQuestionStart();

        console.log("showQuestionModal called");

        // Move tank from staging area to start position if not on map
        if (team.position === -1) {
            console.log(`🚀 ${team.name} entering map at Start position!`);
            team.position = 0;
            this.renderer.draw(this); // Force render update
        }

        const stage = this.getCurrentStage(team.position);
        console.log("Stage:", stage, "Position:", team.position);

        if (!this.questionData || !this.questionData.questions || this.questionData.questions.length === 0) {
            console.log("No questions available");
            this.canRoll = true;
            const diceBtn = document.getElementById('fab-dice');
            if (diceBtn) diceBtn.disabled = false;
            return;
        }

        // Get next question sequentially (theo thứ tự trong file questions)
        if (this.currentQuestionIndex >= this.questionData.questions.length) {
            this.currentQuestionIndex = 0; // Reset về đầu khi hết câu hỏi
        }
        const q = this.questionData.questions[this.currentQuestionIndex];
        this.currentQuestionIndex++; // Tăng lên cho lần tiếp theo

        console.log("Question index:", this.currentQuestionIndex - 1, "Question:", q);

        if (!q) {
            console.log("No question found, allowing roll");
            this.canRoll = true;
            const diceBtn = document.getElementById('fab-dice');
            if (diceBtn) diceBtn.disabled = false;
            return;
        }

        this.currentQuestion = q;

        // Hide difficulty badge (no stage labels)
        const diffBadge = document.getElementById('question-difficulty');
        if (diffBadge) diffBadge.style.display = 'none';

        document.getElementById('question-text').textContent = q.question;

        const answers = document.querySelectorAll('.answer-btn');
        answers.forEach((btn, i) => {
            const textEl = btn.querySelector('.answer-text');
            if (textEl) textEl.textContent = q.answers[i];
            btn.classList.remove('selected', 'correct', 'wrong', 'flipped');
            const flipBack = btn.querySelector('.flip-back');
            if (flipBack) flipBack.className = 'flip-back';
            btn.disabled = false;
        });

        document.getElementById('question-result').classList.add('hidden');
        document.getElementById('question-modal').classList.remove('hidden');

        // Disable dice FAB
        const diceBtn = document.getElementById('fab-dice');
        if (diceBtn) diceBtn.disabled = true;

        console.log("Modal should be visible now");

        this.timeLeft = 30;
        this.totalTime = 30;

        // Safeguard for circularTimer
        if (typeof circularTimer !== 'undefined' && circularTimer) {
            circularTimer.reset();
        }

        this.updateTimerDisplay();
        this.startTimer();
    }

    startTimer() {
        if (this.questionTimer) clearInterval(this.questionTimer);

        this.questionTimer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                clearInterval(this.questionTimer);
                this.handleTimeout();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        // Update timer text directly
        const timerText = document.getElementById('timer-text');
        if (timerText) {
            timerText.textContent = this.timeLeft;
        }

        // Update circular progress
        if (typeof circularTimer !== 'undefined' && circularTimer) {
            circularTimer.setProgress(this.timeLeft, this.totalTime || 15);
        }
    }

    handleAnswerClick(index) {
        if (!this.currentQuestion) return;

        clearInterval(this.questionTimer);

        const answers = document.querySelectorAll('.answer-btn');
        answers.forEach(btn => btn.disabled = true);

        const correct = this.currentQuestion.correct;
        const isCorrect = index === correct;

        // First show selected state (orange blinking)
        answers[index].classList.add('selected');

        // After delay, show correct/wrong
        setTimeout(() => {
            answers[index].classList.remove('selected');

            if (isCorrect) {
                answers[index].classList.add('correct');
                effects.spawnConfetti(50);
            } else {
                answers[index].classList.add('wrong');
                answers[correct].classList.add('correct');
                effects.flashScreen();
            }

            // Wait then hide modal
            setTimeout(() => {
                this.hideQuestionModal();
                if (isCorrect) {
                    this.handleAnswerCorrect();
                } else {
                    this.handleAnswerWrong();
                }
            }, 1500);
        }, 1500);
    }

    handleTimeout() {
        const answers = document.querySelectorAll('.answer-btn');
        answers.forEach(btn => btn.disabled = true);

        // Play timeout sound
        if (typeof soundManager !== 'undefined') soundManager.play('timeout');

        if (this.currentQuestion) {
            answers[this.currentQuestion.correct].classList.add('correct');
        }

        // Result text removed per user request

        setTimeout(() => {
            this.hideQuestionModal();
            this.handleAnswerWrong();
        }, 1500);
    }

    hideQuestionModal() {
        document.getElementById('question-modal').classList.add('hidden');
        if (this.questionTimer) clearInterval(this.questionTimer);
    }

    handleAnswerCorrect() {
        const team = this.teams[this.currentTurn];
        team.correctAnswers++;
        team.combo++;

        // Play correct sound
        if (typeof soundManager !== 'undefined') soundManager.play('correct');

        // Nếu tank chưa vào game (position = -1), đặt vào ô xuất phát (ô 0)
        if (team.position === -1) {
            team.position = 0;
            this.log(`🚀 ${team.name} được vào vị trí xuất phát!`);
        }

        this.canRoll = true;
        // Enable dice FAB button
        const diceBtn = document.getElementById('fab-dice');
        if (diceBtn) diceBtn.disabled = false;

        this.log(`✅ ${team.name} trả lời đúng! (Combo: ${team.combo})`);

        // Spawn confetti for correct answer
        if (typeof effects !== 'undefined') effects.spawnConfetti(50);

        // Combo bonus with sound - ACTUALLY ADD BONUS MOVEMENT
        if (team.combo >= 3) {
            this.log(`🔥 ${team.name} COMBO x${team.combo}! +1 ô bonus`);
            this.comboBonus = 1; // Store bonus for next roll
            if (typeof effects !== 'undefined') effects.spawnConfetti(100);
            if (typeof soundManager !== 'undefined') soundManager.playCombo(team.combo);
        } else {
            this.comboBonus = 0;
        }

        this.turnPhase = 'roll';
        this.updateUI();
        this.renderTeamsList();
    }

    handleAnswerWrong() {
        const team = this.teams[this.currentTurn];
        team.wrongAnswers++;
        team.combo = 0;

        // Play wrong sound and flash screen
        if (typeof soundManager !== 'undefined') soundManager.play('wrong');
        if (typeof effects !== 'undefined') effects.flashScreen('rgba(231, 76, 60, 0.4)');

        this.log(`❌ ${team.name} trả lời sai! Mất lượt.`);
        this.canRoll = false;
        this.endTurn();
    }

    // ========== ROLL ==========
    handleRoll() {
        if (this.isEditorMode || !this.canRoll) return;

        const team = this.teams[this.currentTurn];

        if (team.isFrozen) {
            this.log(`❄️ ${team.name} bị đóng băng! Mất lượt.`);
            team.isFrozen = false;
            this.canRoll = false;
            this.endTurn();
            return;
        }

        // Disable roll button
        this.canRoll = false;
        const diceBtn = document.getElementById('fab-dice');
        if (diceBtn) diceBtn.disabled = true;

        // Xử lý các trường hợp mất phụ tùng
        const lostEngine = team.stats.engine <= 0;
        const lostTires = team.stats.tires <= 0;
        const lostSteering = team.stats.steering <= 0;

        // CASE 1: MẤT HẾT CẢ 3 BỘ PHẬN (Động cơ + Lốp + Vô lăng = 0)
        if (lostEngine && lostTires && lostSteering) {
            this.log(`⚠️ ${team.name} hỏng HẾT cả 3 bộ phận!`);
            this.log(`🎲 Chỉ đi được 1 ô (Lẻ=Lùi, Chẵn=Tiến)`);

            soundManager.playDiceRoll(1500);

            // Gieo xúc xắc để xác định hướng
            const getRandomDice = () => {
                const array = new Uint32Array(1);
                crypto.getRandomValues(array);
                return (array[0] % 6) + 1;
            };
            const diceValue = getRandomDice();

            dice3D.roll(diceValue).then(() => {
                // Lẻ = Lùi, Chẵn = Tiến
                const isForward = (diceValue % 2 === 0);
                const direction = isForward ? 1 : -1;

                let targetPos = team.position + direction;
                if (targetPos < 0) targetPos = 0;
                if (targetPos >= this.mapNodes.length) targetPos = this.mapNodes.length - 1;

                this.log(`🎲 Gieo ${diceValue} (${diceValue % 2 === 0 ? 'Chẵn' : 'Lẻ'}) → ${isForward ? 'TIẾN' : 'LÙI'} 1 ô`);
                this.moveTeamAnimated(team, targetPos);
            });
            return;
        }

        // CASE 2: MẤT VÔ LĂNG (Gieo 2 lần)
        if (lostSteering) {
            this.log(`⚠️ ${team.name} hỏng Vô lăng! Gieo 2 lần.`);
            this.handleSteeringLossRoll(team);
            return;
        }

        // CASE 3: BÌNH THƯỜNG HOẶC MẤT ĐỘNG CƠ
        soundManager.playDiceRoll(2000);

        // Unbiased random dice using rejection sampling
        const getRandomDice = () => {
            const array = new Uint32Array(1);
            let result;
            do {
                crypto.getRandomValues(array);
                result = array[0];
            } while (result >= Math.floor(0xFFFFFFFF / 6) * 6); // Reject biased values
            return (result % 6) + 1;
        };
        const diceValue = getRandomDice();
        console.log(`🎲 [DICE] Random result: ${diceValue}`);

        dice3D.roll(diceValue).then(() => {
            this.log(`🎲 Xúc xắc: ${diceValue}`);

            // RULE: Gieo được 1 thì nhảy thẳng tới chặng kế tiếp (theo luật F1.txt)
            if (diceValue === 1) {
                this.log(`🚀 Gieo được 1! Nhảy thẳng tới chặng kế tiếp!`);

                // Find next checkpoint
                let nextCheckpoint = -1;
                for (const cp of this.stageCheckpoints) {
                    if (cp > team.position) {
                        nextCheckpoint = cp;
                        break;
                    }
                }

                if (nextCheckpoint !== -1) {
                    this.moveTeamAnimated(team, nextCheckpoint);
                } else {
                    // Nếu đã qua hết checkpoint (về đích), move 1 ô bình thường
                    this.moveTeamAnimated(team, Math.min(team.position + 1, this.mapNodes.length - 1));
                }
                return;
            }

            let cellsToMove = diceValue;

            // CHECK DOUBLE DICE BUFF
            if (team.hasDoubleDice) {
                cellsToMove = cellsToMove * 2;
                this.log(`⚡ THẦN TỐC! x2 = ${cellsToMove} ô`);
                team.hasDoubleDice = false; // Reset after use
                if (typeof soundManager !== 'undefined') soundManager.play('powerup');
            }

            // ADD COMBO BONUS
            if (this.comboBonus > 0) {
                cellsToMove += this.comboBonus;
                this.log(`🔥 Combo bonus: +${this.comboBonus} ô`);
                this.comboBonus = 0;
            }

            // CHECK ENGINE LOSS
            if (lostEngine) {
                this.log(`⚠️ ${team.name} hỏng Động cơ!`);
                if (diceValue >= 1 && diceValue <= 3) {
                    cellsToMove = 1;
                    this.log(`🔸 Gieo 1-3 -> Đi 1 ô`);
                } else {
                    cellsToMove = 2;
                    this.log(`🔸 Gieo 4-6 -> Đi 2 ô`);
                }
            }

            const currentPos = team.position;
            const targetPos = Math.min(currentPos + cellsToMove, this.mapNodes.length - 1);

            this.log(`📍 Từ ô ${currentPos} → ô ${targetPos}`);
            this.moveTeamAnimated(team, targetPos);
        });
    }

    // Xử lý mất vô lăng: Gieo 2 lần
    async handleSteeringLossRoll(team) {
        // Improved random function
        const getRandomDice = () => {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            return (array[0] % 6) + 1;
        };

        // Roll 1: Distance
        this.log(`🎲 Lần 1: Xác định số bước...`);
        soundManager.playDiceRoll(1500);
        const val1 = getRandomDice();
        await dice3D.roll(val1);

        let cellsToMove = val1;
        // Check engine loss combined? (Luật nói mất cả 2 thì case 1, nên ở đây Engine > 0)
        // Logic: Nếu chỉ mất Vô lăng, Engine còn -> đi full bước gieo được? 
        // Luật: "Lần 1 để quyết định số ô di chuyển". Assume full dice value.

        this.log(`🔹 Số bước: ${cellsToMove}`);
        await new Promise(r => setTimeout(r, 1000));

        // Roll 2: Direction
        this.log(`🎲 Lần 2: Xác định hướng (Lẻ=Lùi, Chẵn=Tiến)...`);
        soundManager.playDiceRoll(1500);
        const val2 = getRandomDice();
        await dice3D.roll(val2);

        // Quy ước: Chẵn (2,4,6) = Tiến, Lẻ (1,3,5) = Lùi
        const isForward = (val2 % 2 === 0);
        this.log(`🔹 Hướng: ${isForward ? 'TIẾN' : 'LÙI'} (Gieo ${val2})`);

        let targetPos = team.position + (isForward ? cellsToMove : -cellsToMove);

        // Boundary check
        if (targetPos < 0) targetPos = 0;
        if (targetPos >= this.mapNodes.length) targetPos = this.mapNodes.length - 1;

        this.moveTeamAnimated(team, targetPos);
    }

    // Xử lý click chuột để đặt tank
    handleMapClick(mapX, mapY) {
        if (!this.canMoveTank) return;

        const team = this.teams[this.currentTurn];

        // Tìm ô gần nhất với vị trí click
        let nearestNode = -1;
        let minDist = Infinity;

        for (let i = 0; i < this.mapNodes.length; i++) {
            const node = this.mapNodes[i];
            const dist = Math.sqrt(Math.pow(node.x - mapX, 2) + Math.pow(node.y - mapY, 2));
            if (dist < minDist) {
                minDist = dist;
                nearestNode = i;
            }
        }

        // Kiểm tra khoảng cách click có đủ gần ô không (trong vòng 50 pixel)
        if (minDist > 50) {
            this.log(`⚠️ Click quá xa ô! Hãy click gần một ô trên đường đi.`);
            return;
        }

        // Đặt tank vào vị trí mới
        const oldPos = team.position;
        team.position = nearestNode;

        this.log(`🚀 ${team.name} di chuyển từ ô ${oldPos} đến ô ${nearestNode}`);

        // Tắt chế độ click
        this.canMoveTank = false;
        this.pendingMoves = 0;

        // Kiểm tra ô đặc biệt và kết thúc lượt
        this.updateUI();
        this.renderTeamsList();

        // Check win - Về đích = Húc cổng Dinh Độc Lập
        if (team.position >= this.mapNodes.length - 1) {
            this.showLeaderboard = true;

            // Play victory celebration sounds
            if (typeof soundManager !== 'undefined') soundManager.playVictoryCelebration();

            // Trigger spectacular gate break effect!
            if (typeof effects !== 'undefined') effects.gateBreakEffect();

            // Show professional victory modal
            this.showEventModalWithImage('🏆', '🎖️ HÚC CỔNG DINH ĐỘC LẬP! 🎖️',
                `🎉 ${team.name} đã húc đổ cổng Dinh Độc Lập!\n\n` +
                `★ CHIẾN THẮNG VẺ VANG! ★\n` +
                `★ Giải phóng miền Nam thống nhất đất nước!`,
                'assets/icon_tank_3d.png');

            this.log(`🏆🏆🏆 ${team.name} HÚC CỔNG DINH ĐỘC LẬP - CHIẾN THẮNG! 🏆🏆🏆`);
            return;
        }

        // Áp dụng hiệu ứng ô
        const node = this.mapNodes[team.position];
        if (node.type && node.type !== 'normal') {
            this.applyTileEffect(team, node.type).then(() => {
                this.endTurn();
            });
        } else {
            this.endTurn();
        }
    }

    animateDice() {
        return new Promise(async resolve => {
            const team = this.teams[this.currentTurn];
            const needTwo = team.isBroken('steering');

            // Ensure random values are generated
            const roll1 = Mechanics.rollDice();
            const roll2 = needTwo ? Mechanics.rollDice() : 0;

            // Use 3D dice animation
            await dice3D.roll(roll1);

            if (needTwo) {
                this.log(`🎯 Hỏng vô lăng! Gieo lần 2: ${roll2} (${roll2 % 2 === 0 ? 'Tiến' : 'Lùi'})`);
            }

            resolve({ roll1, roll2 });
        });
    }

    // ========== MOVE ==========
    // Di chuyển tank tự động với animation từng bước
    async moveTeamAnimated(team, targetPosition) {
        if (this.mapNodes.length === 0) {
            this.log("⚠️ Chưa có Map!");
            this.endTurn();
            return;
        }

        // Đảm bảo targetPosition hợp lệ
        targetPosition = Math.max(0, Math.min(targetPosition, this.mapNodes.length - 1));
        const startPos = team.position;

        // Debug log chi tiết
        console.log(`[MOVE] Team "${team.name}" moving from position ${startPos} to ${targetPosition}`);
        console.log(`[MOVE] Total cells to move: ${Math.abs(targetPosition - startPos)}`);

        // Nếu không cần di chuyển
        if (startPos === targetPosition) {
            this.log(`🚀 ${team.name} vẫn ở ô ${team.position}`);
            this.endTurn();
            return;
        }

        // Play tank movement sound
        if (typeof soundManager !== 'undefined') soundManager.play('tank_move');

        // Di chuyển từng bước, DỪNG LẠI tại mỗi checkpoint
        const direction = targetPosition > startPos ? 1 : -1;
        let currentPos = startPos;

        while (currentPos !== targetPosition) {
            const nextPos = currentPos + direction;

            console.log(`[MOVE] Step: ${currentPos} -> ${nextPos}`);
            await this.renderer.startMoveAnimation(this.currentTurn, currentPos, nextPos, 250);
            team.position = nextPos;
            currentPos = nextPos;
            this.updateUI();

            // Kiểm tra có vượt checkpoint không (chỉ khi đi TIẾN)
            if (direction > 0) {
                for (const checkpoint of this.stageCheckpoints) {
                    if (currentPos === checkpoint && currentPos !== targetPosition) {
                        // DỪNG LẠI tại checkpoint, hiện thông báo
                        console.log(`[MOVE] CHECKPOINT REACHED at ${currentPos}! Pausing...`);

                        // Play checkpoint sound
                        if (typeof soundManager !== 'undefined') soundManager.playCheckpoint();

                        // Hiển thị thông báo
                        const stageName = this.getStageName(currentPos);
                        this.showEventModal('🎖️', 'VƯỢT CHẶNG!', `${team.name} đã vượt qua ${stageName}! +1 độ bền tất cả bộ phận.`);

                        // Cộng độ bền
                        team.repairAll(1);
                        team.immuneTurns += 1;
                        this.renderPermanentPartsBar();

                        // Sparkle effect
                        const node = this.mapNodes[currentPos];
                        const x = this.renderer.transformX(node.x);
                        const y = this.renderer.transformY(node.y);
                        this.renderer.spawnSparkle(x, y, '100, 255, 100');

                        this.log(`🎖️ ${team.name} VƯỢT CHẶNG ${stageName}! +1 độ bền`);

                        // Đợi 1.5 giây để user thấy thông báo trước khi tiếp tục
                        await new Promise(r => setTimeout(r, 1500));
                        this.hideEventModal();
                    }
                }
            }
        }

        console.log(`[MOVE] Completed! Final position: ${team.position}`);
        this.log(`🚀 ${team.name} đến ô ${team.position}`);
        this.renderTeamsList();

        // Check win - Về đích = Húc cổng Dinh Độc Lập
        if (team.position >= this.mapNodes.length - 1) {
            this.showLeaderboard = true;

            // Play victory sound
            if (typeof soundManager !== 'undefined') {
                soundManager.play('victory');
            }

            // Trigger spectacular gate break effect!
            if (typeof effects !== 'undefined') {
                effects.gateBreakEffect();
            }

            // Show victory modal with gate crash message
            this.showEventModalWithImage('🏆', '🎖️ HÚC CỔNG DINH ĐỘC LẬP! 🎖️',
                `🎉 ${team.name} đã húc đổ cổng Dinh Độc Lập!\n\n` +
                `★ CHIẾN THẮNG VẺ VANG! ★\n` +
                `★ Giải phóng miền Nam thống nhất đất nước! ★`,
                'assets/icon_tank_3d.png');

            this.log(`🏆🏆🏆 ${team.name} HÚC CỔNG DINH ĐỘC LẬP - CHIẾN THẮNG! 🏆🏆🏆`);
            return;
        }

        // Áp dụng hiệu ứng ô đích (sau khi đã đi xong)
        const node = this.mapNodes[team.position];
        if (node && node.type && node.type !== 'normal') {
            await this.applyTileEffect(team, node.type);
        }

        this.endTurn();
    }
    async moveTeam(team, steps) {
        if (this.mapNodes.length === 0) {
            this.log("⚠️ Chưa có Map! Bật sửa Map để tạo.");
            this.endTurn();
            return;
        }

        const teamIndex = this.teams.indexOf(team);
        const startPos = team.position;
        let targetPos = startPos + steps;

        if (targetPos < 0) targetPos = 0;
        if (targetPos >= this.mapNodes.length) targetPos = this.mapNodes.length - 1;

        // Animate step by step
        const direction = steps > 0 ? 1 : -1;
        const totalSteps = Math.abs(targetPos - startPos);

        for (let i = 0; i < totalSteps; i++) {
            const fromNode = team.position;
            const toNode = team.position + direction;

            await this.renderer.startMoveAnimation(teamIndex, fromNode, toNode, 300);
            team.position = toNode;
            this.updateUI();
            this.renderTeamsList();
        }

        // Check win - Về đích = Húc cổng Dinh Độc Lập
        if (team.position >= this.mapNodes.length - 1) {
            this.showLeaderboard = true;

            // Play victory sound
            if (typeof soundManager !== 'undefined') {
                soundManager.play('victory');
            }

            // Trigger spectacular gate break effect!
            if (typeof effects !== 'undefined') {
                effects.gateBreakEffect();
            }

            // Show victory modal
            this.showEventModalWithImage('🏆', '🎖️ HÚC CỔNG DINH ĐỘC LẬP! 🎖️',
                `🎉 ${team.name} đã húc đổ cổng Dinh Độc Lập!\n\n` +
                `★ CHIẾN THẮNG VẺ VANG! ★\n` +
                `★ Giải phóng miền Nam thống nhất đất nước! ★`,
                'assets/icon_tank_3d.png');

            const node = this.mapNodes[team.position];
            const x = this.renderer.transformX(node.x);
            const y = this.renderer.transformY(node.y);
            this.renderer.spawnSparkle(x, y, '255, 215, 0');
            this.renderer.spawnSparkle(x, y, '255, 100, 100');

            this.log(`🏆🏆🏆 ${team.name} HÚC CỔNG DINH ĐỘC LẬP - CHIẾN THẮNG! 🏆🏆🏆`);
            return; // End game
        }

        // Check stage pass
        this.checkStagePass(team, startPos, team.position);

        // Áp dụng hiệu ứng ô (LUÔN áp dụng, kể cả khi qua chặng)
        const node = this.mapNodes[team.position];
        if (node.type && node.type !== 'normal') {
            await this.applyTileEffect(team, node.type);
        }

        this.updateUI();
        this.renderTeamsList();
        this.endTurn();
    }

    checkStagePass(team, oldPos, newPos) {
        for (const checkpoint of this.stageCheckpoints) {
            if (oldPos < checkpoint && newPos >= checkpoint) {
                // Play checkpoint sound
                if (typeof soundManager !== 'undefined') soundManager.playCheckpoint();

                const stageName = this.getStageName(newPos);
                this.showEventModal('🎖️', 'VƯỢT CHẶNG!', `${team.name} đã vượt qua ${stageName}! +1 độ bền tất cả bộ phận.`);
                team.repairAll(1); // Theo luật: +1 độ bền cho cả 3 bộ phận khi qua chặng
                team.immuneTurns += 1; // Cộng dồn lượt miễn nhiễm

                const node = this.mapNodes[newPos];
                const x = this.renderer.transformX(node.x);
                const y = this.renderer.transformY(node.y);
                this.renderer.spawnSparkle(x, y, '100, 255, 100');
                return true;
            }
        }
        return false;
    }

    showEventModal(icon, title, text) {
        document.getElementById('event-icon').textContent = icon;
        document.getElementById('event-title').textContent = title;
        document.getElementById('event-text').textContent = text;

        // Clear any previous image
        const imageContainer = document.getElementById('event-image-container');
        if (imageContainer) imageContainer.innerHTML = '';

        document.getElementById('event-modal').classList.remove('hidden');
    }

    hideEventModal() {
        document.getElementById('event-modal').classList.add('hidden');
        // Clear image container
        const imageContainer = document.getElementById('event-image-container');
        if (imageContainer) imageContainer.innerHTML = '';
    }

    showEventModalWithImage(icon, title, text, imagePath) {
        document.getElementById('event-icon').textContent = icon;
        document.getElementById('event-title').textContent = title;
        document.getElementById('event-text').textContent = text;

        // Add image to container
        const imageContainer = document.getElementById('event-image-container');
        if (imageContainer) {
            imageContainer.innerHTML = `<img src="${imagePath}" alt="${title}" />`;
        }

        document.getElementById('event-modal').classList.remove('hidden');
    }

    // ========== TILE EFFECTS ==========
    async applyTileEffect(team, type) {
        // DEBUG: Log what tile type is being processed
        console.log(`🎮 [applyTileEffect] Team: ${team.name}, Position: ${team.position}, Type: "${type}"`);

        const teamIndex = this.teams.indexOf(team);
        const node = this.mapNodes[team.position];
        const px = this.renderer.transformX(node.x);
        const py = this.renderer.transformY(node.y);

        // Check if broken tires skip bonus (ô thưởng - xe hỏng lốp sẽ trượt qua)
        const bonus = ['repair_one', 'repair_all', 'double_dice', 'immune', 'teleport', 'full_repair', 'repair_engine', 'repair_tires', 'repair_steering'];
        if (team.isBroken('tires') && bonus.includes(type)) {
            this.log(`🛞 ${team.name} hỏng lốp! Trượt qua ô thưởng.`);
            if (team.position + 1 < this.mapNodes.length) {
                await this.renderer.startMoveAnimation(teamIndex, team.position, team.position + 1, 200);
                team.position++;
            }
            return;
        }

        switch (type) {
            case 'mine':
                // Play explosion sound
                if (typeof soundManager !== 'undefined') soundManager.play('explosion');
                this.showEventModalWithImage('💥', 'BOM!', `${team.name} dính bom! Hỏng toàn bộ xe.`, 'assets/icon_bomb_3d.png');
                this.log(`💥 ${team.name} dính BOM!`);
                team.damageAll(10);
                this.renderPermanentPartsBar(); // Update UI immediately
                this.renderer.spawnExplosion(px, py);
                break;

            case 'repair_one':
                // TỔNG TIẾN CÔNG - Sửa chữa hoàn toàn cả 3 bộ phận (theo luật F1.txt)
                if (typeof soundManager !== 'undefined') soundManager.play('powerup');
                if (typeof effects !== 'undefined') effects.spawnConfetti(50);
                this.showEventModalWithImage('🔧', 'TỔNG TIẾN CÔNG',
                    `${team.name} đạt Tổng tiến công! Sửa chữa hoàn toàn 3 bộ phận!`,
                    'assets/icon_repair_3d.png');
                this.log(`🔧 Tổng tiến công: Sửa hoàn toàn 3 bộ phận`);
                team.restoreAll();
                this.renderPermanentPartsBar();
                this.renderer.spawnSparkle(px, py, '100, 200, 255');
                break;

            case 'damage_all':
                if (typeof soundManager !== 'undefined') soundManager.play('damage');
                this.showEventModalWithImage('⚔️', 'HỖN CHIẾN', `${team.name} gặp hỗn chiến! -1 độ bền tất cả.`, 'assets/icon_battle_3d.png');
                this.log(`⚔️ Hỗn chiến: -1 tất cả`);
                team.damageAll(1);
                this.renderPermanentPartsBar();
                break;

            case 'repair_all':
                if (typeof soundManager !== 'undefined') soundManager.play('powerup');
                this.showEventModalWithImage('⏰', 'THỜI CƠ', `${team.name} gặp thời cơ! +1 độ bền tất cả.`, 'assets/icon_tank_3d.png');
                this.log(`⏰ Thời cơ: +1 tất cả`);
                team.repairAll(1);
                this.renderPermanentPartsBar();
                this.renderer.spawnSparkle(px, py);
                break;

            case 'swap':
                if (typeof soundManager !== 'undefined') soundManager.playSwap();
                this.doSwapEffect(team);
                break;

            case 'double_dice':
                this.showEventModalWithImage('⏱️', 'THẦN TỐC', `${team.name} nhận Thần tốc! x2 xúc xắc lượt sau.`, 'assets/icon_speed_3d.png');
                this.log(`⚡ Thần tốc: x2 lượt sau`);
                team.hasDoubleDice = true;
                this.renderer.spawnSparkle(px, py, '255, 200, 0');
                break;

            case 'immune':
                this.showEventModalWithImage('🛡️', 'GIA CỐ', `${team.name} được gia cố! Lượt sau sẽ không bị mất độ bền.`, 'assets/icon_shield_3d.png');
                this.log(`🛡️ Gia cố: Lượt sau sẽ không bị mất độ bền`);
                team.immuneNextTurn = true; // Đánh dấu để kích hoạt protection vào cuối lượt
                this.renderer.spawnSparkle(px, py, '100, 255, 255');
                break;

            case 'skip_turn':
                if (typeof soundManager !== 'undefined') soundManager.playFreeze();
                this.showEventModalWithImage('❄️', 'ĐÓNG BĂNG', `${team.name} bị đóng băng! Mất lượt kế tiếp.`, 'assets/icon_freeze_3d.png');
                this.log(`❄️ Đóng băng`);
                team.isFrozen = true;
                break;

            case 'teleport':
                const nextCheckpoint = this.stageCheckpoints.find(c => c > team.position);
                if (nextCheckpoint && nextCheckpoint < this.mapNodes.length) {
                    this.showEventModalWithImage('🚀', 'ĐÁNH CHIẾM', `${team.name} bay tới chặng tiếp theo!`, 'assets/icon_teleport_3d.png');
                    this.log(`🚀 Đánh chiếm: Nhảy tới checkpoint`);

                    // Animate teleport
                    for (let i = team.position; i < nextCheckpoint; i++) {
                        await this.renderer.startMoveAnimation(teamIndex, i, i + 1, 100);
                        team.position = i + 1;
                    }
                }
                break;

            case 'drop_engine':
                this.showEventModalWithImage('⚙️', 'RƠI ĐỘNG CƠ!',
                    `${team.name} mất động cơ! Gieo 1-3 đi 1 ô, 4-6 đi 2 ô.`,
                    'assets/icon_engine_3d.png');
                this.log(`⚙️ ${team.name} mất động cơ!`);
                team.stats.engine = 0;
                this.renderPermanentPartsBar(); // Update UI immediately
                break;

            case 'drop_tire':
                this.showEventModalWithImage('🛞', 'RƠI BÁNH XE!',
                    `${team.name} mất bánh xe! Sẽ trượt qua ô điểm thưởng.`,
                    'assets/icon_tire_3d.png');
                this.log(`🛞 ${team.name} mất bánh xe!`);
                team.stats.tires = 0;
                this.renderPermanentPartsBar(); // Update UI immediately
                break;

            case 'drop_steering':
                this.showEventModalWithImage('🎡', 'RƠI VÔ LĂNG!',
                    `${team.name} mất vô lăng! Gieo 2 lần: lần 1 số ô, lần 2 tiến/lùi.`,
                    'assets/icon_steering_3d.png');
                this.log(`🎡 ${team.name} mất vô lăng!`);
                team.stats.steering = 0;
                this.renderPermanentPartsBar(); // Update UI immediately
                break;

            case 'checkpoint':
                // Play checkpoint sound with level up effect
                if (typeof soundManager !== 'undefined') {
                    soundManager.playCheckpoint();
                    soundManager.playLevelUp();
                }
                // Qua chặng - +1 độ bền cho cả 3 bộ phận (theo luật F1.txt)
                this.showEventModalWithImage('🏁', 'CHẶNG MỚI!',
                    `${team.name} đến chặng mới! +1 độ bền tất cả bộ phận!`,
                    'assets/icon_repair_3d.png');
                this.log(`🏁 ${team.name} qua chặng - +1 độ bền!`);
                team.repairAll(1);
                this.renderPermanentPartsBar(); // Update UI immediately
                this.renderer.spawnSparkle(px, py, '0, 255, 100');
                break;

            case 'trap':
                // Ngụy - đổi vị trí với đội gần nhất
                if (typeof soundManager !== 'undefined') soundManager.playSwap();
                this.doSwapEffect(team);
                break;

            case 'full_repair':
                // TỔNG TIẾN CÔNG - Sửa hoàn toàn cả 3 bộ phận (theo luật F1.txt)
                if (typeof soundManager !== 'undefined') soundManager.play('powerup');
                if (typeof effects !== 'undefined') effects.spawnConfetti(100);
                this.showEventModalWithImage('🔧', 'TỔNG TIẾN CÔNG!',
                    `${team.name} đạt Tổng tiến công! Sửa chữa hoàn toàn cả 3 bộ phận!`,
                    'assets/icon_repair_3d.png');
                this.log(`🔧 TỔNG TIẾN CÔNG: Sửa hoàn toàn cả 3 bộ phận!`);
                team.restoreAll();
                this.renderPermanentPartsBar();
                this.renderer.spawnSparkle(px, py, '255, 215, 0');
                break;

            case 'repair_engine':
                // Ô ĐỘNG CƠ - Hồi đầy động cơ (+3)
                if (typeof soundManager !== 'undefined') soundManager.play('repair');
                this.showEventModalWithImage('⚙️', 'ĐỘNG CƠ!',
                    `${team.name} tìm được động cơ mới! Hồi đầy động cơ (+3)!`,
                    'assets/icon_engine_3d.png');
                this.log(`⚙️ Ô Động cơ: Hồi đầy động cơ!`);
                team.stats.engine = team.maxStats.engine;
                this.renderPermanentPartsBar();
                this.renderer.spawnSparkle(px, py, '255, 100, 100');
                break;

            case 'repair_tires':
                // Ô BÁNH XE - Hồi đầy lốp (+2)
                if (typeof soundManager !== 'undefined') soundManager.play('repair');
                this.showEventModalWithImage('🛞', 'BÁNH XE!',
                    `${team.name} tìm được lốp mới! Hồi đầy bánh xe (+2)!`,
                    'assets/icon_tire_3d.png');
                this.log(`🛞 Ô Bánh xe: Hồi đầy lốp!`);
                team.stats.tires = team.maxStats.tires;
                this.renderPermanentPartsBar();
                this.renderer.spawnSparkle(px, py, '100, 100, 255');
                break;

            case 'repair_steering':
                // Ô VÔ LĂNG - Hồi đầy vô lăng (+4)
                if (typeof soundManager !== 'undefined') soundManager.play('repair');
                this.showEventModalWithImage('🎡', 'VÔ LĂNG!',
                    `${team.name} tìm được vô lăng mới! Hồi đầy vô lăng (+4)!`,
                    'assets/icon_steering_3d.png');
                this.log(`🎡 Ô Vô lăng: Hồi đầy vô lăng!`);
                team.stats.steering = team.maxStats.steering;
                this.renderPermanentPartsBar();
                this.renderer.spawnSparkle(px, py, '100, 255, 100');
                break;

            case 'finish':
                // Giữ lại cho backward compatibility
                if (typeof soundManager !== 'undefined') soundManager.play('victory');
                if (typeof effects !== 'undefined') effects.victoryEffect();
                this.showEventModalWithImage('🏆', 'TỔNG TIẾN CÔNG!',
                    `${team.name} đạt tổng tiến công! Sửa hoàn toàn cả 3 bộ phận!`,
                    'assets/icon_repair_3d.png');
                team.restoreAll();
                this.renderPermanentPartsBar();
                this.renderer.spawnSparkle(px, py, '255, 215, 0');
                break;
        }
    }

    // NGUỴ - Đổi chỗ với đội gần nhất (theo luật mới)
    // 1. Chỉ đổi với đội đã vào game (position >= 0)
    // 2. Đổi với đội GẦN NHẤT
    // 3. Nếu 2 đội cách đều → ưu tiên đội PHÍA TRÊN (position cao hơn)
    // 4. Nếu là tank đầu tiên (không có đội nào phía trên) → đổi với đội ngay sau
    doSwapEffect(team) {
        const currentPos = team.position;

        // Tìm tất cả đội đã vào game (position >= 0) ngoại trừ đội hiện tại
        const teamsInGame = this.teams.filter(t => t.id !== team.id && t.position >= 0);

        if (teamsInGame.length === 0) {
            // Không có đội nào khác trong game → không thể đổi chỗ
            this.showEventModal('🎭', 'NGUỴ', `${team.name} kích hoạt NGUỴ nhưng không có đội nào để đổi chỗ!`);
            this.log(`🎭 NGUỴ: Không có đội nào trong game để đổi chỗ`);
            return;
        }

        // Tính khoảng cách của từng đội
        const teamsWithDist = teamsInGame.map(t => ({
            team: t,
            distance: Math.abs(t.position - currentPos),
            isAhead: t.position > currentPos
        }));

        // Sắp xếp: Ưu tiên gần nhất, nếu bằng nhau thì ưu tiên phía trên (isAhead = true)
        teamsWithDist.sort((a, b) => {
            if (a.distance !== b.distance) {
                return a.distance - b.distance; // Gần hơn = ưu tiên
            }
            // Cùng khoảng cách → ưu tiên phía trên
            return b.isAhead - a.isAhead; // true (1) > false (0)
        });

        // Đổi chỗ với đội gần nhất
        const targetTeam = teamsWithDist[0].team;
        const tempPos = team.position;
        team.position = targetTeam.position;
        targetTeam.position = tempPos;

        const direction = teamsWithDist[0].isAhead ? 'phía trên' : 'phía dưới';
        const msg = `${team.name} kích hoạt NGUỴ! Đổi chỗ với ${targetTeam.name} (${direction})!`;

        this.showEventModal('🎭', 'NGUỴ', msg);
        this.log(`🎭 ${msg}`);
        this.renderTeamsList();
    }

    // Popup to choose which part to repair - FIXED: Use correct selectors
    showRepairChoice(team) {
        return new Promise(resolve => {
            // Get modal and content elements with correct selectors
            const modal = document.getElementById('event-modal');
            const content = modal.querySelector('.event-modal-content');
            const footer = modal.querySelector('.event-modal-footer');

            // Store original content
            const originalContent = content.innerHTML;
            const originalFooter = footer.innerHTML;

            // Update modal content with repair choices
            document.getElementById('event-icon').textContent = '🔧';
            document.getElementById('event-title').textContent = 'TỔNG TIẾN CÔNG';

            content.innerHTML = `
                <p class="event-description">Chọn bộ phận cần sửa hoàn toàn:</p>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px; flex-wrap: wrap; flex-direction: column; align-items: center;">
                    <button class="event-btn-ok btn-repair" data-part="engine" style="background: linear-gradient(135deg, #e74c3c, #c0392b); font-family: Roboto, sans-serif; display: flex; align-items: center; gap: 10px;">
                        <img src="assets/icon_engine_3d.png" style="width: 28px; height: 28px;" alt="Engine"> Động cơ (${team.stats.engine}/${team.maxStats.engine})
                    </button>
                    <button class="event-btn-ok btn-repair" data-part="tires" style="background: linear-gradient(135deg, #3498db, #2980b9); font-family: Roboto, sans-serif; display: flex; align-items: center; gap: 10px;">
                        <img src="assets/icon_tire_3d.png" style="width: 28px; height: 28px;" alt="Tire"> Lốp (${team.stats.tires}/${team.maxStats.tires})
                    </button>
                    <button class="event-btn-ok btn-repair" data-part="steering" style="background: linear-gradient(135deg, #2ecc71, #27ae60); font-family: Roboto, sans-serif; display: flex; align-items: center; gap: 10px;">
                        <img src="assets/icon_steering_3d.png" style="width: 28px; height: 28px;" alt="Steering"> Vô lăng (${team.stats.steering}/${team.maxStats.steering})
                    </button>
                </div>
            `;
            footer.innerHTML = ''; // Hide default OK button

            modal.classList.remove('hidden');

            // Play repair sound
            if (typeof soundManager !== 'undefined') soundManager.play('repair');

            const buttons = content.querySelectorAll('.btn-repair');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const part = btn.dataset.part;
                    team.repair(part);
                    this.log(`🔧 Sửa ${part === 'engine' ? 'Động cơ' : (part === 'tires' ? 'Lốp' : 'Vô lăng')}`);
                    this.renderPermanentPartsBar();

                    // Restore original modal structure
                    content.innerHTML = originalContent;
                    footer.innerHTML = originalFooter;

                    // Re-bind OK button
                    document.getElementById('btn-event-ok').addEventListener('click', () => this.hideEventModal());

                    this.hideEventModal();
                    this.updateUI();
                    resolve();
                });
            });
        });
    }

    // ========== END TURN ==========
    endTurn() {
        const team = this.teams[this.currentTurn];

        console.log(`[END TURN] Đang xử lý lượt của: ${team.name} (ID: ${team.id})`);
        console.log(`[END TURN] Position: ${team.position}, ImmuneTurns: ${team.immuneTurns}, NextImmune: ${team.immuneNextTurn}`);

        // Giảm độ bền phụ tùng theo luật mới:
        // - Động cơ: mỗi 3 lượt mới -1
        // - Lốp: mỗi 2 lượt mới -1  
        // - Vô lăng: mỗi 4 lượt mới -1

        if (team.position < 0) {
            // Tank chưa vào game, không giảm độ bền và không đếm lượt
            this.log(`📍 ${team.name} chưa vào game, không mất độ bền.`);
        } else if (team.immuneTurns > 0) {
            // Nếu có gia cố, lượt này không mất độ bền (vẫn đếm lượt)
            this.log(`🛡️ ${team.name} được GIA CỐ: Không mất độ bền!`);
            team.immuneTurns--;
            team.turnCount++; // Vẫn đếm lượt
        } else {
            // Tăng số lượt đã chơi
            team.turnCount++;
            const turn = team.turnCount;

            let decayMsg = [];

            // Động cơ: -1 mỗi 3 lượt (lượt 3, 6, 9...)
            if (turn % 3 === 0 && team.stats.engine > 0) {
                team.stats.engine = Math.max(0, team.stats.engine - 1);
                decayMsg.push(`Động cơ ${team.stats.engine}`);
            }

            // Lốp: -1 mỗi 2 lượt (lượt 2, 4, 6...)
            if (turn % 2 === 0 && team.stats.tires > 0) {
                team.stats.tires = Math.max(0, team.stats.tires - 1);
                decayMsg.push(`Lốp ${team.stats.tires}`);
            }

            // Vô lăng: -1 mỗi 4 lượt (lượt 4, 8, 12...)
            if (turn % 4 === 0 && team.stats.steering > 0) {
                team.stats.steering = Math.max(0, team.stats.steering - 1);
                decayMsg.push(`Vô lăng ${team.stats.steering}`);
            }

            if (decayMsg.length > 0) {
                this.log(`⚙️ Lượt ${turn} - ${team.name} hao mòn: ${decayMsg.join(', ')}`);
            } else {
                this.log(`📍 Lượt ${turn} - ${team.name} không hao mòn lượt này`);
            }
        }

        // Xử lý flag immuneNextTurn (Gia cố cho lượt sau)
        // ĐẶT Ở CUỐI: Lượt hiện tại đã mất độ bền xong, giờ mới kích hoạt protection cho lượt SAU
        if (team.immuneNextTurn) {
            console.log(`[END TURN] ${team.name} đã vào Gia cố! Lượt SAU sẽ được bảo vệ.`);
            team.immuneTurns = 1; // Lượt tiếp theo sẽ được bảo vệ
            team.immuneNextTurn = false;
        }

        // Update permanent parts bar IMMEDIATELY
        this.renderPermanentPartsBar();

        // Switch to next team in round-robin order
        this.currentTurn = (this.currentTurn + 1) % this.teams.length;

        // Update UI
        this.updateUI();
        this.renderTeamsList();
        this.canRoll = false;

        setTimeout(() => {
            this.log(`\n--- ${this.teams[this.currentTurn].name} ---`);
            this.log("👆 Bấm nút CÂU HỎI để tiếp tục!");
            this.canQuestion = true;
            this.enableQuestionButton();
        }, 500);
    }

    // Update rank sidebar - show all teams sorted by position
    updateRankSidebar() {
        const rankList = document.getElementById('rank-list');
        if (!rankList) return;

        // Sort teams by position (highest first)
        const sortedTeams = [...this.teams].sort((a, b) => b.position - a.position);

        rankList.innerHTML = '';
        sortedTeams.forEach((team, index) => {
            const isActive = team === this.teams[this.currentTurn];

            const item = document.createElement('div');
            item.className = 'rank-item' + (isActive ? ' active' : '');

            item.innerHTML = `
                <div class="rank-number">${index + 1}</div>
                <img class="rank-tank-icon" src="${team.icon}" alt="${team.name}" style="border-color: ${team.color}">
                <div class="rank-info">
                    <div class="rank-team-name" style="color: ${team.color}">${team.name}</div>
                    <div class="rank-position">Ô ${team.position}</div>
                </div>
            `;

            rankList.appendChild(item);
        });
    }

    // Get team color CSS class
    getTeamColorClass(color) {
        const colorMap = {
            '#e74c3c': 'team-red',
            '#3498db': 'team-blue',
            '#2ecc71': 'team-green',
            '#f39c12': 'team-orange',
            '#9b59b6': 'team-purple',
            '#00bcd4': 'team-cyan',
            '#e91e63': 'team-pink'
        };
        return colorMap[color] || 'team-red';
    }

    // Switch turn to team with highest position
    switchToHighestTeam() {
        // Sort teams by position (highest first)
        const sortedTeams = [...this.teams].sort((a, b) => b.position - a.position);
        const highestTeam = sortedTeams[0];
        const highestTeamIndex = this.teams.indexOf(highestTeam);

        this.currentTurn = highestTeamIndex;
        this.updateUI();
        this.renderTeamsList();
        this.canRoll = false;

        setTimeout(() => {
            this.log(`\n--- ${this.teams[this.currentTurn].name} ---`);
            this.log("👆 Bấm nút CÂU HỎI để tiếp tục!");
            this.canQuestion = true;
            this.enableQuestionButton();
        }, 500);
    }

    enableQuestionButton() {
        const btn = document.getElementById('fab-question');
        if (btn) {
            btn.disabled = false;
            btn.classList.add('pulse');
        }
    }

    disableQuestionButton() {
        const btn = document.getElementById('fab-question');
        if (btn) {
            btn.disabled = true;
            btn.classList.remove('pulse');
        }
    }

    // ========== UI ==========
    updateUI() {
        const team = this.teams[this.currentTurn];

        // Update turn badge
        const badge = document.getElementById('turn-team-name');
        if (badge) {
            badge.textContent = team.name;
            badge.style.color = team.color;
        }

        // Update FAB dice button state
        const diceBtn = document.getElementById('fab-dice');
        if (diceBtn) {
            diceBtn.disabled = !this.canRoll;
        }

        if (this.teams.length > 0) {
            this.renderTeamStatusPopup(); // Update Popup UI
        }
    }

    // updateRaceProgressBar() removed - race progress bar UI has been deleted

    updateBar(barId, valId, val, max) {
        const bar = document.getElementById(barId);
        const valEl = document.getElementById(valId);
        const pct = (val / max) * 100;
        bar.style.width = `${pct}%`;
        valEl.textContent = val;
        bar.classList.toggle('low', pct < 30);
    }

    log(msg) {
        const ul = document.getElementById('game-log');
        const li = document.createElement('li');
        li.textContent = msg;
        ul.insertBefore(li, ul.firstChild);
        while (ul.children.length > 50) ul.removeChild(ul.lastChild);
    }

    update() { }

    loop() {
        this.update();
        this.renderer.draw(this);
        requestAnimationFrame(() => this.loop());
    }

    // ========== EDITOR ==========
    toggleEditor() {
        this.isEditorMode = !this.isEditorMode;
    }

    addNode(x, y, type = 'normal') {
        if (!this.isEditorMode) return;
        this.mapNodes.push({ x, y, type });
        this.saveNodes();
    }

    undoNode() {
        if (!this.isEditorMode) return;
        this.mapNodes.pop();
        this.saveNodes();
    }

    saveNodes() {
        localStorage.setItem('mapNodes', JSON.stringify(this.mapNodes));
    }

    // clearPath() moved to line 48 - removed duplicate

    // Xuất code tọa độ để lưu vĩnh viễn
    exportPath() {
        if (this.mapNodes.length === 0) {
            alert('Chưa có đường đi nào! Hãy vẽ đường trước.');
            return;
        }

        let code = 'this.mapNodes = [\n';
        this.mapNodes.forEach((node, index) => {
            const x = Math.round(node.x);
            const y = Math.round(node.y);
            code += `    { x: ${x}, y: ${y}, type: '${node.type}' }`;
            if (index < this.mapNodes.length - 1) code += ',';
            code += `  // ${index}\n`;
        });
        code += '];';

        // Tạo popup hiển thị code
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #1a1a2e; border: 2px solid #f1c40f; border-radius: 10px;
            padding: 20px; z-index: 10000; max-width: 80%; max-height: 80%;
            overflow: auto; color: #fff; font-family: monospace;
        `;
        popup.innerHTML = `
            <h3 style="color: #f1c40f; margin: 0 0 10px;">📋 Copy code này vào initDefaultPath() trong game.js</h3>
            <textarea id="path-code" style="width: 100%; height: 300px; background: #2c3e50; color: #2ecc71; 
                border: none; padding: 10px; font-family: monospace; font-size: 12px;">${code}</textarea>
            <div style="margin-top: 10px; text-align: center;">
                <button onclick="navigator.clipboard.writeText(document.getElementById('path-code').value); alert('Đã copy!');" 
                    style="padding: 10px 20px; background: #27ae60; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                    📋 Copy Code
                </button>
                <button onclick="this.parentElement.parentElement.remove();" 
                    style="padding: 10px 20px; background: #e74c3c; color: #fff; border: none; border-radius: 5px; cursor: pointer;">
                    ❌ Đóng
                </button>
            </div>
        `;
        document.body.appendChild(popup);

        this.log(`💾 Đã xuất ${this.mapNodes.length} ô. Copy code và dán vào game.js để lưu vĩnh viễn!`);
    }
}
