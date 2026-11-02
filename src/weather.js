/**
 * CARPE'S KUNG FU RAGE - WEATHER & NEON ATMOSPHERE SYSTEM
 * Rainstorm, ground ripple splashes, lightning flashes, electric neon sparks,
 * and real-time wet asphalt ground reflections!
 */

class WeatherSystem {
  constructor() {
    this.rainDrops = [];
    this.splashes = [];
    this.sparks = [];
    this.lightningTimer = 6.0;
    this.lightningFlash = 0; // Flash intensity 0..1
    this.lightningFlashEnabled = (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('kungfu_screenflash') === 'true');
    this.rainEnabled = true;

    // Initialize rain drops
    for (let i = 0; i < 150; i++) {
      this.rainDrops.push({
        x: Math.random() * 480,
        y: Math.random() * 270,
        len: 8 + Math.random() * 8,
        speed: 12 + Math.random() * 5
      });
    }
  }

  setStage(stageNum) {
    // Stage 1: Rainy Neon Alleyway
    // Stage 2: Moonlit Wind & Rooftop Gusts
    // Stage 3: Underground Shrine with Torches and Fire Embers
    this.rainEnabled = (stageNum === 1 || stageNum === 2);
  }

  update(dt, stage) {
    // 1. UPDATE RAIN
    if (this.rainEnabled) {
      for (const drop of this.rainDrops) {
        drop.x -= 2.8;
        drop.y += drop.speed;

        // Reset if off bottom or left
        if (drop.y > 270 || drop.x < 0) {
          drop.x = Math.random() * 520;
          drop.y = -10;

          // Ground splash if in playable ground lane
          if (Math.random() < 0.25) {
            this.splashes.push({
              x: drop.x,
              y: 165 + Math.random() * 95,
              r: 1,
              maxR: 4 + Math.random() * 3,
              alpha: 0.6
            });
          }
        }
      }
    }

    // 2. UPDATE SPLASHES
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.r += dt * 14;
      s.alpha -= dt * 3.5;
      if (s.alpha <= 0) {
        this.splashes.splice(i, 1);
      }
    }

    // 3. THUNDERSTORM & LIGHTNING
    if (this.rainEnabled) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 8.0 + Math.random() * 12.0;
        this.triggerLightning();
      }
    }

    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.2);
    }

    // 4. ELECTRIC NEON SPARKS
    if (Math.random() < 0.08) {
      const sparkX = Math.random() * 480;
      this.sparks.push({
        x: sparkX,
        y: 80 + Math.random() * 35,
        vx: (Math.random() * 2 - 1) * 1.5,
        vy: 1.5 + Math.random() * 2.5,
        color: Math.random() < 0.5 ? '#ffd700' : '#05d9e8',
        life: 0.35 + Math.random() * 0.25
      });
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life -= dt;
      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }
  }

  triggerLightning() {
    this.lightningFlash = this.lightningFlashEnabled ? 0.85 : 0;
    window.soundEngine.playThunder();
    if (window.combatSystem && window.combatSystem.screenShakeEnabled) {
      window.combatSystem.triggerScreenShake(6, 0.35);
    }
  }

  // DRAW WET ASPHALT GROUND REFLECTIONS (Beneath entities)
  drawGroundReflections(ctx, renderList, cameraX, stageNum) {
    if (stageNum === 3) return; // Underground shrine has stone tiles instead

    ctx.save();
    // Clip to street walking area in camera space
    ctx.beginPath();
    ctx.rect(cameraX, 165, 480, 105);
    ctx.clip();

    // 1. Neon Sign Puddle Reflections
    ctx.globalAlpha = 0.14;
    for (let i = 0; i < 12; i++) {
      const signX = (i * 240) + 40;
      const puddleGrad = ctx.createLinearGradient(signX, 175, signX, 235);
      puddleGrad.addColorStop(0, i % 2 === 0 ? '#ff2a6d' : '#05d9e8');
      puddleGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = puddleGrad;
      ctx.fillRect(signX, 175, 45, 60);
    }

    // 2. Mirrored Character Ground Reflections
    for (const entity of renderList) {
      if (entity.isDead) continue;

      if (entity.isPlayer) {
        ctx.save();
        ctx.translate(entity.x, entity.y + 3);
        ctx.scale(1, -0.42);
        ctx.globalAlpha = 0.22;
        window.spriteRenderer.drawPlayer(ctx, entity.state, entity.animTime, entity.facing, entity.characterId, entity.weapon);
        ctx.restore();
      } else if (entity.type === 'thug') {
        ctx.save();
        ctx.translate(entity.x, entity.y + 3);
        ctx.scale(1, -0.42);
        ctx.globalAlpha = 0.18;
        window.spriteRenderer.drawThug(ctx, entity.state, entity.animTime, entity.facing);
        ctx.restore();
      } else if (entity.type === 'ninja') {
        ctx.save();
        ctx.translate(entity.x, entity.y + 3);
        ctx.scale(1, -0.42);
        ctx.globalAlpha = 0.18;
        window.spriteRenderer.drawNinja(ctx, entity.state, entity.animTime, entity.facing);
        ctx.restore();
      } else if (entity.type === 'bruiser') {
        ctx.save();
        ctx.translate(entity.x, entity.y + 3);
        ctx.scale(1, -0.42);
        ctx.globalAlpha = 0.18;
        window.spriteRenderer.drawBruiser(ctx, entity.state, entity.animTime, entity.facing);
        ctx.restore();
      } else if (entity.type === 'boss') {
        ctx.save();
        ctx.translate(entity.x, entity.y + 3);
        ctx.scale(1, -0.42);
        ctx.globalAlpha = 0.22;
        window.spriteRenderer.drawBoss(ctx, entity.state, entity.animTime, entity.facing, entity.isEnraged, entity.bossType);
        ctx.restore();
      }
    }

    // 3. Subtle Wet Puddle Ripple Lines
    ctx.strokeStyle = 'rgba(5, 217, 232, 0.08)';
    ctx.lineWidth = 1;
    for (let py = 175; py < 265; py += 12) {
      ctx.beginPath();
      ctx.moveTo(cameraX, py);
      ctx.lineTo(cameraX + 480, py);
      ctx.stroke();
    }

    ctx.restore();
  }

  // DRAW FOREGROUND WEATHER: RAIN, SPLASHES, SPARKS & LIGHTNING FLASH
  drawForeground(ctx) {
    ctx.save();

    // 1. Draw Falling Rain Streaks
    if (this.rainEnabled) {
      ctx.strokeStyle = 'rgba(175, 215, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const drop of this.rainDrops) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 4, drop.y + drop.len);
      }
      ctx.stroke();

      // Draw Ground Splash Rings
      for (const s of this.splashes) {
        ctx.strokeStyle = `rgba(180, 230, 255, ${s.alpha * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r * 1.8, s.r * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 2. Draw Electric Neon Sparks
    for (const sp of this.sparks) {
      ctx.fillStyle = sp.color;
      ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2);
    }

    // 3. Lightning Screen Flash (only if screen flashing is enabled)
    if (this.lightningFlashEnabled && this.lightningFlash > 0) {
      ctx.fillStyle = `rgba(225, 240, 255, ${this.lightningFlash * 0.65})`;
      ctx.fillRect(0, 0, 480, 270);
    }

    ctx.restore();
  }
}

window.weatherSystem = new WeatherSystem();
