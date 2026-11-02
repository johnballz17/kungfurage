/**
 * CARPE'S KUNG FU RAGE - MAIN GAME ENGINE
 * State machine, main loop, belt-scroll depth rendering, HUD, and arcade lifecycle.
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.gameState = 'TITLE'; // 'TITLE', 'CHARACTER_SELECT', 'PLAYING', 'PAUSED', 'STORE', 'GAMEOVER', 'VICTORY'

    this.characters = ['smellu', 'lindin', 'smoro'];
    this.selectedCharIndex = 0;
    this.selectedWeaponIndex = 0;

    // 3 Selectable Starting Weapons for each Fighter
    this.characterWeapons = {
      smellu: [
        { type: 'nunchaku', name: 'NUNCHAKU', desc: 'Twin Dragon Sticks - High combo speed & reach' },
        { type: 'pistols', name: 'DUAL PISTOLS', desc: 'Twin Dragons .45 - Gun-fu shooting combos' },
        { type: 'daggers', name: 'TWIN DAGGERS', desc: 'Crimson Viper Blades - Razor speed & green bleed' }
      ],
      lindin: [
        { type: 'daggers', name: 'TWIN DAGGERS', desc: 'Venom Assassin Kunai - Hyper speed slashes' },
        { type: 'pistols', name: 'DUAL PISTOLS', desc: 'Dual Silenced Pistols - Akimbo bullet flurries' },
        { type: 'nunchaku', name: 'NUNCHAKU', desc: 'Shadow Viper Chain - Rapid multi-hit chains' }
      ],
      smoro: [
        { type: 'pipe', name: 'LEAD PIPE', desc: 'Iron Bull Lead Pipe - Colossal bone-crushing smash' },
        { type: 'pistols', name: 'DUAL PISTOLS', desc: 'Dual Heavy Magnums - High caliber explosive shots' },
        { type: 'nunchaku', name: 'NUNCHAKU', desc: 'Heavy Steel Flail - Heavy sweeping strikes' }
      ]
    };

    // Chinatown Weapons Armory (Store) Items
    this.storeItems = [
      { id: 'pistols', name: 'DUAL PISTOLS (36 Bullets)', type: 'weapon', weaponType: 'pistols', cost: 1500, desc: 'Gun-Fu shooting combos, tracers & brass shells' },
      { id: 'nunchaku', name: 'NUNCHAKU (24 Hits)', type: 'weapon', weaponType: 'nunchaku', cost: 1000, desc: 'Rapid whipping multi-hit flurries & reach' },
      { id: 'daggers', name: 'TWIN DAGGERS (20 Hits)', type: 'weapon', weaponType: 'daggers', cost: 1000, desc: 'Lethal razor slashes & extra green gore' },
      { id: 'pipe', name: 'LEAD PIPE (15 Hits)', type: 'weapon', weaponType: 'pipe', cost: 1200, desc: 'Heavy bone-shattering smash with knockdown' },
      { id: 'pizza', name: 'PIZZA SLICE (+50 HP)', type: 'heal', amount: 50, cost: 800, desc: 'Fresh hot pepperoni slice restores 50 HP' },
      { id: 'scroll', name: 'DRAGON SCROLL (Max Ki)', type: 'scroll', cost: 1200, desc: 'Instantly fills Special Ki meter to Maximum' }
    ];
    this.selectedStoreIndex = 0;

    // Difficulty & Companion Settings
    this.difficulty = localStorage.getItem('kungfu_difficulty') || 'NORMAL';
    this.companionEnabled = localStorage.getItem('kungfu_companion_enabled') !== 'false';
    this.companionChar = localStorage.getItem('kungfu_companion_char') || 'auto';
    this.companionTactics = localStorage.getItem('kungfu_companion_tactics') || 'balanced';
    this.companion = null;

    // Autonomous AI Auto-Play & Q-Learning Spectator Mode
    this.autoPlay = (typeof localStorage !== 'undefined' && localStorage.getItem('kungfu_autoplay') === 'true');
    this.autoPlayRestartTimer = 0;

    // Game Mode & Vertical Mechanics
    this.gameMode = localStorage.getItem('kungfu_gamemode') || 'HORIZONTAL';

    this.player = new Player(100, 210, 'smellu');
    this.stage = new Stage();
    if (this.stage.gameMode !== this.gameMode) {
      this.stage.setGameMode(this.gameMode);
    }
    this.enemies = [];
    this.breakables = [];
    this.pickups = [];

    // Manual Booklet state
    this.manualOpen = false;
    this.currentManualPage = 1;
    this.totalManualPages = 11;

    this.highScore = parseInt(localStorage.getItem('kungfu_high_score') || '10000', 10);
    this.lastTime = performance.now();
    this.titleBlink = 0;
    this.victoryTimer = 0;
    this.stageTransition = null;
    this.volumeToastTimer = 0;

    // Periodic random battle anthem (The Tiger's Trap) roughly every 10 minutes in combat
    this.tigerTrapCombatTimer = 0;
    this.nextTigerTrapInterval = 600 + (Math.random() * 120 - 60);

    this.setupUI();
    this.setupSettingsUI();
    this.setupManualUI();

    // Start Title/Intro Theme (Shadow in the Dojo)
    if (window.soundEngine) {
      window.soundEngine.startBGM('title');
    }

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  toggleGameMode() {
    if (this.gameMode === 'HORIZONTAL') {
      this.gameMode = 'VERTICAL';
    } else if (this.gameMode === 'VERTICAL') {
      this.gameMode = 'ENDLESS';
    } else {
      this.gameMode = 'HORIZONTAL';
    }
    localStorage.setItem('kungfu_gamemode', this.gameMode);
    if (this.stage) {
      this.stage.setGameMode(this.gameMode);
    }
    if (this.gameState === 'PLAYING') {
      this.enemies = [];
      this.breakables = [];
      this.pickups = [];
      this.stageTransition = null;
    this.volumeToastTimer = 0;
      if (this.player) {
        this.player.x = (this.gameMode === 'VERTICAL') ? 240 : 100;
        this.player.y = 205;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.vz = 0;
        this.player.z = 0;
        this.player.punchChargeTimer = 0;
      }
      if (this.companion) {
        this.companion.x = (this.gameMode === 'VERTICAL') ? 200 : 60;
        this.companion.y = 215;
        this.companion.vx = 0;
        this.companion.vy = 0;
        this.companion.vz = 0;
        this.companion.z = 0;
        this.companion.isDead = false;
        this.companion.reviveTimer = 0;
        this.companion.state = 'idle';
      }
      if (this.stage.gameMode !== 'VERTICAL') {
        this.enemies.push(new Enemy(320, 195, 'thug'));
        this.enemies.push(new Enemy(420, 230, 'thug'));
        this.breakables.push(new Breakable(220, 205, 'crate', 'pizza'));
      }
      if (window.combatSystem && this.player) {
        const modeLabel = (this.gameMode === 'VERTICAL') ? 'PAGODA ASCENT' : 'BELT-SCROLL STREET';
        window.combatSystem.spawnComboText(this.player.x, this.player.y - 45, `MODE: ${modeLabel}`, '#00ffcc');
      }
    }
    if (window.soundEngine) {
      window.soundEngine.playPickup();
    }
  }

  getDifficultyModifiers() {
    switch (this.difficulty) {
      case 'EASY':
        return { playerDamageTakenMult: 0.7, playerDamageDealtMult: 1.25, enemyHealthMult: 0.75, enemyAttackCooldownMult: 1.4 };
      case 'HARD':
        return { playerDamageTakenMult: 1.35, playerDamageDealtMult: 0.9, enemyHealthMult: 1.3, enemyAttackCooldownMult: 0.75 };
      case 'MASTER':
        return { playerDamageTakenMult: 1.7, playerDamageDealtMult: 0.8, enemyHealthMult: 1.6, enemyAttackCooldownMult: 0.6 };
      case 'NORMAL':
      default:
        return { playerDamageTakenMult: 1.0, playerDamageDealtMult: 1.0, enemyHealthMult: 1.0, enemyAttackCooldownMult: 1.0 };
    }
  }

  setupUI() {
    // Scanline Toggle
    const scanlineBtn = document.getElementById('toggle-scanlines');
    if (scanlineBtn) {
      scanlineBtn.addEventListener('click', () => {
        const screen = document.getElementById('screen-wrapper');
        screen.classList.toggle('crt-off');
        const isOn = !screen.classList.contains('crt-off');
        scanlineBtn.innerText = `CRT: ${isOn ? 'ON' : 'OFF'}`;
      });
    }

    // Initialize Unified Master/BGM/SFX Volume Controls
    this.initVolumeControls();

    // Touch Toggle
    const touchBtn = document.getElementById('toggle-touch');
    if (touchBtn) {
      touchBtn.addEventListener('click', () => {
        const touchContainer = document.getElementById('touch-controls');
        touchContainer.classList.toggle('hidden');
        touchBtn.innerText = `TOUCH: ${touchContainer.classList.contains('hidden') ? 'OFF' : 'ON'}`;
      });
    }

    // AI Auto-Play Watch Mode Toggle in footer
    const autoPlayFooterBtn = document.getElementById('toggle-autoplay-btn');
    if (autoPlayFooterBtn) {
      autoPlayFooterBtn.addEventListener('click', () => {
        this.toggleAutoPlay();
      });
    }
    this.refreshAutoPlayUI();

    // Click or Tap anywhere on canvas/screen to Start / Select / Shop
    this.canvas.addEventListener('click', (e) => {
      window.soundEngine.resume();
      if (this.gameState === 'TITLE') {
        this.gameState = 'CHARACTER_SELECT';
        window.soundEngine.startBGM('title');
        window.soundEngine.playPickup();
        return;
      }
      if (this.gameState === 'CHARACTER_SELECT') {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
        const clickY = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

        // Click on starting weapon options
        if (clickY >= 198 && clickY <= 226) {
          if (clickX < 170) this.selectedWeaponIndex = 0;
          else if (clickX < 310) this.selectedWeaponIndex = 1;
          else this.selectedWeaponIndex = 2;
          window.soundEngine.playSwing(420);
          return;
        }

        // Click on Mode toggle or Manual button
        if (clickY >= 227 && clickY <= 243) {
          if (clickX <= 335) {
            this.toggleGameMode();
            return;
          } else {
            this.openManualModal();
            return;
          }
        }

        // Click on fighter portraits
        if (clickX < 170) {
          this.selectedCharIndex = 0;
        } else if (clickX < 310) {
          this.selectedCharIndex = 1;
        } else {
          this.selectedCharIndex = 2;
        }
        this.startNewGame(this.characters[this.selectedCharIndex]);
        window.soundEngine.playPickup();
        return;
      }
      if (this.gameState === 'STORE') {
        const rect = this.canvas.getBoundingClientRect();
        const clickY = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
        if (clickY > 228) {
          this.toggleStore();
          return;
        }
        const itemIdx = Math.floor((clickY - 58) / 25);
        if (itemIdx >= 0 && itemIdx < this.storeItems.length) {
          this.selectedStoreIndex = itemIdx;
          this.buyStoreItem(itemIdx);
        }
        return;
      }
      if (this.gameState === 'PLAYING') {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
        const clickY = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
        // Click on [B] STORE button
        if (clickX >= 195 && clickX <= 285 && clickY >= 44 && clickY <= 62) {
          this.toggleStore();
          return;
        }
      }
      if (this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') {
        this.gameState = 'CHARACTER_SELECT';
        window.soundEngine.startBGM('title');
        window.soundEngine.playPickup();
        return;
      }
    });
  }

  toggleStore() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'STORE';
      this.selectedStoreIndex = 0;
      window.soundEngine.playPickup();
    } else if (this.gameState === 'STORE') {
      this.gameState = 'PLAYING';
      window.soundEngine.playPickup();
    }
  }

  buyStoreItem(index) {
    const item = this.storeItems[index];
    if (!item) return;

    if (this.player.score >= item.cost) {
      this.player.score -= item.cost;
      window.soundEngine.playShopBuy();

      if (item.type === 'weapon') {
        this.player.equipWeapon(item.weaponType);
        window.combatSystem.spawnComboText(this.player.x, this.player.y - 45, `${item.name.split(' ')[0]} EQUIPPED!`, '#05d9e8');
      } else if (item.type === 'heal') {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + item.amount);
        window.combatSystem.spawnComboText(this.player.x, this.player.y - 45, `+${item.amount} HP!`, '#00ff66');
      } else if (item.type === 'scroll') {
        this.player.specialMeter = this.player.maxSpecial;
        window.combatSystem.spawnComboText(this.player.x, this.player.y - 45, 'DRAGON KI MAX!', '#ffd700');
      }
      if (window.gameLogger) {
        window.gameLogger.log('STORE', `Purchased ${item.name} for ${item.cost} pts (Remaining: ${this.player.score})`);
      }
    } else {
      window.soundEngine.playEmptyGun();
      window.combatSystem.spawnComboText(this.player.x, this.player.y - 45, 'NOT ENOUGH SCORE!', '#ff2a6d');
      if (window.gameLogger) {
        window.gameLogger.log('STORE', `Failed purchase: ${item.name} (Need ${item.cost}, have ${this.player.score})`);
      }
    }
  }

  startNewGame(characterId = 'smellu', startingWeapon = null) {
    this.gameState = 'PLAYING';
    this.stage.loadStage(1);
    this.player = new Player(100, 210, characterId);

    // Equip selected starting weapon
    if (!startingWeapon && this.characterWeapons && this.characterWeapons[characterId]) {
      startingWeapon = this.characterWeapons[characterId][this.selectedWeaponIndex]?.type || 'nunchaku';
    }
    if (startingWeapon && this.player.equipWeapon) {
      this.player.equipWeapon(startingWeapon);
    }

    // In Auto-Play mode, guarantee 2P AI Companion is enabled so 2 AI companions fight together
    if (this.autoPlay) {
      this.companionEnabled = true;
    }

    // Spawn AI Companion if enabled
    if (this.companionEnabled) {
      let compChar = this.companionChar;
      if (compChar === 'auto') {
        if (characterId === 'smellu') compChar = 'lindin';
        else if (characterId === 'lindin') compChar = 'smellu';
        else compChar = 'lindin';
      }
      this.companion = new window.AICompanion(60, 225, compChar, this.companionTactics);
    } else {
      this.companion = null;
    }

    if (window.gameLogger) {
      window.gameLogger.startSession({
        characterId,
        gameMode: this.gameMode,
        difficulty: this.difficulty,
        companionEnabled: this.companionEnabled,
        companionChar: this.companionChar,
        companionTactics: this.companionTactics
      });
    }

    this.enemies = [];
    this.breakables = [];
    this.pickups = [];
    this.stageTransition = null;
    this.volumeToastTimer = 0;
    this.tigerTrapCombatTimer = 0;
    this.nextTigerTrapInterval = 600 + (Math.random() * 120 - 60);

    // Initial enemies in street section 1 (Vertical mode spawns from stage.zones automatically)
    if (this.stage.gameMode !== 'VERTICAL') {
      this.enemies.push(new Enemy(320, 195, 'thug'));
      this.enemies.push(new Enemy(420, 230, 'thug'));
      this.breakables.push(new Breakable(220, 205, 'crate', 'pizza'));
    }

    window.weatherSystem.setStage(1);
    window.soundEngine.startBGM('stage1');
  }

  // Master Game Loop
  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    window.inputManager.update();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    const input = window.inputManager;
    this.titleBlink += dt * 3.5;

    // Volume toast timer countdown
    if (this.volumeToastTimer > 0) {
      this.volumeToastTimer -= dt;
    }

    // Audio Volume Hotkeys: - / + or [ / ], 0 for mute
    const volDownPressed = (input.keys['Minus'] && !input.prevKeys['Minus']) ||
                           (input.keys['NumpadSubtract'] && !input.prevKeys['NumpadSubtract']) ||
                           (input.keys['BracketLeft'] && !input.prevKeys['BracketLeft']);
    const volUpPressed = (input.keys['Equal'] && !input.prevKeys['Equal']) ||
                         (input.keys['NumpadAdd'] && !input.prevKeys['NumpadAdd']) ||
                         (input.keys['BracketRight'] && !input.prevKeys['BracketRight']);
    const mutePressed = (input.keys['Digit0'] && !input.prevKeys['Digit0']) ||
                        (input.keys['Numpad0'] && !input.prevKeys['Numpad0']);

    if (volDownPressed) {
      this.adjustVolume(-0.05);
    } else if (volUpPressed) {
      this.adjustVolume(+0.05);
    } else if (mutePressed) {
      this.toggleAudioMute();
    }

    // Open Settings via KeyO shortcut
    if (input.keys['KeyO'] && !input.prevKeys['KeyO']) {
      this.openSettingsModal();
    }

    // Open Manual via KeyN shortcut
    if ((input.keys['KeyN'] && !input.prevKeys['KeyN']) || input.isActionJustPressed('manual')) {
      this.openManualModal();
    }

    // Toggle AI Companion shortcut (KeyT or KeyC)
    if (input.isActionJustPressed('companion')) {
      this.toggleCompanion();
    }

    // Toggle Game Mode shortcut (KeyM)
    if (input.isActionJustPressed('mode') || (input.keys['KeyM'] && !input.prevKeys['KeyM'])) {
      this.toggleGameMode();
    }

    // Toggle Autonomous AI Auto-Play shortcut (KeyQ)
    if (input.keys['KeyQ'] && !input.prevKeys['KeyQ']) {
      this.toggleAutoPlay();
    }

    // TITLE SCREEN -> GO TO CHARACTER SELECT
    if (this.gameState === 'TITLE') {
      if (input.keys['KeyQ'] && !input.prevKeys['KeyQ']) {
        this.toggleAutoPlay();
        return;
      }
      const isControlKey = (input.keys['KeyM'] && !input.prevKeys['KeyM']) ||
                           (input.keys['KeyN'] && !input.prevKeys['KeyN']) ||
                           (input.keys['KeyO'] && !input.prevKeys['KeyO']) ||
                           (input.keys['KeyQ'] && !input.prevKeys['KeyQ']) ||
                           volDownPressed || volUpPressed || mutePressed ||
                           input.isActionJustPressed('mode') ||
                           input.isActionJustPressed('manual');
      if (!isControlKey) {
        const anyKeyPressed = Object.keys(input.keys).some(k => input.keys[k] && !input.prevKeys[k]);
        if (anyKeyPressed || input.isActionJustPressed('start') || input.isActionJustPressed('punch') || input.isActionJustPressed('jump') || input.isActionJustPressed('kick')) {
          this.gameState = 'CHARACTER_SELECT';
          window.soundEngine.startBGM('title');
          window.soundEngine.playPickup();
        }
      }
      return;
    }

    // CHARACTER SELECT SCREEN
    if (this.gameState === 'CHARACTER_SELECT') {
      if (input.keys['KeyQ'] && !input.prevKeys['KeyQ']) {
        this.toggleAutoPlay();
        return;
      }
      if (input.isActionJustPressed('mode') || (input.keys['KeyM'] && !input.prevKeys['KeyM'])) {
        this.toggleGameMode();
      }

      if (input.isActionJustPressed('left')) {
        this.selectedCharIndex = (this.selectedCharIndex + 2) % 3;
        window.soundEngine.playSwing(360);
      } else if (input.isActionJustPressed('right')) {
        this.selectedCharIndex = (this.selectedCharIndex + 1) % 3;
        window.soundEngine.playSwing(360);
      }

      if (input.isActionJustPressed('up')) {
        this.selectedWeaponIndex = (this.selectedWeaponIndex + 2) % 3;
        window.soundEngine.playSwing(450);
      } else if (input.isActionJustPressed('down')) {
        this.selectedWeaponIndex = (this.selectedWeaponIndex + 1) % 3;
        window.soundEngine.playSwing(450);
      }

      if (input.isActionJustPressed('punch') || input.isActionJustPressed('start') || input.isActionJustPressed('jump') || input.isActionJustPressed('kick')) {
        const chosenChar = this.characters[this.selectedCharIndex];
        this.startNewGame(chosenChar);
        window.soundEngine.playPickup();
      }
      return;
    }

    // STORE TOGGLE
    if (input.isActionJustPressed('store')) {
      this.toggleStore();
    }

    // STORE MENU INTERACTION
    if (this.gameState === 'STORE') {
      if (input.isActionJustPressed('up')) {
        this.selectedStoreIndex = (this.selectedStoreIndex + this.storeItems.length - 1) % this.storeItems.length;
        window.soundEngine.playSwing(380);
      } else if (input.isActionJustPressed('down')) {
        this.selectedStoreIndex = (this.selectedStoreIndex + 1) % this.storeItems.length;
        window.soundEngine.playSwing(380);
      }

      if (input.isActionJustPressed('punch') || input.isActionJustPressed('start') || input.isActionJustPressed('jump')) {
        this.buyStoreItem(this.selectedStoreIndex);
      }

      if (input.isActionJustPressed('kick') || input.keys['Escape']) {
        this.toggleStore();
      }
      return;
    }

    // PAUSE TOGGLE
    if (input.isActionJustPressed('start')) {
      if (this.gameState === 'PLAYING') {
        this.gameState = 'PAUSED';
      } else if (this.gameState === 'PAUSED') {
        this.gameState = 'PLAYING';
      }
    }

    if (this.gameState === 'PAUSED') return;

    // GAME OVER & VICTORY RESTART
    if (this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') {
      this.victoryTimer += dt;
      if (this.autoPlay) {
        this.autoPlayRestartTimer += dt;
        if (this.autoPlayRestartTimer > 2.8) {
          this.autoPlayRestartTimer = 0;
          if (window.aiLearningEngine) window.aiLearningEngine.onEpochFinished(this.gameState);
          this.startNewGame(this.player ? this.player.characterId : 'smellu');
          return;
        }
      }
      if (this.victoryTimer > 2.0 && (input.isActionJustPressed('start') || input.isActionJustPressed('punch'))) {
        this.gameState = 'CHARACTER_SELECT';
        window.soundEngine.startBGM('title');
        window.soundEngine.playPickup();
      }
      return;
    }

    // STAGE CLEAR TRANSITION
    if (this.stageTransition) {
      this.stageTransition.timer -= dt;
      if (this.stageTransition.timer <= 0) {
        const nextStage = this.stageTransition.toStage;
        this.stageTransition = null;
    this.volumeToastTimer = 0;
        this.stage.loadStage(nextStage);
        this.player.x = (this.stage.gameMode === 'VERTICAL') ? 240 : 100;
        this.player.y = 210;
        this.player.state = 'idle';
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.vz = 0;
        this.player.z = 0;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 45); // Stage heal bonus!

        if (this.companion) {
          this.companion.x = (this.stage.gameMode === 'VERTICAL') ? 200 : 60;
          this.companion.y = (this.stage.gameMode === 'VERTICAL') ? 215 : 225;
          this.companion.health = Math.min(this.companion.maxHealth, this.companion.health + 45);
          this.companion.isDead = false;
          this.companion.reviveTimer = 0;
          this.companion.state = 'idle';
          this.companion.vx = 0;
          this.companion.vy = 0;
          this.companion.vz = 0;
          this.companion.z = 0;
        }

        this.enemies = [];
        this.breakables = [];
        this.pickups = [];

        // Spawn initial stage enemies (Vertical mode spawns from stage.zones automatically)
        if (this.stage.gameMode !== 'VERTICAL') {
          if (nextStage === 2) {
            this.enemies.push(new Enemy(320, 190, 'ninja'));
            this.enemies.push(new Enemy(420, 225, 'thug'));
            this.breakables.push(new Breakable(220, 200, 'crate', 'pizza'));
          } else if (nextStage === 3) {
            this.enemies.push(new Enemy(320, 185, 'ninja'));
            this.enemies.push(new Enemy(400, 230, 'bruiser'));
            this.breakables.push(new Breakable(220, 205, 'barrel', 'scroll'));
          } else {
            const types = ['ninja', 'ronin', 'kicker', 'assassin'];
            const e1 = types[nextStage % types.length];
            const e2 = types[(nextStage + 1) % types.length];
            this.enemies.push(new Enemy(320, 185, e1));
            this.enemies.push(new Enemy(410, 225, e2));
            this.breakables.push(new Breakable(220, 205, 'crate', (nextStage % 2 === 0 ? 'pizza' : 'scroll')));
          }
        }

        window.soundEngine.startBGM(`stage${nextStage}`);
      }
      return; // Freeze fighting during stage transition fanfare
    }

    // HIT-STOP IMPACT FREEZE
    if (window.combatSystem.hitStopTimer > 0) {
      window.combatSystem.update(dt);
      return;
    }

    // PERIODIC RANDOM BATTLE ANTHEM ("The Tiger's Trap") ~EVERY 10 MINUTES
    if (window.soundEngine && window.soundEngine.currentTrack !== 'tiger_trap') {
      const isBossActive = this.enemies && this.enemies.some(e => e.isBoss && !e.isDead);
      if (!isBossActive) {
        this.tigerTrapCombatTimer += dt;
        if (this.tigerTrapCombatTimer >= this.nextTigerTrapInterval) {
          this.tigerTrapCombatTimer = 0;
          this.nextTigerTrapInterval = 600 + (Math.random() * 120 - 60);
          window.soundEngine.startBGM('tiger_trap');
          if (window.combatSystem && this.player) {
            window.combatSystem.spawnComboText(this.player.x, this.player.y - 60, "THE TIGER'S TRAP!", '#ffaa00');
          }
          if (window.gameLogger) {
            window.gameLogger.log('BATTLE_ANTHEM', { track: "The Tiger's Trap", time: this.stage ? this.stage.time : 0 });
          }
        }
      }
    }

    // UPDATE WEATHER & NEON ATMOSPHERE
    window.weatherSystem.update(dt, this.stage);

    // 1. UPDATE STAGE & SPAWN QUEUE
    this.stage.update(dt, this.player, this.enemies);
    while (this.stage.spawnQueue.length > 0) {
      const item = this.stage.spawnQueue.shift();
      if (item.isBreakable) {
        this.breakables.push(new Breakable(item.x, item.y, item.type, item.drops));
      } else {
        const enemy = new Enemy(item.x, item.y, item.type, item.bossType);
        if (item.bossName) enemy.bossName = item.bossName;
        if (item.weapon) enemy.weapon = { type: item.weapon, hits: 25 };
        if (enemy.isBoss) {
          enemy.laughTimer = 1.8;
          window.combatSystem.spawnComboText(enemy.x, enemy.y - 50, 'MWAHAHAHA!', '#ff0055');
          window.soundEngine.startBGM('boss');
          window.soundEngine.playBossIntro();
        }
        this.enemies.push(enemy);
      }
    }

    // 2. UPDATE COMBAT SYSTEM PARTICLES & EFFECTS
    window.combatSystem.update(dt);

    // 3. UPDATE PLAYER & AI COMPANION
    if (this.autoPlay && window.aiLearningEngine) {
      window.aiLearningEngine.updatePlayerAI(this.player, this.enemies, this.companion, this.stage, dt, this);
      this.player.animTime += dt;
      this.player.stateTimer -= dt;
      this.player.comboInputWindow -= dt;
      if (this.player.dodgeCooldown > 0) this.player.dodgeCooldown -= dt;
      if (this.player.attackCooldown > 0) this.player.attackCooldown -= dt;

      if (this.player.specialMeter < this.player.maxSpecial) {
        this.player.specialMeter = Math.min(this.player.maxSpecial, this.player.specialMeter + dt * 4.0);
      }

      if (this.player.isInvulnerable) {
        this.player.invulnTimer -= dt;
        if (this.player.invulnTimer <= 0) this.player.isInvulnerable = false;
      }

      if (this.player.state === 'hurt' && this.player.stateTimer <= 0) {
        this.player.state = 'idle';
      } else if (this.player.state === 'knockdown' && this.player.z === 0 && this.player.stateTimer <= 0) {
        this.player.state = 'idle';
        this.player.isInvulnerable = true;
        this.player.invulnTimer = 1.2;
      }

      const activeAttacks = [
        'punch1', 'punch2', 'punch_gut', 'punch_elbow', 'punch3',
        'kick1', 'kick2', 'kick_axe', 'spin_kick', 'one_inch_punch',
        'shoryu_uppercut', 'flash_kick', 'low_sweep', 'ground_pound',
        'lunge_punch', 'thrust_kick', 'back_strike',
        'nunchaku_attack', 'dagger_attack', 'pipe_attack',
        'pistol_shot1', 'pistol_shot2', 'pistol_whip', 'pistol_crossfire', 'air_pistol',
        'air_hammer', 'air_split', 'air_spin', 'jump_kick', 'flying_kick',
        'special', 'throw'
      ];
      if (activeAttacks.includes(this.player.state) && this.player.stateTimer <= 0) {
        this.player.state = 'idle';
      }

      if (this.player.state === 'mega_punch_windup' && this.player.stateTimer <= 0) {
        this.player.executeMegaPunchStrike();
      } else if (this.player.state === 'mega_punch_strike' && this.player.stateTimer <= 0) {
        this.player.state = 'idle';
        this.player.vx = 0;
      }

      this.player.updatePhysics(dt);
      if (this.stage) {
        this.player.handleWallCollision(this.stage);
        this.player.y = Math.max(this.stage.minY, Math.min(this.stage.maxY, this.player.y));
      }
    } else {
      this.player.update(dt, input, this.stage);
    }

    if (this.companion) {
      this.companion.update(dt, this.stage);
      this.companion.updateAI(dt, this.enemies, this.player, this.stage);
    }

    // Check Player Death
    if (this.player.isDead && this.player.z === 0) {
      if (this.player.lives > 1) {
        // Respawn
        this.player.lives--;
        this.player.health = this.player.maxHealth;
        this.player.isDead = false;
        this.player.state = 'idle';
        this.player.isInvulnerable = true;
        this.player.invulnTimer = 2.0;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.vz = 0;
        this.player.z = 0;
        this.player.punchChargeTimer = 0;
        this.player.x = (this.stage.gameMode === 'VERTICAL') ? 240 : (this.stage.cameraX + 60);
        this.player.y = 210;
      } else {
        if (this.autoPlay) {
          // AUTO-PLAY SPECTATOR CONTINUOUS RUN:
          // In Auto-Play spectator / learning mode, the AI leader automatically revives
          // to continue playing through to the end of the game!
          this.player.lives = 3;
          this.player.health = this.player.maxHealth;
          this.player.isDead = false;
          this.player.state = 'idle';
          this.player.isInvulnerable = true;
          this.player.invulnTimer = 3.0;
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.vz = 0;
          this.player.z = 0;
          this.player.punchChargeTimer = 0;
          this.player.x = (this.stage.gameMode === 'VERTICAL') ? 240 : (this.stage.cameraX + 60);
          this.player.y = 210;
          if (window.gameLogger) {
            window.gameLogger.log('PLAYER', 'Auto-Play Spectator Continue: Leader revived with full lives to complete playthrough!');
          }
          if (window.combatSystem) {
            window.combatSystem.spawnComboText(this.player.x, this.player.y - 50, 'SPECTATOR REVIVE!', '#00ffcc');
          }
        } else {
          // Game Over!
          this.gameState = 'GAMEOVER';
          this.victoryTimer = 0;
          window.soundEngine.startBGM('gameover');
          window.soundEngine.playKnockdown();

          // Boss taunts with 8-bit laugh on player defeat
          const activeBoss = this.enemies.find(e => e.isBoss && !e.isDead);
          if (activeBoss) {
            activeBoss.laughTimer = 2.5;
            window.soundEngine.playBossLaugh(activeBoss.bossType);
          }

          if (this.player.score > this.highScore) {
            this.highScore = this.player.score;
            localStorage.setItem('kungfu_high_score', this.highScore.toString());
          }

          if (window.gameLogger) {
            window.gameLogger.saveSession('GAMEOVER', this.player.score);
          }
        }
      }
    }

    // 4. UPDATE ENEMIES & AI
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      // Nearest target between player & companion
      let closestTarget = this.player;
      if (this.companion && !this.companion.isDead && this.companion.reviveTimer <= 0) {
        const dPlayer = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        const dComp = Math.hypot(enemy.x - this.companion.x, enemy.y - this.companion.y);
        if (dComp < dPlayer) closestTarget = this.companion;
      }

      enemy.update(dt, closestTarget, this.stage);

      // Remove Dead Enemies after knockdown finishes
      if (enemy.isDead && enemy.z === 0 && enemy.stateTimer <= -0.6) {
        this.player.score += enemy.scoreValue;
        if (window.gameLogger) {
          const enemyName = enemy.isBoss ? ('BOSS ' + (enemy.bossName || enemy.bossType)) : (enemy.type || 'ENEMY').toUpperCase();
          window.gameLogger.log('ENEMY', `${enemyName} Defeated! (+${enemy.scoreValue} pts)`);
        }

        // Guaranteed drop if enemy was armed!
        if (enemy.weapon) {
          this.pickups.push(new window.ItemPickup(enemy.x, enemy.y, enemy.weapon.type));
        } else {
          // Unarmed enemy drop chance
          const dropRoll = Math.random();
          if (dropRoll < 0.22) {
            const dropPool = ['pistols', 'nunchaku', 'daggers', 'pipe', 'pizza'];
            const dropType = dropPool[Math.floor(Math.random() * dropPool.length)];
            this.pickups.push(new window.ItemPickup(enemy.x, enemy.y, dropType));
          }
        }

        // Check for Boss Victory & Stage Progression
        const isFinalStageZone = this.stage.currentZoneIndex >= this.stage.zones.length - 1;
        const remainingLivingEnemies = this.enemies.filter(e => !e.isDead && e !== enemy);
        const noMoreSpawns = this.stage.spawnQueue.length === 0;

        if (enemy.isBoss && !isFinalStageZone) {
          // Mid-boss defeated! Award bonus Ki and celebratory fanfare
          this.player.specialMeter = this.player.maxSpecial;
          window.soundEngine.playSpecial();
          window.combatSystem.spawnComboText(enemy.x, enemy.y - 50, 'MID-BOSS CLEARED!', '#ffd700');
        } else if (isFinalStageZone && (enemy.isBoss || remainingLivingEnemies.length === 0) && noMoreSpawns) {
          this.triggerStageClear();
        }
        this.enemies.splice(i, 1);
      }
    }

    // Automatic stage progression when all zones in the stage are cleared
    if (!this.stageTransition && this.gameState === 'PLAYING') {
      const isPastFinalZone = this.stage.currentZoneIndex >= this.stage.zones.length;
      const allEnemiesDefeated = this.enemies.filter(e => !e.isDead).length === 0 && this.stage.spawnQueue.length === 0;
      if (isPastFinalZone && allEnemiesDefeated) {
        this.triggerStageClear();
      }
    }

    // Soft Pushbox Separation: Prevent enemies from standing directly inside player/companion at walls
    const leftWall = this.stage.cameraX + 20;
    const rightWall = this.stage.cameraX + 460;
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      // Clamp enemy within stage bounds
      enemy.x = Math.max(leftWall - 4, Math.min(rightWall + 4, enemy.x));

      // Separate enemy from player if too close (especially at walls)
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 22 && dist > 0) {
        const overlap = 22 - dist;
        const pushX = (dx / dist) * overlap * 0.5;
        const pushY = (dy / dist) * overlap * 0.5;
        enemy.x = Math.max(leftWall, Math.min(rightWall, enemy.x + pushX));
        enemy.y = Math.max(this.stage.minY, Math.min(this.stage.maxY, enemy.y + pushY));
      }
      if (this.companion && !this.companion.isDead && this.companion.reviveTimer <= 0) {
        const cdx = enemy.x - this.companion.x;
        const cdy = enemy.y - this.companion.y;
        const cdist = Math.hypot(cdx, cdy);
        if (cdist < 22 && cdist > 0) {
          const overlap = 22 - cdist;
          const pushX = (cdx / cdist) * overlap * 0.5;
          const pushY = (cdy / cdist) * overlap * 0.5;
          enemy.x = Math.max(leftWall, Math.min(rightWall, enemy.x + pushX));
          enemy.y = Math.max(this.stage.minY, Math.min(this.stage.maxY, enemy.y + pushY));
        }
      }
    }

    // 5. UPDATE BREAKABLES & ITEM PICKUPS
    for (let i = this.breakables.length - 1; i >= 0; i--) {
      const b = this.breakables[i];
      if (b.isDead) {
        // Drop loot!
        this.pickups.push(new ItemPickup(b.x, b.y, b.drops));
        this.breakables.splice(i, 1);
      }
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.update(dt, this.player);
      if (this.companion && !this.companion.isDead && this.companion.reviveTimer <= 0 && !p.isDead) {
        p.checkCollect(this.companion);
      }
      if (p.isDead) {
        this.pickups.splice(i, 1);
      }
    }

    // 6. COMBAT COLLISIONS
    this.handleCombatCollisions();
  }

  handleCombatCollisions() {
    // Player Attack vs Enemies
    const playerAttack = this.player.getAttackData();
    if (playerAttack) {
      for (const enemy of this.enemies) {
        if (playerAttack.isMegaPunch) {
          // Mega Punch hits every enemy in rocket lunge path once!
          if (!this.player.megaPunchHitSet.has(enemy) && window.combatSystem.checkHit(this.player, playerAttack, enemy, 22)) {
            this.player.megaPunchHitSet.add(enemy);
            window.combatSystem.applyHit(this.player, enemy, playerAttack);
            this.player.specialMeter = Math.min(this.player.maxSpecial, this.player.specialMeter + 10);
          }
        } else {
          if (window.combatSystem.checkHit(this.player, playerAttack, enemy)) {
            window.combatSystem.applyHit(this.player, enemy, playerAttack);
            this.player.hasHitCurrentAttack = true;
            this.player.specialMeter = Math.min(this.player.maxSpecial, this.player.specialMeter + 6);
          }
        }
      }

      // Player Attack vs Breakables
      for (const b of this.breakables) {
        if (!b.isDead && window.combatSystem.checkHit(this.player, playerAttack, b, 26)) {
          b.takeDamage(playerAttack.isMegaPunch ? 5 : 1, this.player.facing);
          if (!playerAttack.isMegaPunch) {
            this.player.hasHitCurrentAttack = true;
          }
        }
      }
    }

    // Companion Attack vs Enemies & Breakables
    if (this.companion && !this.companion.isDead && this.companion.reviveTimer <= 0) {
      const compAttack = this.companion.getAttackData();
      if (compAttack) {
        for (const enemy of this.enemies) {
          if (compAttack.isMegaPunch) {
            if (!this.companion.megaPunchHitSet.has(enemy) && window.combatSystem.checkHit(this.companion, compAttack, enemy, 22)) {
              this.companion.megaPunchHitSet.add(enemy);
              window.combatSystem.applyHit(this.companion, enemy, compAttack);
              this.companion.specialMeter = Math.min(this.companion.maxSpecial, this.companion.specialMeter + 10);
            }
          } else {
            if (window.combatSystem.checkHit(this.companion, compAttack, enemy)) {
              window.combatSystem.applyHit(this.companion, enemy, compAttack);
              this.companion.hasHitCurrentAttack = true;
              this.companion.specialMeter = Math.min(this.companion.maxSpecial, this.companion.specialMeter + 6);
            }
          }
        }

        for (const b of this.breakables) {
          if (!b.isDead && window.combatSystem.checkHit(this.companion, compAttack, b, 26)) {
            b.takeDamage(compAttack.isMegaPunch ? 5 : 1, this.companion.facing);
            if (!compAttack.isMegaPunch) {
              this.companion.hasHitCurrentAttack = true;
            }
          }
        }
      }
    }

    // Enemies Attacks vs Player & Companion
    for (const enemy of this.enemies) {
      const enemyAttack = enemy.getAttackData();
      if (enemyAttack) {
        if (window.combatSystem.checkHit(enemy, enemyAttack, this.player)) {
          window.combatSystem.applyHit(enemy, this.player, enemyAttack);
          enemy.hasHitCurrentAttack = true;
        } else if (this.companion && !this.companion.isDead && this.companion.reviveTimer <= 0 && window.combatSystem.checkHit(enemy, enemyAttack, this.companion)) {
          window.combatSystem.applyHit(enemy, this.companion, enemyAttack);
          enemy.hasHitCurrentAttack = true;
        }
      }
    }
  }

  // ==========================================
  // RENDERING PIPELINE
  // ==========================================
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.gameState === 'TITLE') {
      this.renderTitleScreen(ctx);
      this.renderVolumeToast(ctx);
      return;
    }

    if (this.gameState === 'CHARACTER_SELECT') {
      this.renderCharacterSelect(ctx);
      this.renderVolumeToast(ctx);
      return;
    }

    // Apply Screen Shake (disabled by default)
    const [shakeX, shakeY] = (window.combatSystem && window.combatSystem.screenShakeEnabled)
      ? window.combatSystem.getScreenShakeOffset()
      : [0, 0];

    ctx.save();
    if (shakeX !== 0 || shakeY !== 0) {
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Parallax Background
    this.stage.drawBackground(ctx);

    // Smooth Vertical Camera Tracking so jumps never fly off-screen
    let camY = 0;
    const playerHeadY = (this.player.y - this.player.z) - 45;
    if (playerHeadY < 85) {
      camY = Math.round((85 - playerHeadY) * 0.45);
    }

    // 2. Camera Viewport Translation for World Entities
    ctx.save();
    ctx.translate(-Math.round(this.stage.cameraX), camY);

    // 2.5D BELT-SCROLL DEPTH SORTING (Y-Sorting)
    const renderList = [
      this.player,
      ...(this.companion ? [this.companion] : []),
      ...this.enemies,
      ...this.breakables,
      ...this.pickups
    ];

    renderList.sort((a, b) => a.y - b.y);

    // Draw Wet Asphalt Ground Reflections (Mirror beneath fighters)
    window.weatherSystem.drawGroundReflections(ctx, renderList, this.stage.cameraX, this.stage.currentStageNum);

    // Draw entities in depth order
    for (const entity of renderList) {
      entity.draw(ctx);
    }

    // 3. Draw Combat Particles & Damage Numbers
    window.combatSystem.draw(ctx);

    ctx.restore(); // Restore camera translation

    // 4. Foreground Weather & Atmospheric Lighting (Rain, Sparks, Lightning Flash)
    window.weatherSystem.drawForeground(ctx);

    // 5. Draw Foreground UI / HUD
    this.stage.drawGoSign(ctx);
    this.renderHUD(ctx);

    // Overlays
    if (this.stageTransition) {
      this.renderStageClearOverlay(ctx);
    } else if (this.gameState === 'STORE') {
      this.renderStoreOverlay(ctx);
    } else if (this.gameState === 'PAUSED') {
      this.renderPauseOverlay(ctx);
    } else if (this.gameState === 'GAMEOVER') {
      this.renderGameOverOverlay(ctx);
    } else if (this.gameState === 'VICTORY') {
      this.renderVictoryOverlay(ctx);
    }

    // 6. Draw Master Volume HUD Feedback Toast
    this.renderVolumeToast(ctx);

    ctx.restore(); // Restore screen shake
  }

  // ==========================================
  // HUD & MENUS
  // ==========================================
  renderHUD(ctx) {
    ctx.save();
    ctx.font = '8px "Press Start 2P", monospace';

    // 1. Player 1 Info Header
    let pColor = '#ff2a6d';
    if (this.player.characterId === 'lindin') pColor = '#05d9e8';
    else if (this.player.characterId === 'smoro') pColor = '#ffd700';

    ctx.fillStyle = pColor;
    ctx.fillText(`1P ${this.player.name}`, 18, 16);

    // Player Health Bar
    ctx.fillStyle = '#222';
    ctx.fillRect(18, 22, 110, 10);
    ctx.fillStyle = '#444';
    ctx.strokeRect(17, 21, 112, 12);

    const hpPercent = Math.max(0, this.player.health / this.player.maxHealth);
    let hpColor = '#00ff66';
    if (hpPercent < 0.3) hpColor = '#ff2244';
    else if (hpPercent < 0.6) hpColor = '#ffd700';

    ctx.fillStyle = hpColor;
    ctx.fillRect(19, 23, Math.round(108 * hpPercent), 8);

    // Special Dragon Ki Meter
    ctx.fillStyle = '#111';
    ctx.fillRect(18, 35, 75, 5);
    const spPercent = Math.max(0, this.player.specialMeter / this.player.maxSpecial);
    ctx.fillStyle = '#05d9e8';
    ctx.fillRect(18, 35, Math.round(75 * spPercent), 5);
    ctx.fillStyle = '#fff';
    ctx.font = '5px "Press Start 2P"';
    ctx.fillText('KI', 96, 40);

    // Player Lives & Weapon
    ctx.fillStyle = '#ffd700';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText(`LIVES: ${this.player.lives}`, 18, 52);

    if (this.player.weapon) {
      ctx.fillStyle = '#05d9e8';
      ctx.font = '5px "Press Start 2P"';
      ctx.fillText(`[${this.player.weapon.type.toUpperCase()}: ${this.player.weapon.hits}]`, 18, 62);
    }

    // 2. Score & High Score & Difficulty (Center)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('SCORE', 240, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.player.score.toString().padStart(6, '0'), 240, 24);

    ctx.fillStyle = '#ffaa00';
    ctx.font = '5px "Press Start 2P"';
    ctx.fillText(`HI: ${this.highScore.toString().padStart(6, '0')} [${this.difficulty}]`, 240, 33);

    // Enemy Fighting Speed Scaling Indicator (+0.5% per 100 score)
    const speedBoostPct = (this.player.score / 100) * 0.5;
    if (speedBoostPct > 0) {
      ctx.fillStyle = speedBoostPct >= 50 ? '#ff0055' : (speedBoostPct >= 20 ? '#ff9900' : '#05d9e8');
      ctx.font = '5px "Press Start 2P"';
      const boostStr = speedBoostPct % 1 === 0 ? `+${speedBoostPct}%` : `+${speedBoostPct.toFixed(1)}%`;
      ctx.fillText(`ENEMY SPD ${boostStr}`, 240, 40);
    }

    // 3. AI Companion (Player 2) Info Header (Top Right)
    if (this.companion) {
      let cColor = '#05d9e8';
      if (this.companion.characterId === 'smellu') cColor = '#ff2a6d';
      else if (this.companion.characterId === 'smoro') cColor = '#ffd700';

      ctx.textAlign = 'right';
      ctx.fillStyle = cColor;
      ctx.font = '8px "Press Start 2P"';
      ctx.fillText(`2P ${this.companion.name}`, 462, 16);

      // Companion Health Bar (Right-aligned from 362 to 462)
      ctx.fillStyle = '#222';
      ctx.fillRect(362, 22, 100, 10);
      ctx.fillStyle = '#444';
      ctx.strokeRect(361, 21, 102, 12);

      if (this.companion.reviveTimer > 0) {
        ctx.fillStyle = (Math.floor(this.titleBlink * 3) % 2 === 0) ? '#ff2a6d' : '#ffd700';
        ctx.font = '6px "Press Start 2P"';
        ctx.fillText(`REVIVE: ${Math.ceil(this.companion.reviveTimer)}s`, 458, 30);
      } else {
        const compHpPercent = Math.max(0, this.companion.health / this.companion.maxHealth);
        let compHpCol = '#00ff66';
        if (compHpPercent < 0.3) compHpCol = '#ff2244';
        else if (compHpPercent < 0.6) compHpCol = '#ffd700';

        ctx.fillStyle = compHpCol;
        ctx.fillRect(462 - Math.round(98 * compHpPercent), 23, Math.round(98 * compHpPercent), 8);
      }

      // Companion Ki Meter
      ctx.fillStyle = '#111';
      ctx.fillRect(397, 35, 65, 5);
      const compSpPercent = Math.max(0, this.companion.specialMeter / this.companion.maxSpecial);
      ctx.fillStyle = '#05d9e8';
      ctx.fillRect(462 - Math.round(65 * compSpPercent), 35, Math.round(65 * compSpPercent), 5);
      ctx.fillStyle = '#fff';
      ctx.font = '5px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText('KI', 386, 40);

      // Stage & Zone Display (Below Companion)
      ctx.textAlign = 'right';
      const isVert = (this.stage.gameMode === 'VERTICAL');
      const zoneLabel = isVert ? `FLOOR ${Math.min(20, this.stage.currentZoneIndex + 1)} / 20` : `ZONE ${Math.min(20, this.stage.currentZoneIndex + 1)} / 20`;
      if (this.companion.weapon) {
        ctx.fillStyle = '#05d9e8';
        ctx.font = '5px "Press Start 2P"';
        ctx.fillText(`[${this.companion.weapon.type.toUpperCase()}: ${this.companion.weapon.hits}]`, 462, 52);
        ctx.fillStyle = '#ffd700';
        ctx.font = '6px "Press Start 2P"';
        ctx.fillText(zoneLabel, 462, 63);
      } else {
        ctx.fillStyle = '#ffd700';
        ctx.font = '6px "Press Start 2P"';
        ctx.fillText(zoneLabel, 462, 52);
        if (isVert) {
          ctx.fillStyle = '#05d9e8';
          ctx.font = '5px "Press Start 2P"';
          ctx.fillText(`ALT: ${Math.round(this.stage.altitude)}M`, 462, 62);
        }
      }
    } else {
      // Stage & Zone Display when Solo
      ctx.textAlign = 'right';
      ctx.fillStyle = '#05d9e8';
      ctx.font = '7px "Press Start 2P"';
      ctx.fillText(`STAGE ${this.stage.currentStageNum}`, 462, 16);
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '5px "Press Start 2P"';
      ctx.fillText(this.stage.stageNames[this.stage.currentStageNum], 462, 26);
      ctx.fillStyle = '#ffd700';
      const isVert = (this.stage.gameMode === 'VERTICAL');
      const zoneLabel = isVert ? `FLOOR ${Math.min(20, this.stage.currentZoneIndex + 1)} / 20` : `ZONE ${Math.min(20, this.stage.currentZoneIndex + 1)} / 20`;
      ctx.fillText(zoneLabel, 462, 36);
      if (isVert) {
        ctx.fillStyle = '#05d9e8';
        ctx.font = '5px "Press Start 2P"';
        ctx.fillText(`ALT: ${Math.round(this.stage.altitude)}M`, 462, 45);
      }
    }

    // Mini Distance / Floor Progress Bar (Center, below Score)
    const isVerticalMode = (this.stage.gameMode === 'VERTICAL');
    const progressPercent = isVerticalMode
      ? Math.min(1.0, Math.max(0, (this.stage.currentZoneIndex + (this.stage.isAscending ? (1 - this.stage.ascentTimer / 1.7) : 0)) / 20))
      : Math.min(1.0, Math.max(0, this.player.x / this.stage.width));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(190, 43, 100, 3);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(189, 42, 102, 5);
    ctx.fillStyle = isVerticalMode ? '#00ffcc' : '#05d9e8';
    ctx.fillRect(190, 43, Math.round(100 * progressPercent), 3);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(189 + Math.round(100 * progressPercent) - 1, 41, 3, 7);

    // [B] STORE Button Indicator (Center below progress bar)
    ctx.fillStyle = 'rgba(12, 8, 24, 0.88)';
    ctx.fillRect(202, 48, 76, 12);
    ctx.strokeStyle = (Math.floor(this.titleBlink * 2) % 2 === 0) ? '#ffd700' : '#05d9e8';
    ctx.lineWidth = 1;
    ctx.strokeRect(202, 48, 76, 12);
    ctx.fillStyle = '#ffd700';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText('[B] STORE', 240, 57);

    // 4. Boss Health Bar (When Boss is active!)
    const activeBoss = this.enemies.find(e => e.isBoss && !e.isDead);
    if (activeBoss) {
      ctx.textAlign = 'center';
      ctx.fillStyle = activeBoss.isEnraged ? '#ff0055' : '#ffd700';
      ctx.font = '8px "Press Start 2P"';
      ctx.fillText(activeBoss.bossName, 240, 71);

      ctx.fillStyle = '#222';
      ctx.fillRect(140, 75, 200, 9);
      ctx.fillStyle = '#fff';
      ctx.strokeRect(139, 74, 202, 11);

      const bossHpPercent = Math.max(0, activeBoss.health / activeBoss.maxHealth);
      ctx.fillStyle = activeBoss.isEnraged ? '#ff2a6d' : '#e63946';
      ctx.fillRect(141, 76, Math.round(198 * bossHpPercent), 7);
    }

    // 5. Autonomous 2-AI Spectator & Learning HUD Overlays
    if (this.autoPlay && window.aiLearningEngine) {
      const engine = window.aiLearningEngine;
      const stats = engine.stats;

      // Broadcast Banner at Top Center
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10, 5, 25, 0.88)';
      ctx.fillRect(95, 2, 290, 11);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.strokeRect(95, 2, 290, 11);

      ctx.fillStyle = (Math.floor(this.titleBlink * 3) % 2 === 0) ? '#ff2a6d' : '#00ffcc';
      ctx.font = '5px "Press Start 2P"';
      ctx.fillText('● AI AUTO-PLAY SPECTATOR [Q] RESUME PLAY', 240, 10);

      // AI Learning Telemetry Dashboard (Bottom Center)
      ctx.fillStyle = 'rgba(8, 6, 18, 0.92)';
      ctx.fillRect(95, 245, 290, 22);
      ctx.strokeStyle = '#05d9e8';
      ctx.strokeRect(95, 245, 290, 22);

      ctx.font = '5px "Press Start 2P"';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`AI BRAIN: GEN #${stats.epochs} | ACCURACY: ${engine.getAccuracy()}% | MOVES: ${stats.totalMovesRecorded}`, 240, 253);

      ctx.fillStyle = '#00ffcc';
      ctx.fillText(`P1: ${engine.leaderCurrentGoal} | P2: FLANK & COMBO`, 240, 262);

      // Draw recent rewards ticker if any
      if (engine.recentRewards && engine.recentRewards.length > 0) {
        const latest = engine.recentRewards[0];
        if (Date.now() - latest.time < 1800) {
          ctx.fillStyle = latest.text.startsWith('-') ? '#ff2a6d' : '#00ff66';
          ctx.font = '6px "Press Start 2P"';
          ctx.fillText(`REWARD ${latest.text}`, 240, 238);
        }
      }
    }

    ctx.restore();
  }

  triggerStageClear() {
    if (this.stageTransition) return;

    // Award Stage Clear Bonus: +10,000 pts per stage level
    const stageBonus = this.stage.currentStageNum * 10000;
    this.player.score += stageBonus;
    if (this.player.score > this.highScore) {
      this.highScore = this.player.score;
      localStorage.setItem('kungfu_high_score', this.highScore.toString());
    }

    const nextStage = this.stage.currentStageNum + 1;
    this.stageTransition = {
      fromStage: this.stage.currentStageNum,
      toStage: nextStage,
      bonus: stageBonus,
      timer: 3.8
    };

    window.soundEngine.playStageClear();
    window.combatSystem.triggerScreenShake(7, 0.4);

    if (window.gameLogger) {
      window.gameLogger.log('STAGE', `Stage ${this.stage.currentStageNum} Cleared! Bonus: +${stageBonus} pts. Proceeding to Stage ${nextStage}...`);
    }

    // Celebratory victory anthem when completing Stage 3 story campaign before entering endless mode
    if (this.stage.currentStageNum === 3 && this.gameMode !== 'ENDLESS') {
      window.soundEngine.startBGM('victory');
    }
  }

  renderStageClearOverlay(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(0, 0, 480, 270);

    ctx.save();
    ctx.textAlign = 'center';

    const fromStage = this.stageTransition.fromStage;
    const toStage = this.stageTransition.toStage;
    const nextName = this.stage.getStageName(toStage);

    if (fromStage === 3 && this.gameMode !== 'ENDLESS') {
      ctx.fillStyle = '#00ffcc';
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText('CAMPAIGN CONQUERED!', 240, 65);
      ctx.fillStyle = '#ffd700';
      ctx.font = '16px "Press Start 2P"';
      ctx.fillText('ENTER THE ENDLESS RAGE!', 240, 92);
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.font = '18px "Press Start 2P"';
      ctx.fillText(`STAGE ${fromStage} CLEARED!`, 240, 85);
    }

    ctx.fillStyle = '#ff2a6d';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText(`STAGE CLEAR BONUS: +${this.stageTransition.bonus || (fromStage * 10000)} PTS!`, 240, 115);

    ctx.fillStyle = '#05d9e8';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText(`NEXT: STAGE ${toStage}`, 240, 140);
    ctx.fillStyle = '#ffffff';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText(nextName, 240, 154);

    ctx.fillStyle = '#00ff66';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('+45 HP RECOVERY BONUS!', 240, 180);

    ctx.restore();
  }

  renderCharacterSelect(ctx) {
    // Parallax background preview
    this.stage.drawBackground(ctx);

    // Dark retro arcade overlay
    ctx.fillStyle = 'rgba(8, 4, 16, 0.82)';
    ctx.fillRect(0, 0, 480, 270);

    ctx.save();
    ctx.textAlign = 'center';

    // Header Title
    ctx.fillStyle = '#ff2a6d';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('SELECT YOUR FIGHTER', 241, 18);
    ctx.fillStyle = '#ffd700';
    ctx.fillText('SELECT YOUR FIGHTER', 240, 17);

    // Render 3 Character Cards
    window.spriteRenderer.drawPortraitCard(ctx, 'smellu', 95, 24, this.selectedCharIndex === 0, this.titleBlink);
    window.spriteRenderer.drawPortraitCard(ctx, 'lindin', 240, 24, this.selectedCharIndex === 1, this.titleBlink);
    window.spriteRenderer.drawPortraitCard(ctx, 'smoro', 385, 24, this.selectedCharIndex === 2, this.titleBlink);

    // Weapon Selection Row for selected fighter
    const currentCharId = this.characters[this.selectedCharIndex];
    const weapons = this.characterWeapons ? (this.characterWeapons[currentCharId] || []) : [];

    const weaponBoxW = 120;
    const weaponBoxH = 22;
    const weaponY = 202;
    const weaponCenters = [95, 240, 385];

    for (let w = 0; w < weapons.length; w++) {
      const wep = weapons[w];
      const isWepSelected = (this.selectedWeaponIndex === w);
      const bx = weaponCenters[w] - weaponBoxW / 2;

      ctx.fillStyle = isWepSelected ? '#2a1a44' : '#110c1e';
      ctx.fillRect(bx, weaponY, weaponBoxW, weaponBoxH);
      ctx.strokeStyle = isWepSelected ? ((Math.floor(this.titleBlink * 5) % 2 === 0) ? '#ffd700' : '#05d9e8') : '#36294d';
      ctx.lineWidth = isWepSelected ? 2 : 1;
      ctx.strokeRect(bx, weaponY, weaponBoxW, weaponBoxH);

      // Weapon Name
      ctx.font = '6px "Press Start 2P"';
      ctx.fillStyle = isWepSelected ? '#ffd700' : '#bbbbbb';
      ctx.fillText(isWepSelected ? `▶ ${wep.name} ◀` : wep.name, weaponCenters[w], weaponY + 9);

      // Weapon Subtext
      ctx.font = '5px "Press Start 2P"';
      ctx.fillStyle = isWepSelected ? '#00ffcc' : '#666688';
      ctx.fillText(wep.type.toUpperCase(), weaponCenters[w], weaponY + 17);
    }

    // Game Mode & Manual Buttons Row
    const isVert = (this.gameMode === 'VERTICAL');
    const isEndless = (this.gameMode === 'ENDLESS');
    let modeLabel = '▶ MODE: STREET BRAWL (HORIZ) ▶';
    let modeBorder = '#ffd700';
    let modeBg = '#141d33';
    if (isVert) {
      modeLabel = '▲ MODE: PAGODA ASCENT (VERT) ▲';
      modeBorder = '#00ffcc';
      modeBg = '#2b1238';
    } else if (isEndless) {
      modeLabel = '⚡ MODE: ENDLESS GENERATOR (INFINITE) ⚡';
      modeBorder = '#ff2a6d';
      modeBg = '#2d0a1e';
    }

    // Mode Button (x: 35 to 325)
    ctx.fillStyle = modeBg;
    ctx.fillRect(35, 227, 290, 14);
    ctx.strokeStyle = modeBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(35, 227, 290, 14);
    ctx.font = '5px "Press Start 2P"';
    ctx.fillStyle = modeBorder;
    ctx.fillText(`[M] ${modeLabel}`, 180, 237);

    // Manual Button (x: 335 to 445)
    ctx.fillStyle = '#1c102a';
    ctx.fillRect(335, 227, 110, 14);
    ctx.strokeStyle = '#05d9e8';
    ctx.lineWidth = 1;
    ctx.strokeRect(335, 227, 110, 14);
    ctx.fillStyle = '#05d9e8';
    ctx.fillText('[N] MANUAL', 390, 237);

    // Companion & Auto-Play Info Banner
    const compKey = window.inputManager.getKeyDisplayName(window.inputManager.bindings.companion?.[0] || 'KeyT');
    const compStatus = this.companionEnabled ? `ON (${this.companionChar.toUpperCase()})` : 'OFF';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = this.companionEnabled ? '#00ffcc' : '#8888aa';
    ctx.fillText(`[${compKey}] 2P COMP: ${compStatus}   [Q] WATCH AI   [O] SETTINGS`, 240, 249);

    // Bottom Footer Prompt
    if (Math.floor(this.titleBlink) % 2 === 0) {
      ctx.fillStyle = '#00ff66';
      ctx.font = '6px "Press Start 2P"';
      ctx.fillText('[J] START GAME   [Q] WATCH 2-AI COMPANIONS LEARN', 240, 261);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '6px "Press Start 2P"';
      ctx.fillText('◀ / ▶ FIGHTER   ⬆ / ⬇ WEAPON   [M] MODE   [Q] AUTO', 240, 261);
    }

    ctx.restore();
  }

  renderStoreOverlay(ctx) {
    // Dim background
    ctx.fillStyle = 'rgba(8, 4, 16, 0.88)';
    ctx.fillRect(0, 0, 480, 270);

    ctx.save();

    // Store Panel Window
    const winX = 35;
    const winY = 14;
    const winW = 410;
    const winH = 242;

    ctx.fillStyle = '#110d22';
    ctx.fillRect(winX, winY, winW, winH);

    ctx.strokeStyle = '#05d9e8';
    ctx.lineWidth = 2;
    ctx.strokeRect(winX, winY, winW, winH);

    // Decorative inner border
    ctx.strokeStyle = '#36294d';
    ctx.lineWidth = 1;
    ctx.strokeRect(winX + 4, winY + 4, winW - 8, winH - 8);

    // Store Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('CHINATOWN BLACK MARKET ARMORY', 240, winY + 18);

    // Score / Funds Display
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#00ff66';
    ctx.fillText(`YOUR SCORE (FUNDS): ${this.player.score} PTS`, 240, winY + 31);

    // Divider Line
    ctx.fillStyle = '#ff2a6d';
    ctx.fillRect(winX + 15, winY + 36, winW - 30, 2);

    // Store Item Rows (6 items)
    const startY = winY + 44;
    const rowH = 25;

    for (let i = 0; i < this.storeItems.length; i++) {
      const item = this.storeItems[i];
      const isSelected = (this.selectedStoreIndex === i);
      const rowY = startY + i * rowH;
      const canAfford = (this.player.score >= item.cost);

      // Row Highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.18)';
        ctx.fillRect(winX + 10, rowY, winW - 20, rowH - 2);
        ctx.strokeStyle = (Math.floor(this.titleBlink * 5) % 2 === 0) ? '#ffd700' : '#00ffcc';
        ctx.lineWidth = 1;
        ctx.strokeRect(winX + 10, rowY, winW - 20, rowH - 2);

        // Selection Cursor
        ctx.fillStyle = '#ffd700';
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('▶', winX + 14, rowY + 12);
      }

      // Draw item mini sprite / preview
      ctx.save();
      ctx.translate(winX + 32, rowY + 12);
      if (window.spriteRenderer && window.spriteRenderer.drawItem) {
        window.spriteRenderer.drawItem(ctx, item.weaponType || item.id);
      }
      ctx.restore();

      // Item Name
      ctx.textAlign = 'left';
      ctx.font = '6px "Press Start 2P"';
      ctx.fillStyle = isSelected ? '#ffd700' : (canAfford ? '#ffffff' : '#888888');
      ctx.fillText(item.name, winX + 48, rowY + 9);

      // Item Description
      ctx.font = '5px "Press Start 2P"';
      ctx.fillStyle = isSelected ? '#00ffcc' : '#8888aa';
      ctx.fillText(item.desc, winX + 48, rowY + 18);

      // Item Cost
      ctx.textAlign = 'right';
      ctx.font = '7px "Press Start 2P"';
      ctx.fillStyle = canAfford ? '#00ff66' : '#ff3344';
      ctx.fillText(`${item.cost} PTS`, winX + winW - 16, rowY + 14);
    }

    // Divider Line
    ctx.fillStyle = '#36294d';
    ctx.fillRect(winX + 15, winY + winH - 30, winW - 30, 1);

    // Footer Help Prompt
    ctx.textAlign = 'center';
    ctx.font = '6px "Press Start 2P"';
    if (Math.floor(this.titleBlink * 2) % 2 === 0) {
      ctx.fillStyle = '#00ff66';
      ctx.fillText('[J] / ENTER / CLICK TO BUY    [B] / ESC TO EXIT', 240, winY + winH - 12);
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.fillText('⬆ / ⬇ TO SELECT WEAPON OR SUPPLY', 240, winY + winH - 12);
    }

    ctx.restore();
  }

  renderTitleScreen(ctx) {
    // Parallax background preview
    this.stage.drawBackground(ctx);

    // Dark tint
    ctx.fillStyle = 'rgba(10, 5, 20, 0.75)';
    ctx.fillRect(0, 0, 480, 270);

    // Title Logo
    ctx.save();
    ctx.textAlign = 'center';

    // Title typography
    let titleFontSize = 19;
    ctx.font = `${titleFontSize}px "Press Start 2P", monospace`;
    while (ctx.measureText("CARPE'S KUNG FU RAGE").width > 440 && titleFontSize > 12) {
      titleFontSize--;
      ctx.font = `${titleFontSize}px "Press Start 2P", monospace`;
    }

    // Drop shadow
    ctx.fillStyle = '#ff0055';
    ctx.fillText("CARPE'S KUNG FU RAGE", 242, 62);

    ctx.fillStyle = '#ffd700';
    ctx.fillText("CARPE'S KUNG FU RAGE", 240, 60);

    ctx.fillStyle = '#05d9e8';
    ctx.font = '9px "Press Start 2P"';
    ctx.fillText('~ SHADOWS OF CHINATOWN ~', 240, 80);

    // Decorative Dragon Line
    ctx.fillStyle = '#ff2a6d';
    ctx.fillRect(100, 90, 280, 3);

    // Animated Hero fighting pose
    ctx.save();
    ctx.translate(240, 135);
    window.spriteRenderer.drawPlayer(ctx, 'punch3', this.titleBlink * 0.5, 1);
    ctx.restore();

    // Flashing Press Start / Insert Coin
    if (Math.floor(this.titleBlink) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText('PRESS START OR ENTER', 240, 172);
    }

    // Move List Preview
    ctx.fillStyle = '#ffd700';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText('[H] / HOLD [J] DRAGON KNUCKLE (MEGA PUNCH)', 240, 198);
    ctx.fillText('[J] PUNCH   [K] KICK ➔ TORNADO   [L] SPECIAL', 240, 212);
    ctx.fillText('[SPACE] FLIP / JUMP   [O] SETTINGS MENU', 240, 226);

    ctx.fillStyle = '#00ff66';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText(`2P CO-OP COMPANION: ${this.companionEnabled ? 'ACTIVE' : 'OFF'}  |  DIFF: ${this.difficulty}`, 240, 244);

    ctx.restore();
  }

  renderPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, 0, 480, 270);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = '16px "Press Start 2P"';
    ctx.fillText('PAUSED', 240, 85);

    ctx.fillStyle = '#05d9e8';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText(`DIFFICULTY: ${this.difficulty}`, 240, 115);
    ctx.fillText(`2P COMPANION: ${this.companionEnabled ? 'ENABLED' : 'DISABLED'}`, 240, 130);
    const volStr = window.soundEngine && window.soundEngine.isMuted
      ? 'MUTED'
      : `${Math.round((window.soundEngine ? window.soundEngine.getMasterVolume() : 0.7) * 100)}%`;
    ctx.fillText(`AUDIO: ${volStr} (HOTKEYS: - / +)`, 240, 145);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('PRESS P OR ESC TO RESUME', 240, 170);
    ctx.fillText('PRESS O OR CLICK SETTINGS BUTTON', 240, 186);
  }

  renderGameOverOverlay(ctx) {
    ctx.fillStyle = 'rgba(20, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 480, 270);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2a6d';
    ctx.font = '22px "Press Start 2P"';
    ctx.fillText('GAME OVER', 240, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = '9px "Press Start 2P"';
    ctx.fillText(`FINAL SCORE: ${this.player.score}`, 240, 145);

    if (Math.floor(this.victoryTimer * 3) % 2 === 0) {
      ctx.fillStyle = '#ffd700';
      ctx.fillText('PRESS START TO RETRY', 240, 180);
    }
  }

  renderVictoryOverlay(ctx) {
    ctx.fillStyle = 'rgba(10, 25, 10, 0.82)';
    ctx.fillRect(0, 0, 480, 270);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('ULTIMATE VICTORY!', 240, 85);

    const isVert = (this.stage && this.stage.gameMode === 'VERTICAL');
    const bossDefeatedText = isVert ? 'CELESTIAL DRAGON LORD DEFEATED!' : 'GRANDMASTER KURODA DEFEATED!';
    const worldSavedText = isVert ? 'YOU CONQUERED THE 100 FLOORS!' : 'CHINATOWN IS FREED FROM THE SYNDICATE!';

    ctx.fillStyle = '#05d9e8';
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText(bossDefeatedText, 240, 115);

    ctx.fillStyle = '#ffffff';
    ctx.font = '9px "Press Start 2P"';
    ctx.fillText(`TOTAL SCORE: ${this.player.score}`, 240, 150);
    ctx.fillText(worldSavedText, 240, 172);

    if (Math.floor(this.victoryTimer * 3) % 2 === 0) {
      ctx.fillStyle = '#00ff66';
      ctx.fillText('PRESS START TO PLAY AGAIN', 240, 215);
    }
  }

  // ==========================================
  // SETTINGS & KEYBINDS MODAL CONTROLLER
  // ==========================================
  openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    window.soundEngine.resume();
    window.soundEngine.playPickup();
    if (this.gameState === 'PLAYING') {
      this.wasPlayingBeforeSettings = true;
      this.gameState = 'PAUSED';
    } else {
      this.wasPlayingBeforeSettings = false;
    }
    modal.classList.remove('hidden');
    this.refreshSettingsUI();
    if (window.gameLogger) {
      window.gameLogger.log('SYSTEM', 'Settings menu opened (game paused)');
    }
  }

  setupSettingsUI() {
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('open-settings-btn');
    const closeBtn = document.getElementById('close-settings-btn');
    const saveCloseBtn = document.getElementById('save-settings-close');

    if (openBtn) openBtn.addEventListener('click', () => this.openSettingsModal());

    const closeSettings = () => {
      this.closeSettingsModal();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeSettings);
    if (saveCloseBtn) saveCloseBtn.addEventListener('click', closeSettings);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeSettingsModal();
      });

      window.addEventListener('keydown', (e) => {
        if (!modal || modal.classList.contains('hidden')) return;
        if (e.code === 'Escape') {
          this.closeSettingsModal();
        }
      });

      // Tab Switching
      const tabBtns = modal.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const targetTabId = btn.dataset.tab;
          modal.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
          const targetContent = document.getElementById(targetTabId);
          if (targetContent) targetContent.classList.remove('hidden');
          window.soundEngine.playSwing(360);
        });
      });

      // Difficulty Selection
      const diffBtns = modal.querySelectorAll('.difficulty-grid .opt-btn');
      diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          diffBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.difficulty = btn.dataset.difficulty;
          localStorage.setItem('kungfu_difficulty', this.difficulty);
          window.soundEngine.playPickup();
          if (window.gameLogger) {
            window.gameLogger.log('SYSTEM', `Difficulty changed to ${this.difficulty}`);
          }
        });
      });

      // Default Game Mode Selection
      const modeBtns = modal.querySelectorAll('.mode-grid .opt-btn');
      modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          modeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.gameMode = btn.dataset.mode;
          localStorage.setItem('kungfu_gamemode', this.gameMode);
          if (this.stage) this.stage.setGameMode(this.gameMode);
          window.soundEngine.playPickup();
          if (window.gameLogger) {
            window.gameLogger.log('SYSTEM', `Default game mode set to ${this.gameMode}`);
          }
        });
      });

      // Companion Toggle
      const compToggleBtn = document.getElementById('toggle-companion-btn');
      if (compToggleBtn) {
        compToggleBtn.addEventListener('click', () => {
          this.toggleCompanion();
        });
      }

      // Companion Character Grid
      const compCharBtns = modal.querySelectorAll('.companion-char-grid .opt-btn');
      compCharBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          compCharBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.companionChar = btn.dataset.compChar;
          localStorage.setItem('kungfu_companion_char', this.companionChar);
          window.soundEngine.playPickup();
          this.syncCompanionState();
        });
      });

      // Companion Combat Tactics Grid
      const compTacticsBtns = modal.querySelectorAll('.companion-tactics-grid .opt-btn');
      compTacticsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          compTacticsBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.companionTactics = btn.dataset.compTactics;
          localStorage.setItem('kungfu_companion_tactics', this.companionTactics);
          window.soundEngine.playPickup();
          this.syncCompanionState();
        });
      });

      // Debug Tab actions
      const openConsoleBtn = document.getElementById('settings-open-console-btn');
      if (openConsoleBtn) {
        openConsoleBtn.addEventListener('click', () => {
          this.closeSettingsModal();
          if (window.gameLogger) window.gameLogger.openConsole(false);
        });
      }

      const viewLastLogBtn = document.getElementById('settings-view-last-log-btn');
      if (viewLastLogBtn) {
        viewLastLogBtn.addEventListener('click', () => {
          this.closeSettingsModal();
          if (window.gameLogger) window.gameLogger.openConsole(true);
        });
      }

      const exportJsonBtn = document.getElementById('settings-export-json-btn');
      if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
          if (window.gameLogger) window.gameLogger.exportJSON(window.gameLogger.getLastSavedSession());
        });
      }

      const exportTxtBtn = document.getElementById('settings-export-txt-btn');
      if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
          if (window.gameLogger) window.gameLogger.exportTXT(window.gameLogger.getLastSavedSession());
        });
      }

      const openFolderBtn = document.getElementById('settings-open-folder-btn');
      if (openFolderBtn) {
        openFolderBtn.addEventListener('click', () => {
          this.closeSettingsModal();
          if (window.gameLogger) window.gameLogger.openFolderModal();
        });
      }

      // Auto-Play Spectator & AI Brain Buttons
      const autoPlayToggle = document.getElementById('settings-toggle-autoplay-btn');
      if (autoPlayToggle) {
        autoPlayToggle.addEventListener('click', () => {
          this.toggleAutoPlay();
        });
      }

      const resetBrainBtn = document.getElementById('reset-ai-brain-btn');
      if (resetBrainBtn) {
        resetBrainBtn.addEventListener('click', () => {
          if (confirm('Reset all AI Learning data and Q-table weights to baseline?')) {
            if (window.aiLearningEngine) window.aiLearningEngine.resetLearning();
            window.soundEngine.playPickup();
            alert('AI Learning Brain successfully reset!');
          }
        });
      }

      const exportBrainBtn = document.getElementById('export-ai-brain-btn');
      if (exportBrainBtn) {
        exportBrainBtn.addEventListener('click', () => {
          if (window.aiLearningEngine) window.aiLearningEngine.exportBrainJSON();
        });
      }

      // 8-Bit Soundtrack Jukebox Track Buttons
      const trackBtns = modal.querySelectorAll('.jukebox-grid .track-btn');
      trackBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const track = btn.dataset.track;
          if (track === 'stop') {
            window.soundEngine.stopBGM();
          } else {
            window.soundEngine.startBGM(track);
          }
          this.refreshSoundtrackUI();
          window.soundEngine.playPickup();
        });
      });

      // Synchronize initial Volume Sliders
      this.syncVolumeUI();

      // Visual Accessibility Options (Screen Shake & Screen Flashing)
      const shakeBtn = document.getElementById('toggle-screenshake-btn');
      if (shakeBtn) {
        shakeBtn.addEventListener('click', () => {
          const enabled = !(window.combatSystem && window.combatSystem.screenShakeEnabled);
          if (window.combatSystem) window.combatSystem.screenShakeEnabled = enabled;
          localStorage.setItem('kungfu_screenshake', enabled.toString());
          window.soundEngine.playPickup();
          this.refreshSettingsUI();
        });
      }

      const flashBtn = document.getElementById('toggle-screenflash-btn');
      if (flashBtn) {
        flashBtn.addEventListener('click', () => {
          const enabled = !(window.combatSystem && window.combatSystem.screenFlashEnabled);
          if (window.combatSystem) window.combatSystem.screenFlashEnabled = enabled;
          if (window.weatherSystem) window.weatherSystem.lightningFlashEnabled = enabled;
          localStorage.setItem('kungfu_screenflash', enabled.toString());
          window.soundEngine.playPickup();
          this.refreshSettingsUI();
        });
      }

      // Keybinds Setup
      this.setupKeybindsUI();
    }
  }

  toggleCompanion() {
    this.companionEnabled = !this.companionEnabled;
    localStorage.setItem('kungfu_companion_enabled', this.companionEnabled.toString());
    window.soundEngine.playPickup();
    this.syncCompanionState();
    this.refreshSettingsUI();
  }

  refreshSoundtrackUI() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    const nowPlaying = document.getElementById('now-playing-label');
    if (nowPlaying) {
      if (window.soundEngine.bgmPlaying && window.soundEngine.currentTrack) {
        nowPlaying.innerText = window.soundEngine.getTrackDisplayName();
      } else {
        nowPlaying.innerText = '⏹️ MUSIC STOPPED / MUTED';
      }
    }

    const trackBtns = modal.querySelectorAll('.jukebox-grid .track-btn');
    trackBtns.forEach(btn => {
      const isCurrent = window.soundEngine.bgmPlaying
        ? (btn.dataset.track === window.soundEngine.currentTrack || 
           (btn.dataset.track === 'title' && (window.soundEngine.currentTrack === 'intro' || window.soundEngine.currentTrack === 'character_select')) ||
           (btn.dataset.track === 'stage1' && window.soundEngine.currentTrack === 'stage'))
        : (btn.dataset.track === 'stop');
      btn.classList.toggle('active', isCurrent);
    });

    this.syncVolumeUI();
  }

  // ==========================================
  // UNIFIED MASTER, BGM & SFX VOLUME CONTROLS
  // ==========================================
  initVolumeControls() {
    const quickMuteBtn = document.getElementById('quick-mute-btn');
    const quickSlider = document.getElementById('quick-volume-slider');
    const soundBtn = document.getElementById('toggle-sound');
    const masterSlider = document.getElementById('master-volume-slider');
    const bgmSlider = document.getElementById('bgm-volume-slider');
    const sfxSlider = document.getElementById('sfx-volume-slider');

    if (quickMuteBtn) {
      quickMuteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleAudioMute();
      });
    }

    if (quickSlider) {
      quickSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        if (window.soundEngine) {
          window.soundEngine.resume();
          window.soundEngine.setMasterVolume(val);
        }
        this.syncVolumeUI();
        this.triggerVolumeToast();
      });
      quickSlider.addEventListener('change', () => {
        if (window.soundEngine) window.soundEngine.playPickup();
      });
    }

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.toggleAudioMute();
      });
    }

    if (masterSlider) {
      masterSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        if (window.soundEngine) {
          window.soundEngine.resume();
          window.soundEngine.setMasterVolume(val);
        }
        this.syncVolumeUI();
        this.triggerVolumeToast();
      });
      masterSlider.addEventListener('change', () => {
        if (window.soundEngine) window.soundEngine.playPickup();
      });
    }

    if (bgmSlider) {
      bgmSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        if (window.soundEngine) window.soundEngine.setBGMVolume(val);
        this.syncVolumeUI();
      });
    }

    if (sfxSlider) {
      sfxSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        if (window.soundEngine) window.soundEngine.setSFXVolume(val);
        this.syncVolumeUI();
      });
      sfxSlider.addEventListener('change', () => {
        if (window.soundEngine) window.soundEngine.playHit(false);
      });
    }

    this.syncVolumeUI();
  }

  syncVolumeUI() {
    if (!window.soundEngine) return;
    const isMuted = window.soundEngine.isMuted;
    const masterPct = Math.round(window.soundEngine.getMasterVolume() * 100);
    const bgmPct = Math.round(window.soundEngine.getBGMVolume() * 100);
    const sfxPct = Math.round(window.soundEngine.getSFXVolume() * 100);

    const quickMuteBtn = document.getElementById('quick-mute-btn');
    if (quickMuteBtn) {
      quickMuteBtn.innerText = isMuted ? '🔇' : '🔊';
      quickMuteBtn.classList.toggle('muted', isMuted);
      quickMuteBtn.title = isMuted ? 'Unmute Audio (Hotkey: 0)' : 'Mute Audio (Hotkey: 0)';
    }

    const quickSlider = document.getElementById('quick-volume-slider');
    const quickDisplay = document.getElementById('quick-volume-display');
    if (quickSlider) quickSlider.value = isMuted ? 0 : masterPct;
    if (quickDisplay) quickDisplay.innerText = isMuted ? 'MUTE' : `${masterPct}%`;

    const masterSlider = document.getElementById('master-volume-slider');
    const masterDisplay = document.getElementById('master-vol-display');
    if (masterSlider) masterSlider.value = isMuted ? 0 : masterPct;
    if (masterDisplay) masterDisplay.innerText = isMuted ? 'MUTED' : `${masterPct}%`;

    const bgmSlider = document.getElementById('bgm-volume-slider');
    const bgmDisplay = document.getElementById('bgm-vol-display');
    if (bgmSlider) bgmSlider.value = bgmPct;
    if (bgmDisplay) bgmDisplay.innerText = `${bgmPct}%`;

    const sfxSlider = document.getElementById('sfx-volume-slider');
    const sfxDisplay = document.getElementById('sfx-vol-display');
    if (sfxSlider) sfxSlider.value = sfxPct;
    if (sfxDisplay) sfxDisplay.innerText = `${sfxPct}%`;

    const soundBtn = document.getElementById('toggle-sound');
    if (soundBtn) {
      soundBtn.innerText = isMuted ? 'AUDIO: OFF' : `VOL: ${masterPct}%`;
    }
  }

  adjustVolume(delta) {
    if (!window.soundEngine) return;
    window.soundEngine.resume();
    window.soundEngine.adjustMasterVolume(delta);
    this.syncVolumeUI();
    this.triggerVolumeToast();
  }

  toggleAudioMute() {
    if (!window.soundEngine) return;
    window.soundEngine.resume();
    window.soundEngine.toggleMute();
    this.syncVolumeUI();
    this.triggerVolumeToast();
  }

  triggerVolumeToast() {
    this.volumeToastTimer = 1.6;
  }

  renderVolumeToast(ctx) {
    if (this.volumeToastTimer <= 0) return;
    const isMuted = window.soundEngine ? window.soundEngine.isMuted : false;
    const vol = window.soundEngine ? Math.round(window.soundEngine.getMasterVolume() * 100) : 70;

    ctx.save();
    ctx.textAlign = 'center';

    const bx = 160, by = 42, bw = 160, bh = 22;
    ctx.fillStyle = 'rgba(10, 5, 20, 0.92)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = isMuted ? '#ff2a6d' : '#05d9e8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    if (isMuted) {
      ctx.fillStyle = '#ff2a6d';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText('🔇 AUDIO MUTED', 240, by + 14);
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText(`🔊 MASTER VOL: ${vol}%`, 240, by + 8);

      // Mini retro progress bar
      const pbX = bx + 16, pbY = by + 11, pbW = 128, pbH = 5;
      ctx.fillStyle = '#1a102a';
      ctx.fillRect(pbX, pbY, pbW, pbH);
      ctx.fillStyle = '#05d9e8';
      ctx.fillRect(pbX, pbY, Math.round(pbW * (vol / 100)), pbH);
      ctx.strokeStyle = '#443366';
      ctx.lineWidth = 1;
      ctx.strokeRect(pbX, pbY, pbW, pbH);
    }

    ctx.restore();
  }

  refreshSettingsUI() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    // Difficulty buttons state
    modal.querySelectorAll('.difficulty-grid .opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.difficulty === this.difficulty);
    });

    // Default Game Mode state
    modal.querySelectorAll('.mode-grid .opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.gameMode);
    });

    // Companion Toggle state
    const compToggleBtn = document.getElementById('toggle-companion-btn');
    if (compToggleBtn) {
      compToggleBtn.classList.toggle('active', this.companionEnabled);
      compToggleBtn.querySelector('.opt-title').innerText = `COMPANION: ${this.companionEnabled ? 'ON' : 'OFF'}`;
      compToggleBtn.querySelector('.opt-desc').innerText = this.companionEnabled ? 'AI fighting partner assists in combat' : 'Solo player mode';
    }

    // Companion Character state
    modal.querySelectorAll('.companion-char-grid .opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.compChar === this.companionChar);
    });

    // Companion Combat Tactics state
    modal.querySelectorAll('.companion-tactics-grid .opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.compTactics === this.companionTactics);
    });

    // Visual Accessibility state (Screen Shake & Flashing)
    const shakeBtn = document.getElementById('toggle-screenshake-btn');
    if (shakeBtn) {
      const isShake = !!(window.combatSystem && window.combatSystem.screenShakeEnabled);
      shakeBtn.classList.toggle('active', isShake);
      const title = document.getElementById('screenshake-btn-title');
      if (title) title.innerText = `SCREEN SHAKE: ${isShake ? 'ON' : 'OFF'}`;
    }

    const flashBtn = document.getElementById('toggle-screenflash-btn');
    if (flashBtn) {
      const isFlash = !!(window.combatSystem && window.combatSystem.screenFlashEnabled);
      flashBtn.classList.toggle('active', isFlash);
      const title = document.getElementById('screenflash-btn-title');
      if (title) title.innerText = `SCREEN FLASHING: ${isFlash ? 'ON' : 'OFF'}`;
    }

    this.refreshSoundtrackUI();
    this.refreshAutoPlayUI();
    this.renderKeybindsList();
  }

  setupKeybindsUI() {
    const resetBtn = document.getElementById('reset-keybinds-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        window.inputManager.resetBindings();
        window.soundEngine.playPickup();
        this.renderKeybindsList();
      });
    }
    this.renderKeybindsList();
  }

  renderKeybindsList() {
    const container = document.getElementById('keybinds-list');
    if (!container) return;
    container.innerHTML = '';

    const actionList = [
      { id: 'up', label: 'MOVE UP' },
      { id: 'down', label: 'MOVE DOWN' },
      { id: 'left', label: 'MOVE LEFT' },
      { id: 'right', label: 'MOVE RIGHT' },
      { id: 'punch', label: 'PUNCH' },
      { id: 'kick', label: 'KICK' },
      { id: 'jump', label: 'JUMP' },
      { id: 'special', label: 'DRAGON SPECIAL' },
      { id: 'mega', label: 'DRAGON KNUCKLE' },
      { id: 'companion', label: 'TOGGLE COMPANION' },
      { id: 'start', label: 'PAUSE / MENU' }
    ];

    actionList.forEach(action => {
      const row = document.createElement('div');
      row.className = 'keybind-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'keybind-name';
      nameSpan.textContent = action.label;

      const btn = document.createElement('button');
      btn.className = 'keybind-btn';
      const boundKeys = window.inputManager.bindings[action.id] || [];
      const primaryKey = boundKeys[0] || 'NONE';
      btn.textContent = window.inputManager.getKeyDisplayName(primaryKey);

      btn.addEventListener('click', () => {
        window.soundEngine.resume();
        btn.textContent = 'PRESS KEY...';
        btn.classList.add('rebinding');

        const onKeyDown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.removeEventListener('keydown', onKeyDown, true);

          const newCode = e.code;
          window.inputManager.bindKey(action.id, newCode);
          window.soundEngine.playPickup();
          btn.classList.remove('rebinding');
          btn.textContent = window.inputManager.getKeyDisplayName(newCode);
        };

        window.addEventListener('keydown', onKeyDown, { once: true, capture: true });
      });

      row.appendChild(nameSpan);
      row.appendChild(btn);
      container.appendChild(row);
    });
  }

  closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
    window.soundEngine.resume();
    window.soundEngine.playPickup();
    if (this.wasPlayingBeforeSettings) {
      this.gameState = 'PLAYING';
      this.wasPlayingBeforeSettings = false;
    }
    this.syncCompanionState();
    if (window.gameLogger) {
      window.gameLogger.log('SYSTEM', `Settings modal closed, current gameState: ${this.gameState}`);
    }
  }

  syncCompanionState() {
    if (this.companionEnabled) {
      let chosen = this.companionChar;
      if (chosen === 'auto') {
        chosen = (this.player && this.player.characterId === 'lindin') ? 'smellu' : 'lindin';
      }
      const targetX = (this.companion && Number.isFinite(this.companion.x)) ? this.companion.x : (this.player ? this.player.x - 30 : 60);
      const targetY = (this.companion && Number.isFinite(this.companion.y)) ? this.companion.y : (this.player ? this.player.y : 225);

      if (!this.companion) {
        if (this.gameState === 'PLAYING' || this.gameState === 'PAUSED') {
          this.companion = new window.AICompanion(targetX, targetY, chosen, this.companionTactics);
          if (window.combatSystem && window.combatSystem.spawnComboText) {
            window.combatSystem.spawnComboText(this.companion.x, this.companion.y - 45, 'COMPANION JOINED!', '#00ffcc');
          }
          if (window.gameLogger) {
            window.gameLogger.log('COMPANION', `Companion ${chosen.toUpperCase()} joined the fight (${this.companionTactics})`);
          }
        }
      } else {
        if (this.companion.characterId !== chosen) {
          const oldHealth = this.companion.health;
          const oldWeapon = this.companion.weapon ? this.companion.weapon.type : null;
          const oldFacing = this.companion.facing;
          this.companion = new window.AICompanion(targetX, targetY, chosen, this.companionTactics);
          this.companion.health = Math.min(this.companion.maxHealth, oldHealth || this.companion.maxHealth);
          this.companion.facing = oldFacing;
          if (oldWeapon && this.companion.equipWeapon) {
            this.companion.equipWeapon(oldWeapon);
          }
          if (window.gameLogger) {
            window.gameLogger.log('COMPANION', `Switched companion character to ${chosen.toUpperCase()}`);
          }
        }
        this.companion.tactics = this.companionTactics;
      }
    } else {
      if (this.companion) {
        if (window.combatSystem && window.combatSystem.spawnComboText) {
          window.combatSystem.spawnComboText(this.companion.x, this.companion.y - 45, 'COMPANION LEFT', '#ff2a6d');
        }
        this.companion = null;
        if (window.gameLogger) {
          window.gameLogger.log('COMPANION', 'Companion left');
        }
      }
    }
  }

  toggleAutoPlay() {
    this.autoPlay = !this.autoPlay;
    localStorage.setItem('kungfu_autoplay', this.autoPlay.toString());
    window.soundEngine.playPickup();

    if (this.autoPlay) {
      // Ensure 2 AI companions are active!
      this.companionEnabled = true;
      localStorage.setItem('kungfu_companion_enabled', 'true');

      if (this.gameState === 'TITLE' || this.gameState === 'CHARACTER_SELECT' || this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') {
        this.startNewGame('smellu');
      } else {
        this.syncCompanionState();
      }
    }

    this.refreshAutoPlayUI();
    this.refreshSettingsUI();

    if (window.combatSystem && this.player) {
      window.combatSystem.spawnComboText(
        this.player.x,
        this.player.y - 45,
        this.autoPlay ? 'AI WATCH MODE ON!' : 'MANUAL CONTROL RESUMED!',
        this.autoPlay ? '#ffd700' : '#00ff66'
      );
    }

    if (window.gameLogger) {
      window.gameLogger.log('SYSTEM', `Auto-Play Spectator Watch Mode: ${this.autoPlay ? 'ACTIVE (2 AI Companions)' : 'INACTIVE (Player Control)'}`);
    }
  }

  refreshAutoPlayUI() {
    const btn = document.getElementById('toggle-autoplay-btn');
    if (btn) {
      btn.classList.toggle('active', this.autoPlay);
      btn.innerText = `WATCH AI: ${this.autoPlay ? 'ON' : 'OFF'}`;
    }
    const settingsBtn = document.getElementById('settings-toggle-autoplay-btn');
    if (settingsBtn) {
      settingsBtn.classList.toggle('active', this.autoPlay);
      const title = document.getElementById('settings-autoplay-title');
      const desc = document.getElementById('settings-autoplay-desc');
      if (title) title.innerText = `WATCH AI AUTO-PLAY: ${this.autoPlay ? 'ON (ACTIVE)' : 'OFF'}`;
      if (desc) desc.innerText = this.autoPlay
        ? 'Two AI companions actively clearing stages autonomously and training via Q-Learning [Press Q to take over]'
        : 'Two AI companions team up, conquer stages autonomously, and train via Q-Learning [Press Q]';
    }
  }

  // ==========================================
  // INSTRUCTION MANUAL BOOKLET CONTROLLER
  // ==========================================
  setupManualUI() {
    const modal = document.getElementById('manual-modal');
    if (!modal) return;

    const closeBtn = document.getElementById('close-manual-btn');
    const bottomCloseBtn = document.getElementById('manual-close-bottom');
    const prevBtn = document.getElementById('manual-prev-btn');
    const nextBtn = document.getElementById('manual-next-btn');
    const pageSelect = document.getElementById('manual-page-select');
    const openManualBtn = document.getElementById('open-manual-btn');
    const openManualTabBtn = document.getElementById('open-manual-tab-btn');

    const updatePage = (newPage) => {
      this.currentManualPage = Math.max(1, Math.min(this.totalManualPages, newPage));
      const pages = modal.querySelectorAll('.manual-page');
      pages.forEach((p, idx) => {
        if (idx + 1 === this.currentManualPage) {
          p.classList.remove('hidden');
        } else {
          p.classList.add('hidden');
        }
      });
      const pageNumEl = document.getElementById('manual-page-number');
      if (pageNumEl) pageNumEl.innerText = `PAGE ${this.currentManualPage} / ${this.totalManualPages}`;
      if (pageSelect) pageSelect.value = this.currentManualPage.toString();
      if (prevBtn) prevBtn.disabled = (this.currentManualPage <= 1);
      if (nextBtn) nextBtn.disabled = (this.currentManualPage >= this.totalManualPages);
      if (window.soundEngine) window.soundEngine.playSwing(400);
    };

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeManualModal());
    if (bottomCloseBtn) bottomCloseBtn.addEventListener('click', () => this.closeManualModal());
    if (prevBtn) prevBtn.addEventListener('click', () => updatePage(this.currentManualPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => updatePage(this.currentManualPage + 1));
    if (pageSelect) pageSelect.addEventListener('change', (e) => updatePage(parseInt(e.target.value, 10)));

    if (openManualBtn) openManualBtn.addEventListener('click', () => this.openManualModal());
    if (openManualTabBtn) {
      openManualTabBtn.addEventListener('click', () => {
        this.closeSettingsModal();
        this.openManualModal();
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeManualModal();
    });

    window.addEventListener('keydown', (e) => {
      if (!modal || modal.classList.contains('hidden')) return;
      if (e.code === 'Escape' || e.code === 'KeyN') {
        this.closeManualModal();
      } else if (e.code === 'ArrowLeft') {
        updatePage(this.currentManualPage - 1);
      } else if (e.code === 'ArrowRight') {
        updatePage(this.currentManualPage + 1);
      }
    });

    updatePage(1);
  }

  openManualModal(page = 1) {
    const modal = document.getElementById('manual-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this.manualOpen = true;
    if (window.soundEngine) {
      window.soundEngine.resume();
      window.soundEngine.playPickup();
    }
  }

  closeManualModal() {
    const modal = document.getElementById('manual-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    this.manualOpen = false;
    if (window.soundEngine) {
      window.soundEngine.playPickup();
    }
  }
}

window.Game = Game;

// Start game when page loads
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
  });
} else {
  window.game = new Game();
}
