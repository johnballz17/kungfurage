/**
 * CARPE'S KUNG FU RAGE - FIGHTERS & ENTITIES
 * Core player mechanics, belt-scroll AI enemies, boss phases, pickups, and breakables.
 */

class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.width = 24;
    this.height = 40;
    this.isDead = false;
  }
}

// BASE FIGHTER CLASS
class Fighter extends Entity {
  constructor(x, y) {
    super(x, y);
    this.facing = 1; // 1 = right, -1 = left
    this.health = 100;
    this.maxHealth = 100;
    this.state = 'idle'; // idle, walk, punch1, punch2, punch3, kick1, kick2, jump, jump_kick, special, hurt, knockdown, dead
    this.stateTimer = 0;
    this.animTime = 0;
    this.isInvulnerable = false;
    this.invulnTimer = 0;
    this.grabbedBy = null;
    this.holdingTarget = null;
    this.weapon = null;
  }

  takeDamage(amount, fromFacing, knockdown = false, launchX = 4, launchZ = 3) {
    if (this.isDead || this.isInvulnerable) return;

    this.health -= amount;
    this.facing = -fromFacing; // Face the attacker
    this.animTime = 0;

    if (this.health <= 0) {
      this.health = 0;
      this.knockdown(fromFacing, launchX * 1.3, launchZ * 1.3);
      this.isDead = true;
      return;
    }

    if (knockdown || this.z > 0) {
      this.knockdown(fromFacing, launchX, launchZ);
    } else {
      this.state = 'hurt';
      this.stateTimer = 0.22;
      this.vx = fromFacing * 1.5;
    }
  }

  knockdown(fromFacing, launchX = 4, launchZ = 3.5) {
    this.state = 'knockdown';
    this.stateTimer = 1.0;
    this.vx = fromFacing * launchX;
    this.vz = launchZ;
  }

  updatePhysics(dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;

    // Gravity
    if (this.z > 0) {
      this.vz -= 0.28; // Gravity

      // Ceiling clamp so jumping never flies above the camera view!
      const maxSafeZ = Math.max(30, this.y - 65);
      if (this.z > maxSafeZ) {
        this.z = maxSafeZ;
        if (this.vz > 0) this.vz = 0;
      }
    }

    // Ground landing check (must be outside of if (this.z > 0) so single-frame overshoots land reliably!)
    if (this.z <= 0) {
      const wasAirborne = this.vz !== 0 || this.z < 0 || this.state === 'knockdown' || ['jump', 'jump_kick', 'front_flip', 'backflip', 'air_spin', 'air_hammer', 'air_split', 'air_pistol', 'flying_kick'].includes(this.state);
      this.z = 0;
      this.vz = 0;
      if (wasAirborne) {
        this.onLand();
      }
      // Failsafe: Grounded entities must never remain trapped in airborne move states
      if (['jump', 'jump_kick', 'front_flip', 'backflip', 'air_spin', 'air_hammer', 'air_split', 'air_pistol', 'flying_kick'].includes(this.state)) {
        this.state = 'idle';
        this.stateTimer = 0;
      }
    }

    // Friction on ground
    if (this.z === 0) {
      this.vx *= 0.78;
      this.vy *= 0.78;
    }

    // Invulnerability flashing timer
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
      if (this.invulnTimer <= 0) {
        this.isInvulnerable = false;
      }
    }
  }

  onLand() {
    if (this.state === 'knockdown') {
      this.vx *= 0.3;
    } else if (['jump', 'jump_kick', 'front_flip', 'backflip', 'air_spin', 'air_hammer', 'air_split', 'air_pistol', 'flying_kick'].includes(this.state)) {
      this.state = 'idle';
      this.stateTimer = 0;
      this.vx *= 0.2;
    }
  }

  handleWallCollision(stage) {
    if (!stage) return;
    const leftWall = stage.cameraX + 20;
    const rightWall = stage.cameraX + 460;

    if (this.x <= leftWall) {
      this.x = leftWall;
      if (this.vx < 0) {
        const wasAirborne = this.z > 0 || this.state === 'knockdown';
        if (wasAirborne) {
          // Rebound wall bounce inward!
          this.vx = Math.max(1.8, Math.abs(this.vx) * 0.45);
          if (typeof window !== 'undefined' && window.soundEngine && !this.isDead) window.soundEngine.playHit(false);
          if (typeof window !== 'undefined' && window.combatSystem) {
            window.combatSystem.spawnHitSpark(leftWall + 2, this.y - this.z - 18, '#ffffff', 5);
            window.combatSystem.triggerScreenShake(2, 0.12);
          }
        } else {
          this.vx = 0;
        }
      }
    } else if (this.x >= rightWall) {
      this.x = rightWall;
      if (this.vx > 0) {
        const wasAirborne = this.z > 0 || this.state === 'knockdown';
        if (wasAirborne) {
          // Rebound wall bounce inward!
          this.vx = -Math.max(1.8, Math.abs(this.vx) * 0.45);
          if (typeof window !== 'undefined' && window.soundEngine && !this.isDead) window.soundEngine.playHit(false);
          if (typeof window !== 'undefined' && window.combatSystem) {
            window.combatSystem.spawnHitSpark(rightWall - 2, this.y - this.z - 18, '#ffffff', 5);
            window.combatSystem.triggerScreenShake(2, 0.12);
          }
        } else {
          this.vx = 0;
        }
      }
    }
  }
}

// ==========================================
// PLAYER (THE KUNG-FU MASTER)
// ==========================================
class Player extends Fighter {
  constructor(x, y, characterId = 'smellu') {
    super(x, y);
    this.isPlayer = true;
    this.characterId = characterId;

    if (characterId === 'lindin') {
      this.name = 'LINDIN';
      this.title = 'THE AGILE VIPER';
      this.speed = 3.3;
      this.health = 85;
      this.maxHealth = 85;
      this.hasSuperArmor = false;
    } else if (characterId === 'smoro') {
      this.name = 'SMORO';
      this.title = 'THE HEAVY IRON BULL';
      this.speed = 1.8;
      this.health = 140;
      this.maxHealth = 140;
      this.hasSuperArmor = true;
      this.width = 30;
    } else {
      this.name = 'SMELLU';
      this.title = 'THE BALANCED DRAGON';
      this.speed = 2.4;
      this.health = 100;
      this.maxHealth = 100;
      this.hasSuperArmor = false;
    }

    this.lives = 3;
    this.score = 0;
    this.specialMeter = 100;
    this.maxSpecial = 100;

    this.comboStep = 0;
    this.comboInputWindow = 0;
    this.comboAltRoute = false;
    this.comboLastType = null;
    this.dashTimer = 0;
    this.isDashing = false;
    this.hasHitCurrentAttack = false;
    this.megaPunchHitSet = new Set();
    this.punchChargeTimer = 0;
  }

  takeDamage(amount, fromFacing, knockdown = false, launchX = 4, launchZ = 3) {
    if (this.isDead || this.isInvulnerable) return;

    // Reset punch charge on taking damage
    this.punchChargeTimer = 0;

    // Apply Difficulty Modifiers
    const diff = (window.game && window.game.getDifficultyModifiers) ? window.game.getDifficultyModifiers() : { playerDamageTakenMult: 1 };
    amount = Math.max(1, Math.round(amount * diff.playerDamageTakenMult));

    // Smoro Super-Armor against light hits
    if (this.hasSuperArmor && !knockdown && amount < 18 && this.health > 20) {
      this.health -= Math.round(amount * 0.7); // 30% damage reduction
      this.animTime = 0;
      window.soundEngine.playHit(true);
      window.combatSystem.spawnDamageNumber(this.x, this.y - 30, Math.round(amount * 0.7));
      return; // Do not interrupt attack or flinch!
    }

    // Corner Trap / Multi-Hit Wall Pin Breaker:
    // If player is hit while already in 'hurt' state, or hit repeatedly against the boundary,
    // force a knockdown with wall bounce so the player falls safely and recovers with 1.2s invulnerability!
    const stage = (typeof window !== 'undefined' && window.game) ? window.game.stage : null;
    const isNearWall = stage && (this.x <= stage.cameraX + 28 || this.x >= stage.cameraX + 452);
    if (this.state === 'hurt' || (isNearWall && !knockdown)) {
      knockdown = true;
      launchX = 2.5;
      launchZ = 2.8;
    }

    super.takeDamage(amount, fromFacing, knockdown, launchX, launchZ);

    if (typeof window !== 'undefined' && window.aiLearningEngine) {
      window.aiLearningEngine.recordDamageTaken(this, amount);
    }
  }

  update(dt, input, stage) {
    this.animTime += dt;
    this.stateTimer -= dt;
    this.comboInputWindow -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Passive Ki Regen
    if (this.specialMeter < this.maxSpecial) {
      const regenRate = this.characterId === 'lindin' ? 5.5 : (this.characterId === 'smoro' ? 3.0 : 4.0);
      this.specialMeter = Math.min(this.maxSpecial, this.specialMeter + dt * regenRate);
    }

    // Recover from hurt or knockdown
    if (this.state === 'hurt' && this.stateTimer <= 0) {
      this.state = 'idle';
      const isAtWall = stage && (this.x <= stage.cameraX + 26 || this.x >= stage.cameraX + 454);
      if (isAtWall) {
        this.isInvulnerable = true;
        this.invulnTimer = 0.45; // 450ms safety window to dodge/jump/attack away from wall
      }
    } else if (this.state === 'knockdown') {
      if (this.z === 0 && this.stateTimer <= 0) {
        // Stand up with recovery invulnerability
        this.state = 'idle';
        this.isInvulnerable = true;
        this.invulnTimer = 1.2;
        if (stage) {
          const leftWall = stage.cameraX + 20;
          const rightWall = stage.cameraX + 460;
          if (this.x <= leftWall + 6) this.x = leftWall + 10;
          if (this.x >= rightWall - 6) this.x = rightWall - 10;
        }
      }
    }

    // Reset punch charge timer if punch button is released at any point
    if (!input.isActionPressed('punch')) {
      this.punchChargeTimer = 0;
    }

    // Handle Active Attacks Completion (Unarmed & Weapons)
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
    if (activeAttacks.includes(this.state)) {
      if (this.stateTimer <= 0) {
        this.state = 'idle';
      }
    }

    // Handle Mega Punch State Transitions (Dragon Knuckle)
    if (this.state === 'mega_punch_windup') {
      if (this.stateTimer <= 0) {
        this.executeMegaPunchStrike();
      }
    } else if (this.state === 'mega_punch_strike') {
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.vx = 0;
      }
    }

    // Can Player Move / Attack?
    const canAct = (this.state === 'idle' || this.state === 'walk') && this.z === 0;
    const isAirborne = this.z > 0;

    if (canAct) {
      // Hold punch to charge Dragon Knuckle Mega Punch (continuous hold for >= 0.35s)
      if (input.isActionPressed('punch')) {
        this.punchChargeTimer += dt;
        if (this.punchChargeTimer >= 0.35) {
          this.punchChargeTimer = 0;
          this.executeMegaPunchWindup();
          return;
        }
      }

      this.handleMovement(input);
      this.handleAttacks(input);
    } else if (isAirborne && !['knockdown', 'jump_kick', 'air_spin', 'air_hammer', 'air_split', 'air_pistol', 'flying_kick', 'front_flip', 'backflip', 'shoryu_uppercut', 'flash_kick', 'mega_punch_windup', 'mega_punch_strike'].includes(this.state)) {
      // Mid-air attack input: Flying Dive Kick, Aerial Cyclone, Air Hammer, or Air Split!
      const moveX = input.getHorizontal();
      const moveY = input.getVertical();
      if (input.isActionJustPressed('punch')) {
        if (moveY > 0 || moveX === 0) {
          this.executeAirHammer();
        } else {
          this.executeFlyingKick();
        }
      } else if (input.isActionJustPressed('kick')) {
        if (moveX === 0) {
          this.executeAirSplit();
        } else {
          this.executeAirSpin();
        }
      }
    }

    this.updatePhysics(dt);

    // Keep player in stage bounds with wall bounce / boundary collision
    if (stage) {
      this.handleWallCollision(stage);
      this.y = Math.max(stage.minY, Math.min(stage.maxY, this.y));
    }
  }

  handleMovement(input) {
    const moveX = input.getHorizontal();
    const moveY = input.getVertical();

    let curSpeed = this.speed;
    if (input.isDashing) curSpeed *= 1.6;

    // Jump with Front Flip / Backflip detection FIRST (before walking facing direction changes!)
    if (input.isActionJustPressed('jump') && this.z === 0) {
      if (input.isDashing || (moveX !== 0 && moveX === this.facing)) {
        // FRONT FLIP! High forward somersault axe drop!
        this.state = 'front_flip';
        this.vz = 4.8;
        this.z = 1;
        this.vx = this.facing * (this.speed * 1.85);
        this.animTime = 0;
        this.hasHitCurrentAttack = false;
        window.soundEngine.playSwing(420);
        return;
      } else if (moveX !== 0 && moveX === -this.facing) {
        // BACKFLIP! Evasive somersault with invulnerability
        this.state = 'backflip';
        this.vz = 4.5;
        this.z = 1;
        this.vx = -this.facing * (this.speed * 1.55);
        this.animTime = 0;
        this.isInvulnerable = true;
        this.invulnTimer = 0.55;
        this.hasHitCurrentAttack = false;
        window.soundEngine.playSwing(360);
        return;
      } else {
        // Standard Jump
        this.state = 'jump';
        this.vz = this.characterId === 'lindin' ? 5.2 : (this.characterId === 'smoro' ? 4.5 : 4.8);
        this.z = 1;
        window.soundEngine.playJump();
        return;
      }
    }

    if (moveX !== 0 || moveY !== 0) {
      this.vx = moveX * curSpeed;
      this.vy = moveY * (curSpeed * 0.7); // Depth scrolling slightly slower for perspective
      this.state = 'walk';
      if (moveX !== 0) {
        this.facing = moveX > 0 ? 1 : -1;
      }
    } else {
      this.state = 'idle';
    }
  }

  handleAttacks(input) {
    const moveX = input.getHorizontal();
    const moveY = input.getVertical();
    const isForward = (moveX !== 0 && moveX === this.facing);
    const isBackward = (moveX !== 0 && moveX === -this.facing);
    const isUp = (moveY < 0);
    const isDown = (moveY > 0);

    // 0. CAPTAIN FALCON MEGA PUNCH HOMAGE: "DRAGON KNUCKLE"
    // Triggered by dedicated key (H / U / B), RT gamepad button, Forward + Special, or Dash + Punch!
    if (input.isActionJustPressed('mega') ||
        (input.isActionJustPressed('special') && (isForward || input.isDashing)) ||
        (input.isDashing && input.isActionJustPressed('punch') && this.comboStep === 0)) {
      this.executeMegaPunchWindup();
      return;
    }

    // 1. Special Move (L / V)
    if (input.isActionJustPressed('special')) {
      if (this.specialMeter >= 30) {
        this.executeSpecialMove();
        return;
      }
    }

    // 2. DIRECTIONAL COMMAND ATTACKS (Direction + Same Buttons)
    if (input.isActionJustPressed('punch')) {
      if (isUp) {
        this.executeRisingDragonUppercut();
        return;
      } else if (isDown) {
        this.executeGroundPound();
        return;
      } else if (isBackward && this.comboStep === 0) {
        this.executeBackStrike('punch');
        return;
      } else if (isForward && this.comboStep === 0) {
        this.executeLungePunch();
        return;
      }
      this.executePunch();
      return;
    }

    // 3. DIRECTIONAL KICKS & COMBOS (Direction + Same Buttons)
    if (input.isActionJustPressed('kick')) {
      if (isUp) {
        this.executeFlashKick();
        return;
      } else if (isDown) {
        this.executeLowSweep();
        return;
      } else if (isBackward && this.comboStep === 0) {
        this.executeBackStrike('kick');
        return;
      } else if (isForward && this.comboStep === 0) {
        this.executeThrustKick();
        return;
      }
      this.executeKick();
      return;
    }
  }

  equipWeapon(type) {
    let hits = 20;
    if (type === 'pipe') hits = 14;
    else if (type === 'nunchaku') hits = 24;
    else if (type === 'daggers') hits = 20;
    else if (type === 'pistols' || type === 'dual_pistols') hits = 36;
    this.weapon = {
      type: (type === 'dual_pistols') ? 'pistols' : type,
      hits: hits,
      maxHits: hits
    };
    if (window.gameLogger) {
      const charName = this.isAI ? 'AI Companion' : 'Player';
      const cat = this.isAI ? 'COMPANION' : 'PLAYER';
      window.gameLogger.log(cat, `${charName} equipped ${this.weapon.type.toUpperCase()} (${hits} durability)`);
    }
  }

  executeWeaponAttack() {
    this.hasHitCurrentAttack = false;
    this.punchChargeTimer = 0;
    const type = this.weapon ? this.weapon.type : 'nunchaku';

    if (type === 'nunchaku') {
      this.state = 'nunchaku_attack';
      this.stateTimer = 0.14;
      this.comboStep = (this.comboInputWindow > 0 && this.comboStep > 0) ? ((this.comboStep % 3) + 1) : 1;
      this.comboInputWindow = 0.55;
      this.vx = this.facing * (2.2 + this.comboStep * 0.4);
      window.soundEngine.playNunchaku();
      if (this.comboStep === 3) {
        window.combatSystem.spawnComboText(this.x, this.y - 40, 'NUNCHAKU CYCLONE!', '#ffd700');
      } else if (Math.random() < 0.25) {
        window.combatSystem.spawnComboText(this.x, this.y - 40, 'NUNCHAKU FLURRY!', '#ffd700');
      }
    } else if (type === 'daggers') {
      this.state = 'dagger_attack';
      this.stateTimer = 0.12;
      this.comboStep = (this.comboInputWindow > 0 && this.comboStep > 0) ? ((this.comboStep % 3) + 1) : 1;
      this.comboInputWindow = 0.55;
      this.vx = this.facing * (2.4 + this.comboStep * 0.4);
      window.soundEngine.playSlash();
      if (this.comboStep === 3) {
        window.combatSystem.spawnComboText(this.x, this.y - 40, 'TWIN X-CROSS SLICE!', '#05d9e8');
      } else if (Math.random() < 0.25) {
        window.combatSystem.spawnComboText(this.x, this.y - 40, 'DAGGER SLICE!', '#05d9e8');
      }
    } else if (type === 'pipe') {
      this.state = 'pipe_attack';
      this.stateTimer = 0.22;
      this.comboStep = (this.comboInputWindow > 0 && this.comboStep > 0) ? ((this.comboStep % 2) + 1) : 1;
      this.comboInputWindow = 0.55;
      this.vx = this.facing * (2.8 + this.comboStep * 0.6);
      window.soundEngine.playHit(true);
      if (this.comboStep === 2) {
        window.combatSystem.spawnComboText(this.x, this.y - 40, 'PIPE HOME RUN!', '#ffaa00');
      } else if (Math.random() < 0.25) {
        window.combatSystem.spawnComboText(this.x, this.y - 40, 'PIPE CRUSH!', '#ffaa00');
      }
    } else if (type === 'pistols' || type === 'dual_pistols') {
      if (this.z > 0) {
        // Airborne akimbo shooting sweep
        this.state = 'air_pistol';
        this.stateTimer = 0.20;
        this.vx = this.facing * 2.2;
        window.soundEngine.playGunshot();
        window.combatSystem.spawnGunShotEffects(this.x, this.y - this.z - 16, this.y, this.facing, true);
        return;
      }

      // Ground Gun-Fu Combo sequence
      if (this.comboInputWindow > 0 && this.comboStep > 0) {
        if (this.comboStep === 1) {
          // Hit 2: Left-hand follow-up shot
          this.state = 'pistol_shot2';
          this.stateTimer = 0.12;
          this.comboStep = 2;
          this.comboInputWindow = 0.55;
          this.vx = this.facing * 1.8;
          window.soundEngine.playGunshot();
          window.combatSystem.spawnGunShotEffects(this.x, this.y - 24, this.y, this.facing, false);
        } else if (this.comboStep === 2) {
          // Hit 3: Gun-Butt Pistol Whip
          this.state = 'pistol_whip';
          this.stateTimer = 0.16;
          this.comboStep = 3;
          this.comboInputWindow = 0.55;
          this.vx = this.facing * 2.8;
          window.soundEngine.playHit(true);
          window.combatSystem.spawnComboText(this.x, this.y - 40, 'PISTOL WHIP!', '#ffaa00');
        } else if (this.comboStep >= 3) {
          // Hit 4: Dual Crossfire Execution Blast!
          this.state = 'pistol_crossfire';
          this.stateTimer = 0.22;
          this.comboStep = 0;
          this.comboInputWindow = 0;
          this.vx = this.facing * 3.6;
          window.soundEngine.playGunshot();
          setTimeout(() => window.soundEngine.playGunshot(), 50);
          window.combatSystem.spawnGunShotEffects(this.x, this.y - 26, this.y, this.facing, true);
          window.combatSystem.spawnComboText(this.x, this.y - 45, 'CROSSFIRE EXECUTION!', '#ff0055');
          window.combatSystem.triggerScreenShake(5, 0.2);
        }
      } else {
        // Hit 1: Lead Right-Hand Gun-Fu Shot
        this.state = 'pistol_shot1';
        this.stateTimer = 0.12;
        this.comboStep = 1;
        this.comboInputWindow = 0.55;
        this.vx = this.facing * 1.5;
        window.soundEngine.playGunshot();
        window.combatSystem.spawnGunShotEffects(this.x, this.y - 26, this.y, this.facing, false);
      }
    }
  }

  executePunch() {
    this.hasHitCurrentAttack = false;
    this.punchChargeTimer = 0;

    // Custom weapon attacks take priority on punch button when equipped!
    if (this.weapon) {
      this.executeWeaponAttack();
      return;
    }

    const swingPitch = this.characterId === 'lindin' ? 380 : (this.characterId === 'smoro' ? 200 : 300);
    window.soundEngine.playSwing(swingPitch);

    // Timing scaling per character
    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);

    if (this.comboInputWindow > 0 && this.comboStep > 0) {
      // Branching from kick into punch:
      if (this.state === 'kick2') {
        this.executeOneInchPunch();
        return;
      } else if (this.state === 'kick1') {
        this.state = 'punch_elbow';
        this.stateTimer = 0.17 * timingScale;
        this.comboStep = 2;
        this.comboInputWindow = 0.55;
        this.vx = this.facing * 2.6;
        window.combatSystem.spawnComboText(this.x, this.y - 40, 'ELBOW COMBO!', '#ffaa00');
        return;
      }

      // Punch combo sequence:
      if (this.comboStep === 1) {
        // Hit 2: Straight Cross Punch
        this.state = 'punch2';
        this.stateTimer = 0.14 * timingScale;
        this.comboStep = 2;
        this.comboInputWindow = 0.55;
        this.vx = this.facing * (this.characterId === 'smoro' ? 1.8 : 2.2);
      } else if (this.comboStep === 2) {
        // Hit 3: Heavy Gut Hook or Stepping Elbow (Alternates on same button!)
        if (!this.comboAltRoute) {
          this.state = 'punch_gut';
          this.stateTimer = 0.16 * timingScale;
          this.comboStep = 3;
          this.comboInputWindow = 0.55;
          this.vx = this.facing * 2.5;
          window.combatSystem.spawnComboText(this.x, this.y - 40, 'GUT HOOK!', '#ff7700');
        } else {
          this.state = 'punch_elbow';
          this.stateTimer = 0.17 * timingScale;
          this.comboStep = 3;
          this.comboInputWindow = 0.55;
          this.vx = this.facing * 2.8;
          window.combatSystem.spawnComboText(this.x, this.y - 40, 'ELBOW SMASH!', '#ffaa00');
        }
      } else if (this.comboStep === 3) {
        // Hit 4: Heavy Stepping Elbow or Gut Strike
        this.state = (this.state === 'punch_gut') ? 'punch_elbow' : 'punch_gut';
        this.stateTimer = 0.18 * timingScale;
        this.comboStep = 4;
        this.comboInputWindow = 0.55;
        this.vx = this.facing * 3.2;
        window.soundEngine.playSwing(swingPitch + 40);
      } else if (this.comboStep >= 4) {
        // Hit 5: SHATTERING KNOCKDOWN FINISHER!
        this.state = 'punch3';
        this.stateTimer = 0.22 * timingScale;
        this.comboStep = 0;
        this.comboInputWindow = 0;
        this.comboAltRoute = !this.comboAltRoute; // Toggle route for next combo
        this.vx = this.facing * (this.characterId === 'smoro' ? 4.8 : 4.0);
        window.soundEngine.playHit(true);
        window.combatSystem.spawnComboText(this.x, this.y - 45, 'DRAGON PALM FINISHER!', '#ff0055');
      } else {
        // Fallback Hit 1
        this.state = 'punch1';
        this.stateTimer = 0.11 * timingScale;
        this.comboStep = 1;
        this.comboInputWindow = 0.55;
        this.vx = this.facing * 1.4;
      }
    } else {
      // Hit 1: Fast Lead Jab
      this.state = 'punch1';
      this.stateTimer = 0.11 * timingScale;
      this.comboStep = 1;
      this.comboInputWindow = 0.55;
      this.vx = this.facing * 1.4;
    }
  }

  executeKick() {
    this.hasHitCurrentAttack = false;
    this.punchChargeTimer = 0;
    const swingPitch = this.characterId === 'lindin' ? 320 : (this.characterId === 'smoro' ? 160 : 240);
    window.soundEngine.playSwing(swingPitch);

    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);

    if (this.comboInputWindow > 0 && this.comboStep > 0) {
      // Branching from punch into kick:
      if (this.state === 'punch2') {
        this.state = 'kick_axe';
        this.stateTimer = 0.20 * timingScale;
        this.comboStep = 0;
        this.comboInputWindow = 0;
        this.vx = this.facing * 3.2;
        window.combatSystem.spawnComboText(this.x, this.y - 45, 'AXE KICK FINISHER!', '#ffd700');
        return;
      } else if (this.state === 'punch1') {
        this.state = 'kick1';
        this.stateTimer = 0.12 * timingScale;
        this.comboStep = 2;
        this.comboInputWindow = 0.55;
        this.vx = this.facing * 2.0;
        return;
      } else if (this.state === 'punch_gut' || this.state === 'punch_elbow') {
        this.state = 'spin_kick';
        this.stateTimer = 0.22 * timingScale;
        this.comboStep = 0;
        this.comboInputWindow = 0;
        this.vx = this.facing * 3.8;
        window.soundEngine.playSwing(480);
        window.combatSystem.spawnComboText(this.x, this.y - 45, 'CYCLONE FINISHER!', '#05d9e8');
        return;
      }

      // Kick combo sequence:
      if (this.comboStep === 1 || this.state === 'kick1') {
        // Hit 2: High Hook Kick
        this.state = 'kick2';
        this.stateTimer = 0.16 * timingScale;
        this.comboStep = 2;
        this.comboInputWindow = 0.55;
        this.vx = this.facing * 2.4;
      } else if (this.comboStep === 2 || this.state === 'kick2') {
        // Hit 3: Overhead Axe Heel Drop
        this.state = 'kick_axe';
        this.stateTimer = 0.20 * timingScale;
        this.comboStep = 3;
        this.comboInputWindow = 0.55;
        this.vx = this.facing * 2.8;
        window.soundEngine.playSwing(360);
        window.combatSystem.spawnComboText(this.x, this.y - 45, 'AXE HEEL DROP!', '#00ffcc');
      } else if (this.comboStep >= 3 || this.state === 'kick_axe') {
        // Hit 4: 360 TORNADO SPINNING GROUND KICK FINISHER!
        this.state = 'spin_kick';
        this.stateTimer = 0.22 * timingScale;
        this.comboStep = 0;
        this.comboInputWindow = 0;
        this.vx = this.facing * 3.6;
        window.soundEngine.playSwing(480);
        window.combatSystem.spawnComboText(this.x, this.y - 45, 'TORNADO CYCLONE!', '#05d9e8');
      } else {
        // Fallback Hit 1
        this.state = 'kick1';
        this.stateTimer = 0.12 * timingScale;
        this.comboStep = 1;
        this.comboInputWindow = 0.55;
        this.vx = this.facing * 1.8;
      }
    } else {
      // Hit 1: Snap Kick
      this.state = 'kick1';
      this.stateTimer = 0.12 * timingScale;
      this.comboStep = 1;
      this.comboInputWindow = 0.55;
      this.vx = this.facing * 1.8;
    }
  }

  // ==========================================
  // EXPANDED COMMAND NORMALS & DIRECTIONAL MOVES
  // ==========================================

  executeRisingDragonUppercut() {
    this.state = 'shoryu_uppercut';
    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);
    this.stateTimer = 0.28 * timingScale;
    this.vz = 4.4;
    this.z = 1;
    this.vx = this.facing * 1.8;
    this.hasHitCurrentAttack = false;
    this.comboStep = 0;
    this.comboInputWindow = 0;
    window.soundEngine.playSwing(460);
    window.combatSystem.spawnComboText(this.x, this.y - 45, 'RISING DRAGON!', '#ff2a6d');
  }

  executeFlashKick() {
    this.state = 'flash_kick';
    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);
    this.stateTimer = 0.26 * timingScale;
    this.vz = 4.2;
    this.z = 1;
    this.vx = this.facing * 1.4;
    this.hasHitCurrentAttack = false;
    this.comboStep = 0;
    this.comboInputWindow = 0;
    window.soundEngine.playSwing(480);
    window.combatSystem.spawnComboText(this.x, this.y - 45, 'FLASH KICK!', '#05d9e8');
  }

  executeLowSweep() {
    this.state = 'low_sweep';
    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);
    this.stateTimer = 0.20 * timingScale;
    this.vx = this.facing * 2.6;
    this.hasHitCurrentAttack = false;
    this.comboStep = 0;
    this.comboInputWindow = 0;
    window.soundEngine.playSwing(220);
    window.combatSystem.spawnComboText(this.x, this.y - 35, 'LOW SWEEP!', '#ffd700');
  }

  executeGroundPound() {
    this.state = 'ground_pound';
    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);
    this.stateTimer = 0.24 * timingScale;
    this.vx = 0;
    this.hasHitCurrentAttack = false;
    this.comboStep = 0;
    this.comboInputWindow = 0;
    window.soundEngine.playHit(true);
    window.combatSystem.spawnComboText(this.x, this.y - 35, 'GROUND SLAM!', '#ffd700');
    window.combatSystem.triggerScreenShake(3, 0.15);
  }

  executeLungePunch() {
    this.state = 'lunge_punch';
    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);
    this.stateTimer = 0.24 * timingScale;
    this.vx = this.facing * (this.characterId === 'smoro' ? 4.8 : 5.4);
    this.hasHitCurrentAttack = false;
    this.comboStep = 0;
    this.comboInputWindow = 0;
    window.soundEngine.playSwing(380);
    window.combatSystem.spawnComboText(this.x, this.y - 45, 'SUPER LUNGE!', '#00ffcc');
  }

  executeThrustKick() {
    this.state = 'thrust_kick';
    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);
    this.stateTimer = 0.22 * timingScale;
    this.vx = this.facing * (this.characterId === 'smoro' ? 4.0 : 4.4);
    this.hasHitCurrentAttack = false;
    this.comboStep = 0;
    this.comboInputWindow = 0;
    window.soundEngine.playSwing(350);
    window.combatSystem.spawnComboText(this.x, this.y - 45, 'SIDE THRUST!', '#ff2a6d');
  }

  executeBackStrike(type = 'punch') {
    this.state = 'back_strike';
    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);
    this.stateTimer = 0.18 * timingScale;
    this.vx = -this.facing * 1.5;
    this.hasHitCurrentAttack = false;
    this.comboStep = 0;
    this.comboInputWindow = 0;
    window.soundEngine.playSwing(280);
    window.combatSystem.spawnComboText(this.x, this.y - 45, 'REVERSE STRIKE!', '#ff00aa');
  }

  executeOneInchPunch() {
    this.state = 'one_inch_punch';
    const timingScale = this.characterId === 'lindin' ? 0.75 : (this.characterId === 'smoro' ? 1.2 : 0.95);
    this.stateTimer = 0.26 * timingScale;
    this.vx = this.facing * 4.2;
    this.hasHitCurrentAttack = false;
    this.comboStep = 0;
    this.comboInputWindow = 0;
    window.soundEngine.playSpecial();
    window.combatSystem.spawnComboText(this.x, this.y - 45, 'ONE-INCH BLAST!', '#ffd700');
    window.combatSystem.triggerScreenShake(4, 0.2);
  }

  executeAirHammer() {
    this.state = 'air_hammer';
    this.stateTimer = 0.35;
    this.hasHitCurrentAttack = false;
    this.vz = -4.2;
    this.vx = this.facing * 1.2;
    window.soundEngine.playSwing(360);
    window.combatSystem.spawnComboText(this.x, this.y - 45, 'HAMMER DROP!', '#ffd700');
  }

  executeAirSplit() {
    this.state = 'air_split';
    this.stateTimer = 0.35;
    this.hasHitCurrentAttack = false;
    this.vz = 0.8;
    this.vx = 0;
    window.soundEngine.playSwing(420);
    window.combatSystem.spawnComboText(this.x, this.y - 45, 'SPLIT KICK!', '#00ffcc');
  }

  executeFlyingKick() {
    this.state = 'jump_kick';
    this.stateTimer = 0.35;
    this.hasHitCurrentAttack = false;
    const speedBoost = this.characterId === 'lindin' ? 4.8 : (this.characterId === 'smoro' ? 3.6 : 4.2);
    this.vx = this.facing * speedBoost;
    this.vz = -0.5;
    window.soundEngine.playSwing(380);
  }

  executeAirSpin() {
    this.state = 'air_spin';
    this.stateTimer = 0.35;
    this.hasHitCurrentAttack = false;
    const speedBoost = this.characterId === 'lindin' ? 3.8 : (this.characterId === 'smoro' ? 2.6 : 3.2);
    this.vx = this.facing * speedBoost;
    window.soundEngine.playSwing(460);
  }

  executeSpecialMove() {
    this.state = 'special';
    this.stateTimer = this.characterId === 'smoro' ? 0.75 : 0.65;
    this.specialMeter -= 30;
    this.isInvulnerable = true;
    this.invulnTimer = 0.7;
    this.hasHitCurrentAttack = false;
    this.vx = 0;
    this.vy = 0;
    window.soundEngine.playSpecial();
  }

  // ==========================================
  // CAPTAIN FALCON MEGA PUNCH HOMAGE: "DRAGON KNUCKLE"
  // ==========================================
  executeMegaPunchWindup() {
    this.state = 'mega_punch_windup';
    this.stateTimer = 0.38; // Snappier windup charging!
    this.isInvulnerable = true; // Super armor through charging!
    this.invulnTimer = 0.85;
    this.hasHitCurrentAttack = false;
    this.megaPunchHitSet.clear();
    this.punchChargeTimer = 0;
    this.vx = -this.facing * 0.9; // Steps backward into deep crane stance
    this.vy = 0;
    window.soundEngine.playMegaPunchWindup();

    // Callout text during windup
    let shout = 'DRAAAAGOON...';
    let color = '#ffd700';
    if (this.characterId === 'lindin') {
      shout = 'VIIIPEEER...';
      color = '#05d9e8';
    } else if (this.characterId === 'smoro') {
      shout = 'TITAAAN...';
      color = '#ff4400';
    }
    window.combatSystem.spawnComboText(this.x, this.y - this.z - 52, shout, color);
    window.combatSystem.triggerScreenShake(3, 0.45);
  }

  executeMegaPunchStrike() {
    this.state = 'mega_punch_strike';
    this.stateTimer = 0.32;
    this.hasHitCurrentAttack = false;
    this.vx = this.facing * 8.6; // High velocity rocket blast!
    this.vy = 0;
    window.soundEngine.playMegaPunchRelease();
    window.combatSystem.triggerScreenShake(12, 0.45);

    // Callout text on punch release
    let banner = 'DRAGON KNUCKLE!!!';
    let color = '#ff4500';
    if (this.characterId === 'lindin') {
      banner = 'VIPER STRIKE!!!';
      color = '#05d9e8';
    } else if (this.characterId === 'smoro') {
      banner = 'TITAN SMASH!!!';
      color = '#ffd700';
    }
    window.combatSystem.spawnComboText(this.x + (this.facing * 35), this.y - this.z - 56, banner, color);
  }

  // Get current attack hitbox properties
  getAttackData() {
    // During mega punch strike, continue hitting all enemies in path (filtered by megaPunchHitSet)
    if (this.hasHitCurrentAttack && this.state !== 'mega_punch_strike') return null;

    // CAPTAIN FALCON MEGA PUNCH: DRAGON KNUCKLE
    if (this.state === 'mega_punch_strike') {
      return {
        xOffset: 16,
        width: 64, // Massive 64px flaming reach in front!
        damage: 65, // Massive mega damage!
        knockdown: true,
        launchX: 9.5, // Extreme launch velocity!
        launchZ: 5.5,
        isSpecial: true,
        isMegaPunch: true
      };
    }

    // Acrobatic & Expanded Moves Hitboxes
    if (this.state === 'front_flip') {
      return { xOffset: 12, width: 34, damage: 24, knockdown: true, launchX: 5.5, launchZ: 3.5 };
    } else if (this.state === 'backflip') {
      return { xOffset: -18, width: 30, damage: 18, knockdown: true, launchX: -4.0, launchZ: 3.0 };
    } else if (this.state === 'spin_kick') {
      return { xOffset: -26, width: 52, damage: 26, knockdown: true, launchX: 5.0, launchZ: 3.2 };
    } else if (this.state === 'air_spin') {
      return { xOffset: -26, width: 52, damage: 24, knockdown: true, launchX: 5.5, launchZ: 3.5 };
    } else if (this.state === 'shoryu_uppercut') {
      return { xOffset: 12, width: 32, damage: 28, knockdown: true, launchX: 3.5, launchZ: 6.5 };
    } else if (this.state === 'flash_kick') {
      return { xOffset: 12, width: 34, damage: 28, knockdown: true, launchX: 4.0, launchZ: 6.0 };
    } else if (this.state === 'low_sweep') {
      return { xOffset: 10, width: 38, damage: 16, knockdown: true, launchX: 2.5, launchZ: 2.0 };
    } else if (this.state === 'kick_axe') {
      return { xOffset: 14, width: 34, damage: 30, knockdown: true, launchX: 5.0, launchZ: 4.5 };
    } else if (this.state === 'punch_gut') {
      return { xOffset: 10, width: 28, damage: 16, knockdown: false, launchX: 3.2, launchZ: 1.4 };
    } else if (this.state === 'punch_elbow') {
      return { xOffset: 12, width: 30, damage: 20, knockdown: false, launchX: 3.8, launchZ: 1.6 };
    } else if (this.state === 'one_inch_punch') {
      return { xOffset: 14, width: 38, damage: 36, knockdown: true, launchX: 7.2, launchZ: 4.5 };
    } else if (this.state === 'lunge_punch') {
      return { xOffset: 16, width: 40, damage: 26, knockdown: true, launchX: 6.5, launchZ: 3.2 };
    } else if (this.state === 'thrust_kick') {
      return { xOffset: 16, width: 38, damage: 26, knockdown: true, launchX: 6.8, launchZ: 3.4 };
    } else if (this.state === 'back_strike') {
      return { xOffset: -20, width: 34, damage: 20, knockdown: true, launchX: -4.5, launchZ: 2.8 };
    } else if (this.state === 'ground_pound') {
      return { xOffset: 10, width: 36, damage: 24, knockdown: true, launchX: 4.0, launchZ: 3.2 };
    } else if (this.state === 'air_hammer') {
      return { xOffset: 10, width: 32, damage: 26, knockdown: true, launchX: 3.5, launchZ: -3.0 };
    } else if (this.state === 'air_split') {
      return { xOffset: -26, width: 52, damage: 22, knockdown: true, launchX: 5.0, launchZ: 3.2 };
    } else if (this.state === 'nunchaku_attack') {
      return { xOffset: 16, width: 36, damage: 20, knockdown: false, launchX: 3.8, launchZ: 1.6, weaponType: 'nunchaku' };
    } else if (this.state === 'dagger_attack') {
      return { xOffset: 14, width: 32, damage: 18, knockdown: false, launchX: 3.2, launchZ: 1.4, weaponType: 'daggers' };
    } else if (this.state === 'pipe_attack') {
      return { xOffset: 18, width: 42, damage: 30, knockdown: true, launchX: 6.5, launchZ: 4.2, weaponType: 'pipe' };
    } else if (this.state === 'pistol_shot1') {
      return { xOffset: 24, width: 48, damage: 16, knockdown: false, launchX: 2.8, launchZ: 1.2, weaponType: 'pistols' };
    } else if (this.state === 'pistol_shot2') {
      return { xOffset: 26, width: 50, damage: 18, knockdown: false, launchX: 3.2, launchZ: 1.4, weaponType: 'pistols' };
    } else if (this.state === 'pistol_whip') {
      return { xOffset: 16, width: 34, damage: 22, knockdown: false, launchX: 4.0, launchZ: 1.8, weaponType: 'pistols' };
    } else if (this.state === 'pistol_crossfire') {
      return { xOffset: 28, width: 60, damage: 32, knockdown: true, launchX: 7.0, launchZ: 4.5, weaponType: 'pistols' };
    } else if (this.state === 'air_pistol') {
      return { xOffset: 20, width: 48, damage: 24, knockdown: true, launchX: 4.5, launchZ: -3.0, weaponType: 'pistols' };
    }

    if (this.characterId === 'lindin') {
      if (this.state === 'punch1') {
        return { xOffset: 8, width: 22, damage: 6, knockdown: false, launchX: 2, launchZ: 1 };
      } else if (this.state === 'punch2') {
        return { xOffset: 10, width: 24, damage: 9, knockdown: false, launchX: 2.5, launchZ: 1.2 };
      } else if (this.state === 'punch3') {
        return { xOffset: 12, width: 30, damage: 18, knockdown: true, launchX: 5.0, launchZ: 3.5 };
      } else if (this.state === 'kick1') {
        return { xOffset: 10, width: 26, damage: 10, knockdown: false, launchX: 2.8, launchZ: 1.2 };
      } else if (this.state === 'kick2') {
        return { xOffset: 12, width: 28, damage: 16, knockdown: true, launchX: 4.8, launchZ: 3.2 };
      } else if (this.state === 'jump_kick') {
        return { xOffset: 12, width: 30, damage: 22, knockdown: true, launchX: 5.5, launchZ: 3.5 };
      } else if (this.state === 'special') {
        return { xOffset: -24, width: 48, damage: 32, knockdown: true, launchX: 6.0, launchZ: 4.2, isSpecial: true };
      }
    } else if (this.characterId === 'smoro') {
      if (this.state === 'punch1') {
        return { xOffset: 10, width: 26, damage: 14, knockdown: false, launchX: 3, launchZ: 1.5 };
      } else if (this.state === 'punch2') {
        return { xOffset: 12, width: 28, damage: 20, knockdown: false, launchX: 3.5, launchZ: 1.8 };
      } else if (this.state === 'punch3') {
        return { xOffset: 14, width: 36, damage: 38, knockdown: true, launchX: 7.5, launchZ: 5.0 };
      } else if (this.state === 'kick1') {
        return { xOffset: 12, width: 30, damage: 18, knockdown: false, launchX: 4.0, launchZ: 2.0 };
      } else if (this.state === 'kick2') {
        return { xOffset: 14, width: 32, damage: 28, knockdown: true, launchX: 6.0, launchZ: 4.0 };
      } else if (this.state === 'jump_kick') {
        return { xOffset: 14, width: 36, damage: 34, knockdown: true, launchX: 7.0, launchZ: 4.5 };
      } else if (this.state === 'special') {
        return { xOffset: -32, width: 64, damage: 50, knockdown: true, launchX: 7.5, launchZ: 5.0, isSpecial: true };
      }
    } else {
      // Smellu (Balanced)
      if (this.state === 'punch1') {
        return { xOffset: 8, width: 24, damage: 8, knockdown: false, launchX: 2, launchZ: 1 };
      } else if (this.state === 'punch2') {
        return { xOffset: 10, width: 26, damage: 12, knockdown: false, launchX: 3, launchZ: 1.5 };
      } else if (this.state === 'punch3') {
        return { xOffset: 12, width: 32, damage: 24, knockdown: true, launchX: 5.5, launchZ: 4 };
      } else if (this.state === 'kick1') {
        return { xOffset: 10, width: 28, damage: 12, knockdown: false, launchX: 3, launchZ: 1.5 };
      } else if (this.state === 'kick2') {
        return { xOffset: 12, width: 30, damage: 20, knockdown: true, launchX: 5, launchZ: 3.5 };
      } else if (this.state === 'jump_kick') {
        return { xOffset: 12, width: 32, damage: 26, knockdown: true, launchX: 6, launchZ: 3.8 };
      } else if (this.state === 'special') {
        return { xOffset: -24, width: 48, damage: 35, knockdown: true, launchX: 6.5, launchZ: 4.5, isSpecial: true };
      }
    }

    return null;
  }

  draw(ctx) {
    ctx.save();
    // Non-flashing translucent invulnerability display (steady and easy on the eyes)
    if (this.isInvulnerable) {
      ctx.globalAlpha = 0.65;
    }

    // Shadow
    const shadowWidth = this.characterId === 'smoro' ? 38 : (this.characterId === 'lindin' ? 26 : 30);
    window.spriteRenderer.drawShadow(ctx, this.x, this.y, shadowWidth, 10, this.z);

    // Player Sprite
    ctx.translate(this.x, this.y - this.z);
    window.spriteRenderer.drawPlayer(ctx, this.state, this.animTime, this.facing, this.characterId, this.weapon);
    ctx.restore();
  }
}

// ==========================================
// AI COMPANION (CO-OP FIGHTING PARTNER)
// ==========================================
class AICompanion extends Player {
  constructor(x, y, characterId = 'lindin', tactics = 'balanced') {
    super(x, y, characterId);
    this.isAI = true;
    this.name = `[AI] ${this.name}`;
    this.tactics = tactics || (window.game ? window.game.companionTactics : 'balanced') || 'balanced';
    this.targetEnemy = null;
    this.tacticTimer = 0;
    this.reviveTimer = 0;
    this.attackIntent = null;
    this.dodgeCooldown = 0;
    this.attackCooldown = 0.2 + Math.random() * 0.25; // Human-like reaction & attack cadence
  }

  takeDamage(amount, fromFacing, knockdown = false, launchX = 4, launchZ = 3) {
    // If reviving, immune to damage
    if (this.reviveTimer > 0) return;

    // Reset punch charge on taking damage
    this.punchChargeTimer = 0;

    // Companion takes scaled damage based on difficulty
    const diff = (window.game && window.game.getDifficultyModifiers) ? window.game.getDifficultyModifiers() : { playerDamageTakenMult: 1 };
    const scaledAmount = Math.max(1, Math.round(amount * diff.playerDamageTakenMult));

    // Corner Trap / Multi-Hit Wall Pin Breaker:
    const stage = (typeof window !== 'undefined' && window.game) ? window.game.stage : null;
    const isNearWall = stage && (this.x <= stage.cameraX + 28 || this.x >= stage.cameraX + 452);
    if (this.state === 'hurt' || (isNearWall && !knockdown)) {
      knockdown = true;
      launchX = 2.5;
      launchZ = 2.8;
    }

    super.takeDamage(scaledAmount, fromFacing, knockdown, launchX, launchZ);

    // If health drops to 0, start Revive Timer instead of permanent death
    if (this.health <= 0 && this.reviveTimer <= 0) {
      this.reviveTimer = 6.0; // 6 seconds recovery timer
      this.isDead = true;
      this.state = 'knockdown';
      window.combatSystem.spawnComboText(this.x, this.y - 45, 'REVIVING IN 6s...', '#ffd700');
      if (window.gameLogger) {
        window.gameLogger.log('COMPANION', 'Companion health reached 0 - Reviving in 6.0s');
      }
    }
  }

  // Autonomous companion physics & lifecycle update (does not listen to human player's keyboard/gamepad)
  update(dt, stage) {
    this.animTime += dt;
    this.stateTimer -= dt;
    this.comboInputWindow -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Passive Ki Regen
    if (this.specialMeter < this.maxSpecial) {
      const regenRate = this.characterId === 'lindin' ? 5.5 : (this.characterId === 'smoro' ? 3.0 : 4.0);
      this.specialMeter = Math.min(this.maxSpecial, this.specialMeter + dt * regenRate);
    }

    // Invulnerability timer
    if (this.isInvulnerable) {
      this.invulnTimer -= dt;
      if (this.invulnTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // Recover from hurt or knockdown
    if (this.state === 'hurt' && this.stateTimer <= 0) {
      this.state = 'idle';
      const isAtWall = stage && (this.x <= stage.cameraX + 26 || this.x >= stage.cameraX + 454);
      if (isAtWall) {
        this.isInvulnerable = true;
        this.invulnTimer = 0.45;
      }
    } else if (this.state === 'knockdown') {
      if (this.z === 0 && this.stateTimer <= 0) {
        this.state = 'idle';
        this.isInvulnerable = true;
        this.invulnTimer = 1.2;
        if (stage) {
          const leftWall = stage.cameraX + 20;
          const rightWall = stage.cameraX + 460;
          if (this.x <= leftWall + 6) this.x = leftWall + 10;
          if (this.x >= rightWall - 6) this.x = rightWall - 10;
        }
      }
    }

    // Handle Active Attacks Completion (Unarmed & Weapons)
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
    if (activeAttacks.includes(this.state)) {
      if (this.stateTimer <= 0) {
        this.state = 'idle';
      }
    }

    // Handle Mega Punch State Transitions (Dragon Knuckle)
    if (this.state === 'mega_punch_windup') {
      if (this.stateTimer <= 0) {
        this.executeMegaPunchStrike();
      }
    } else if (this.state === 'mega_punch_strike') {
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.vx = 0;
      }
    }

    this.updatePhysics(dt);

    // Keep AI Companion in stage bounds with wall collision
    if (stage) {
      this.handleWallCollision(stage);
      this.y = Math.max(stage.minY, Math.min(stage.maxY, this.y));
    }
  }

  updateAI(dt, enemies, player, stage) {
    // 1. Handle KO / Revive Recovery State
    if (this.reviveTimer > 0) {
      this.reviveTimer -= dt;
      if (this.reviveTimer <= 0) {
        // Leaps back into the fight!
        this.health = this.maxHealth;
        this.isDead = false;
        this.state = 'jump_kick';
        this.z = 24;
        this.vz = 3.5;
        this.isInvulnerable = true;
        this.invulnTimer = 2.5;
        this.x = Math.max(stage.cameraX + 20, Math.min(stage.cameraX + 460, player.x - (player.facing * 35)));
        this.y = player.y;
        window.soundEngine.playSwing(450);
        window.combatSystem.spawnComboText(this.x, this.y - 50, 'BACK IN ACTION!', '#00ff66');
        if (window.gameLogger) {
          window.gameLogger.log('COMPANION', 'Companion revived and re-entered the fight!');
        }
      }
      return;
    }

    if (this.isDead || this.state === 'knockdown' || this.state === 'hurt') {
      return;
    }

    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    this.tacticTimer -= dt;

    // Filter active living enemies
    const activeEnemies = enemies.filter(e => !e.isDead);

    // 2. Select High-Value Target based on Tactics
    if (this.tacticTimer <= 0 || !this.targetEnemy || this.targetEnemy.isDead) {
      this.tacticTimer = 0.35 + Math.random() * 0.25;

      if (this.tactics === 'protector') {
        // Bodyguard mode: target whoever is closest to player
        let closestThreat = null;
        let minPDist = 130;
        for (const e of activeEnemies) {
          const pDist = Math.hypot(e.x - player.x, e.y - player.y);
          if (pDist < minPDist) {
            minPDist = pDist;
            closestThreat = e;
          }
        }
        this.targetEnemy = closestThreat || activeEnemies[0] || null;
      } else if (this.tactics === 'aggressive') {
        // Blitzkrieg mode: hunt bosses first, otherwise nearest enemy
        const boss = activeEnemies.find(e => e.isBoss);
        if (boss) {
          this.targetEnemy = boss;
        } else {
          let closest = null;
          let minDist = Infinity;
          for (const e of activeEnemies) {
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist < minDist) {
              minDist = dist;
              closest = e;
            }
          }
          this.targetEnemy = closest;
        }
      } else {
        // Balanced (default): Protect player if mobbed, otherwise flank
        let threatToPlayer = null;
        let minPlayerDist = 75;
        for (const e of activeEnemies) {
          const pDist = Math.hypot(e.x - player.x, e.y - player.y);
          if (pDist < minPlayerDist) {
            minPlayerDist = pDist;
            threatToPlayer = e;
          }
        }

        if (threatToPlayer) {
          this.targetEnemy = threatToPlayer;
        } else {
          let closest = null;
          let minDist = Infinity;
          for (const e of activeEnemies) {
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist < minDist) {
              minDist = dist;
              closest = e;
            }
          }
          this.targetEnemy = closest;
        }
      }
    }

    // 3. Companion Movement & Tactics
    const target = this.targetEnemy;
    const canAct = (this.state === 'idle' || this.state === 'walk') && this.z === 0;

    if (!target) {
      // No active enemies: stay in formation with player
      const idealX = player.x - (player.facing * 44);
      const idealY = player.y + 8;
      const dx = idealX - this.x;
      const dy = idealY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 28 && canAct) {
        this.state = 'walk';
        this.facing = dx >= 0 ? 1 : -1;
        const speedBoost = dist > 120 ? 1.45 : 1.15;
        this.vx = Math.sign(dx) * (this.speed * speedBoost);
        this.vy = Math.sign(dy) * (this.speed * 0.8);
      } else if (canAct) {
        this.state = 'idle';
        this.vx = 0;
        this.vy = 0;
        // Watch the rear perimeter rather than mirroring player's exact facing!
        this.facing = -player.facing;
      }
      return;
    }

    // Co-Op Pincer Attack Positioning: Companion always flanks the target from the opposite side of the human player!
    const playerSide = (player.x <= target.x) ? -1 : 1; // -1 = player is on left, 1 = player is on right
    const companionSide = -playerSide; // Companion takes opposite flank
    const desiredTargetX = target.x + (companionSide * (target.isBoss ? 36 : 28));
    const desiredTargetY = target.y + (player.y >= target.y ? -12 : 12);

    const dx = desiredTargetX - this.x;
    const dy = desiredTargetY - this.y;
    const absX = Math.abs(target.x - this.x);
    const absY = Math.abs(target.y - this.y);

    if (canAct) {
      // 4. Combat Decisions
      // Check if surrounded by 2+ enemies within 42px
      const closeEnemies = activeEnemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) < 42);

      if (closeEnemies.length >= 2) {
        // Use Dragon Special if Ki available
        if (this.specialMeter >= 30) {
          this.executeSpecialMove();
          return;
        } else if (this.dodgeCooldown <= 0) {
          // Front Flip or Evasive Backflip out of danger!
          this.dodgeCooldown = 2.2;
          this.state = Math.random() < 0.5 ? 'front_flip' : 'backflip';
          this.z = 1;
          this.vz = 4.8;
          this.vx = (this.state === 'front_flip' ? this.facing : -this.facing) * (this.speed * 1.8);
          this.hasHitCurrentAttack = false;
          window.soundEngine.playSwing(420);
          return;
        }
      }

      // In Melee Strike Range!
      if (absX <= 36 && absY <= 14) {
        this.facing = target.x >= this.x ? 1 : -1;
        this.vx = 0;
        this.vy = 0;

        // Respect attack cadence delay so AI doesn't fire synchronously on the exact same frame as the player
        if (this.attackCooldown > 0) {
          this.state = 'idle';
          return;
        }

        // Set cooldown for next attack flurry based on combat tactics
        const baseCooldown = (this.tactics === 'aggressive') ? 0.16 : ((this.tactics === 'protector') ? 0.38 : 0.26);
        this.attackCooldown = baseCooldown + Math.random() * 0.22;

        // Anti-Mirror Protocol: Detect what the player is doing to ensure move variety
        const playerIsPunching = player.state.startsWith('punch') || player.state === 'lunge_punch';
        const playerIsKicking = player.state.startsWith('kick') || player.state === 'thrust_kick' || player.state === 'spin_kick';
        const playerIsMega = player.state.startsWith('mega_punch');

        // Never double-cast Mega Punch synchronously with player
        if (!playerIsMega && (target.isBoss || target.health > 80 || Math.random() < 0.08) && this.stateTimer <= 0 && this.state !== 'mega_punch_windup') {
          this.executeMegaPunchWindup();
          return;
        }

        // If companion wields an equipped weapon, prioritize weapon attack!
        if (this.weapon) {
          this.executePunch();
          return;
        }

        // Consult AI Reinforcement Learning Engine for optimal learned action & record move
        if (typeof window !== 'undefined' && window.aiLearningEngine) {
          const decision = window.aiLearningEngine.selectBestAction(this, target, activeEnemies);
          window.aiLearningEngine.executeLearnedAction(this, decision.action, target);
          return;
        }

        // Asymmetric Character-Specific Profiles & Anti-Mirror moves fallback

        if (this.characterId === 'lindin') {
          // LINDIN (Agile Viper): Specializes in high kicks, flash kick launchers, sweeps & daggers
          if (playerIsPunching || roll < 0.45) {
            this.executeKick();
          } else if (roll < 0.68) {
            this.executeFlashKick();
          } else if (roll < 0.85) {
            this.executeLowSweep();
          } else {
            this.executePunch();
          }
        } else if (this.characterId === 'smoro') {
          // SMORO (Titan Bull): Specializes in heavy gut hooks, ground shockwaves & pipe smashes
          if (playerIsKicking || roll < 0.45) {
            this.executePunch();
          } else if (roll < 0.70) {
            this.executeGroundPound();
          } else if (roll < 0.85) {
            this.executeLungePunch();
          } else {
            this.executeKick();
          }
        } else {
          // SMELLU (Balanced Dragon): Shoryu uppercuts, 5-hit punch rushes & one-inch blasts
          if (playerIsPunching) {
            if (roll < 0.5) this.executeKick();
            else this.executeFlashKick();
          } else if (playerIsKicking) {
            if (roll < 0.5) this.executeRisingDragonUppercut();
            else this.executePunch();
          } else {
            if (roll < 0.28) this.executeRisingDragonUppercut();
            else if (roll < 0.52) this.executePunch();
            else if (roll < 0.76) this.executeKick();
            else this.executeOneInchPunch();
          }
        }
      } else {
        // Move towards target in 2.5D plane
        this.state = 'walk';
        this.facing = target.x >= this.x ? 1 : -1;
        this.vx = Math.sign(dx) * (this.speed * 1.25);
        this.vy = Math.sign(dy) * (this.speed * 0.85);

        // Gap-closing Lunges & Thrust Kicks from mid-range!
        if (absX > 60 && absX < 110 && Math.random() < 0.08 && this.z === 0) {
          if (Math.random() < 0.5) this.executeLungePunch();
          else this.executeThrustKick();
          return;
        }

        // Occasional acrobatic leap to close gap!
        if (absX > 80 && absX < 140 && Math.random() < 0.05 && this.z === 0) {
          this.state = 'front_flip';
          this.z = 1;
          this.vz = 4.6;
          this.vx = this.facing * (this.speed * 2.0);
          this.hasHitCurrentAttack = false;
          window.soundEngine.playSwing(400);
        }
      }
    } else if (this.z > 0 && !['knockdown', 'jump_kick', 'air_spin', 'air_hammer', 'air_split', 'air_pistol', 'flying_kick', 'front_flip', 'backflip', 'shoryu_uppercut', 'flash_kick'].includes(this.state)) {
      // Airborne strike variations!
      if (absX < 45) {
        const aRoll = Math.random();
        if (aRoll < 0.35) this.executeFlyingKick();
        else if (aRoll < 0.70) this.executeAirSpin();
        else this.executeAirHammer();
      }
    }
  }

  draw(ctx) {
    if (this.reviveTimer > 0) {
      // Render flashing downed companion with countdown
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.font = '6px "Press Start 2P"';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.fillText(`REVIVE IN ${Math.ceil(this.reviveTimer)}s`, 0, -32);
      ctx.restore();
      super.draw(ctx);
      return;
    }

    super.draw(ctx);

    // Glowing 2P [AI] indicator above head
    ctx.save();
    ctx.translate(this.x, this.y - this.z);
    ctx.font = '5px "Press Start 2P"';
    ctx.fillStyle = '#05d9e8';
    ctx.textAlign = 'center';
    ctx.fillText('2P [AI]', 0, -52);
    ctx.restore();
  }
}

window.AICompanion = AICompanion;

// ==========================================
// ENEMY BASE & SPECIALIZED ARCHETYPES
// ==========================================
class Enemy extends Fighter {
  constructor(x, y, type = 'thug', bossType = 'master_shen') {
    super(x, y);
    this.type = type; // 'thug', 'ninja', 'bruiser', 'ronin', 'kicker', 'assassin', 'club_giant', 'boss'
    this.bossType = bossType;
    this.facing = -1;
    this.attackCooldown = 0.5 + Math.random() * 1.5;
    this.hasHitCurrentAttack = false;
    this.laughTimer = 0;

    if (type === 'thug') {
      this.health = 45;
      this.maxHealth = 45;
      this.speed = 1.3;
      this.scoreValue = 200;
    } else if (type === 'ninja') {
      this.health = 55;
      this.maxHealth = 55;
      this.speed = 2.1;
      this.scoreValue = 350;
    } else if (type === 'bruiser') {
      this.health = 110;
      this.maxHealth = 110;
      this.speed = 1.0;
      this.scoreValue = 600;
      this.width = 30;
    } else if (type === 'ronin') {
      this.health = 75;
      this.maxHealth = 75;
      this.speed = 1.7;
      this.scoreValue = 450;
      this.width = 28;
    } else if (type === 'kicker') {
      this.health = 60;
      this.maxHealth = 60;
      this.speed = 2.3;
      this.scoreValue = 400;
      this.width = 26;
    } else if (type === 'assassin') {
      this.health = 55;
      this.maxHealth = 55;
      this.speed = 2.5;
      this.scoreValue = 500;
      this.width = 26;
    } else if (type === 'club_giant') {
      this.health = 160;
      this.maxHealth = 160;
      this.speed = 0.95;
      this.scoreValue = 900;
      this.width = 36;
      this.hasSuperArmor = true;
    } else if (type === 'zombie') {
      this.health = 75;
      this.maxHealth = 75;
      this.speed = 1.05;
      this.scoreValue = 450;
      this.width = 28;
      this.isZombie = true;
      this.attackSubtype = 'claw';
    } else if (type === 'boss' || type === 'master_shen' || type === 'oni' || type === 'iron_fang' || type === 'kuroda' || bossType === 'oni' || bossType === 'iron_fang' || bossType === 'kuroda') {
      this.isBoss = true;
      this.isEnraged = false;
      this.width = 34;

      const rawType = (type !== 'boss' ? type : bossType);
      this.bossType = (rawType === 'oni') ? 'iron_fang' : rawType;

      if (this.bossType === 'iron_fang') {
        this.bossName = 'IRON FANG ONI';
        this.health = 420;
        this.maxHealth = 420;
        this.speed = 1.9;
        this.scoreValue = 7500;
      } else if (this.bossType === 'kuroda') {
        this.bossName = 'GRANDMASTER KURODA (DRAGON LORD)';
        this.health = 550;
        this.maxHealth = 550;
        this.speed = 2.2;
        this.scoreValue = 15000;
      } else {
        this.bossType = 'master_shen';
        this.bossName = 'MASTER SHEN (SHADOW TIGER)';
        this.health = 320;
        this.maxHealth = 320;
        this.speed = 1.6;
        this.scoreValue = 5000;
      }
    }

    // Random enemies spawn wielding weapons! (32% chance)
    if (!this.isBoss && Math.random() < 0.32) {
      if (this.type === 'ninja' || this.type === 'assassin') {
        this.weapon = { type: Math.random() < 0.5 ? 'daggers' : 'pistols', hits: 15 };
      } else if (this.type === 'ronin') {
        this.weapon = { type: Math.random() < 0.5 ? 'pipe' : 'daggers', hits: 15 };
      } else if (this.type === 'bruiser') {
        this.weapon = { type: 'pipe', hits: 15 };
      } else if (this.type === 'zombie') {
        this.weapon = { type: Math.random() < 0.5 ? 'pipe' : 'pistols', hits: 15 };
      } else {
        const pool = ['nunchaku', 'daggers', 'pipe', 'pistols'];
        this.weapon = { type: pool[Math.floor(Math.random() * pool.length)], hits: 15 };
      }
    }

    // Apply Difficulty Scaling
    const diff = (window.game && window.game.getDifficultyModifiers) ? window.game.getDifficultyModifiers() : { enemyHealthMult: 1, enemyAttackCooldownMult: 1 };
    this.health = Math.round(this.health * diff.enemyHealthMult);
    this.maxHealth = this.health;
    this.attackCooldown *= diff.enemyAttackCooldownMult;

    // Apply Score Speed Scaling (+0.5% per 100 score) on initial cooldown
    const initialScoreMult = this.getScoreSpeedMultiplier();
    this.attackCooldown /= initialScoreMult;
  }

  getScoreSpeedMultiplier(target) {
    let score = 0;
    if (target && !target.isAI && typeof target.score === 'number') {
      score = target.score;
    } else if (typeof window !== 'undefined' && window.game && window.game.player && typeof window.game.player.score === 'number') {
      score = window.game.player.score;
    } else if (target && typeof target.score === 'number') {
      score = target.score;
    }

    // Dynamic fighting speed scaling: +0.5% (0.005) increase per 100 score points
    // e.g. 1000 score => +5.0% (1.05x), 10000 score => +50% (1.50x), 20000 score => +100% (2.00x)
    const multiplier = 1 + (Math.max(0, score) / 100) * 0.005;
    // Cap at 3.5x (+250% speed) for gameplay integrity
    return Math.min(3.5, multiplier);
  }

  takeDamage(amount, fromFacing, knockdown = false, launchX = 4, launchZ = 3) {
    // Scaled player damage dealt by difficulty
    const diff = (window.game && window.game.getDifficultyModifiers) ? window.game.getDifficultyModifiers() : { playerDamageDealtMult: 1 };
    const scaledAmount = Math.max(1, Math.round(amount * diff.playerDamageDealtMult));
    super.takeDamage(scaledAmount, fromFacing, knockdown, launchX, launchZ);
  }

  update(dt, player, stage) {
    const scoreMult = this.getScoreSpeedMultiplier(player);
    this.currentScoreSpeedMult = scoreMult;

    // Fighting animation cycles scale with fighting speed
    this.animTime += dt * ((this.state === 'walk' || this.state === 'attack') ? Math.min(2.0, scoreMult) : 1);
    this.stateTimer -= dt;
    this.attackCooldown -= dt;
    if (this.laughTimer > 0) this.laughTimer -= dt;

    if (this.isDead) {
      if (this.z === 0) {
        this.vx = 0;
        this.state = 'knockdown';
      }
      this.updatePhysics(dt);
      return;
    }

    // Recover from hurt or knockdown
    if (this.state === 'hurt' && this.stateTimer <= 0) {
      this.state = 'idle';
    } else if (this.state === 'knockdown') {
      if (this.z === 0 && this.stateTimer <= 0) {
        this.state = 'idle';
        this.isInvulnerable = true;
        this.invulnTimer = 0.8;
      }
    } else if (this.state === 'attack' && this.stateTimer <= 0) {
      this.state = 'idle';
    }

    if (this.state === 'idle' || this.state === 'walk') {
      this.updateAI(dt, player, stage);
    }

    this.updatePhysics(dt);

    // Keep within reasonable stage boundaries with wall collision
    if (stage) {
      this.handleWallCollision(stage);
      this.y = Math.max(stage.minY, Math.min(stage.maxY, this.y));
    }
  }

  updateAI(dt, player, stage) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.facing = dx >= 0 ? 1 : -1;

    // Boss Enrage logic with 8-bit villain laugh!
    if (this.isBoss && this.health <= this.maxHealth * 0.45 && !this.isEnraged) {
      this.isEnraged = true;
      this.speed *= 1.35;
      this.laughTimer = 1.5;
      window.soundEngine.playBossIntro();
      window.soundEngine.playBossLaugh(this.bossType);
      window.combatSystem.triggerScreenShake(7, 0.4);
      window.combatSystem.spawnComboText(this.x, this.y - this.z - 52, 'MWAHAHAHA!', '#ff0055');
    }

    // Distance threshold for attacking
    let attackRangeX = 28;
    if (this.type === 'bruiser') attackRangeX = 36;
    else if (this.type === 'ronin') attackRangeX = 44; // Long Katana reach
    else if (this.type === 'kicker') attackRangeX = 34; // Flying Kick distance
    else if (this.type === 'assassin') attackRangeX = 30; // Twin Dagger range
    else if (this.type === 'club_giant') attackRangeX = 48; // Huge Spiked Club smash radius
    else if (this.type === 'zombie') attackRangeX = 32; // Zombie reach
    else if (this.isBoss || this.type === 'boss') attackRangeX = 36;
    const attackRangeY = 14;

    if (Math.abs(dx) <= attackRangeX && Math.abs(dy) <= attackRangeY) {
      // In strike range!
      this.vx = 0;
      this.vy = 0;
      if (this.attackCooldown <= 0) {
        this.executeAttack(player);
      } else {
        this.state = 'idle';
      }
    } else {
      // Approach player on 2.5D belt-scroll plane
      this.state = 'walk';
      
      // Smart belt-scroll flanking: Grunts align on Y, Ninjas & Kickers circle, Assassins zig-zag, Zombies shamble & lurch
      let targetY = player.y;
      if (this.type === 'ninja') {
        targetY = player.y + (Math.sin(this.animTime * 3) * 20);
      } else if (this.type === 'kicker') {
        targetY = player.y + (Math.cos(this.animTime * 3.5) * 18);
      } else if (this.type === 'assassin') {
        targetY = player.y + (Math.sin(this.animTime * 4.8) * 24);
      } else if (this.type === 'zombie') {
        targetY = player.y + (Math.sin(this.animTime * 2.2) * 16);
        // Eerie random zombie groans
        if (Math.random() < 0.005 && !this.isDead) {
          window.soundEngine.playZombieGroan();
        }
      }

      const moveX = Math.sign(dx);
      const moveY = Math.sign(targetY - this.y);

      // Dynamically scale movement speed based on player score (+0.5% per 100 score)
      const scoreMult = this.getScoreSpeedMultiplier(player);
      const effectiveSpeed = this.speed * scoreMult;
      this.vx = moveX * effectiveSpeed;
      this.vy = moveY * (effectiveSpeed * 0.7);
    }
  }

  executeAttack(player) {
    this.state = 'attack';
    this.hasHitCurrentAttack = false;

    // Attack cooldown scales inversely with score speed multiplier (+0.5% faster per 100 score)
    const scoreMult = this.getScoreSpeedMultiplier(player);
    const baseCooldown = 1.0 + Math.random() * 1.2;
    this.attackCooldown = Math.max(0.20, baseCooldown / scoreMult);

    const diff = (window.game && window.game.getDifficultyModifiers) ? window.game.getDifficultyModifiers() : { enemyAttackCooldownMult: 1 };
    this.attackCooldown *= diff.enemyAttackCooldownMult;

    // Attack strike execution animation duration scales with score speed
    const animMult = Math.min(2.0, Math.sqrt(scoreMult));

    // If enemy wields a weapon, perform armed attack!
    if (this.weapon) {
      if (this.weapon.type === 'pistols') {
        this.stateTimer = 0.32 / animMult;
        window.soundEngine.playGunshot();
        window.combatSystem.spawnGunShotEffects(this.x, this.y - 24, this.y, this.facing, false);
        return;
      } else if (this.weapon.type === 'nunchaku') {
        this.stateTimer = 0.30 / animMult;
        this.vx = this.facing * 2.5 * animMult;
        window.soundEngine.playNunchaku();
        return;
      } else if (this.weapon.type === 'daggers') {
        this.stateTimer = 0.28 / animMult;
        this.vx = this.facing * 3.2 * animMult;
        window.soundEngine.playSlash();
        return;
      } else if (this.weapon.type === 'pipe') {
        this.stateTimer = 0.45 / animMult;
        this.vx = this.facing * 2.2 * animMult;
        window.soundEngine.playHit(true);
        return;
      }
    }

    if (this.type === 'thug') {
      this.stateTimer = 0.35 / animMult;
      window.soundEngine.playSwing(240);
    } else if (this.type === 'ninja') {
      this.stateTimer = 0.28 / animMult;
      this.vx = this.facing * 3.0 * animMult; // Ninja flying slash
      window.soundEngine.playSwing(340);
    } else if (this.type === 'bruiser') {
      this.stateTimer = 0.50 / animMult;
      this.vx = this.facing * 2.2 * animMult; // Bruiser charge
      window.soundEngine.playSwing(170);
    } else if (this.type === 'ronin') {
      this.stateTimer = 0.40 / animMult;
      this.vx = this.facing * 3.6 * animMult; // Ronin Iaijutsu dash slash
      window.soundEngine.playSwing(380);
    } else if (this.type === 'kicker') {
      this.stateTimer = 0.36 / animMult;
      this.z = 1;
      this.vz = 3.6; // Airborne leap
      this.vx = this.facing * 4.0 * animMult; // Flying spin kick
      window.soundEngine.playSwing(450);
    } else if (this.type === 'assassin') {
      this.stateTimer = 0.32 / animMult;
      this.vx = this.facing * 3.8 * animMult; // Fast twin-dagger cross lunge
      window.soundEngine.playSwing(420);
    } else if (this.type === 'club_giant') {
      this.stateTimer = 0.58 / animMult;
      this.vx = this.facing * 1.6 * animMult; // Slow heavy overhead smash
      window.soundEngine.playSwing(130);
      window.combatSystem.triggerScreenShake(4, 0.25);
    } else if (this.type === 'zombie') {
      const isBite = Math.random() < 0.45;
      this.attackSubtype = isBite ? 'bite' : 'claw';
      if (isBite) {
        this.stateTimer = 0.36 / animMult;
        this.vx = this.facing * 3.4 * animMult; // Leaping zombie chomp
        window.soundEngine.playZombieBite();
      } else {
        this.stateTimer = 0.30 / animMult;
        this.vx = this.facing * 2.2 * animMult; // Decaying double claw swipe
        window.soundEngine.playSwing(220);
      }
    } else if (this.isBoss || this.type === 'boss') {
      this.stateTimer = 0.42 / animMult;
      this.vx = this.facing * 3.5 * animMult;
      window.soundEngine.playSwing(310);
    }
  }

  getAttackData() {
    if (this.hasHitCurrentAttack || this.state !== 'attack') return null;

    if (this.weapon) {
      if (this.weapon.type === 'pistols') {
        return { xOffset: 24, width: 52, damage: 16, knockdown: false, launchX: 3.0, launchZ: 1.2, weaponType: 'pistols' };
      } else if (this.weapon.type === 'daggers') {
        return { xOffset: 16, width: 34, damage: 16, knockdown: false, launchX: 3.2, launchZ: 1.4, weaponType: 'daggers' };
      } else if (this.weapon.type === 'nunchaku') {
        return { xOffset: 18, width: 36, damage: 18, knockdown: false, launchX: 3.5, launchZ: 1.5, weaponType: 'nunchaku' };
      } else if (this.weapon.type === 'pipe') {
        return { xOffset: 20, width: 42, damage: 24, knockdown: true, launchX: 6.0, launchZ: 3.8, weaponType: 'pipe' };
      }
    }

    if (this.type === 'thug') {
      return { xOffset: 8, width: 22, damage: 10, knockdown: false, launchX: 2.5, launchZ: 1.5 };
    } else if (this.type === 'ninja') {
      return { xOffset: 12, width: 26, damage: 14, knockdown: false, launchX: 3.5, launchZ: 2 };
    } else if (this.type === 'bruiser') {
      return { xOffset: 14, width: 32, damage: 24, knockdown: true, launchX: 5.5, launchZ: 3.5 };
    } else if (this.type === 'ronin') {
      return { xOffset: 18, width: 40, damage: 20, knockdown: true, launchX: 4.8, launchZ: 2.6 };
    } else if (this.type === 'kicker') {
      return { xOffset: 14, width: 32, damage: 16, knockdown: true, launchX: 5.2, launchZ: 3.2 };
    } else if (this.type === 'assassin') {
      return { xOffset: 14, width: 30, damage: 16, knockdown: false, launchX: 3.8, launchZ: 1.8 };
    } else if (this.type === 'club_giant') {
      return { xOffset: 24, width: 48, damage: 32, knockdown: true, launchX: 7.0, launchZ: 4.5 };
    } else if (this.type === 'zombie') {
      const isBite = this.attackSubtype === 'bite';
      return {
        xOffset: isBite ? 12 : 14,
        width: isBite ? 30 : 34,
        damage: isBite ? 18 : 14,
        knockdown: isBite,
        launchX: isBite ? 4.8 : 2.8,
        launchZ: isBite ? 2.6 : 1.4
      };
    } else if (this.isBoss || this.type === 'boss') {
      return { xOffset: 14, width: 34, damage: 28, knockdown: true, launchX: 6.0, launchZ: 4.0 };
    }
    return null;
  }

  draw(ctx) {
    ctx.save();
    // Non-flashing translucent invulnerability display (steady and easy on the eyes)
    if (this.isInvulnerable) {
      ctx.globalAlpha = 0.65;
    }

    // Shadow
    const shadowWidth = (this.isBoss || this.type === 'boss' || this.type === 'club_giant') ? 44 : (this.type === 'bruiser' ? 36 : 28);
    window.spriteRenderer.drawShadow(ctx, this.x, this.y, shadowWidth, 10, this.z);

    // Entity Sprite
    ctx.translate(this.x, this.y - this.z);

    if (this.type === 'thug') {
      window.spriteRenderer.drawThug(ctx, this.state, this.animTime, this.facing);
    } else if (this.type === 'ninja') {
      window.spriteRenderer.drawNinja(ctx, this.state, this.animTime, this.facing);
    } else if (this.type === 'bruiser') {
      window.spriteRenderer.drawBruiser(ctx, this.state, this.animTime, this.facing);
    } else if (this.type === 'ronin') {
      window.spriteRenderer.drawRonin(ctx, this.state, this.animTime, this.facing);
    } else if (this.type === 'kicker') {
      window.spriteRenderer.drawKicker(ctx, this.state, this.animTime, this.facing);
    } else if (this.type === 'assassin') {
      window.spriteRenderer.drawAssassin(ctx, this.state, this.animTime, this.facing);
    } else if (this.type === 'club_giant') {
      window.spriteRenderer.drawClubGiant(ctx, this.state, this.animTime, this.facing);
    } else if (this.type === 'zombie') {
      window.spriteRenderer.drawZombie(ctx, this.state, this.animTime, this.facing);
    } else if (this.isBoss || this.type === 'boss') {
      const isLaughing = this.laughTimer > 0;
      window.spriteRenderer.drawBoss(ctx, this.state, this.animTime, this.facing, this.isEnraged, this.bossType, isLaughing);

      // Laugh Speech Bubble
      if (isLaughing) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-22, -68, 44, 12);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-22, -68, 44, 12);
        ctx.fillStyle = '#ff0033';
        ctx.font = '5px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('HA!HA!HA!', 0, -60);
      }
    }

    // Render weapon in enemy hands if armed!
    if (this.weapon) {
      window.spriteRenderer.drawEquippedWeapon(ctx, this.state, this.animTime, this.facing, 'enemy', this.weapon);
    }

    ctx.restore();
  }
}

// ==========================================
// BREAKABLES & ITEM PICKUPS
// ==========================================
class Breakable extends Entity {
  constructor(x, y, type = 'crate', drops = 'pizza') {
    super(x, y);
    this.type = type;
    this.drops = drops; // 'pizza', 'nunchaku', 'scroll'
    this.health = 2;
    this.maxHealth = 2;
    this.width = 28;
    this.height = 26;
  }

  takeDamage(amount, facing) {
    this.health -= amount;
    window.soundEngine.playHit(true);
    window.combatSystem.spawnHitSpark(this.x, this.y - 14, '#b87333', 10);
    if (this.health <= 0) {
      this.isDead = true;
      window.soundEngine.playKnockdown();
      window.combatSystem.triggerScreenShake(4, 0.18);
    }
  }

  draw(ctx) {
    window.spriteRenderer.drawShadow(ctx, this.x, this.y, 32, 12, 0);
    ctx.save();
    ctx.translate(this.x, this.y);
    window.spriteRenderer.drawBreakable(ctx, this.type, this.health, this.maxHealth);
    ctx.restore();
  }
}

class ItemPickup extends Entity {
  constructor(x, y, type = 'pizza') {
    super(x, y);
    this.type = type; // 'pizza', 'nunchaku', 'scroll'
    this.animTime = 0;
    this.width = 22;
    this.height = 20;
    this.vz = 2.5; // Pop up when dropped
    this.z = 2;
  }

  update(dt, player) {
    this.animTime += dt;
    this.z += this.vz;
    if (this.z > 0) {
      this.vz -= 0.2;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
      }
    }

    if (player) {
      this.checkCollect(player);
    }
  }

  checkCollect(target) {
    if (this.isDead || !target) return;
    const dx = Math.abs(target.x - this.x);
    const dy = Math.abs(target.y - this.y);
    if (dx < 20 && dy < 16) {
      this.onCollect(target);
    }
  }

  onCollect(player) {
    this.isDead = true;
    window.soundEngine.playPickup();

    if (this.type === 'pizza') {
      player.health = Math.min(player.maxHealth, player.health + 45);
      player.score += 500;
      window.combatSystem.spawnComboText(this.x, this.y - 30, '+45 HP! PIZZA!');
    } else if (this.type === 'scroll') {
      player.specialMeter = player.maxSpecial;
      player.score += 1000;
      window.combatSystem.spawnComboText(this.x, this.y - 30, 'DRAGON KI MAX!');
    } else if (this.type === 'nunchaku' || this.type === 'daggers' || this.type === 'pipe' || this.type === 'pistols' || this.type === 'dual_pistols') {
      if (player.equipWeapon) {
        player.equipWeapon(this.type);
      }
      player.score += 800;
      const weaponNames = {
        nunchaku: 'NUNCHAKU EQUIPPED!',
        daggers: 'TWIN DAGGERS EQUIPPED!',
        pipe: 'LEAD PIPE EQUIPPED!',
        pistols: 'DUAL PISTOLS EQUIPPED!',
        dual_pistols: 'DUAL PISTOLS EQUIPPED!'
      };
      window.combatSystem.spawnComboText(this.x, this.y - 30, weaponNames[this.type] || 'WEAPON EQUIPPED!', '#05d9e8');
    }
  }

  draw(ctx) {
    window.spriteRenderer.drawShadow(ctx, this.x, this.y, 22, 8, this.z);
    ctx.save();
    ctx.translate(this.x, this.y - this.z);
    window.spriteRenderer.drawItem(ctx, this.type, this.animTime);
    ctx.restore();
  }
}

window.Player = Player;
window.Enemy = Enemy;
window.Breakable = Breakable;
window.ItemPickup = ItemPickup;
