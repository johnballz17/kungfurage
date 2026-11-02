/**
 * CARPE'S KUNG FU RAGE - 2.5D BELT-SCROLL COMBAT SYSTEM
 * Manages 2.5D depth collision, hitboxes, hurtboxes, hit-stop, screen shake, and combo tracking.
 */

class CombatSystem {
  constructor() {
    this.hitStopTimer = 0;
    this.screenShakeTime = 0;
    this.screenShakeIntensity = 0;
    // Screen shake and flashing disabled by default per user request
    this.screenShakeEnabled = (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('kungfu_screenshake') === 'true');
    this.screenFlashEnabled = (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('kungfu_screenflash') === 'true');
    this.particles = [];
    this.floatingTexts = [];
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  // Trigger hit-stop freeze (classic Capcom/Streets of Rage impact freeze)
  triggerHitStop(frames = 4) {
    this.hitStopTimer = frames;
  }

  // Trigger camera screen shake
  triggerScreenShake(intensity = 6, duration = 0.25) {
    if (!this.screenShakeEnabled) {
      this.screenShakeIntensity = 0;
      this.screenShakeTime = 0;
      return;
    }
    this.screenShakeIntensity = intensity;
    this.screenShakeTime = duration;
  }

  // Check 2.5D Belt-Scroll collision between an attack hitbox and a target's hurtbox
  // In belt-scrollers, attackers and targets must share similar ground depth (Y plane)
  checkHit(attacker, attackBox, target, yTolerance = 18) {
    if (target.isDead || target.isInvulnerable || target.state === 'knockdown') return false;

    // 1. Check ground depth lane (Y-axis belt scroll)
    const dy = Math.abs(attacker.y - target.y);
    if (dy > yTolerance) return false;

    // 2. Check height (Z-axis jumping/airborne)
    const dz = Math.abs(attacker.z - target.z);
    if (dz > 32) return false;

    // 3. Check X-axis horizontal reach
    // attackBox = { xOffset: number, width: number } relative to attacker's facing direction
    const attackX = attacker.x + (attackBox.xOffset * attacker.facing);
    const attackLeft = attacker.facing === 1 ? attackX : attackX - attackBox.width;
    const attackRight = attacker.facing === 1 ? attackX + attackBox.width : attackX;

    const targetLeft = target.x - target.width / 2;
    const targetRight = target.x + target.width / 2;

    const xOverlap = attackLeft < targetRight && attackRight > targetLeft;
    return xOverlap;
  }

  // Register a successful attack hit on a target
  applyHit(attacker, target, attackData) {
    const {
      damage = 10,
      knockdown = false,
      launchX = 4,
      launchZ = 3,
      hitSound = 'hit',
      hitEffect = 'spark',
      isSpecial = false,
      isMegaPunch = false
    } = attackData;

    // Damage target
    target.takeDamage(damage, attacker.facing, knockdown, launchX, launchZ);

    // Audio SFX
    if (isMegaPunch) {
      window.soundEngine.playMegaPunchRelease();
    } else if (knockdown || isSpecial) {
      window.soundEngine.playKnockdown();
    } else if (attackData.weaponType === 'daggers') {
      window.soundEngine.playSlash();
    } else if (attackData.weaponType === 'nunchaku') {
      window.soundEngine.playNunchaku();
    } else {
      window.soundEngine.playHit(damage > 12);
    }

    // Impact Effects
    const impactX = (attacker.x + target.x) / 2;
    const impactY = target.y - target.z - 26;

    // Green Gore splatter when striking an enemy
    const isEnemyTarget = !target.isPlayer && !target.isAI && (target.type !== undefined || (window.Enemy && target instanceof window.Enemy));
    if (isEnemyTarget) {
      const isZombie = target.type === 'zombie';
      const isBladeOrGun = (attackData.weaponType === 'daggers' || attackData.weaponType === 'pistols');
      this.spawnGreenGore(impactX, impactY, target.y, damage, knockdown || isMegaPunch || isBladeOrGun, attacker.facing, isZombie);

      // Massive undead gore explosion on zombie kill
      if (isZombie && target.health <= 0) {
        this.spawnGreenGore(target.x, target.y - 18, target.y, 45, true, attacker.facing, true);
        window.soundEngine.playZombieGroan();
      }
    }

    // Weapon Durability handling
    if (attacker.weapon && (attacker.isPlayer || attacker.isAI)) {
      attacker.weapon.hits--;
      if (attacker.weapon.hits <= 0) {
        const brokenType = attacker.weapon.type;
        attacker.weapon = null;
        window.soundEngine.playWeaponBreak();
        this.spawnWeaponShatter(attacker.x, attacker.y - 22, brokenType);
        const breakLabel = (brokenType === 'pistols') ? 'OUT OF AMMO!' : `${brokenType.toUpperCase()} BROKE!`;
        this.spawnComboText(attacker.x, attacker.y - 45, breakLabel, '#ff2a6d');
        if (window.gameLogger) {
          window.gameLogger.log('COMBAT', `${attacker.isPlayer ? 'Player' : 'AI Companion'} weapon broke: ${brokenType.toUpperCase()}`);
        }
      }
    }

    if (window.gameLogger) {
      const srcName = attacker.isPlayer ? 'Player' : (attacker.isAI ? 'AI Companion' : (attacker.type || 'Enemy'));
      const tgtName = target.isPlayer ? 'Player' : (target.isAI ? 'AI Companion' : (target.type || 'Enemy'));
      const cat = attacker.isPlayer ? 'PLAYER' : (attacker.isAI ? 'COMPANION' : 'ENEMY');
      window.gameLogger.log(cat, `${srcName} hit ${tgtName} for ${damage} dmg (Knockdown=${knockdown})`);
    }

    // AI Reinforcement Learning Engine: record hit outcome & update Q-table
    if (typeof window !== 'undefined' && window.aiLearningEngine && (attacker.isPlayer || attacker.isAI)) {
      window.aiLearningEngine.recordHitSuccess(attacker, target, damage, knockdown, this.comboCount);
    }

    if (isMegaPunch) {
      // Massive fiery explosion particles!
      for (let i = 0; i < 28; i++) {
        const angle = (Math.PI * 2 / 28) * i + (Math.random() * 0.4);
        const speed = 4 + Math.random() * 6.5;
        this.particles.push({
          x: impactX,
          y: impactY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.55,
          color: ['#ff4500', '#ffd700', '#ff0033', '#ffffff'][i % 4],
          size: 4 + Math.random() * 4
        });
      }
      if (this.screenFlashEnabled) {
        this.particles.push({
          x: impactX,
          y: impactY,
          vx: 0,
          vy: 0,
          life: 0.2,
          maxLife: 0.2,
          isBurst: true,
          size: 32
        });
      }
      this.spawnDamageNumber(impactX, impactY - 16, damage);
      this.triggerScreenShake(14, 0.48);
      this.triggerHitStop(9);
    } else {
      this.spawnHitSpark(impactX, impactY, isSpecial ? '#05d9e8' : '#ffd700', isSpecial ? 16 : 10);
      this.spawnDamageNumber(impactX, impactY - 12, damage);

      if (knockdown || isSpecial) {
        this.triggerScreenShake(isSpecial ? 8 : 5, 0.22);
        this.triggerHitStop(5);
      } else {
        this.triggerHitStop(3);
      }
    }

    // Boss 8-Bit Villain Laugh when knocking down player!
    if (attacker.isBoss && target.isPlayer && (knockdown || target.health <= 0)) {
      attacker.laughTimer = 1.3;
      window.soundEngine.playBossLaugh(attacker.bossType);
      this.spawnComboText(attacker.x, attacker.y - attacker.z - 50, 'MWAHAHAHA!', '#ff0055');
    }

    // Player Combo Increment
    if (attacker.isPlayer) {
      this.comboCount++;
      this.comboTimer = 2.2; // Seconds before combo resets
      if (this.comboCount >= 3) {
        this.spawnComboText(target.x, target.y - target.z - 50, `${this.comboCount} HITS!`);
        if (window.gameLogger) {
          window.gameLogger.log('COMBAT', `Combo x${this.comboCount}!`);
        }
      }
    }
  }

  // Spawn retro comic hit spark / starburst particles
  spawnHitSpark(x, y, color = '#ffd700', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.4);
      const speed = 2 + Math.random() * 4.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.22 + Math.random() * 0.15,
        maxLife: 0.35,
        color: color,
        size: 3 + Math.random() * 3
      });
    }

    // Extra comic impact flash star (only if screen flashing is enabled)
    if (this.screenFlashEnabled) {
      this.particles.push({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        life: 0.12,
        maxLife: 0.12,
        isBurst: true,
        size: 16
      });
    }
  }

  // Spawn floating damage / combo texts
  spawnDamageNumber(x, y, damage) {
    this.floatingTexts.push({
      x: x + (Math.random() * 12 - 6),
      y: y,
      vy: -1.8,
      text: damage.toString(),
      color: damage >= 20 ? '#ff2a6d' : '#ffffff',
      size: damage >= 20 ? 11 : 9,
      life: 0.65,
      maxLife: 0.65
    });
  }

  spawnComboText(x, y, text) {
    this.floatingTexts.push({
      x: x,
      y: y,
      vy: -1.2,
      text: text,
      color: '#ffd700',
      size: 12,
      life: 0.9,
      maxLife: 0.9
    });
  }

  // Spawn retro pixel green gore & blood splatter when striking enemies!
  spawnGreenGore(x, y, floorY, damage = 10, isHeavy = false, facing = 1, isZombie = false) {
    const count = isZombie ? (isHeavy ? 30 : 18) : (isHeavy ? 22 : 12);
    const goreColors = isZombie
      ? ['#39ff14', '#1b7a2b', '#2e6b28', '#76ff03', '#4d7348', '#8bc34a', '#a3e635']
      : ['#00ff44', '#39ff14', '#1b7a2b', '#76ff03', '#00e676', '#14521e', '#22c55e'];

    // 1. High-velocity arterial green droplets spraying in strike direction
    for (let i = 0; i < count; i++) {
      const angle = (facing === 1 ? -0.4 : Math.PI + 0.4) + (Math.random() - 0.5) * 1.5;
      const speed = (2.2 + Math.random() * 5.5) * (isHeavy ? 1.35 : 1.0);
      const color = goreColors[Math.floor(Math.random() * goreColors.length)];
      const size = Math.random() < 0.25 ? (3 + Math.random() * 3) : (1.5 + Math.random() * 2);

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (1.6 + Math.random() * 2.2), // Upward arterial spray
        gravity: 0.22,
        floorY: floorY + (Math.random() * 10 - 5),
        life: 0.75 + Math.random() * 0.75,
        maxLife: 1.5,
        color: color,
        size: size,
        isGore: true,
        stuck: false
      });
    }

    // 2. Lingering green blood splat puddle on the rainy ground
    const splatCount = isHeavy ? 3 : 1;
    for (let s = 0; s < splatCount; s++) {
      this.particles.push({
        x: x + (facing * (6 + Math.random() * 18)),
        y: floorY + (Math.random() * 8 - 4),
        vx: 0,
        vy: 0,
        life: 3.5 + Math.random() * 2.5,
        maxLife: 6.0,
        color: goreColors[Math.floor(Math.random() * goreColors.length)],
        size: 5 + Math.random() * 6,
        isFloorSplat: true
      });
    }

    // 3. Meaty rotten chunk / giblet for heavy hits or zombies
    if (isHeavy || isZombie) {
      const chunkCount = isZombie ? 3 : 1;
      for (let c = 0; c < chunkCount; c++) {
        this.particles.push({
          x: x,
          y: y,
          vx: facing * (1.2 + Math.random() * 3.2),
          vy: -(2.4 + Math.random() * 3.4),
          gravity: 0.26,
          floorY: floorY,
          life: 1.6,
          maxLife: 1.6,
          color: isZombie ? '#204018' : '#14521e',
          size: 4 + Math.random() * 3,
          isGoreChunk: true,
          rotSpeed: (Math.random() - 0.5) * 8,
          rotation: Math.random() * Math.PI
        });
      }
    }
  }

  // Spawn flying weapon shatter splinters when weapon breaks
  spawnWeaponShatter(x, y, weaponType = 'nunchaku') {
    const isWood = weaponType === 'nunchaku';
    const colors = isWood ? ['#b87333', '#8b4513', '#d2b48c', '#e0e0e0'] : ['#a0abb7', '#dbe2ea', '#ffd700', '#ffffff'];
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        gravity: 0.24,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 3,
        isShatter: true,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 12
      });
    }
  }

  // Spawn gun-fu muzzle flash, bullet tracer, and ejected brass shell casings!
  spawnGunShotEffects(x, y, floorY, facing = 1, isDual = false) {
    const shotCount = isDual ? 2 : 1;

    for (let s = 0; s < shotCount; s++) {
      const barrelY = y + (isDual ? (s === 0 ? -6 : 6) : 0);
      const barrelX = x + (facing * 24);

      // 1. Explosive pixel muzzle flash burst
      this.particles.push({
        x: barrelX,
        y: barrelY,
        vx: 0,
        vy: 0,
        life: 0.08,
        maxLife: 0.08,
        isMuzzleFlash: true,
        size: 14 + Math.random() * 6
      });

      // 2. High-speed piercing bullet tracer streak
      this.particles.push({
        x: barrelX,
        y: barrelY,
        vx: facing * 24,
        vy: (Math.random() - 0.5) * 0.8,
        length: 48,
        facing: facing,
        life: 0.12,
        maxLife: 0.12,
        isBulletTracer: true
      });

      // 3. Ejected gold brass shell casing
      this.particles.push({
        x: x + (facing * 6),
        y: barrelY - 4,
        vx: -facing * (1.8 + Math.random() * 2.2), // Ejects backward
        vy: -(2.5 + Math.random() * 2.5), // Pops upward
        gravity: 0.28,
        floorY: floorY || (y + 24),
        life: 1.2,
        maxLife: 1.2,
        isShell: true,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 16
      });
    }
  }

  // Update particles and visual effects
  update(dt) {
    // Hit-stop decrement
    if (this.hitStopTimer > 0) {
      this.hitStopTimer--;
    }

    // Screen-shake decrement
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
      if (this.screenShakeTime <= 0) {
        this.screenShakeIntensity = 0;
      }
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.isGore) {
        if (!p.stuck) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity || 0.22;
          if (p.y >= p.floorY) {
            p.y = p.floorY;
            p.stuck = true;
            p.vx = 0;
            p.vy = 0;
            p.size *= 1.35; // Spread on impact
          }
        }
      } else if (p.isGoreChunk || p.isShatter || p.isShell) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity || 0.25;
        p.rotation += (p.rotSpeed || 4) * dt;
        if (p.floorY && p.y >= p.floorY) {
          p.y = p.floorY;
          p.vx *= 0.5;
          p.vy = -p.vy * 0.35; // Small squishy / metallic bounce
          if (Math.abs(p.vy) < 0.6) p.vy = 0;
        }
      } else {
        p.x += p.vx;
        p.y += p.vy;
      }

      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // Render particles and combat text on top of fighters
  draw(ctx) {
    ctx.save();

    // Draw Particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.isFloorSplat) {
        // Flat horizontal blood/gore puddle on the wet pavement
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.isGoreChunk) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.fillStyle = '#39ff14'; // Acid green highlight
        ctx.fillRect(-p.size / 4, -p.size / 4, p.size / 2, p.size / 2);
        ctx.restore();
      } else if (p.isShatter) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      } else if (p.isMuzzleFlash) {
        // Bright retro pistol muzzle burst
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.isBulletTracer) {
        // Glowing laser-fast bullet tracer streak
        ctx.strokeStyle = '#ffff77';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + (p.facing * (p.length || 40)), p.y);
        ctx.stroke();
      } else if (p.isShell) {
        // Tumbling brass bullet casing
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-2, -1, 4, 2);
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(-2, -1, 1, 2);
        ctx.restore();
      } else if (p.isBurst) {
        if (!this.screenFlashEnabled) continue;
        // Comic hit flash
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - alpha * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), Math.round(p.size), Math.round(p.size));
      }
    }

    // Draw Floating Damage & Combo Text
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.globalAlpha = alpha;
      ctx.font = `${ft.size}px "Press Start 2P", monospace`;
      
      // Black drop shadow
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);

      // Colored text
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();
  }

  // Get current screen shake translation [dx, dy]
  getScreenShakeOffset() {
    if (!this.screenShakeEnabled || this.screenShakeTime <= 0 || this.screenShakeIntensity <= 0) {
      return [0, 0];
    }
    const dx = (Math.random() * 2 - 1) * this.screenShakeIntensity;
    const dy = (Math.random() * 2 - 1) * this.screenShakeIntensity;
    return [dx, dy];
  }
}

window.combatSystem = new CombatSystem();
