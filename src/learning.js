// ==========================================
// CARPE'S KUNG FU RAGE - AI REINFORCEMENT LEARNING ENGINE
// Autonomous Auto-Play & Move Memory System
// ==========================================

class AILearningEngine {
  constructor() {
    this.storageKeyMatrix = 'kungfu_ai_learning_matrix';
    this.storageKeyStats = 'kungfu_ai_learning_stats';

    this.learningRate = 0.22; // Alpha
    this.discountFactor = 0.82; // Gamma
    this.baseExploration = 0.18; // Epsilon

    this.matrix = this.loadMatrix();
    this.stats = this.loadStats();

    this.pendingMoves = new Map(); // id -> move token
    this.nextMoveId = 1;
    this.recentRewards = [];
    this.autoPlayActive = false;

    // Leader AI state for auto-play
    this.leaderTarget = null;
    this.leaderTacticTimer = 0;
    this.leaderAttackCooldown = 0.2;
    this.leaderCurrentGoal = 'SCANNING ARENA';
  }

  loadMatrix() {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      try {
        const raw = localStorage.getItem(this.storageKeyMatrix);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('AILearningEngine: error loading matrix from storage:', e);
      }
    }
    return this.createDefaultMatrix();
  }

  loadStats() {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      try {
        const raw = localStorage.getItem(this.storageKeyStats);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('AILearningEngine: error loading stats from storage:', e);
      }
    }
    return {
      totalMovesRecorded: 0,
      successfulHits: 0,
      totalDamageDealt: 0,
      epochs: 1,
      highestCombo: 0,
      bossesDefeated: 0,
      lastSessionDate: new Date().toISOString()
    };
  }

  save() {
    if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') return;
    try {
      localStorage.setItem(this.storageKeyMatrix, JSON.stringify(this.matrix));
      localStorage.setItem(this.storageKeyStats, JSON.stringify(this.stats));
    } catch (e) {
      console.warn('AILearningEngine: unable to save to localStorage:', e);
    }
  }

  createDefaultMatrix() {
    // Seed initial sensible move weights so AI starts smart and gets sharper
    const situations = [
      'MELEE_ALONE', 'MELEE_MOBBED', 'MELEE_BOSS',
      'MID_ALONE', 'MID_MOBBED', 'MID_BOSS',
      'FAR_ALONE', 'FAR_MOBBED', 'FAR_BOSS',
      'AIRBORNE'
    ];
    const actions = [
      'punch_combo', 'kick_combo', 'flash_kick', 'uppercut',
      'ground_pound', 'lunge_punch', 'dive_kick', 'mega_punch',
      'special', 'weapon_attack', 'dodge_flip'
    ];

    const matrix = {};
    situations.forEach(sit => {
      matrix[sit] = {};
      actions.forEach(act => {
        let defaultQ = 10.0;
        // Pre-seed some logical kung-fu heuristics:
        if (sit.includes('MELEE_MOBBED') && (act === 'special' || act === 'flash_kick' || act === 'ground_pound')) defaultQ = 22.0;
        if (sit.includes('MELEE_BOSS') && (act === 'mega_punch' || act === 'weapon_attack' || act === 'dodge_flip')) defaultQ = 24.0;
        if (sit.includes('FAR') && (act === 'dive_kick' || act === 'lunge_punch')) defaultQ = 20.0;
        if (sit.includes('AIRBORNE') && act === 'dive_kick') defaultQ = 25.0;

        matrix[sit][act] = { q: defaultQ, visits: 1, wins: 0 };
      });
    });

    return matrix;
  }

  getSituationKey(fighter, target, enemies) {
    if (fighter.z > 0) return 'AIRBORNE';

    const activeLiving = enemies.filter(e => !e.isDead);
    const isMobbed = activeLiving.length >= 2;
    const isBoss = target && target.isBoss;

    let dist = 30;
    if (target) {
      dist = Math.hypot(target.x - fighter.x, target.y - fighter.y);
    }

    let distBucket = 'MELEE';
    if (dist > 85) distBucket = 'FAR';
    else if (dist > 36) distBucket = 'MID';

    let crowdBucket = 'ALONE';
    if (isBoss) crowdBucket = 'BOSS';
    else if (isMobbed) crowdBucket = 'MOBBED';

    return `${distBucket}_${crowdBucket}`;
  }

  selectBestAction(fighter, target, enemies) {
    const sitKey = this.getSituationKey(fighter, target, enemies);
    if (!this.matrix[sitKey]) {
      this.matrix[sitKey] = {};
    }

    const availableActions = ['punch_combo', 'kick_combo'];
    if (fighter.weapon) availableActions.push('weapon_attack');
    if (fighter.specialMeter >= 30) availableActions.push('special');
    if (fighter.characterId === 'lindin') availableActions.push('flash_kick');
    if (fighter.characterId === 'smoro') availableActions.push('ground_pound');
    if (fighter.characterId === 'smellu') availableActions.push('uppercut');
    availableActions.push('lunge_punch', 'dodge_flip');

    if (target && (target.isBoss || target.health > 70)) {
      availableActions.push('mega_punch');
    }

    // Dynamic exploration rate: decreases as epochs / training moves increase
    const epsilon = Math.max(0.06, this.baseExploration * Math.pow(0.96, Math.floor(this.stats.epochs / 2)));

    let chosenAction = availableActions[0];

    if (Math.random() < epsilon) {
      // Explore: random choice
      chosenAction = availableActions[Math.floor(Math.random() * availableActions.length)];
    } else {
      // Exploit: find action with maximum Q-score
      let maxQ = -Infinity;
      for (const act of availableActions) {
        if (!this.matrix[sitKey][act]) {
          this.matrix[sitKey][act] = { q: 10.0, visits: 0, wins: 0 };
        }
        const score = this.matrix[sitKey][act].q + (Math.random() * 0.4); // tie-breaker jitter
        if (score > maxQ) {
          maxQ = score;
          chosenAction = act;
        }
      }
    }

    // Register move token for reward evaluation
    const token = {
      id: this.nextMoveId++,
      fighterName: fighter.name || (fighter.isAI ? 'AI Companion' : 'AI Leader'),
      characterId: fighter.characterId,
      situation: sitKey,
      action: chosenAction,
      timestamp: Date.now(),
      resolved: false
    };

    this.pendingMoves.set(token.id, token);
    this.stats.totalMovesRecorded++;

    // Prune stale tokens if they hang for > 3.5 seconds
    if (this.pendingMoves.size > 80) {
      const now = Date.now();
      for (const [id, tok] of this.pendingMoves.entries()) {
        if (now - tok.timestamp > 3500) {
          this.pendingMoves.delete(id);
        }
      }
    }

    return { action: chosenAction, token };
  }

  recordHitSuccess(attacker, target, damage, knockdown, comboCount = 1) {
    // Reward calculation
    let reward = 12 + Math.min(25, damage * 0.4);
    if (knockdown) reward += 18;
    if (comboCount >= 3) reward += comboCount * 3;
    if (target.health <= 0) {
      reward += target.isBoss ? 150 : 45;
      if (target.isBoss) this.stats.bossesDefeated++;
    }

    this.stats.successfulHits++;
    this.stats.totalDamageDealt += damage;
    if (comboCount > this.stats.highestCombo) {
      this.stats.highestCombo = comboCount;
    }

    // Update pending token
    const token = this.findMatchingPendingMove(attacker);
    if (token) {
      token.resolved = true;
      this.pendingMoves.delete(token.id);
      this.applyQUpdate(token.situation, token.action, reward, true);

      this.addRecentReward(`+${Math.round(reward)}: ${token.action.toUpperCase()} (${damage} dmg)`);
    } else {
      // Direct general update
      this.addRecentReward(`+${Math.round(reward)}: HIT CONNECTED (${damage} dmg)`);
    }
  }

  recordMoveWhiff(attacker, actionName) {
    const penalty = -5;
    const token = this.findMatchingPendingMove(attacker);
    if (token) {
      token.resolved = true;
      this.pendingMoves.delete(token.id);
      this.applyQUpdate(token.situation, token.action, penalty, false);
      this.addRecentReward(`${penalty}: WHIFF ${token.action.toUpperCase()}`);
    }
  }

  recordDamageTaken(fighter, damageAmount) {
    const penalty = -15 - Math.min(25, damageAmount * 0.4);
    const token = this.findMatchingPendingMove(fighter);
    if (token) {
      token.resolved = true;
      this.pendingMoves.delete(token.id);
      this.applyQUpdate(token.situation, token.action, penalty, false);
      this.addRecentReward(`${Math.round(penalty)}: INTERRUPTED`);
    }
  }

  findMatchingPendingMove(fighter) {
    const now = Date.now();
    for (const [id, tok] of this.pendingMoves.entries()) {
      if (tok.characterId === fighter.characterId && (now - tok.timestamp) < 1800) {
        return tok;
      }
    }
    return null;
  }

  applyQUpdate(situation, action, reward, isWin) {
    if (!this.matrix[situation]) this.matrix[situation] = {};
    if (!this.matrix[situation][action]) {
      this.matrix[situation][action] = { q: 10.0, visits: 0, wins: 0 };
    }

    const node = this.matrix[situation][action];
    node.visits++;
    if (isWin) node.wins++;

    // Bellman Temporal Difference update: Q(s,a) = Q(s,a) + alpha * (reward - Q(s,a))
    node.q = node.q + this.learningRate * (reward - node.q);
    node.q = Math.max(-50, Math.min(100, node.q)); // clamp to reasonable range

    // Save periodically
    if (this.stats.totalMovesRecorded % 10 === 0) {
      this.save();
    }
  }

  addRecentReward(text) {
    this.recentRewards.unshift({ text, time: Date.now() });
    if (this.recentRewards.length > 5) {
      this.recentRewards.pop();
    }
  }

  onEpochFinished(reason = 'COMPLETE') {
    this.stats.epochs++;
    this.stats.lastSessionDate = new Date().toISOString();
    this.save();
    if (typeof window !== 'undefined' && window.gameLogger) {
      window.gameLogger.log('SYSTEM', `AI Learning Engine Epoch #${this.stats.epochs} Finished: Reason=${reason}, Total Moves=${this.stats.totalMovesRecorded}, Accuracy=${this.getAccuracy()}%`);
    }
  }

  getAccuracy() {
    if (this.stats.totalMovesRecorded === 0) return '0.0';
    const acc = (this.stats.successfulHits / Math.max(1, this.stats.totalMovesRecorded)) * 100;
    return acc.toFixed(1);
  }

  getTopLearnedMoves(limit = 4) {
    const actionTotals = {};
    for (const sit in this.matrix) {
      for (const act in this.matrix[sit]) {
        if (!actionTotals[act]) {
          actionTotals[act] = { name: act, totalQ: 0, visits: 0, count: 0 };
        }
        actionTotals[act].totalQ += this.matrix[sit][act].q;
        actionTotals[act].visits += this.matrix[sit][act].visits;
        actionTotals[act].count++;
      }
    }

    const sorted = Object.values(actionTotals).map(item => ({
      name: item.name.replace('_', ' ').toUpperCase(),
      avgQ: (item.totalQ / Math.max(1, item.count)).toFixed(1),
      visits: item.visits
    })).sort((a, b) => parseFloat(b.avgQ) - parseFloat(a.avgQ));

    return sorted.slice(0, limit);
  }

  resetLearning() {
    this.matrix = this.createDefaultMatrix();
    this.stats = {
      totalMovesRecorded: 0,
      successfulHits: 0,
      totalDamageDealt: 0,
      epochs: 1,
      highestCombo: 0,
      bossesDefeated: 0,
      lastSessionDate: new Date().toISOString()
    };
    this.save();
  }

  exportBrainJSON() {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stats: this.stats,
      matrix: this.matrix
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kungfu_ai_brain_epoch${this.stats.epochs}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // AUTONOMOUS AI LEADER CONTROLLER (P1 AUTO-PLAY)
  // ==========================================
  updatePlayerAI(player, enemies, companion, stage, dt, game) {
    if (!player || player.isDead) return;

    this.leaderTacticTimer -= dt;
    if (this.leaderAttackCooldown > 0) this.leaderAttackCooldown -= dt;
    if (this.storeBuyCooldown > 0) this.storeBuyCooldown -= dt;

    const canAct = (player.state === 'idle' || player.state === 'walk') && player.z === 0;
    const activeEnemies = enemies.filter(e => !e.isDead);

    // Target Selection for Leader
    if (this.leaderTacticTimer <= 0 || !this.leaderTarget || this.leaderTarget.isDead) {
      this.leaderTacticTimer = 0.35 + Math.random() * 0.2;

      // Prioritize nearest boss, or nearest enemy
      const boss = activeEnemies.find(e => e.isBoss);
      if (boss) {
        this.leaderTarget = boss;
        this.leaderCurrentGoal = 'HUNTING STAGE BOSS';
      } else if (activeEnemies.length > 0) {
        let closest = null;
        let minDist = Infinity;
        for (const e of activeEnemies) {
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < minDist) {
            minDist = d;
            closest = e;
          }
        }
        this.leaderTarget = closest;
        this.leaderCurrentGoal = `ENGAGING ${closest.type ? closest.type.toUpperCase() : 'ENEMY'}`;
      } else {
        this.leaderTarget = null;
      }
    }

    // 1. If NO enemies on screen: Navigate forward through the stage!
    if (activeEnemies.length === 0) {
      // Check for nearby dropped pickups (weapons, pizza)
      const nearbyPickup = (game && game.pickups && game.pickups.length > 0)
        ? game.pickups.find(p => !p.isDead && !p.collected && (!p.type.includes('pistol') || player.weapon?.type !== 'pistols'))
        : null;

      if (nearbyPickup && Math.hypot(nearbyPickup.x - player.x, nearbyPickup.y - player.y) < 180 && (this.pickupPursuitTimer || 0) < 2.0) {
        this.pickupPursuitTimer = (this.pickupPursuitTimer || 0) + dt;
        this.leaderCurrentGoal = `COLLECTING ${nearbyPickup.type.toUpperCase()}`;
        const pdx = nearbyPickup.x - player.x;
        const pdy = nearbyPickup.y - player.y;
        if (canAct) {
          player.state = 'walk';
          player.facing = pdx >= 0 ? 1 : -1;
          player.vx = Math.min(player.speed, Math.abs(pdx)) * Math.sign(pdx);
          player.vy = Math.min(player.speed * 0.7, Math.abs(pdy)) * Math.sign(pdy);
        }
        return;
      } else {
        this.pickupPursuitTimer = 0;
      }

      // Check for nearby breakable crates
      const nearbyBreakable = (game && game.breakables && game.breakables.length > 0)
        ? game.breakables.find(b => !b.isDead)
        : null;

      if (nearbyBreakable && Math.hypot(nearbyBreakable.x - player.x, nearbyBreakable.y - player.y) < 140) {
        this.leaderCurrentGoal = 'SMASHING SUPPLY CRATE';
        const bdx = nearbyBreakable.x - player.x;
        const bdy = nearbyBreakable.y - player.y;
        if (Math.abs(bdx) < 32 && Math.abs(bdy) < 12 && canAct) {
          player.facing = bdx >= 0 ? 1 : -1;
          player.executePunch();
          return;
        } else if (canAct) {
          player.state = 'walk';
          player.facing = bdx >= 0 ? 1 : -1;
          player.vx = Math.min(player.speed, Math.abs(bdx)) * Math.sign(bdx);
          player.vy = Math.min(player.speed * 0.7, Math.abs(bdy)) * Math.sign(bdy);
          return;
        }
      }

      // Smart Chinatown Store Purchasing between combat encounters:
      if (game && game.storeItems && (this.storeBuyCooldown || 0) <= 0) {
        const pizzaIdx = game.storeItems.findIndex(i => i.type === 'heal');
        const weaponIdx = game.storeItems.findIndex(i => i.type === 'weapon');
        const scrollIdx = game.storeItems.findIndex(i => i.type === 'scroll');

        if (pizzaIdx >= 0 && player.health <= 70 && player.score >= game.storeItems[pizzaIdx].cost) {
          this.leaderCurrentGoal = 'PURCHASING PIZZA AT CHINATOWN STORE';
          game.buyStoreItem(pizzaIdx);
          this.storeBuyCooldown = 2.5;
        } else if (weaponIdx >= 0 && (!player.weapon || (player.weaponDurability || 0) < 6) && player.score >= 2500) {
          this.leaderCurrentGoal = 'PURCHASING WEAPON AT CHINATOWN STORE';
          game.buyStoreItem(weaponIdx);
          this.storeBuyCooldown = 3.0;
        } else if (scrollIdx >= 0 && player.specialMeter < 30 && player.score >= 3000) {
          this.leaderCurrentGoal = 'PURCHASING DRAGON SCROLL';
          game.buyStoreItem(scrollIdx);
          this.storeBuyCooldown = 3.0;
        }
      }

      // Level Progression: Advance forward across the zone!
      if (stage && stage.gameMode !== 'VERTICAL') {
        this.leaderCurrentGoal = 'ADVANCING TO NEXT ZONE';
        const nextZone = (stage.zones && stage.currentZoneIndex < stage.zones.length)
          ? stage.zones[stage.currentZoneIndex]
          : null;
        const targetX = nextZone ? (nextZone.triggerX + 60) : ((stage.width || 16000) - 100);
        const targetY = 210;
        const dx = targetX - player.x;
        const dy = targetY - player.y;

        if (canAct) {
          player.state = 'walk';
          player.facing = dx >= 0 ? 1 : -1;
          player.vx = Math.sign(dx) * (player.speed * 1.25);
          if (Math.abs(dy) > 8) {
            player.vy = Math.sign(dy) * (player.speed * 0.6);
          } else {
            player.vy = 0;
          }
        }
      } else if (stage && stage.gameMode === 'VERTICAL') {
        this.leaderCurrentGoal = stage.isAscending ? 'RIDING PAGODA ELEVATOR' : 'HOLDING ELEVATOR CENTER';
        const centerX = 240;
        const centerY = 215;
        const dx = centerX - player.x;
        const dy = centerY - player.y;
        if (Math.hypot(dx, dy) > 25 && canAct) {
          player.state = 'walk';
          player.facing = dx >= 0 ? 1 : -1;
          player.vx = Math.sign(dx) * player.speed;
          player.vy = Math.sign(dy) * (player.speed * 0.7);
        } else if (canAct) {
          player.state = 'idle';
          player.vx = 0;
          player.vy = 0;
        }
      }
      return;
    }

    // 2. Combat Tactics when Enemies are present
    const target = this.leaderTarget;
    if (!target) return;

    const absX = Math.abs(target.x - player.x);
    const absY = Math.abs(target.y - player.y);

    // Emergency in-combat pizza healing if critically low on health (< 45 HP)
    if (game && game.storeItems && player.health < 45 && player.score >= 800 && (this.storeBuyCooldown || 0) <= 0) {
      const pizzaIdx = game.storeItems.findIndex(i => i.type === 'heal');
      if (pizzaIdx >= 0) {
        this.leaderCurrentGoal = 'EMERGENCY PIZZA HEAL';
        game.buyStoreItem(pizzaIdx);
        this.storeBuyCooldown = 2.5;
      }
    }

    // Mid-air attack response if airborne!
    if (player.z > 0 && !['knockdown', 'jump_kick', 'air_spin', 'air_hammer', 'air_split', 'air_pistol', 'flying_kick', 'front_flip', 'backflip'].includes(player.state)) {
      if (absX < 55) {
        if (player.weapon?.type === 'pistols') {
          player.executePunch(); // Triggers air_pistol
        } else {
          const aRoll = Math.random();
          if (aRoll < 0.40) player.executeFlyingKick();
          else if (aRoll < 0.70) player.executeAirSpin();
          else player.executeAirHammer();
        }
      }
      return;
    }

    // Defensive tactical evasion if mobbed by 2+ enemies within 45px
    const closeThreats = enemies.filter(e => !e.isDead && Math.hypot(e.x - player.x, e.y - player.y) < 45);
    if (closeThreats.length >= 2 && canAct) {
      if (player.specialMeter >= 30) {
        this.leaderCurrentGoal = 'DRAGON KI SPECIAL ESCAPE';
        player.executeSpecialMove();
        return;
      } else if (player.dodgeCooldown <= 0 && Math.random() < 0.45) {
        this.leaderCurrentGoal = 'EVASIVE BACKFLIP ESCAPE';
        player.dodgeCooldown = 2.0;
        player.state = 'backflip';
        player.vz = 4.4;
        player.z = 1;
        player.vx = -player.facing * (player.speed * 1.6);
        player.isInvulnerable = true;
        player.invulnTimer = 0.55;
        if (window.soundEngine) window.soundEngine.playSwing(380);
        return;
      }
    }

    // Movement towards target
    if (canAct) {
      if (absX > 32 || absY > 12) {
        player.state = 'walk';
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        player.facing = dx >= 0 ? 1 : -1;
        player.vx = Math.sign(dx) * (player.speed * 1.1);
        player.vy = Math.sign(dy) * (player.speed * 0.7);

        // Long distance gap closer
        if (absX > 90 && Math.random() < 0.08 && player.z === 0) {
          player.state = 'jump';
          player.vz = 4.8;
          player.z = 1;
          player.vx = player.facing * (player.speed * 1.6);
          this.leaderCurrentGoal = 'EXECUTING DIVE KICK';
          return;
        }
      } else {
        // In striking range!
        player.vx = 0;
        player.vy = 0;
        player.facing = target.x >= player.x ? 1 : -1;

        if (this.leaderAttackCooldown <= 0) {
          this.leaderAttackCooldown = 0.22 + Math.random() * 0.18;

          // Consult AI Learning Engine for best action!
          const decision = this.selectBestAction(player, target, enemies);
          this.executeLearnedAction(player, decision.action, target);
        } else {
          player.state = 'idle';
        }
      }
    }
  }

  executeLearnedAction(fighter, action, target) {
    this.leaderCurrentGoal = `EXECUTING ${action.toUpperCase()}`;

    switch (action) {
      case 'weapon_attack':
        if (fighter.weapon) fighter.executePunch();
        else fighter.executePunch();
        break;
      case 'special':
        if (fighter.specialMeter >= 30) fighter.executeSpecialMove();
        else fighter.executePunch();
        break;
      case 'mega_punch':
        if (fighter.executeMegaPunchWindup) fighter.executeMegaPunchWindup();
        else fighter.executePunch();
        break;
      case 'flash_kick':
        if (fighter.executeFlashKick) fighter.executeFlashKick();
        else fighter.executeKick();
        break;
      case 'uppercut':
        if (fighter.executeRisingDragonUppercut) fighter.executeRisingDragonUppercut();
        else fighter.executePunch();
        break;
      case 'ground_pound':
        if (fighter.executeGroundPound) fighter.executeGroundPound();
        else fighter.executePunch();
        break;
      case 'lunge_punch':
        if (fighter.executeLungePunch) fighter.executeLungePunch();
        else fighter.executePunch();
        break;
      case 'dodge_flip':
        if (fighter.z === 0) {
          fighter.state = 'backflip';
          fighter.vz = 4.4;
          fighter.z = 1;
          fighter.vx = -fighter.facing * (fighter.speed * 1.6);
          fighter.isInvulnerable = true;
          fighter.invulnTimer = 0.55;
          window.soundEngine.playSwing(380);
        }
        break;
      case 'kick_combo':
        fighter.executeKick();
        break;
      case 'punch_combo':
      default:
        fighter.executePunch();
        break;
    }
  }
}

// Global Singleton
if (typeof window !== 'undefined') {
  window.AILearningEngine = AILearningEngine;
  window.aiLearningEngine = new AILearningEngine();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AILearningEngine };
}
