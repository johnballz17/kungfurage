/**
 * CARPE'S KUNG FU RAGE - RETRO PIXEL ART SPRITE RENDERER
 * Procedurally draws crisp NES / 16-bit arcade sprites with pixel precision.
 */

class SpriteRenderer {
  constructor() {
    this.cache = new Map();
  }

  // Draw an oval perspective shadow on the belt-scroll ground plane
  drawShadow(ctx, x, y, width = 28, height = 10, heightAboveGround = 0) {
    ctx.save();
    const scale = Math.max(0.35, 1 - (heightAboveGround / 120));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y, (width / 2) * scale, (height / 2) * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Helper to draw a pixel block
  px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // MASTER PLAYER DRAW ROUTER
  drawPlayer(ctx, state, animTime, facing = 1, characterId = 'smellu', weapon = null) {
    if (!this.drawAcrobaticMove(ctx, state, animTime, facing, characterId)) {
      if (characterId === 'lindin') {
        this.drawLindin(ctx, state, animTime, facing, weapon);
      } else if (characterId === 'smoro') {
        this.drawSmoro(ctx, state, animTime, facing, weapon);
      } else {
        this.drawSmellu(ctx, state, animTime, facing, weapon);
      }
    }

    if (weapon) {
      this.drawEquippedWeapon(ctx, state, animTime, facing, characterId, weapon);
    }
  }

  // DRAW WEAPONS (NUNCHAKU, DAGGERS, LEAD PIPE) IN HANDS
  drawEquippedWeapon(ctx, state, animTime, facing, characterId, weapon) {
    if (!weapon) return;
    ctx.save();
    ctx.scale(facing, 1);

    const type = weapon.type;
    const isAttacking = state === 'nunchaku_attack' || state === 'dagger_attack' || state === 'pipe_attack' || state.startsWith('punch');

    if (type === 'nunchaku') {
      const cWood = '#b87333';
      const cChain = '#e0e0e0';
      if (isAttacking) {
        // Forward whipping thrust with spinning motion blur arc!
        this.px(ctx, 16, -26, 18, 4, cWood);
        this.px(ctx, 32, -28, 4, 14, cWood);
        this.px(ctx, 28, -28, 6, 3, cChain);
        // Spinning golden blur circle
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(28, -22, 14, -0.5, Math.PI * 0.8);
        ctx.stroke();
      } else {
        // Held at side / tucked under arm
        const bob = Math.sin(animTime * 6) * 1.5;
        this.px(ctx, 10, -24 + bob, 4, 14, cWood);
        this.px(ctx, 6, -20 + bob, 4, 12, cWood);
        this.px(ctx, 8, -26 + bob, 4, 3, cChain);
      }
    } else if (type === 'daggers') {
      const cSteel = '#e2e8f0';
      const cGold = '#ffd700';
      if (isAttacking) {
        // Crossed slash with gleaming crescent blade arcs!
        this.px(ctx, 18, -30, 14, 4, cSteel);
        this.px(ctx, 20, -29, 10, 2, '#ffffff');
        this.px(ctx, 14, -32, 4, 8, cGold);
        // Lower dagger
        this.px(ctx, 16, -18, 16, 4, cSteel);
        this.px(ctx, 18, -17, 12, 2, '#ffffff');
        this.px(ctx, 12, -20, 4, 8, cGold);
        // Slash arc
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(24, -24, 16, -0.6, 0.6);
        ctx.stroke();
      } else {
        // Held in reverse-grip ready stance
        this.px(ctx, 12, -24, 3, 12, cSteel);
        this.px(ctx, 10, -26, 6, 2, cGold);
        this.px(ctx, -8, -22, 3, 10, cSteel);
        this.px(ctx, -10, -24, 6, 2, cGold);
      }
    } else if (type === 'pipe') {
      const cPipe = '#a0abb7';
      const cSheen = '#dbe2ea';
      if (isAttacking) {
        // Heavy diagonal smash
        this.px(ctx, 14, -34, 6, 26, cPipe);
        this.px(ctx, 16, -32, 2, 22, cSheen);
        // Whoosh arc
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(18, -22, 20, -1.2, 0.4);
        ctx.stroke();
      } else {
        // Slung over shoulder / resting at hip
        this.px(ctx, -6, -36, 4, 28, cPipe);
        this.px(ctx, -5, -34, 2, 24, cSheen);
      }
    } else if (type === 'pistols' || type === 'dual_pistols') {
      const cGun = '#1c1917'; // Matte black polymer frame
      const cSlide = '#94a3b8'; // Steel slide
      const cGold = '#ffd700'; // Gold trigger / barrel tip
      const isShooting = state.startsWith('pistol') || state === 'air_pistol' || isAttacking;

      if (isShooting) {
        // Gun-fu extended arms holding dual handguns!
        // Right hand gun
        this.px(ctx, 16, -28, 12, 4, cSlide);
        this.px(ctx, 18, -26, 4, 7, cGun);
        this.px(ctx, 26, -28, 3, 4, cGold);

        // Left hand gun
        if (state === 'pistol_crossfire' || state === 'air_pistol') {
          // Crossed akimbo blast!
          this.px(ctx, 14, -18, 12, 4, cSlide);
          this.px(ctx, 16, -16, 4, 7, cGun);
          this.px(ctx, 24, -18, 3, 4, cGold);
        } else {
          this.px(ctx, 10, -20, 10, 4, cSlide);
          this.px(ctx, 12, -18, 4, 6, cGun);
        }

        // Muzzle flash on barrel
        if (state === 'pistol_shot1' || state === 'pistol_shot2' || state === 'pistol_crossfire' || state === 'air_pistol') {
          this.px(ctx, 29, -29, 6, 6, '#ffea00');
          this.px(ctx, 31, -28, 3, 4, '#ffffff');
          if (state === 'pistol_crossfire') {
            this.px(ctx, 27, -19, 6, 6, '#ffea00');
            this.px(ctx, 29, -18, 3, 4, '#ffffff');
          }
        }
      } else {
        // Dual pistols held ready in both hands
        const bob = Math.sin(animTime * 6) * 1.5;
        // Right gun
        this.px(ctx, 10, -26 + bob, 10, 4, cSlide);
        this.px(ctx, 10, -23 + bob, 4, 6, cGun);
        this.px(ctx, 18, -26 + bob, 2, 4, cGold);
        // Left gun
        this.px(ctx, -6, -24 + bob, 9, 4, cSlide);
        this.px(ctx, -6, -21 + bob, 4, 6, cGun);
        this.px(ctx, -8, -24 + bob, 2, 4, cGold);
      }
    }

    ctx.restore();
  }

  // ACROBATIC & EXPANDED COMBAT MOVES: FLIPS, RISING DRAGON, FLASH KICK, SWEEPS, ELBOWS & AXE KICKS
  drawAcrobaticMove(ctx, state, animTime, facing, characterId) {
    const acrobaticStates = [
      'front_flip', 'backflip', 'spin_kick', 'air_spin',
      'mega_punch_windup', 'mega_punch_strike',
      'shoryu_uppercut', 'flash_kick', 'low_sweep', 'ground_pound',
      'kick_axe', 'punch_gut', 'punch_elbow', 'one_inch_punch',
      'lunge_punch', 'thrust_kick', 'back_strike', 'air_hammer', 'air_split'
    ];
    if (!acrobaticStates.includes(state)) {
      return false;
    }

    ctx.save();
    ctx.scale(facing, 1);

    let cTunic = '#ffffff';
    let cTrim = '#ff2244';
    let cPants = '#222533';
    let cSkin = '#ffcc99';
    let cHair = '#221111';

    if (characterId === 'lindin') {
      cTunic = '#05d9e8';
      cTrim = '#ff0055';
      cPants = '#1a1429';
      cSkin = '#fed0bb';
      cHair = '#1b1b2f';
    } else if (characterId === 'smoro') {
      cTunic = '#2c1820';
      cTrim = '#ffd700';
      cPants = '#3b4338';
      cSkin = '#c68a5c';
      cHair = '#111115';
    }

    if (state === 'mega_punch_windup') {
      // ========================================================
      // CAPTAIN FALCON MEGA PUNCH HOMAGE: CHARGING WINDUP PHASE
      // ========================================================
      const bob = Math.sin(animTime * 25) * 1.2;

      // Deep Crane Windup Stance: Stepped backward, knees bent low
      this.px(ctx, -12, -43 + bob, 12, 10, cHair);
      this.px(ctx, -11, -39 + bob, 10, 8, cSkin);
      this.px(ctx, -12, -41 + bob, 12, 3, cTrim); // Headband
      this.px(ctx, -4, -38 + bob, 3, 2, '#ffffff'); // Glowing focused eyes!

      // Torso angled back
      this.px(ctx, -13, -31 + bob, 15, 14, cTunic);
      this.px(ctx, -13, -20 + bob, 15, 4, cTrim);

      // Lead arm forward guarding
      this.px(ctx, 0, -28 + bob, 10, 4, cTunic);
      this.px(ctx, 8, -29 + bob, 4, 5, cSkin);

      // Legs in deep grounded stance
      this.px(ctx, -16, -16, 7, 14, cPants);
      this.px(ctx, 3, -16, 7, 14, cPants);
      this.px(ctx, -18, -2, 9, 4, '#111');
      this.px(ctx, 3, -2, 9, 4, '#111');

      // Clenched rear fist pulled all the way back
      const fistX = -22;
      const fistY = -24 + bob;
      this.px(ctx, fistX - 2, fistY - 3, 8, 8, cSkin);
      this.px(ctx, fistX - 1, fistY - 4, 6, 3, cTrim); // Wrist wrap

      // Blazing Swirling Ki Vortex coalescing into the fist!
      const pulse = Math.sin(animTime * 35) * 3;
      ctx.fillStyle = (Math.floor(animTime * 25) % 2 === 0) ? 'rgba(255, 69, 0, 0.45)' : 'rgba(255, 215, 0, 0.45)';
      ctx.beginPath();
      ctx.arc(fistX + 2, fistY, 14 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Inward spiraling energy spark motes
      for (let i = 0; i < 7; i++) {
        const angle = animTime * 22 + (i * Math.PI * 2 / 7);
        const r = 18 - ((animTime * 25 + i * 3) % 12);
        const sx = fistX + 2 + Math.cos(angle) * r;
        const sy = fistY + Math.sin(angle) * r;
        const sparkCol = (i % 3 === 0) ? '#ffd700' : ((i % 3 === 1) ? '#ff4500' : '#ffffff');
        this.px(ctx, Math.round(sx), Math.round(sy), 3, 3, sparkCol);
      }

      ctx.restore();
      return true;
    }
    else if (state === 'mega_punch_strike') {
      // ========================================================
      // CAPTAIN FALCON MEGA PUNCH HOMAGE: EXPLOSIVE DRAGON KNUCKLE!
      // ========================================================
      // Full Rocket Forward Thrust!
      this.px(ctx, 2, -41, 12, 10, cHair);
      this.px(ctx, 4, -37, 10, 8, cSkin);
      this.px(ctx, 2, -39, 12, 3, cTrim);
      this.px(ctx, 11, -36, 3, 2, '#00ffff'); // Gleaming fierce eyes!

      // Forward lunging torso
      this.px(ctx, -2, -31, 16, 13, cTunic);
      this.px(ctx, -2, -20, 16, 4, cTrim);

      // Trailing arm back for propulsion
      this.px(ctx, -14, -26, 12, 4, cTunic);
      this.px(ctx, -18, -25, 5, 5, cSkin);

      // Full horizontal leg split thrust
      this.px(ctx, -24, -16, 22, 6, cPants);
      this.px(ctx, -28, -17, 8, 7, '#111');
      this.px(ctx, 4, -16, 14, 15, cPants);
      this.px(ctx, 6, -1, 11, 4, '#111');

      // Extended punch arm driving forward
      this.px(ctx, 12, -28, 20, 7, cTunic);
      this.px(ctx, 28, -29, 6, 6, cTrim); // Golden wrist band
      this.px(ctx, 32, -30, 9, 8, cSkin); // Clenched mega fist

      // ========================================================
      // THE GIANT FLAMING DRAGON HEAD AURA (FALCON PUNCH HOMAGE)
      // ========================================================
      const fFlame1 = characterId === 'lindin' ? '#05d9e8' : (characterId === 'smoro' ? '#b91c1c' : '#ff4500');
      const fFlame2 = characterId === 'lindin' ? '#ff0055' : (characterId === 'smoro' ? '#f59e0b' : '#ffd700');
      const fGlow = characterId === 'lindin' ? 'rgba(5, 217, 232, 0.5)' : (characterId === 'smoro' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 69, 0, 0.5)');

      // Pulsing outer heat wave
      const flamePulse = Math.sin(animTime * 40) * 3;
      ctx.fillStyle = fGlow;
      ctx.beginPath();
      ctx.arc(46, -26, 24 + flamePulse, 0, Math.PI * 2);
      ctx.fill();

      // Upper Dragon Snout & Jaws
      this.px(ctx, 34, -36, 24, 7, fFlame1);
      this.px(ctx, 48, -38, 20, 6, fFlame2);
      this.px(ctx, 64, -37, 16, 5, '#ffffff'); // Snout tip

      // Dragon Teeth / Fangs (Upper)
      this.px(ctx, 52, -31, 3, 4, '#ffffff');
      this.px(ctx, 60, -32, 4, 5, '#ffffff');
      this.px(ctx, 68, -32, 3, 4, '#ffffff');

      // Lower Dragon Jaws
      this.px(ctx, 36, -22, 22, 6, fFlame1);
      this.px(ctx, 48, -20, 18, 5, fFlame2);
      this.px(ctx, 60, -21, 12, 4, '#ffffff');

      // Dragon Teeth / Fangs (Lower)
      this.px(ctx, 54, -25, 3, 4, '#ffffff');
      this.px(ctx, 62, -26, 4, 5, '#ffffff');

      // Glowing Dragon Eye
      this.px(ctx, 56, -37, 5, 4, '#00ffff');
      this.px(ctx, 58, -36, 2, 2, '#ffffff');

      // Dragon Crest & Flaming Horns billowing backwards
      this.px(ctx, 28, -44, 20, 5, fFlame2);
      this.px(ctx, 22, -48, 18, 4, fFlame1);
      this.px(ctx, 16, -42, 14, 4, fFlame2);
      this.px(ctx, 12, -36, 16, 4, fFlame1);

      // Trailing Rocket Flame Plumes behind punch
      this.px(ctx, -38, -20, 16, 3, fFlame2);
      this.px(ctx, -34, -14, 14, 2, fFlame1);
      this.px(ctx, -42, -26, 18, 3, '#ffffff');

      ctx.restore();
      return true;
    }
    else if (state === 'front_flip') {
      // 360-DEGREE ROTATING FRONT SOMERSAULT AXE DROP
      ctx.translate(0, -22);
      ctx.rotate(animTime * 12);

      this.px(ctx, -8, -8, 16, 16, cTunic);
      this.px(ctx, -6, -14, 12, 8, cHair);
      this.px(ctx, -4, -12, 8, 6, cSkin);

      // Rotating legs with extended heel cutting an arc
      this.px(ctx, -4, 4, 14, 10, cPants);
      this.px(ctx, 4, -18, 16, 7, cPants);
      this.px(ctx, 18, -20, 8, 8, cTrim);

      // Golden speed spin aura
      ctx.strokeStyle = characterId === 'lindin' ? '#05d9e8' : (characterId === 'smoro' ? '#ff4400' : '#ffd700');
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      return true;
    }
    else if (state === 'backflip') {
      // ACROBATIC EVASIVE BACKFLIP LEAP
      ctx.translate(0, -22);
      ctx.rotate(-animTime * 12);

      this.px(ctx, -8, -8, 16, 16, cTunic);
      this.px(ctx, -6, -14, 12, 8, cHair);
      this.px(ctx, -14, -18, 16, 7, cPants);
      this.px(ctx, -22, -20, 8, 8, cTrim);

      ctx.strokeStyle = '#05d9e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      return true;
    }
    else if (state === 'spin_kick') {
      // 360 TORNADO SPINNING GROUND KICK
      this.px(ctx, -6, -42, 12, 10, cHair);
      this.px(ctx, -5, -38, 10, 8, cSkin);
      this.px(ctx, -7, -30, 14, 14, cTunic);
      this.px(ctx, -7, -20, 14, 4, cTrim);

      // Twin spinning horizontal roundhouses
      this.px(ctx, -26, -28, 52, 8, cPants);
      this.px(ctx, -30, -29, 7, 9, cTrim);
      this.px(ctx, 23, -29, 7, 9, cTrim);

      this.px(ctx, -36, -27, 5, 5, '#ffd700');
      this.px(ctx, 30, -27, 5, 5, '#ffd700');

      ctx.restore();
      return true;
    }
    else if (state === 'air_spin') {
      // AERIAL CYCLONE HURRICANE KICK
      this.px(ctx, -6, -40, 12, 10, cHair);
      this.px(ctx, -5, -36, 10, 8, cSkin);
      this.px(ctx, -7, -28, 14, 12, cTunic);

      this.px(ctx, -26, -22, 52, 8, cPants);
      this.px(ctx, -30, -23, 7, 9, cTrim);
      this.px(ctx, 23, -23, 7, 9, cTrim);

      ctx.strokeStyle = characterId === 'lindin' ? '#05d9e8' : '#00ff66';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -22, 32, 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      return true;
    }
    else if (state === 'shoryu_uppercut') {
      // 1. RISING DRAGON UPPERCUT (SHORYUKEN HOMAGE)
      // Head tilted up
      this.px(ctx, -4, -48, 12, 10, cHair);
      this.px(ctx, -3, -44, 10, 8, cSkin);
      this.px(ctx, -4, -46, 12, 3, cTrim);
      this.px(ctx, 3, -45, 2, 2, '#fff');

      // Torso stretched upwards
      this.px(ctx, -5, -36, 13, 16, cTunic);
      this.px(ctx, -5, -22, 13, 4, cTrim);

      // Lead Fist rocketed straight up into the stratosphere!
      this.px(ctx, 3, -56, 7, 22, cTunic);
      this.px(ctx, 3, -64, 8, 8, cTrim); // Wrist wrap
      this.px(ctx, 4, -70, 7, 7, cSkin); // Raised fist

      // Trailing Ki dragon flames spiraling upward
      const flameCol = characterId === 'lindin' ? '#05d9e8' : (characterId === 'smoro' ? '#ffd700' : '#ff0055');
      this.px(ctx, 1, -74, 12, 5, flameCol);
      this.px(ctx, 3, -78, 8, 4, '#ffffff');

      // Tucked rear leg & trailing lead leg
      this.px(ctx, -9, -18, 6, 14, cPants);
      this.px(ctx, 2, -18, 6, 20, cPants);
      this.px(ctx, -10, -5, 8, 5, '#111');
      this.px(ctx, 2, 0, 8, 5, '#111');

      ctx.restore();
      return true;
    }
    else if (state === 'flash_kick') {
      // 2. SOMERSAULT FLASH KICK (GUILE HOMAGE)
      ctx.translate(0, -22);
      ctx.rotate(-animTime * 14);

      // Inverted somersault kicking posture
      this.px(ctx, -6, -8, 12, 12, cTunic);
      this.px(ctx, -4, 2, 10, 8, cSkin);
      this.px(ctx, -4, 8, 10, 6, cHair);

      // Full vertical slashing leg
      this.px(ctx, 4, -30, 8, 26, cPants);
      this.px(ctx, 4, -36, 9, 7, cTrim);

      // Glowing Crescent Blade Arc
      ctx.strokeStyle = characterId === 'lindin' ? '#05d9e8' : '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 32, -Math.PI * 0.8, Math.PI * 0.2);
      ctx.stroke();

      ctx.restore();
      return true;
    }
    else if (state === 'low_sweep') {
      // 3. LOW LEG SWEEP (CROUCHING CIRCULAR TRIP)
      // Low crouched head & torso
      this.px(ctx, -8, -26, 12, 10, cHair);
      this.px(ctx, -7, -22, 10, 8, cSkin);
      this.px(ctx, -8, -24, 12, 3, cTrim);
      this.px(ctx, -10, -16, 15, 11, cTunic);

      // Support hand planted on asphalt
      this.px(ctx, -14, -6, 5, 6, cSkin);

      // Extended sweeping leg skimming along the floor
      this.px(ctx, -6, -8, 38, 7, cPants);
      this.px(ctx, 28, -9, 8, 8, cTrim); // Sweeping shoe

      // Ground friction dust sparks
      this.px(ctx, 36, -6, 4, 4, '#ffd700');
      this.px(ctx, 32, -10, 3, 3, '#ffffff');

      ctx.restore();
      return true;
    }
    else if (state === 'kick_axe') {
      // 4. OVERHEAD AXE HEEL DROP (VERTICAL SLAM)
      this.px(ctx, -7, -42, 12, 10, cHair);
      this.px(ctx, -6, -38, 10, 8, cSkin);
      this.px(ctx, -7, -40, 12, 3, cTrim);
      this.px(ctx, -8, -30, 14, 14, cTunic);

      // Standing support leg
      this.px(ctx, -10, -16, 7, 16, cPants);
      this.px(ctx, -12, -2, 9, 4, '#111');

      // Heavy Axe Leg snapping downward
      this.px(ctx, 8, -44, 8, 38, cPants);
      this.px(ctx, 8, -6, 10, 8, cTrim);

      // Vertical downward speed streaks
      this.px(ctx, 16, -36, 2, 28, '#ffffff');
      this.px(ctx, 19, -24, 2, 20, '#ff0055');

      ctx.restore();
      return true;
    }
    else if (state === 'punch_gut') {
      // 5. HEAVY GUT HOOK (LIVER BLOW)
      this.px(ctx, -2, -38, 12, 10, cHair);
      this.px(ctx, -1, -34, 10, 8, cSkin);
      this.px(ctx, -2, -36, 12, 3, cTrim);
      this.px(ctx, -4, -26, 15, 13, cTunic);

      // Stance
      this.px(ctx, -12, -14, 7, 14, cPants);
      this.px(ctx, 4, -14, 7, 14, cPants);
      this.px(ctx, -14, -1, 9, 4, '#111');
      this.px(ctx, 4, -1, 9, 4, '#111');

      // Driving Uppercut Hook into the Gut
      this.px(ctx, 10, -22, 14, 7, cTunic);
      this.px(ctx, 22, -23, 6, 8, cTrim);
      this.px(ctx, 27, -24, 7, 7, cSkin);

      // Orange Impact Flash
      this.px(ctx, 33, -25, 6, 6, '#ff7700');
      this.px(ctx, 35, -23, 3, 3, '#ffffff');

      ctx.restore();
      return true;
    }
    else if (state === 'punch_elbow') {
      // 6. STEPPING ELBOW SMASH
      this.px(ctx, 0, -40, 12, 10, cHair);
      this.px(ctx, 1, -36, 10, 8, cSkin);
      this.px(ctx, 0, -38, 12, 3, cTrim);
      this.px(ctx, -2, -28, 15, 14, cTunic);

      this.px(ctx, -10, -15, 7, 15, cPants);
      this.px(ctx, 5, -15, 8, 15, cPants);
      this.px(ctx, -12, -1, 9, 4, '#111');
      this.px(ctx, 5, -1, 10, 4, '#111');

      // Tucked elbow thrusting forward like a battering ram
      this.px(ctx, 12, -26, 10, 9, cTunic);
      this.px(ctx, 20, -27, 8, 10, cTrim); // Point of the elbow
      this.px(ctx, 26, -26, 4, 6, '#ffd700'); // Kinetic strike spark

      ctx.restore();
      return true;
    }
    else if (state === 'one_inch_punch') {
      // 7. ONE-INCH KI BLAST FINISHER
      // Proud Crane Master stance
      this.px(ctx, -6, -42, 12, 10, cHair);
      this.px(ctx, -5, -38, 10, 8, cSkin);
      this.px(ctx, -6, -40, 12, 3, cTrim);
      this.px(ctx, -7, -30, 14, 15, cTunic);

      this.px(ctx, -11, -15, 7, 15, cPants);
      this.px(ctx, 3, -15, 7, 15, cPants);
      this.px(ctx, -13, -1, 9, 4, '#111');
      this.px(ctx, 3, -1, 9, 4, '#111');

      // Open Palm thrust forward just one inch
      this.px(ctx, 7, -26, 16, 5, cTunic);
      this.px(ctx, 22, -28, 5, 8, cSkin);

      // Explosive Golden Ki Blast Ring
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(28, -24, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      return true;
    }
    else if (state === 'lunge_punch') {
      // 8. SUPERMAN LUNGE PUNCH (FORWARD BLITZ)
      // Horizontal flying body
      this.px(ctx, 6, -34, 12, 10, cHair);
      this.px(ctx, 7, -30, 10, 8, cSkin);
      this.px(ctx, 6, -32, 12, 3, cTrim);
      this.px(ctx, -8, -26, 22, 11, cTunic);

      // Fist leading forward
      this.px(ctx, 14, -25, 18, 6, cTunic);
      this.px(ctx, 30, -26, 7, 7, cSkin);
      this.px(ctx, 36, -26, 4, 5, '#05d9e8'); // Speed spark

      // Trailing horizontal legs behind in air
      this.px(ctx, -28, -24, 22, 7, cPants);
      this.px(ctx, -34, -25, 8, 7, '#111');

      ctx.restore();
      return true;
    }
    else if (state === 'thrust_kick') {
      // 9. SIDE THRUST DROPKICK
      this.px(ctx, -12, -40, 12, 10, cHair);
      this.px(ctx, -11, -36, 10, 8, cSkin);
      this.px(ctx, -12, -38, 12, 3, cTrim);
      this.px(ctx, -12, -28, 14, 14, cTunic);

      this.px(ctx, -16, -14, 8, 15, cPants);
      this.px(ctx, -18, 0, 9, 4, '#111');

      // Heavy horizontal side kick thrusting forward
      this.px(ctx, 2, -25, 30, 8, cPants);
      this.px(ctx, 30, -26, 8, 9, cTrim); // Boot sole
      this.px(ctx, 37, -25, 4, 6, '#ff0055');

      ctx.restore();
      return true;
    }
    else if (state === 'back_strike') {
      // 10. REVERSE BACKFIST / MULE KICK
      this.px(ctx, -4, -41, 12, 10, cHair);
      this.px(ctx, -8, -37, 10, 8, cSkin); // Head facing backward
      this.px(ctx, -4, -39, 12, 3, cTrim);
      this.px(ctx, -6, -29, 14, 14, cTunic);

      // Backfist striking behind
      this.px(ctx, -22, -26, 16, 6, cTunic);
      this.px(ctx, -28, -27, 7, 7, cSkin);
      this.px(ctx, -33, -27, 4, 6, '#ff00aa');

      this.px(ctx, -8, -15, 7, 15, cPants);
      this.px(ctx, 4, -15, 7, 15, cPants);
      this.px(ctx, -10, -1, 9, 4, '#111');
      this.px(ctx, 4, -1, 9, 4, '#111');

      ctx.restore();
      return true;
    }
    else if (state === 'ground_pound') {
      // 11. GROUND SLAM / LOW KNUCKLE
      this.px(ctx, -6, -28, 12, 10, cHair);
      this.px(ctx, -5, -24, 10, 8, cSkin);
      this.px(ctx, -6, -26, 12, 3, cTrim);
      this.px(ctx, -8, -18, 16, 12, cTunic);

      this.px(ctx, -14, -8, 10, 10, cPants);
      this.px(ctx, 2, -8, 10, 10, cPants);

      // Fist slammed into the ground
      this.px(ctx, 10, -12, 6, 12, cTunic);
      this.px(ctx, 10, -4, 9, 8, cSkin);

      // Radial Ground Shockwaves
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(14, 0, 24, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      return true;
    }
    else if (state === 'air_hammer') {
      // 12. AERIAL HAMMER DROP (METEOR SLAM)
      this.px(ctx, -6, -38, 12, 10, cHair);
      this.px(ctx, -5, -34, 10, 8, cSkin);
      this.px(ctx, -6, -26, 13, 13, cTunic);

      // Both arms clasped driving downward
      this.px(ctx, 4, -26, 10, 16, cTunic);
      this.px(ctx, 6, -10, 9, 9, cSkin); // Double fist hammer

      this.px(ctx, -8, -14, 6, 12, cPants);
      this.px(ctx, 1, -14, 6, 12, cPants);

      this.px(ctx, 10, -2, 4, 8, '#ffd700');

      ctx.restore();
      return true;
    }
    else if (state === 'air_split') {
      // 13. AERIAL SPLIT KICK (HITS BOTH SIDES)
      this.px(ctx, -6, -38, 12, 10, cHair);
      this.px(ctx, -5, -34, 10, 8, cSkin);
      this.px(ctx, -6, -26, 12, 12, cTunic);

      // Left leg fully extended left, Right leg fully extended right
      this.px(ctx, -32, -20, 28, 7, cPants);
      this.px(ctx, -38, -21, 8, 8, cTrim);

      this.px(ctx, 4, -20, 28, 7, cPants);
      this.px(ctx, 30, -21, 8, 8, cTrim);

      this.px(ctx, -43, -20, 4, 5, '#00ffcc');
      this.px(ctx, 37, -20, 4, 5, '#00ffcc');

      ctx.restore();
      return true;
    }

    ctx.restore();
    return false;
  }

  // =======================================================
  // 1. SMELLU - THE BALANCED DRAGON
  // =======================================================
  drawSmellu(ctx, state, animTime, facing = 1, weapon = null) {
    ctx.save();
    ctx.scale(facing, 1);

    const f = Math.floor(animTime * 8);

    // Color Palette
    const cSkin = '#ffcc99';
    const cGi = '#ffffff';
    const cGiShadow = '#c5c5d0';
    const cHeadband = '#ff2244';
    const cSash = '#dd1133';
    const cPants = '#222533';
    const cPantsShadow = '#141620';
    const cHair = '#221111';
    const cShoe = '#443322';

    if (state === 'idle') {
      const bob = Math.sin(animTime * 6) * 1.5;
      // Head & Hair
      this.px(ctx, -6, -44 + bob, 12, 10, cHair);
      this.px(ctx, -5, -40 + bob, 10, 8, cSkin);
      // Red Headband with tails
      this.px(ctx, -6, -42 + bob, 12, 3, cHeadband);
      this.px(ctx, -10, -42 + bob + Math.sin(animTime * 4) * 2, 4, 2, cHeadband);
      this.px(ctx, -12, -40 + bob + Math.sin(animTime * 4) * 3, 3, 2, cHeadband);
      // Eyes
      this.px(ctx, 1, -39 + bob, 2, 2, '#000');

      // Torso / Gi
      this.px(ctx, -7, -32 + bob, 14, 14, cGi);
      this.px(ctx, -3, -32 + bob, 6, 8, cSkin); // Open V chest
      this.px(ctx, -7, -22 + bob, 14, 4, cSash); // Red belt/sash

      // Guarding Kung-Fu Arms
      this.px(ctx, -1, -30 + bob, 9, 4, cGi);
      this.px(ctx, 7, -33 + bob, 4, 5, cHeadband); // Wrist wrap
      this.px(ctx, 8, -35 + bob, 4, 4, cSkin); // Fist

      this.px(ctx, -8, -29 + bob, 4, 7, cGi);
      this.px(ctx, -8, -22 + bob, 4, 4, cSkin);

      // Legs / Pants
      this.px(ctx, -7, -18, 6, 14, cPants);
      this.px(ctx, 1, -18, 6, 14, cPants);
      // Shoes
      this.px(ctx, -9, -4, 8, 4, cShoe);
      this.px(ctx, 1, -4, 8, 4, cShoe);
    } 
    else if (state === 'walk') {
      const step = Math.floor(animTime * 9) % 4;
      const bob = (step % 2 === 0) ? -1 : 1;

      // Head
      this.px(ctx, -5, -43 + bob, 12, 10, cHair);
      this.px(ctx, -4, -39 + bob, 10, 8, cSkin);
      this.px(ctx, -5, -41 + bob, 12, 3, cHeadband);
      this.px(ctx, -9, -41 + bob + step, 4, 2, cHeadband);
      this.px(ctx, 2, -38 + bob, 2, 2, '#000');

      // Torso
      this.px(ctx, -6, -31 + bob, 13, 13, cGi);
      this.px(ctx, -6, -21 + bob, 13, 4, cSash);

      // Arms swinging
      const armSwing = Math.sin(animTime * 9) * 6;
      this.px(ctx, 3 + armSwing, -28 + bob, 5, 4, cGi);
      this.px(ctx, 7 + armSwing, -27 + bob, 4, 4, cSkin);

      // Legs walking cycle
      if (step === 0) {
        this.px(ctx, -9, -17, 6, 12, cPants);
        this.px(ctx, 3, -17, 6, 12, cPants);
        this.px(ctx, -11, -5, 8, 5, cShoe);
        this.px(ctx, 3, -5, 8, 5, cShoe);
      } else if (step === 1) {
        this.px(ctx, -5, -17, 6, 14, cPants);
        this.px(ctx, 0, -17, 6, 14, cPants);
        this.px(ctx, -6, -3, 8, 4, cShoe);
        this.px(ctx, 1, -3, 8, 4, cShoe);
      } else if (step === 2) {
        this.px(ctx, 3, -17, 6, 12, cPants);
        this.px(ctx, -9, -17, 6, 12, cPants);
        this.px(ctx, 3, -5, 8, 5, cShoe);
        this.px(ctx, -11, -5, 8, 5, cShoe);
      } else {
        this.px(ctx, -2, -18, 6, 15, cPants);
        this.px(ctx, -3, -18, 6, 15, cPants);
        this.px(ctx, -3, -3, 8, 4, cShoe);
        this.px(ctx, 0, -3, 8, 4, cShoe);
      }
    }
    else if (state === 'punch1' || state === 'nunchaku_attack' || state === 'dagger_attack' || state === 'pipe_attack' || state.startsWith('pistol') || state === 'air_pistol') {
      // Fast Lead Jab / Weapon Strike
      this.px(ctx, -4, -42, 12, 10, cHair);
      this.px(ctx, -3, -38, 10, 8, cSkin);
      this.px(ctx, -4, -40, 12, 3, cHeadband);
      this.px(ctx, 3, -37, 2, 2, '#000');

      this.px(ctx, -5, -30, 13, 13, cGi);
      this.px(ctx, -5, -20, 13, 4, cSash);

      // Extended Punch Arm!
      this.px(ctx, 6, -28, 16, 5, cGi);
      this.px(ctx, 21, -29, 4, 6, cHeadband); // Red wristband
      this.px(ctx, 25, -29, 6, 6, cSkin); // Glowing Fist

      // Stance
      this.px(ctx, -10, -16, 6, 13, cPants);
      this.px(ctx, 4, -16, 7, 13, cPants);
      this.px(ctx, -12, -3, 8, 4, cShoe);
      this.px(ctx, 4, -3, 9, 4, cShoe);
    }
    else if (state === 'punch2') {
      // Straight Cross Punch
      this.px(ctx, -2, -41, 12, 10, cHair);
      this.px(ctx, -1, -37, 10, 8, cSkin);
      this.px(ctx, -2, -39, 12, 3, cHeadband);
      this.px(ctx, 4, -36, 2, 2, '#000');

      this.px(ctx, -4, -29, 14, 13, cGi);
      this.px(ctx, -4, -19, 14, 4, cSash);

      // Rear Arm lunging forward
      this.px(ctx, 4, -26, 18, 6, cGi);
      this.px(ctx, 22, -27, 4, 7, cHeadband);
      this.px(ctx, 26, -27, 7, 7, cSkin);

      this.px(ctx, -11, -15, 6, 14, cPants);
      this.px(ctx, 6, -15, 7, 14, cPants);
      this.px(ctx, -13, -2, 8, 4, cShoe);
      this.px(ctx, 7, -2, 9, 4, cShoe);
    }
    else if (state === 'punch3') {
      // Dragon Palm Strike (Knockdown Finisher!)
      this.px(ctx, 0, -40, 12, 10, cHair);
      this.px(ctx, 1, -36, 10, 8, cSkin);
      this.px(ctx, 0, -38, 12, 3, cHeadband);
      this.px(ctx, -8, -38, 8, 3, cHeadband); // Bandana blowing back!
      this.px(ctx, 6, -35, 2, 2, '#fff'); // Fiery eyes

      this.px(ctx, -2, -28, 15, 14, cGi);
      this.px(ctx, -2, -18, 15, 4, cSash);

      // Deep Double Palm Strike
      this.px(ctx, 8, -26, 18, 7, cGi);
      this.px(ctx, 26, -27, 5, 8, cHeadband);
      this.px(ctx, 31, -29, 6, 12, cSkin); // Open thrusting palm

      // Ki fire glow on palms
      this.px(ctx, 34, -28, 4, 10, '#ffd700');
      this.px(ctx, 38, -26, 3, 6, '#ff4400');

      // Deep wide martial stance
      this.px(ctx, -14, -14, 7, 13, cPants);
      this.px(ctx, 7, -14, 8, 13, cPants);
      this.px(ctx, -17, -1, 10, 4, cShoe);
      this.px(ctx, 8, -1, 10, 4, cShoe);
    }
    else if (state === 'kick1') {
      // High Roundhouse Kick
      this.px(ctx, -7, -42, 12, 10, cHair);
      this.px(ctx, -6, -38, 10, 8, cSkin);
      this.px(ctx, -7, -40, 12, 3, cHeadband);
      this.px(ctx, 0, -37, 2, 2, '#000');

      this.px(ctx, -8, -30, 13, 14, cGi);
      this.px(ctx, -8, -20, 13, 4, cSash);

      // Standing leg
      this.px(ctx, -7, -16, 7, 14, cPants);
      this.px(ctx, -9, -2, 9, 4, cShoe);

      // High horizontal kicking leg
      this.px(ctx, 3, -30, 18, 7, cPants);
      this.px(ctx, 21, -32, 9, 8, cShoe);
      this.px(ctx, 29, -31, 3, 6, '#fff'); // Motion flash
    }
    else if (state === 'kick2') {
      // Spinning Crescent Kick
      this.px(ctx, -5, -42, 12, 10, cHair);
      this.px(ctx, -4, -38, 10, 8, cSkin);
      this.px(ctx, -5, -40, 12, 3, cHeadband);

      this.px(ctx, -6, -30, 14, 14, cGi);
      this.px(ctx, -6, -20, 14, 4, cSash);

      this.px(ctx, -6, -16, 7, 14, cPants);
      this.px(ctx, -8, -2, 8, 4, cShoe);

      // Upward arc kick!
      this.px(ctx, 4, -36, 12, 8, cPants);
      this.px(ctx, 14, -45, 8, 10, cShoe);
      this.px(ctx, 16, -49, 4, 6, '#05d9e8'); // Cyan kick flash
    }
    else if (state === 'jump') {
      // Airborne Tuck / Rise
      this.px(ctx, -6, -40, 12, 10, cHair);
      this.px(ctx, -5, -36, 10, 8, cSkin);
      this.px(ctx, -6, -38, 12, 3, cHeadband);
      this.px(ctx, -10, -36, 4, 2, cHeadband);

      this.px(ctx, -7, -28, 14, 12, cGi);
      this.px(ctx, -7, -18, 14, 4, cSash);

      // Tucked knees
      this.px(ctx, -8, -14, 7, 8, cPants);
      this.px(ctx, 0, -14, 7, 8, cPants);
      this.px(ctx, -8, -6, 7, 5, cShoe);
      this.px(ctx, 1, -6, 7, 5, cShoe);
    }
    else if (state === 'jump_kick') {
      // CLASSIC KUNG-FU MASTER / TMNT FLYING JUMP KICK
      this.px(ctx, -8, -36, 12, 10, cHair);
      this.px(ctx, -7, -32, 10, 8, cSkin);
      this.px(ctx, -8, -34, 12, 3, cHeadband);
      this.px(ctx, -13, -33, 5, 2, cHeadband);

      // Angled body
      this.px(ctx, -6, -24, 15, 11, cGi);
      this.px(ctx, -8, -26, 4, 12, cGi); // Rear arm up for balance

      // Tucked back leg
      this.px(ctx, -13, -18, 8, 7, cPants);
      this.px(ctx, -14, -11, 7, 5, cShoe);

      // Fully extended flying kick foot!
      this.px(ctx, 7, -22, 18, 7, cPants);
      this.px(ctx, 24, -22, 10, 7, cShoe);
      // Wind speed trail
      this.px(ctx, 33, -21, 5, 5, '#ffff55');
      this.px(ctx, -20, -22, 6, 2, 'rgba(255,255,255,0.7)');
    }
    else if (state === 'special') {
      // DRAGON KI BURST / FLAMING WHIRLWIND
      const rot = animTime * 25;
      const pulse = Math.sin(animTime * 30) * 4;

      // Aura flame rings around player
      ctx.fillStyle = (Math.floor(animTime * 20) % 2 === 0) ? 'rgba(255, 68, 0, 0.4)' : 'rgba(255, 215, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(0, -22, 28 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Spinning fighter silhouette
      this.px(ctx, -7, -43, 14, 11, '#ffdd88');
      this.px(ctx, -8, -32, 16, 14, '#ffffff');
      this.px(ctx, -8, -20, 16, 4, '#ff2244');

      // Twin spinning arms / palms
      this.px(ctx, -24, -28, 48, 6, '#ffaa00');
      this.px(ctx, -26, -29, 6, 8, '#ffffff');
      this.px(ctx, 22, -29, 6, 8, '#ffffff');

      // Spinning legs
      this.px(ctx, -18, -14, 36, 8, '#222533');
      this.px(ctx, -20, -12, 6, 6, '#443322');
      this.px(ctx, 16, -12, 6, 6, '#443322');
    }
    else if (state === 'grab') {
      // Grabbing enemy by collar
      this.px(ctx, -6, -42, 12, 10, cHair);
      this.px(ctx, -5, -38, 10, 8, cSkin);
      this.px(ctx, -6, -40, 12, 3, cHeadband);
      this.px(ctx, -7, -30, 14, 14, cGi);
      this.px(ctx, -7, -20, 14, 4, cSash);

      // Both arms locked forward holding enemy
      this.px(ctx, 6, -28, 14, 5, cGi);
      this.px(ctx, 18, -29, 5, 6, cSkin);

      this.px(ctx, -8, -16, 6, 14, cPants);
      this.px(ctx, 2, -16, 6, 14, cPants);
      this.px(ctx, -10, -2, 8, 4, cShoe);
      this.px(ctx, 2, -2, 8, 4, cShoe);
    }
    else if (state === 'throw') {
      // Judo Shoulder Throw!
      this.px(ctx, -10, -32, 12, 10, cHair);
      this.px(ctx, -9, -28, 10, 8, cSkin);
      this.px(ctx, -10, -30, 12, 3, cHeadband);

      this.px(ctx, -12, -22, 15, 12, cGi);
      this.px(ctx, -12, -14, 15, 4, cSash);

      // Deep bent knees throwing leverage
      this.px(ctx, -14, -10, 8, 10, cPants);
      this.px(ctx, 2, -10, 8, 10, cPants);
      this.px(ctx, -16, -1, 10, 4, cShoe);
      this.px(ctx, 2, -1, 10, 4, cShoe);

      // Throwing arms overhead
      this.px(ctx, 0, -34, 6, 14, cGi);
      this.px(ctx, 3, -38, 6, 6, cSkin);
    }
    else if (state === 'hurt') {
      // Flinch
      this.px(ctx, -9, -40, 12, 10, cHair);
      this.px(ctx, -8, -36, 10, 8, cSkin);
      this.px(ctx, -9, -38, 12, 3, cHeadband);
      this.px(ctx, -3, -35, 3, 2, '#880000'); // Grimace

      this.px(ctx, -8, -28, 13, 14, cGi);
      this.px(ctx, -8, -18, 13, 4, cSash);

      this.px(ctx, -8, -14, 6, 12, cPants);
      this.px(ctx, -1, -14, 6, 12, cPants);
      this.px(ctx, -10, -2, 8, 4, cShoe);
      this.px(ctx, -1, -2, 8, 4, cShoe);
    }
    else if (state === 'knockdown') {
      // Knockback through the air / flat on back
      this.px(ctx, -20, -14, 10, 12, cHair);
      this.px(ctx, -16, -13, 8, 10, cSkin);
      this.px(ctx, -18, -14, 10, 3, cHeadband);

      this.px(ctx, -8, -12, 16, 10, cGi);
      this.px(ctx, 2, -12, 4, 10, cSash);

      this.px(ctx, 8, -12, 14, 7, cPants);
      this.px(ctx, 20, -12, 6, 7, cShoe);
    }

    ctx.restore();
  }

  // =======================================================
  // 2. LINDIN - THE AGILE VIPER
  // =======================================================
  drawLindin(ctx, state, animTime, facing = 1, weapon = null) {
    ctx.save();
    ctx.scale(facing, 1);

    const cSkin = '#fed0bb';
    const cVest = '#05d9e8';
    const cVestTrim = '#ffd700';
    const cSash = '#9b5de5';
    const cPants = '#1a1429';
    const cHair = '#1b1b2f';
    const cRibbon = '#ff0055';
    const cShoe = '#ffffff';

    if (state === 'idle') {
      const bob = Math.sin(animTime * 8) * 1.8;
      // Head & Twin Ponytails
      this.px(ctx, -5, -42 + bob, 10, 9, cHair);
      this.px(ctx, -4, -38 + bob, 8, 7, cSkin);
      this.px(ctx, 2, -37 + bob, 2, 2, '#000'); // Sharp eyes

      // Twin Ponytail Ribbons
      this.px(ctx, -9, -44 + bob + Math.sin(animTime * 6) * 2, 4, 3, cRibbon);
      this.px(ctx, -12, -41 + bob + Math.sin(animTime * 6) * 3, 3, 5, cHair);
      this.px(ctx, -3, -45 + bob, 3, 3, cRibbon);

      // Cyan Sleek Tunic
      this.px(ctx, -6, -31 + bob, 12, 13, cVest);
      this.px(ctx, -2, -31 + bob, 4, 5, cSkin); // Neckline
      this.px(ctx, -6, -21 + bob, 12, 3, cSash); // Purple sash
      this.px(ctx, -1, -21 + bob, 2, 6, cSash); // Sash tail

      // Agile Guarding Hands
      this.px(ctx, 2, -29 + bob, 6, 4, cSkin);
      this.px(ctx, 7, -33 + bob, 4, 4, cSkin); // Open palm
      this.px(ctx, -7, -27 + bob, 4, 5, cSkin);

      // Pants & Light Ninja Boots
      this.px(ctx, -6, -17, 5, 14, cPants);
      this.px(ctx, 1, -17, 5, 14, cPants);
      this.px(ctx, -7, -3, 6, 4, cShoe);
      this.px(ctx, 1, -3, 6, 4, cShoe);
    }
    else if (state === 'walk') {
      const step = Math.floor(animTime * 12) % 4; // Fast agile step
      const bob = (step % 2 === 0) ? -1 : 1;

      this.px(ctx, -4, -42 + bob, 10, 9, cHair);
      this.px(ctx, -3, -38 + bob, 8, 7, cSkin);
      this.px(ctx, 2, -37 + bob, 2, 2, '#000');

      // Fluttering ponytails
      this.px(ctx, -10, -42 + bob + step, 4, 3, cRibbon);
      this.px(ctx, -13, -39 + bob + step, 3, 5, cHair);

      this.px(ctx, -5, -31 + bob, 11, 13, cVest);
      this.px(ctx, -5, -21 + bob, 11, 3, cSash);

      // Swift stride
      if (step === 0) {
        this.px(ctx, -8, -16, 5, 13, cPants);
        this.px(ctx, 3, -16, 5, 13, cPants);
        this.px(ctx, -9, -3, 6, 4, cShoe);
        this.px(ctx, 3, -3, 6, 4, cShoe);
      } else if (step === 1) {
        this.px(ctx, -4, -17, 5, 14, cPants);
        this.px(ctx, 0, -17, 5, 14, cPants);
        this.px(ctx, -5, -3, 6, 4, cShoe);
        this.px(ctx, 0, -3, 6, 4, cShoe);
      } else if (step === 2) {
        this.px(ctx, 3, -16, 5, 13, cPants);
        this.px(ctx, -8, -16, 5, 13, cPants);
        this.px(ctx, 3, -3, 6, 4, cShoe);
        this.px(ctx, -9, -3, 6, 4, cShoe);
      } else {
        this.px(ctx, -2, -18, 5, 15, cPants);
        this.px(ctx, -1, -18, 5, 15, cPants);
        this.px(ctx, -2, -3, 6, 4, cShoe);
        this.px(ctx, 0, -3, 6, 4, cShoe);
      }
    }
    else if (state === 'punch1' || state === 'nunchaku_attack' || state === 'dagger_attack' || state === 'pipe_attack' || state.startsWith('pistol') || state === 'air_pistol') {
      // Lightning Palm Jab / Weapon Strike
      this.px(ctx, -3, -41, 10, 9, cHair);
      this.px(ctx, -2, -37, 8, 7, cSkin);
      this.px(ctx, 3, -36, 2, 2, '#000');
      this.px(ctx, -4, -30, 11, 13, cVest);
      this.px(ctx, -4, -20, 11, 3, cSash);

      // Swift Palm thrust
      this.px(ctx, 6, -28, 16, 4, cSkin);
      this.px(ctx, 22, -30, 4, 7, cSkin);
      this.px(ctx, 25, -29, 3, 5, '#05d9e8'); // Cyan speed spark

      this.px(ctx, -8, -16, 5, 13, cPants);
      this.px(ctx, 3, -16, 6, 13, cPants);
      this.px(ctx, -9, -3, 6, 4, cShoe);
      this.px(ctx, 3, -3, 7, 4, cShoe);
    }
    else if (state === 'punch2') {
      // Twin Elbow Strike
      this.px(ctx, -1, -40, 10, 9, cHair);
      this.px(ctx, 0, -36, 8, 7, cSkin);
      this.px(ctx, 4, -35, 2, 2, '#000');
      this.px(ctx, -3, -29, 12, 13, cVest);
      this.px(ctx, -3, -19, 12, 3, cSash);

      this.px(ctx, 5, -26, 16, 6, cSkin);
      this.px(ctx, 20, -27, 6, 7, cSkin);

      this.px(ctx, -9, -15, 5, 13, cPants);
      this.px(ctx, 5, -15, 6, 13, cPants);
      this.px(ctx, -10, -2, 6, 4, cShoe);
      this.px(ctx, 5, -2, 7, 4, cShoe);
    }
    else if (state === 'punch3') {
      // Spear Hand Finisher
      this.px(ctx, 1, -39, 10, 9, cHair);
      this.px(ctx, 2, -35, 8, 7, cSkin);
      this.px(ctx, 6, -34, 2, 2, '#fff'); // Focused glow
      this.px(ctx, -1, -28, 13, 13, cVest);
      this.px(ctx, -1, -18, 13, 3, cSash);

      // Extended Spear Hand
      this.px(ctx, 8, -25, 20, 5, cSkin);
      this.px(ctx, 28, -26, 8, 7, cSkin);
      this.px(ctx, 36, -26, 5, 7, '#05d9e8'); // Piercing ki blade

      this.px(ctx, -12, -14, 6, 13, cPants);
      this.px(ctx, 6, -14, 7, 13, cPants);
      this.px(ctx, -14, -1, 8, 4, cShoe);
      this.px(ctx, 6, -1, 8, 4, cShoe);
    }
    else if (state === 'kick1') {
      // High Viper Roundhouse
      this.px(ctx, -6, -41, 10, 9, cHair);
      this.px(ctx, -5, -37, 8, 7, cSkin);
      this.px(ctx, -7, -29, 11, 13, cVest);
      this.px(ctx, -7, -19, 11, 3, cSash);

      // Standing leg
      this.px(ctx, -6, -15, 6, 14, cPants);
      this.px(ctx, -8, -1, 7, 4, cShoe);

      // High snapping kick
      this.px(ctx, 3, -31, 20, 6, cPants);
      this.px(ctx, 23, -33, 8, 7, cShoe);
      this.px(ctx, 31, -32, 4, 5, '#ff0055');
    }
    else if (state === 'kick2') {
      // Spinning Heel Sweep
      this.px(ctx, -4, -40, 10, 9, cHair);
      this.px(ctx, -3, -36, 8, 7, cSkin);
      this.px(ctx, -5, -29, 12, 13, cVest);

      this.px(ctx, -5, -15, 6, 14, cPants);
      this.px(ctx, -7, -1, 7, 4, cShoe);

      // Upward spinning crescent arc
      this.px(ctx, 5, -38, 14, 7, cPants);
      this.px(ctx, 16, -48, 8, 9, cShoe);
      this.px(ctx, 18, -52, 5, 5, '#05d9e8');
    }
    else if (state === 'jump') {
      this.px(ctx, -5, -39, 10, 9, cHair);
      this.px(ctx, -4, -35, 8, 7, cSkin);
      this.px(ctx, -6, -27, 12, 11, cVest);
      this.px(ctx, -7, -14, 6, 8, cPants);
      this.px(ctx, 0, -14, 6, 8, cPants);
      this.px(ctx, -7, -6, 6, 5, cShoe);
      this.px(ctx, 0, -6, 6, 5, cShoe);
    }
    else if (state === 'jump_kick') {
      // Acrobatic Viper Dive Kick
      this.px(ctx, -7, -35, 10, 9, cHair);
      this.px(ctx, -6, -31, 8, 7, cSkin);
      this.px(ctx, -11, -33, 5, 3, cRibbon);

      this.px(ctx, -5, -23, 13, 11, cVest);
      this.px(ctx, -11, -17, 7, 7, cPants);
      this.px(ctx, -12, -10, 6, 5, cShoe);

      // Extended dive foot!
      this.px(ctx, 7, -22, 19, 6, cPants);
      this.px(ctx, 25, -22, 9, 6, cShoe);
      this.px(ctx, 34, -22, 6, 6, '#05d9e8');
    }
    else if (state === 'special') {
      // SHADOW FLASH HURRICANE KICK
      const rot = animTime * 30;
      const pulse = Math.sin(animTime * 35) * 4;

      ctx.fillStyle = (Math.floor(animTime * 24) % 2 === 0) ? 'rgba(5, 217, 232, 0.45)' : 'rgba(255, 0, 85, 0.45)';
      ctx.beginPath();
      ctx.arc(0, -22, 28 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Spinning silhouette with twin ribbons
      this.px(ctx, -6, -42, 12, 10, cHair);
      this.px(ctx, -7, -31, 14, 13, cVest);
      this.px(ctx, -26, -26, 52, 6, '#05d9e8');
      this.px(ctx, -28, -27, 6, 8, '#ffffff');
      this.px(ctx, 24, -27, 6, 8, '#ffffff');

      this.px(ctx, -20, -14, 40, 7, cPants);
      this.px(ctx, -22, -12, 6, 6, cShoe);
      this.px(ctx, 18, -12, 6, 6, cShoe);
    }
    else if (state === 'hurt') {
      this.px(ctx, -8, -39, 10, 9, cHair);
      this.px(ctx, -7, -35, 8, 7, cSkin);
      this.px(ctx, -7, -27, 11, 13, cVest);
      this.px(ctx, -7, -13, 5, 12, cPants);
      this.px(ctx, 0, -13, 5, 12, cPants);
    }
    else if (state === 'knockdown') {
      this.px(ctx, -18, -13, 9, 11, cHair);
      this.px(ctx, -14, -12, 7, 9, cSkin);
      this.px(ctx, -7, -11, 14, 9, cVest);
      this.px(ctx, 7, -11, 13, 6, cPants);
      this.px(ctx, 19, -11, 6, 6, cShoe);
    }

    ctx.restore();
  }

  // =======================================================
  // 3. SMORO - THE HEAVY IRON BULL
  // =======================================================
  drawSmoro(ctx, state, animTime, facing = 1, weapon = null) {
    ctx.save();
    ctx.scale(facing * 1.25, 1.25); // 25% bigger, muscular titan!

    const cSkin = '#c68a5c';
    const cVest = '#2c1820';
    const cBuckle = '#ffd700';
    const cPants = '#3b4338';
    const cHair = '#111115';
    const cWrist = '#8b2635';
    const cShoe = '#111111';

    if (state === 'idle') {
      const bob = Math.sin(animTime * 4.5) * 1.2;
      // Head with bull horns headband / brutal crewcut
      this.px(ctx, -7, -46 + bob, 14, 11, cHair);
      this.px(ctx, -6, -42 + bob, 12, 8, cSkin);
      this.px(ctx, 2, -41 + bob, 3, 2, '#fff'); // Glowering white eyes
      this.px(ctx, -6, -44 + bob, 12, 3, '#aa2233'); // Crimson headband

      // Massive Chest & Spiked Leather Pauldrons
      this.px(ctx, -11, -35 + bob, 22, 19, cSkin);
      this.px(ctx, -12, -35 + bob, 5, 10, cVest);
      this.px(ctx, 7, -35 + bob, 5, 10, cVest);
      this.px(ctx, -11, -19 + bob, 22, 5, '#111'); // Heavy leather belt
      this.px(ctx, -3, -19 + bob, 6, 5, cBuckle); // Golden Bull Buckle

      // Giant Biceps & Spiked Wristguards
      this.px(ctx, 9, -32 + bob, 7, 11, cSkin);
      this.px(ctx, 12, -22 + bob, 6, 6, cWrist);
      this.px(ctx, -14, -30 + bob, 6, 10, cSkin);

      // Heavy Combat Pants & Steel-Toe Boots
      this.px(ctx, -10, -14, 8, 14, cPants);
      this.px(ctx, 2, -14, 8, 14, cPants);
      this.px(ctx, -12, -2, 10, 5, cShoe);
      this.px(ctx, 2, -2, 10, 5, cShoe);
    }
    else if (state === 'walk') {
      const step = Math.floor(animTime * 7) % 4; // Heavy stomping march
      const bob = (step % 2 === 0) ? -1 : 1;

      this.px(ctx, -6, -45 + bob, 14, 11, cHair);
      this.px(ctx, -5, -41 + bob, 12, 8, cSkin);
      this.px(ctx, 3, -40 + bob, 3, 2, '#fff');

      this.px(ctx, -10, -34 + bob, 22, 19, cSkin);
      this.px(ctx, -10, -18 + bob, 22, 5, '#111');

      if (step === 0) {
        this.px(ctx, -13, -13, 8, 12, cPants);
        this.px(ctx, 4, -13, 9, 12, cPants);
        this.px(ctx, -15, -1, 11, 5, cShoe);
        this.px(ctx, 4, -1, 11, 5, cShoe);
      } else if (step === 1) {
        this.px(ctx, -8, -14, 8, 14, cPants);
        this.px(ctx, 1, -14, 8, 14, cPants);
        this.px(ctx, -9, -2, 10, 5, cShoe);
        this.px(ctx, 1, -2, 10, 5, cShoe);
      } else if (step === 2) {
        this.px(ctx, 4, -13, 9, 12, cPants);
        this.px(ctx, -13, -13, 8, 12, cPants);
        this.px(ctx, 4, -1, 11, 5, cShoe);
        this.px(ctx, -15, -1, 11, 5, cShoe);
      } else {
        this.px(ctx, -5, -15, 8, 15, cPants);
        this.px(ctx, -2, -15, 8, 15, cPants);
        this.px(ctx, -6, -2, 10, 5, cShoe);
        this.px(ctx, 0, -2, 10, 5, cShoe);
      }
    }
    else if (state === 'punch1' || state === 'nunchaku_attack' || state === 'dagger_attack' || state === 'pipe_attack' || state.startsWith('pistol') || state === 'air_pistol') {
      // Heavy Gut Punch / Weapon Strike
      this.px(ctx, -4, -44, 14, 11, cHair);
      this.px(ctx, -3, -40, 12, 8, cSkin);
      this.px(ctx, -8, -33, 22, 18, cSkin);

      // Huge fist thrust
      this.px(ctx, 8, -28, 18, 9, cSkin);
      this.px(ctx, 24, -29, 8, 10, cWrist);

      this.px(ctx, -12, -14, 9, 13, cPants);
      this.px(ctx, 5, -14, 9, 13, cPants);
      this.px(ctx, -14, -1, 11, 4, cShoe);
      this.px(ctx, 5, -1, 11, 4, cShoe);
    }
    else if (state === 'punch2') {
      // Overhead Sledgehammer
      this.px(ctx, -2, -43, 14, 11, cHair);
      this.px(ctx, -1, -39, 12, 8, cSkin);
      this.px(ctx, -6, -32, 22, 18, cSkin);

      // Overhead double arm swing
      this.px(ctx, 10, -38, 12, 12, cSkin);
      this.px(ctx, 20, -35, 10, 12, cWrist);

      this.px(ctx, -13, -13, 9, 13, cPants);
      this.px(ctx, 6, -13, 10, 13, cPants);
      this.px(ctx, -15, 0, 11, 4, cShoe);
      this.px(ctx, 6, 0, 12, 4, cShoe);
    }
    else if (state === 'punch3') {
      // MEGATON IRON BULL PUNCH (Earth Shaker!)
      this.px(ctx, 2, -42, 14, 11, cHair);
      this.px(ctx, 3, -38, 12, 8, cSkin);
      this.px(ctx, 8, -37, 4, 3, '#ffd700'); // Blazing gold rage eye

      this.px(ctx, -2, -31, 24, 18, cSkin);
      this.px(ctx, -2, -15, 24, 5, '#111');

      // Giant lunging fist
      this.px(ctx, 14, -28, 22, 11, cSkin);
      this.px(ctx, 32, -30, 12, 14, cWrist);
      // Fiery kinetic shockwave
      this.px(ctx, 42, -31, 8, 16, '#ffd700');
      this.px(ctx, 48, -29, 6, 12, '#ff4400');

      this.px(ctx, -16, -12, 10, 13, cPants);
      this.px(ctx, 8, -12, 12, 13, cPants);
      this.px(ctx, -19, 1, 13, 4, cShoe);
      this.px(ctx, 8, 1, 14, 4, cShoe);
    }
    else if (state === 'kick1') {
      // Spartan Front Boot
      this.px(ctx, -8, -44, 14, 11, cHair);
      this.px(ctx, -7, -40, 12, 8, cSkin);
      this.px(ctx, -10, -33, 22, 18, cSkin);

      this.px(ctx, -9, -14, 9, 14, cPants);
      this.px(ctx, -11, 0, 11, 4, cShoe);

      // Heavy thrusting leg
      this.px(ctx, 6, -26, 20, 9, cPants);
      this.px(ctx, 24, -28, 12, 11, cShoe);
    }
    else if (state === 'kick2') {
      // Seismic Heel Stomp
      this.px(ctx, -6, -43, 14, 11, cHair);
      this.px(ctx, -5, -39, 12, 8, cSkin);
      this.px(ctx, -8, -32, 22, 18, cSkin);

      this.px(ctx, -7, -14, 9, 14, cPants);
      this.px(ctx, -9, 0, 11, 4, cShoe);

      // Downward crushing heel
      this.px(ctx, 8, -30, 14, 10, cPants);
      this.px(ctx, 18, -15, 12, 14, cShoe);
      this.px(ctx, 16, -1, 16, 5, '#ffd700'); // Ground crack
    }
    else if (state === 'jump') {
      this.px(ctx, -7, -42, 14, 11, cHair);
      this.px(ctx, -6, -38, 12, 8, cSkin);
      this.px(ctx, -10, -30, 22, 16, cSkin);
      this.px(ctx, -10, -14, 10, 8, cPants);
      this.px(ctx, 1, -14, 10, 8, cPants);
      this.px(ctx, -10, -6, 10, 6, cShoe);
      this.px(ctx, 2, -6, 10, 6, cShoe);
    }
    else if (state === 'jump_kick') {
      // Giant Flying Body Splash / Dropkick
      this.px(ctx, -10, -38, 14, 11, cHair);
      this.px(ctx, -9, -34, 12, 8, cSkin);
      this.px(ctx, -8, -25, 24, 14, cSkin);

      this.px(ctx, 10, -22, 22, 10, cPants);
      this.px(ctx, 30, -23, 13, 11, cShoe);
      this.px(ctx, 42, -21, 6, 8, '#ffcc00');
    }
    else if (state === 'special') {
      // EARTHQUAKE SLAM / IRON BULL ROAR
      const pulse = Math.sin(animTime * 30) * 6;

      ctx.fillStyle = 'rgba(255, 180, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(0, -15, 34 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Giant Smoro slamming fists into pavement
      this.px(ctx, -7, -35, 14, 11, cHair);
      this.px(ctx, -6, -31, 12, 8, cSkin);
      this.px(ctx, -10, -24, 24, 18, cSkin);

      // Downward smashing twin hammerfists
      this.px(ctx, -18, -12, 14, 12, cWrist);
      this.px(ctx, 4, -12, 14, 12, cWrist);

      // Ground shockwaves spreading out
      this.px(ctx, -40, -4, 80, 6, '#ffd700');
      this.px(ctx, -50, -2, 100, 4, '#ff4400');
    }
    else if (state === 'hurt') {
      // Heavy poise flinch
      this.px(ctx, -10, -44, 14, 11, cHair);
      this.px(ctx, -9, -40, 12, 8, cSkin);
      this.px(ctx, -11, -32, 22, 18, cSkin);
      this.px(ctx, -10, -14, 9, 13, cPants);
      this.px(ctx, 1, -14, 9, 13, cPants);
    }
    else if (state === 'knockdown') {
      this.px(ctx, -24, -14, 14, 11, cHair);
      this.px(ctx, -12, -13, 24, 15, cSkin);
      this.px(ctx, 10, -13, 18, 10, cPants);
      this.px(ctx, 28, -13, 10, 8, cShoe);
    }

    ctx.restore();
  }

  // RENDER ENEMY: THUG (STREET BRAWLER)
  drawThug(ctx, state, animTime, facing = -1) {
    ctx.save();
    ctx.scale(facing, 1);

    const cSkin = '#e0aa88';
    const cVest = '#cc2233';
    const cJeans = '#335588';
    const cHair = '#553311';
    const cBandana = '#ffcc00';

    if (state === 'idle' || state === 'walk') {
      const bob = (state === 'walk') ? Math.sin(animTime * 8) * 1.5 : Math.sin(animTime * 4);
      // Head
      this.px(ctx, -6, -42 + bob, 12, 10, cHair);
      this.px(ctx, -5, -38 + bob, 10, 8, cSkin);
      this.px(ctx, -6, -40 + bob, 12, 3, cBandana);
      this.px(ctx, 2, -37 + bob, 2, 2, '#111');

      // Vest & Bare Arms
      this.px(ctx, -7, -30 + bob, 14, 14, cVest);
      this.px(ctx, -3, -30 + bob, 6, 14, cSkin); // Open vest
      this.px(ctx, 4, -28 + bob, 5, 8, cSkin); // Muscular arm
      this.px(ctx, 7, -22 + bob, 5, 5, '#222'); // Spiked glove

      // Pants
      this.px(ctx, -7, -16, 6, 14, cJeans);
      this.px(ctx, 1, -16, 6, 14, cJeans);
      this.px(ctx, -9, -3, 8, 4, '#111');
      this.px(ctx, 1, -3, 8, 4, '#111');
    }
    else if (state === 'attack') {
      // Windup and punch
      this.px(ctx, -3, -41, 12, 10, cHair);
      this.px(ctx, -2, -37, 10, 8, cSkin);
      this.px(ctx, -3, -39, 12, 3, cBandana);

      this.px(ctx, -5, -29, 14, 13, cVest);
      this.px(ctx, 7, -27, 16, 6, cSkin);
      this.px(ctx, 21, -28, 6, 7, '#222'); // Spiked knuckle

      this.px(ctx, -10, -16, 6, 14, cJeans);
      this.px(ctx, 5, -16, 7, 14, cJeans);
      this.px(ctx, -12, -3, 8, 4, '#111');
      this.px(ctx, 5, -3, 9, 4, '#111');
    }
    else if (state === 'hurt') {
      this.px(ctx, -10, -39, 12, 10, cHair);
      this.px(ctx, -9, -35, 10, 8, cSkin);
      this.px(ctx, -10, -37, 12, 3, cBandana);

      this.px(ctx, -9, -27, 13, 13, cVest);
      this.px(ctx, -9, -14, 6, 12, cJeans);
      this.px(ctx, -2, -14, 6, 12, cJeans);
      this.px(ctx, -11, -2, 8, 4, '#111');
      this.px(ctx, -2, -2, 8, 4, '#111');
    }
    else if (state === 'knockdown') {
      this.px(ctx, -18, -12, 10, 10, cHair);
      this.px(ctx, -15, -11, 8, 8, cSkin);
      this.px(ctx, -6, -10, 14, 9, cVest);
      this.px(ctx, 8, -10, 14, 7, cJeans);
      this.px(ctx, 20, -10, 6, 6, '#111');
    }

    ctx.restore();
  }

  // RENDER ENEMY: SHADOW NINJA (TMNT FOOT CLAN STYLE)
  drawNinja(ctx, state, animTime, facing = -1) {
    ctx.save();
    ctx.scale(facing, 1);

    const cSuit = '#3b1d60';
    const cTrim = '#7b3dbd';
    const cMask = '#220e38';
    const cEyes = '#ff0055';
    const cSash = '#05d9e8';

    if (state === 'idle' || state === 'walk') {
      const bob = Math.sin(animTime * 7) * 1.5;
      // Hooded mask
      this.px(ctx, -6, -42 + bob, 12, 10, cMask);
      this.px(ctx, -4, -38 + bob, 8, 4, cSuit);
      this.px(ctx, 1, -38 + bob, 3, 2, cEyes); // Glowing red slit eye

      // Robe
      this.px(ctx, -7, -32 + bob, 14, 14, cSuit);
      this.px(ctx, -7, -22 + bob, 14, 3, cSash);

      // Ninja stealth hands
      this.px(ctx, 4, -28 + bob, 6, 4, cTrim);
      this.px(ctx, 9, -28 + bob, 4, 4, '#111');

      // Ninja tabi pants & shoes
      this.px(ctx, -7, -18, 6, 15, cSuit);
      this.px(ctx, 1, -18, 6, 15, cSuit);
      this.px(ctx, -8, -4, 7, 4, cMask);
      this.px(ctx, 1, -4, 7, 4, cMask);
    }
    else if (state === 'attack') {
      // Ninja Shuriken Throw or Flying Slash
      this.px(ctx, -4, -41, 12, 10, cMask);
      this.px(ctx, 2, -37, 3, 2, cEyes);

      this.px(ctx, -5, -31, 13, 14, cSuit);
      this.px(ctx, -5, -21, 13, 3, cSash);

      // Arm flicking shuriken
      this.px(ctx, 6, -29, 16, 5, cTrim);
      this.px(ctx, 21, -30, 4, 6, '#fff'); // Steel shuriken ready

      this.px(ctx, -9, -17, 6, 14, cSuit);
      this.px(ctx, 4, -17, 7, 14, cSuit);
      this.px(ctx, -10, -4, 7, 4, cMask);
      this.px(ctx, 4, -4, 8, 4, cMask);
    }
    else if (state === 'hurt') {
      this.px(ctx, -9, -40, 12, 10, cMask);
      this.px(ctx, -3, -36, 3, 2, cEyes);
      this.px(ctx, -8, -30, 13, 14, cSuit);
      this.px(ctx, -8, -16, 6, 13, cSuit);
      this.px(ctx, -1, -16, 6, 13, cSuit);
    }
    else if (state === 'knockdown') {
      this.px(ctx, -18, -12, 10, 10, cMask);
      this.px(ctx, -6, -11, 14, 9, cSuit);
      this.px(ctx, 6, -11, 14, 7, cSuit);
      this.px(ctx, 18, -11, 6, 6, cMask);
    }

    ctx.restore();
  }

  // RENDER ENEMY: HEAVY BRUISER (TANK)
  drawBruiser(ctx, state, animTime, facing = -1) {
    ctx.save();
    ctx.scale(facing * 1.25, 1.25); // 25% bigger!

    const cSkin = '#d49b73';
    const cPants = '#2d5a27';
    const cBelt = '#111';
    const cHair = '#111';

    if (state === 'idle' || state === 'walk') {
      const bob = Math.sin(animTime * 5) * 1.2;
      // Big bald head with mohawk
      this.px(ctx, -7, -46 + bob, 14, 12, cSkin);
      this.px(ctx, -2, -50 + bob, 4, 5, '#ff4400'); // Mohawk
      this.px(ctx, 3, -42 + bob, 2, 2, '#000'); // Angry eye

      // Huge barrel chest
      this.px(ctx, -11, -34 + bob, 22, 18, cSkin);
      this.px(ctx, -8, -32 + bob, 5, 4, '#b57953'); // Pec definition
      this.px(ctx, 3, -32 + bob, 5, 4, '#b57953');
      this.px(ctx, -11, -18 + bob, 22, 4, cBelt);

      // Massive bicep
      this.px(ctx, 8, -32 + bob, 7, 12, cSkin);
      this.px(ctx, 11, -22 + bob, 6, 6, '#333');

      // Heavy combat pants & boots
      this.px(ctx, -10, -14, 9, 14, cPants);
      this.px(ctx, 1, -14, 9, 14, cPants);
      this.px(ctx, -12, -2, 11, 5, '#111');
      this.px(ctx, 1, -2, 11, 5, '#111');
    }
    else if (state === 'attack') {
      // Big Charging Haymaker / Body Slam
      this.px(ctx, -4, -44, 14, 12, cSkin);
      this.px(ctx, 1, -48, 4, 5, '#ff4400');

      this.px(ctx, -8, -32, 24, 18, cSkin);
      this.px(ctx, -8, -16, 24, 4, cBelt);

      // Huge lunge fist
      this.px(ctx, 12, -30, 18, 9, cSkin);
      this.px(ctx, 28, -31, 8, 11, '#222');

      this.px(ctx, -14, -13, 10, 13, cPants);
      this.px(ctx, 5, -13, 11, 13, cPants);
      this.px(ctx, -16, -1, 12, 5, '#111');
      this.px(ctx, 5, -1, 13, 5, '#111');
    }
    else if (state === 'hurt') {
      this.px(ctx, -12, -43, 14, 12, cSkin);
      this.px(ctx, -12, -31, 20, 17, cSkin);
      this.px(ctx, -11, -14, 9, 13, cPants);
      this.px(ctx, -2, -14, 9, 13, cPants);
    }
    else if (state === 'knockdown') {
      this.px(ctx, -22, -13, 12, 11, cSkin);
      this.px(ctx, -10, -12, 20, 12, cSkin);
      this.px(ctx, 8, -12, 18, 9, cPants);
      this.px(ctx, 24, -12, 8, 7, '#111');
    }

    ctx.restore();
  }

  // RENDER BLADE RONIN (KATANA SWORD SLASHER)
  drawRonin(ctx, state, animTime, facing = -1) {
    ctx.save();
    ctx.scale(facing, 1);

    const cKasa = '#bfa15f'; // Straw hat
    const cKasaDark = '#8a6e38';
    const cHaori = '#1b2a4a'; // Indigo samurai coat
    const cHakama = '#0f172a'; // Dark hakama pants
    const cBlade = '#e0f2fe'; // Gleaming Katana steel
    const cTsuba = '#ffd700'; // Golden sword guard
    const cSheath = '#3f1a1a'; // Red lacquer sheath

    if (state === 'idle' || state === 'walk') {
      const bob = (state === 'walk') ? Math.sin(animTime * 7) * 1.5 : Math.sin(animTime * 3.5);

      // Kasa (Straw Conical Hat)
      this.px(ctx, -12, -48 + bob, 24, 4, cKasaDark);
      this.px(ctx, -8, -52 + bob, 16, 5, cKasa);
      this.px(ctx, -3, -55 + bob, 6, 4, cKasa);
      // Face underneath shadow
      this.px(ctx, -5, -44 + bob, 10, 7, '#1e293b'); // Dark shadow mask
      this.px(ctx, 1, -43 + bob, 3, 2, '#ef4444');  // Piercing red eyes

      // Samurai Haori & Kimono
      this.px(ctx, -8, -37 + bob, 16, 16, cHaori);
      this.px(ctx, -2, -37 + bob, 4, 16, '#ffffff'); // White inner lapel
      this.px(ctx, -8, -25 + bob, 16, 4, '#c2410c'); // Sash obi

      // Left hand on Katana Hilt at hip
      this.px(ctx, -12, -26 + bob, 18, 4, cSheath);
      this.px(ctx, 3, -28 + bob, 5, 4, cTsuba);
      this.px(ctx, 6, -30 + bob, 8, 4, '#111'); // Wrapped tsuka hilt
      this.px(ctx, 2, -27 + bob, 4, 4, '#dfb892');

      // Hakama Pants & Waraji Sandals
      this.px(ctx, -8, -21, 7, 18, cHakama);
      this.px(ctx, 1, -21, 7, 18, cHakama);
      this.px(ctx, -9, -3, 8, 4, cKasa);
      this.px(ctx, 1, -3, 8, 4, cKasa);
    }
    else if (state === 'attack') {
      // Fast Iaijutsu Katana Slash Pose with Cyan Arc Trail
      this.px(ctx, -9, -46, 22, 4, cKasaDark);
      this.px(ctx, -6, -50, 14, 5, cKasa);
      this.px(ctx, -4, -42, 10, 6, '#1e293b');
      this.px(ctx, 2, -41, 3, 2, '#ef4444');

      this.px(ctx, -7, -36, 16, 16, cHaori);
      this.px(ctx, -7, -24, 16, 4, '#c2410c');

      // Extended Katana Blade with gleaming edge
      this.px(ctx, 6, -32, 10, 5, '#dfb892'); // Lunging arm
      this.px(ctx, 14, -33, 4, 5, cTsuba);
      this.px(ctx, 18, -34, 30, 4, cBlade);
      this.px(ctx, 20, -35, 26, 2, '#ffffff'); // Glint shine

      // Cyan katana slash wave particle arc
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(28, -32, 24, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      // Hakama in deep lunging stance
      this.px(ctx, -14, -20, 8, 17, cHakama);
      this.px(ctx, 4, -20, 10, 17, cHakama);
      this.px(ctx, -16, -3, 9, 4, cKasa);
      this.px(ctx, 5, -3, 10, 4, cKasa);
    }
    else if (state === 'hurt') {
      this.px(ctx, -10, -44, 22, 5, cKasa);
      this.px(ctx, -6, -35, 14, 15, cHaori);
      this.px(ctx, -8, -20, 16, 17, cHakama);
    }
    else if (state === 'knockdown') {
      this.px(ctx, -20, -10, 18, 10, cHaori);
      this.px(ctx, 0, -10, 18, 8, cHakama);
      this.px(ctx, -14, -18, 16, 6, cKasa); // Hat falling off
      this.px(ctx, 8, -6, 20, 3, cBlade); // Katana on floor
    }

    ctx.restore();
  }

  // RENDER TENGU ACROBATIC KICKBOXER
  drawKicker(ctx, state, animTime, facing = -1) {
    ctx.save();
    ctx.scale(facing, 1);

    const cMask = '#dc2626'; // Red Tengu mask
    const cBeak = '#f59e0b'; // Gold beak/nose
    const cHair = '#111827'; // Black topknot
    const cGi = '#27272a'; // Dark charcoal martial gi
    const cSash = '#ffffff'; // White belt
    const cWraps = '#ef4444'; // Crimson shin & wrist wraps
    const cSkin = '#e0a97a';

    if (state === 'idle' || state === 'walk') {
      const bob = (state === 'walk') ? Math.sin(animTime * 9) * 2 : Math.sin(animTime * 4);

      // Topknot & Tengu Mask
      this.px(ctx, -2, -49 + bob, 5, 5, cHair);
      this.px(ctx, -6, -44 + bob, 12, 10, cMask);
      this.px(ctx, 3, -41 + bob, 6, 4, cBeak); // Long Tengu nose
      this.px(ctx, 0, -42 + bob, 3, 2, '#ffd700'); // Piercing gold eye

      // Gi & Sash
      this.px(ctx, -7, -34 + bob, 14, 14, cGi);
      this.px(ctx, -7, -23 + bob, 14, 3, cSash);
      this.px(ctx, -3, -20 + bob, 3, 6, cSash); // Hanging belt ends

      // Hands with wraps in kickboxer guard
      this.px(ctx, 3, -33 + bob, 6, 6, cWraps);
      this.px(ctx, 6, -31 + bob, 4, 4, cSkin);

      // Pants & Crimson Shin Wraps
      this.px(ctx, -7, -20, 6, 10, cGi);
      this.px(ctx, 1, -20, 6, 10, cGi);
      this.px(ctx, -7, -10, 6, 8, cWraps);
      this.px(ctx, 1, -10, 6, 8, cWraps);
      this.px(ctx, -8, -2, 7, 3, '#111');
      this.px(ctx, 1, -2, 7, 3, '#111');
    }
    else if (state === 'attack') {
      // Dynamic Flying Jump Kick Pose
      this.px(ctx, -4, -46, 5, 5, cHair);
      this.px(ctx, -6, -42, 12, 10, cMask);
      this.px(ctx, 4, -39, 6, 4, cBeak);
      this.px(ctx, 1, -40, 3, 2, '#ffd700');

      this.px(ctx, -7, -32, 14, 13, cGi);

      // Forward outstretched flying kick leg!
      this.px(ctx, 4, -28, 14, 7, cGi);
      this.px(ctx, 16, -29, 12, 7, cWraps);
      this.px(ctx, 26, -30, 8, 8, '#111'); // Foot piercing forward

      // Trailing tucked leg
      this.px(ctx, -14, -24, 8, 8, cWraps);

      // Golden kick impact trail arc
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(18, -26, 18, -Math.PI * 0.3, Math.PI * 0.3);
      ctx.stroke();
    }
    else if (state === 'hurt') {
      this.px(ctx, -6, -42, 12, 10, cMask);
      this.px(ctx, -6, -32, 13, 14, cGi);
      this.px(ctx, -7, -18, 14, 16, cWraps);
    }
    else if (state === 'knockdown') {
      this.px(ctx, -18, -12, 14, 10, cMask);
      this.px(ctx, -4, -11, 16, 10, cGi);
      this.px(ctx, 12, -10, 14, 8, cWraps);
    }

    ctx.restore();
  }

  // RENDER SHADOW KUNOICHI ASSASSIN (TWIN DAGGER SLASHER)
  drawAssassin(ctx, state, animTime, facing = -1) {
    ctx.save();
    ctx.scale(facing, 1);

    const cVeil = '#4c1d95'; // Deep violet ninja cowl
    const cSkin = '#fed7aa';
    const cGarb = '#2e1065'; // Shadow ninja bodysuit
    const cSash = '#ec4899'; // Bright pink/magenta sash
    const cDagger = '#e2e8f0'; // Gleaming silver steel
    const cHilt = '#ffd700';

    if (state === 'idle' || state === 'walk') {
      const bob = (state === 'walk') ? Math.sin(animTime * 10) * 1.8 : Math.sin(animTime * 4.5);

      // Veil & Piercing Violet Eyes
      this.px(ctx, -5, -43 + bob, 10, 10, cVeil);
      this.px(ctx, -6, -46 + bob, 12, 4, cVeil); // Ponytail cowl
      this.px(ctx, 1, -41 + bob, 3, 2, '#ec4899'); // Glowing pink eyes
      this.px(ctx, -4, -38 + bob, 8, 5, cVeil); // Face mask

      // Sleek Ninja Bodysuit & Magenta Sash
      this.px(ctx, -6, -33 + bob, 12, 13, cGarb);
      this.px(ctx, -6, -24 + bob, 12, 3, cSash);
      this.px(ctx, -1, -21 + bob, 3, 7, cSash); // Ribbon trailing

      // Twin Daggers held in reverse grip!
      // Lead Hand
      this.px(ctx, 4, -31 + bob, 4, 4, cSkin);
      this.px(ctx, 7, -33 + bob, 3, 3, cHilt);
      this.px(ctx, 9, -38 + bob, 3, 10, cDagger); // Reversed dagger blade
      // Rear Hand
      this.px(ctx, -7, -29 + bob, 4, 4, cSkin);
      this.px(ctx, -9, -31 + bob, 3, 3, cHilt);
      this.px(ctx, -11, -36 + bob, 3, 9, cDagger);

      // Legs & Shin Guards
      this.px(ctx, -6, -20, 5, 17, cGarb);
      this.px(ctx, 1, -20, 5, 17, cGarb);
      this.px(ctx, -7, -9, 6, 7, cVeil);
      this.px(ctx, 1, -9, 6, 7, cVeil);
      this.px(ctx, -7, -2, 7, 3, '#111');
      this.px(ctx, 1, -2, 7, 3, '#111');
    }
    else if (state === 'attack') {
      // Rapid Twin-Dagger X-Cross Flurry Slash Pose
      this.px(ctx, -5, -42, 11, 10, cVeil);
      this.px(ctx, 1, -40, 3, 2, '#ec4899');
      this.px(ctx, -6, -32, 12, 12, cGarb);
      this.px(ctx, -6, -23, 12, 3, cSash);

      // Lunging arms with criss-crossing twin daggers
      this.px(ctx, 4, -32, 12, 4, cSkin);
      this.px(ctx, 14, -34, 4, 4, cHilt);
      this.px(ctx, 17, -35, 18, 3, cDagger);
      this.px(ctx, 4, -26, 12, 4, cSkin);
      this.px(ctx, 14, -27, 4, 4, cHilt);
      this.px(ctx, 17, -26, 16, 3, cDagger);

      // Magenta and silver cross-slash particle arcs
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(22, -30, 16, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Deep sprint stance
      this.px(ctx, -12, -20, 6, 17, cGarb);
      this.px(ctx, 4, -20, 7, 17, cGarb);
      this.px(ctx, -14, -3, 8, 4, '#111');
      this.px(ctx, 5, -3, 9, 4, '#111');
    }
    else if (state === 'hurt') {
      this.px(ctx, -6, -41, 11, 10, cVeil);
      this.px(ctx, -6, -31, 12, 13, cGarb);
      this.px(ctx, -7, -18, 13, 16, cGarb);
    }
    else if (state === 'knockdown') {
      this.px(ctx, -18, -10, 14, 10, cVeil);
      this.px(ctx, -4, -9, 16, 9, cGarb);
      this.px(ctx, 12, -8, 12, 7, cGarb);
      this.px(ctx, 6, -14, 12, 3, cDagger);
    }

    ctx.restore();
  }

  // RENDER TETSUBO CLUB GIANT (MASSIVE 7-FOOT KANABO BRUTE)
  drawClubGiant(ctx, state, animTime, facing = -1) {
    ctx.save();
    ctx.scale(facing * 1.3, 1.3); // 30% larger, imposing brute!

    const cSkin = '#c27d53'; // Sunburnt muscular brute
    const cHair = '#1c1917';
    const cPelt = '#d97706'; // Tiger-skin sash
    const cPants = '#374151'; // Dark rawhide pants
    const cKanabo = '#111827'; // Black iron spiked club
    const cSpikes = '#e5e7eb'; // Steel spikes

    if (state === 'idle' || state === 'walk') {
      const bob = (state === 'walk') ? Math.sin(animTime * 6) * 1.5 : Math.sin(animTime * 3);

      // Bald Head with Topknot & Warpaint
      this.px(ctx, -3, -48 + bob, 5, 5, cHair);
      this.px(ctx, -7, -43 + bob, 14, 12, cSkin);
      this.px(ctx, -5, -45 + bob, 10, 3, '#991b1b'); // Red warpaint brow
      this.px(ctx, 2, -41 + bob, 3, 2, '#fef08a'); // Menacing yellow eyes
      this.px(ctx, -3, -35 + bob, 6, 3, '#1c1917'); // Scowling mouth

      // Colossal Muscular Torso & Tiger Pelt
      this.px(ctx, -10, -32 + bob, 20, 16, cSkin);
      this.px(ctx, -10, -32 + bob, 6, 16, cPelt); // Tiger pelt over shoulder
      this.px(ctx, -8, -30 + bob, 2, 4, '#111'); // Tiger stripes
      this.px(ctx, -10, -18 + bob, 20, 4, '#78350f'); // Heavy leather belt

      // Giant Kanabo Iron Club resting on shoulder!
      this.px(ctx, -16, -52 + bob, 8, 38, cKanabo); // Spiked club shaft
      // Iron Spikes protruding from club
      this.px(ctx, -19, -48 + bob, 3, 3, cSpikes);
      this.px(ctx, -8, -45 + bob, 3, 3, cSpikes);
      this.px(ctx, -19, -38 + bob, 3, 3, cSpikes);
      this.px(ctx, -8, -35 + bob, 3, 3, cSpikes);

      // Huge brawny arm holding club
      this.px(ctx, -12, -26 + bob, 6, 10, cSkin);
      this.px(ctx, 4, -28 + bob, 6, 12, cSkin); // Off hand

      // Rawhide Pants & Heavy Boots
      this.px(ctx, -9, -14, 8, 14, cPants);
      this.px(ctx, 1, -14, 8, 14, cPants);
      this.px(ctx, -10, -2, 9, 4, '#1c1917');
      this.px(ctx, 1, -2, 9, 4, '#1c1917');
    }
    else if (state === 'attack') {
      // Overhead Heavy Club Slam with Ground Shockwave
      this.px(ctx, -5, -42, 14, 12, cSkin);
      this.px(ctx, 3, -40, 3, 2, '#fef08a');
      this.px(ctx, -8, -30, 20, 16, cSkin);

      // Slamming Kanabo Club smashing down into pavement!
      this.px(ctx, 6, -26, 10, 6, cSkin); // Both arms driving club down
      this.px(ctx, 14, -28, 6, 6, '#78350f');
      this.px(ctx, 18, -22, 12, 24, cKanabo); // Heavy club head hitting floor!

      // Spikes
      this.px(ctx, 15, -18, 3, 3, cSpikes);
      this.px(ctx, 30, -18, 3, 3, cSpikes);
      this.px(ctx, 15, -8, 3, 3, cSpikes);
      this.px(ctx, 30, -8, 3, 3, cSpikes);

      // Yellow/Orange ground impact shockwave sparks
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(16, 0, 18, 3);
      ctx.fillRect(12, -3, 6, 3);
      ctx.fillRect(32, -3, 6, 3);

      this.px(ctx, -14, -14, 9, 14, cPants);
      this.px(ctx, 4, -14, 10, 14, cPants);
      this.px(ctx, -15, -2, 10, 4, '#1c1917');
      this.px(ctx, 5, -2, 11, 4, '#1c1917');
    }
    else if (state === 'hurt') {
      this.px(ctx, -8, -42, 14, 12, cSkin);
      this.px(ctx, -10, -30, 20, 16, cSkin);
      this.px(ctx, -10, -14, 19, 15, cPants);
    }
    else if (state === 'knockdown') {
      this.px(ctx, -24, -10, 16, 12, cSkin);
      this.px(ctx, -8, -9, 22, 12, cSkin);
      this.px(ctx, 14, -9, 18, 10, cPants);
      this.px(ctx, -16, -24, 8, 30, cKanabo); // Kanabo dropped on ground
    }

    ctx.restore();
  }

  // RENDER UNDEAD ENEMY: ZOMBIE (WALKING ROTTEN CORPSE)
  drawZombie(ctx, state, animTime, facing = -1) {
    ctx.save();
    ctx.scale(facing, 1);

    const cSkin = '#547a4b'; // Decaying sage green skin
    const cShadow = '#344c2e'; // Dark rot
    const cShirt = '#4a3b32'; // Shredded brownish ragged shirt
    const cPants = '#262626'; // Torn charcoal trousers
    const cBones = '#e5e7eb'; // Exposed rib / bone
    const cEyes = '#ffff00'; // Sunken glowing yellow eyes
    const cPupils = '#ff0033'; // Hollow red pinprick pupils
    const cSlime = '#39ff14'; // Toxic acid dripping saliva / bile
    const cClaws = '#d4d4d8'; // Jagged decaying nails

    if (state === 'idle' || state === 'walk') {
      // Eerie zombie limp / shamble sway
      const shamble = Math.sin(animTime * 4) * 3;
      const headTwitch = Math.cos(animTime * 2.5) * 2;
      const armReach = Math.sin(animTime * 3) * 3;

      // Legs (shambling drag)
      this.px(ctx, -7, -14, 5, 14, cPants);
      this.px(ctx, 3, -14, 5, 14, cPants);
      this.px(ctx, -8, -2, 6, 3, cSkin); // Bare rotting foot
      this.px(ctx, 2, -2, 6, 3, cSkin);

      // Torso (hunched forward)
      this.px(ctx, -8 + shamble * 0.4, -28, 16, 15, cShirt);
      this.px(ctx, -5 + shamble * 0.4, -24, 5, 6, cBones); // Exposed ribs through torn shirt
      this.px(ctx, -2 + shamble * 0.4, -22, 3, 3, cSkin); // Rotten green belly

      // Outstretched crooked clawed arms (Classic zombie reach)
      this.px(ctx, 4 + armReach, -26, 12, 5, cSkin);
      this.px(ctx, 16 + armReach, -27, 4, 6, cClaws); // Claws
      this.px(ctx, -12, -24, 7, 5, cSkin);
      this.px(ctx, -14, -23, 3, 4, cClaws);

      // Slime dripping from fingers
      if (Math.floor(animTime * 10) % 3 === 0) {
        this.px(ctx, 18 + armReach, -20, 2, 4, cSlime);
      }

      // Head (tilted, twitching skull)
      const hx = 2 + headTwitch;
      this.px(ctx, hx - 6, -38, 13, 11, cSkin);
      this.px(ctx, hx - 5, -39, 10, 3, '#1c1917'); // Matted hair clumps
      // Sunken glowing yellow eyes
      this.px(ctx, hx + 1, -34, 3, 3, cEyes);
      this.px(ctx, hx + 2, -33, 1, 1, cPupils);
      this.px(ctx, hx - 4, -34, 3, 3, cEyes);
      this.px(ctx, hx - 3, -33, 1, 1, cPupils);
      // Gaping open jaw with yellow teeth and green acid drool
      this.px(ctx, hx - 1, -30, 8, 4, '#18181b'); // Hollow mouth cavity
      this.px(ctx, hx, -30, 2, 2, '#fef08a'); // Rotten yellow fang
      this.px(ctx, hx + 4, -30, 2, 2, '#fef08a');
      this.px(ctx, hx + 2, -28, 3, 5, cSlime); // Toxic green drool
    } else if (state === 'attack') {
      // Leaping lunge bite or double claw strike
      this.px(ctx, -10, -12, 6, 12, cPants);
      this.px(ctx, 2, -10, 7, 10, cPants);

      // Hunched lunging torso
      this.px(ctx, -4, -26, 18, 14, cShirt);
      this.px(ctx, 0, -22, 6, 6, cBones);

      // Both clawed arms lunging forward to grab
      this.px(ctx, 8, -28, 16, 5, cSkin);
      this.px(ctx, 24, -29, 6, 7, cClaws);
      this.px(ctx, 6, -21, 18, 5, cSkin);
      this.px(ctx, 24, -22, 6, 7, cClaws);

      // Head snapping forward with wide gaping jaws and acid splatter
      this.px(ctx, 10, -36, 14, 12, cSkin);
      this.px(ctx, 16, -33, 4, 4, cEyes);
      this.px(ctx, 18, -32, 2, 2, cPupils);
      this.px(ctx, 14, -28, 12, 6, '#18181b');
      this.px(ctx, 16, -28, 3, 3, '#fef08a'); // Top teeth
      this.px(ctx, 22, -28, 3, 3, '#fef08a');
      this.px(ctx, 18, -24, 4, 3, '#fef08a'); // Bottom jaw teeth
      this.px(ctx, 24, -26, 6, 4, cSlime); // Acid bite spit

      // Claw slash streaks
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(28, -32);
      ctx.lineTo(36, -20);
      ctx.moveTo(30, -24);
      ctx.lineTo(38, -12);
      ctx.stroke();
    } else if (state === 'hurt') {
      // Reeling backward in pain with green gore squirt
      this.px(ctx, -8, -14, 6, 14, cPants);
      this.px(ctx, 0, -12, 6, 12, cPants);
      this.px(ctx, -10, -26, 15, 14, cShirt);
      this.px(ctx, -4, -36, 12, 11, cSkin); // Head thrown back
      this.px(ctx, 0, -34, 3, 3, cEyes);
      this.px(ctx, 2, -30, 6, 4, cSlime);
      this.px(ctx, -16, -22, 8, 4, cSkin);
    } else if (state === 'knockdown') {
      // Collapsed rotting corpse on ground
      this.px(ctx, -22, -8, 16, 8, cPants);
      this.px(ctx, -6, -9, 20, 9, cShirt);
      this.px(ctx, -2, -8, 6, 4, cBones);
      this.px(ctx, 14, -8, 12, 8, cSkin); // Skull on floor
      this.px(ctx, 18, -6, 3, 3, cEyes);
      this.px(ctx, 22, -4, 8, 3, cSlime); // Green puddle pooling
    }

    ctx.restore();
  }

  // RENDER STAGE BOSSES: MASTER SHEN, IRON FANG ONI, GRANDMASTER KURODA
  drawBoss(ctx, state, animTime, facing = -1, isEnraged = false, bossType = 'master_shen', isLaughing = false) {
    ctx.save();
    ctx.scale(facing * 1.35, 1.35); // 35% bigger, intimidating presence!

    let cSkin = '#e8be99';
    let cRobe = isEnraged ? '#aa1122' : '#111122';
    let cGold = '#ffd700';
    let cHair = '#eeeeee';
    let cEyes = isEnraged ? '#ffff00' : '#00ffff';

    if (bossType === 'iron_fang') {
      cSkin = '#a83232'; // Crimson Oni skin
      cRobe = '#1f1a24';
      cGold = '#b33939';
      cHair = '#111111';
      cEyes = '#ffcc00';
    } else if (bossType === 'kuroda') {
      cSkin = '#e0c0a0';
      cRobe = isEnraged ? '#770011' : '#0a0a14';
      cGold = '#ffd700';
      cHair = '#220033';
      cEyes = '#ff0033'; // Crimson Dragon Lord eyes
    }

    if (state === 'idle' || state === 'walk') {
      // If laughing, shoulders and head shake in rapid 8-bit cackle rhythm!
      const laughShake = isLaughing ? Math.sin(animTime * 22) * 2.2 : 0;
      const bob = Math.sin(animTime * 5) * 1.5 + laughShake;

      if (bossType === 'iron_fang') {
        // Oni Horns & Mask
        this.px(ctx, -7, -48 + bob, 14, 12, cHair);
        this.px(ctx, -6, -44 + bob, 12, 9, cSkin);
        this.px(ctx, -9, -52 + bob, 4, 6, '#444'); // Left Iron Horn
        this.px(ctx, 5, -52 + bob, 4, 6, '#444');  // Right Iron Horn
        this.px(ctx, 1, -43 + bob, 3, 2, cEyes);

        if (isLaughing) {
          // Open demonic roaring laughing mouth with fangs
          this.px(ctx, -3, -38 + bob, 8, 6, '#660000');
          this.px(ctx, -2, -38 + bob, 2, 3, '#ffffff'); // Upper fang
          this.px(ctx, 2, -38 + bob, 2, 3, '#ffffff');
        } else {
          this.px(ctx, -3, -37 + bob, 6, 4, '#111'); // Spiked iron jaw mask
        }
      } else {
        // Silver Hair / Royal Overlord Hair
        this.px(ctx, -8, -48 + bob, 16, 12, cHair);
        this.px(ctx, -6, -44 + bob, 12, 9, cSkin);
        this.px(ctx, 1, -43 + bob, 3, 2, cEyes);

        if (isLaughing) {
          // Cackling open mouth with white teeth
          this.px(ctx, -2, -38 + bob, 7, 5, '#880011');
          this.px(ctx, -1, -38 + bob, 5, 2, '#ffffff');
        }

        if (bossType === 'master_shen') {
          this.px(ctx, -3, -35 + bob, 6, 7, cHair); // White beard
        } else {
          this.px(ctx, -8, -50 + bob, 16, 3, cGold); // Golden Dragon Crown
        }
      }

      // Royal Robe & Dragon Embroidery
      this.px(ctx, -10, -35 + bob, 20, 22, cRobe);
      this.px(ctx, -2, -35 + bob, 4, 22, cGold);
      this.px(ctx, -10, -20 + bob, 20, 4, cGold);

      // Kung-Fu Hand Stance / Claws
      this.px(ctx, 6, -30 + bob, 8, 5, cRobe);
      this.px(ctx, 12, -31 + bob, 5, 6, cSkin);

      // Skirt / Tabi
      this.px(ctx, -9, -13, 8, 14, cRobe);
      this.px(ctx, 1, -13, 8, 14, cRobe);
      this.px(ctx, -10, -2, 9, 4, '#000');
      this.px(ctx, 1, -2, 9, 4, '#000');

      if (isEnraged || bossType === 'kuroda') {
        this.px(ctx, -14, -40 + Math.sin(animTime * 12) * 3, 3, 10, '#ff3300');
        this.px(ctx, 12, -42 + Math.cos(animTime * 12) * 3, 3, 10, '#ffd700');
      }
    }
    else if (state === 'attack' || state === 'special') {
      this.px(ctx, -4, -46, 16, 12, cHair);
      this.px(ctx, -2, -42, 12, 9, cSkin);
      this.px(ctx, 3, -41, 4, 3, cEyes);

      this.px(ctx, -8, -33, 22, 22, cRobe);
      this.px(ctx, -8, -18, 22, 4, cGold);

      // Thrusting Dragon Palm
      this.px(ctx, 10, -32, 20, 8, cRobe);
      this.px(ctx, 28, -34, 8, 12, cSkin);

      // Energy orb on boss palm
      const orbColor = bossType === 'iron_fang' ? '#ff3300' : (bossType === 'kuroda' ? '#ffd700' : '#00ffff');
      this.px(ctx, 35, -35, 8, 14, orbColor);
      this.px(ctx, 37, -33, 4, 10, '#ffffff');

      this.px(ctx, -12, -11, 10, 13, cRobe);
      this.px(ctx, 4, -11, 10, 13, cRobe);
      this.px(ctx, -14, -1, 11, 4, '#000');
      this.px(ctx, 4, -1, 11, 4, '#000');
    }
    else if (state === 'hurt') {
      this.px(ctx, -11, -44, 16, 12, cHair);
      this.px(ctx, -9, -40, 12, 9, cSkin);
      this.px(ctx, -10, -31, 20, 20, cRobe);
      this.px(ctx, -10, -11, 8, 12, cRobe);
      this.px(ctx, -2, -11, 8, 12, cRobe);
    }
    else if (state === 'knockdown') {
      this.px(ctx, -24, -14, 14, 12, cHair);
      this.px(ctx, -12, -13, 22, 14, cRobe);
      this.px(ctx, 8, -13, 16, 10, cRobe);
      this.px(ctx, 22, -13, 8, 6, '#000');
    }

    ctx.restore();
  }

  // RENDER ITEMS: PIZZA, NUNCHUCKS, SCROLL, WEAPONS
  drawItem(ctx, type, animTime) {
    const bob = Math.sin(animTime * 6) * 3;
    ctx.save();
    ctx.translate(0, bob);

    if (type === 'pizza') {
      // Classic TMNT Pizza Box & Slice!
      // Pizza Box
      this.px(ctx, -10, -8, 20, 7, '#d84a38');
      this.px(ctx, -9, -7, 18, 5, '#f5e2b3');
      this.px(ctx, -5, -6, 10, 3, '#2a8b32'); // Green logo
      // Cheese pizza slice popping out
      this.px(ctx, 2, -14, 8, 8, '#f5c842');
      this.px(ctx, 3, -13, 2, 2, '#d62828'); // Pepperoni
      this.px(ctx, 6, -10, 2, 2, '#d62828');
    }
    else if (type === 'nunchaku') {
      // Bruce Lee / Kung-Fu Nunchaku!
      this.px(ctx, -8, -12, 4, 14, '#b87333');
      this.px(ctx, 4, -10, 4, 14, '#b87333');
      // Steel chain link
      this.px(ctx, -4, -14, 8, 3, '#e0e0e0');
    }
    else if (type === 'daggers') {
      // Twin Ninja / Assassin Daggers
      // First dagger
      this.px(ctx, -7, -14, 3, 16, '#e2e8f0');
      this.px(ctx, -6, -13, 1, 14, '#ffffff'); // Gleaming edge
      this.px(ctx, -9, -6, 7, 2, '#ffd700'); // Gold guard
      this.px(ctx, -7, -4, 3, 6, '#4a2511'); // Hilt
      // Second dagger crossed
      this.px(ctx, 4, -14, 3, 16, '#e2e8f0');
      this.px(ctx, 5, -13, 1, 14, '#ffffff');
      this.px(ctx, 2, -6, 7, 2, '#ffd700');
      this.px(ctx, 4, -4, 3, 6, '#4a2511');
    }
    else if (type === 'pipe') {
      // Streets of Rage Lead Pipe
      this.px(ctx, -12, -4, 24, 4, '#a0abb7');
      this.px(ctx, -11, -3, 22, 2, '#dbe2ea');
    }
    else if (type === 'pistols' || type === 'dual_pistols') {
      // Dual Akimbo Semi-Automatic Pistols
      // Left gun
      this.px(ctx, -10, -12, 11, 4, '#94a3b8');
      this.px(ctx, -8, -10, 4, 7, '#1c1917');
      this.px(ctx, -11, -12, 2, 3, '#ffd700');
      // Right gun crossed
      this.px(ctx, 0, -14, 11, 4, '#94a3b8');
      this.px(ctx, 4, -12, 4, 7, '#1c1917');
      this.px(ctx, 9, -14, 2, 3, '#ffd700');
    }
    else if (type === 'scroll') {
      // Ancient Dragon Martial Scroll
      this.px(ctx, -9, -9, 18, 10, '#f2dfaa');
      this.px(ctx, -11, -10, 3, 12, '#8b1e1e');
      this.px(ctx, 8, -10, 3, 12, '#8b1e1e');
      this.px(ctx, -4, -7, 8, 6, '#ff2200'); // Kanji seal
    }

    ctx.restore();
  }

  // RENDER BREAKABLE OBJECT & ENVIRONMENTAL HAZARDS
  drawBreakable(ctx, type, health, maxHealth, animTime = 0, hazardState = 'active') {
    if (type === 'crate') {
      // Wooden Kung-Fu Crate
      this.px(ctx, -14, -26, 28, 26, '#a66935');
      this.px(ctx, -12, -24, 24, 22, '#bd8148');
      // Wood planks & diagonal cross brace
      this.px(ctx, -14, -14, 28, 2, '#703e15');
      this.px(ctx, -10, -22, 20, 2, '#703e15');
      this.px(ctx, -10, -6, 20, 2, '#703e15');
      // Frame border
      ctx.strokeStyle = '#5a300d';
      ctx.lineWidth = 2;
      ctx.strokeRect(-13, -25, 26, 24);
    } else if (type === 'barrel') {
      // Chinatown Red Lantern or Dragon Oil Barrel
      this.px(ctx, -12, -28, 24, 28, '#b82a2a');
      this.px(ctx, -10, -26, 20, 24, '#db4646');
      // Steel bands
      this.px(ctx, -12, -22, 24, 3, '#444');
      this.px(ctx, -12, -10, 24, 3, '#444');
      // Dragon insignia
      this.px(ctx, -4, -18, 8, 6, '#ffd700');
    } else if (type === 'tnt') {
      // High-Explosive TNT Hazard Barrel
      this.px(ctx, -12, -28, 24, 28, '#d62828');
      this.px(ctx, -10, -26, 20, 24, '#e63946');
      // Yellow & Black Hazard Stripes on top & bottom rims
      this.px(ctx, -12, -28, 24, 4, '#ffbe0b');
      this.px(ctx, -12, -4, 24, 4, '#ffbe0b');
      this.px(ctx, -10, -28, 4, 4, '#111111');
      this.px(ctx, -2, -28, 4, 4, '#111111');
      this.px(ctx, 6, -28, 4, 4, '#111111');
      this.px(ctx, -10, -4, 4, 4, '#111111');
      this.px(ctx, -2, -4, 4, 4, '#111111');
      this.px(ctx, 6, -4, 4, 4, '#111111');
      // White bold stenciled "TNT" label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TNT', 0, -13);
      // Lit fuse rope on top
      this.px(ctx, -1, -33, 2, 5, '#8d99ae');
      // Flickering burning spark
      const sparkPulse = Math.sin(animTime * 28) * 1.5;
      ctx.fillStyle = (Math.floor(animTime * 18) % 2 === 0) ? '#ffbe0b' : '#ff0055';
      ctx.beginPath();
      ctx.arc(0, -34, 3 + sparkPulse * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'electric_pylon') {
      // High-Voltage Tesla Generator & Pylon
      this.px(ctx, -12, -12, 24, 12, '#1e293b');
      this.px(ctx, -10, -10, 20, 8, '#334155');
      // Yellow Lightning Bolt Hazard Badge
      this.px(ctx, -3, -10, 6, 8, '#facc15');
      this.px(ctx, -1, -8, 2, 4, '#1e293b');
      // Ceramic Insulator Stack (Ribbed)
      this.px(ctx, -6, -24, 12, 12, '#0284c7');
      this.px(ctx, -8, -22, 16, 2, '#38bdf8');
      this.px(ctx, -8, -17, 16, 2, '#38bdf8');
      this.px(ctx, -8, -13, 16, 2, '#38bdf8');
      // Copper Tesla Coil Terminals
      this.px(ctx, -10, -32, 5, 8, '#d97706');
      this.px(ctx, 5, -32, 5, 8, '#d97706');
      this.px(ctx, -9, -34, 3, 3, '#f59e0b');
      this.px(ctx, 6, -34, 3, 3, '#f59e0b');
      // Animated Electric Zap Arc snapping between terminals
      if (Math.sin(animTime * 14) > -0.2) {
        ctx.strokeStyle = '#05d9e8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const midY = -34 + (Math.random() * 6 - 3);
        ctx.moveTo(-7, -33);
        ctx.lineTo(-2, midY);
        ctx.lineTo(2, midY + (Math.random() * 4 - 2));
        ctx.lineTo(7, -33);
        ctx.stroke();
        // Bright white center spark
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, midY - 1, 2, 2);
      }
    } else if (type === 'acid_drum') {
      if (hazardState === 'puddle') {
        // Active Bubbling Acid Puddle on the floor
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.72)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Bubbles popping in the ooze
        for (let b = 0; b < 4; b++) {
          const bx = Math.sin(animTime * 4 + b * 1.8) * 24;
          const by = Math.cos(animTime * 5 + b * 1.5) * 8;
          const br = 2 + (Math.sin(animTime * 8 + b) + 1);
          ctx.fillStyle = '#6ee7b7';
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
        // Dented melted drum resting in the puddle
        this.px(ctx, -8, -12, 16, 12, '#064e3b');
        this.px(ctx, -6, -10, 12, 8, '#047857');
        ctx.restore();
      } else {
        // Toxic Chemical Acid Drum
        this.px(ctx, -12, -28, 24, 28, '#065f46');
        this.px(ctx, -10, -26, 20, 24, '#059669');
        // Black steel ribs
        this.px(ctx, -12, -22, 24, 3, '#1e293b');
        this.px(ctx, -12, -10, 24, 3, '#1e293b');
        // Yellow Biohazard trefoil badge
        this.px(ctx, -5, -18, 10, 7, '#facc15');
        this.px(ctx, -2, -16, 4, 3, '#065f46');
        // Bubbling radioactive slime dripping over the rim
        this.px(ctx, -11, -30, 22, 4, '#10b981');
        const drip = Math.floor(animTime * 3) % 4;
        this.px(ctx, -6, -26, 3, 5 + drip, '#34d399');
        this.px(ctx, 4, -26, 3, 3 + (drip % 2), '#34d399');
      }
    } else if (type === 'spike_trap') {
      // Floor Spike Blade Trap Grate
      ctx.save();
      // Outer steel frame recessed in floor
      this.px(ctx, -18, -8, 36, 16, '#1e293b');
      this.px(ctx, -16, -6, 32, 12, '#334155');
      // Slits in grate
      for (let s = -12; s <= 12; s += 6) {
        this.px(ctx, s, -5, 2, 10, '#0f172a');
      }

      if (hazardState === 'warning') {
        // Spikes peeking out slightly with warning rattling
        const rattle = (Math.sin(animTime * 35) > 0 ? 1 : 0);
        ctx.fillStyle = '#ffbe0b';
        for (let s = -12; s <= 12; s += 6) {
          ctx.beginPath();
          ctx.moveTo(s + 1, -5 - rattle);
          ctx.lineTo(s - 1, -1);
          ctx.lineTo(s + 3, -1);
          ctx.closePath();
          ctx.fill();
        }
      } else if (hazardState === 'extended') {
        // Sharp gleaming steel spikes thrust high into the air!
        for (let s = -12; s <= 12; s += 6) {
          // Spike blade body
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(s + 1, -22); // Sharp top tip
          ctx.lineTo(s - 2, -4);
          ctx.lineTo(s + 4, -4);
          ctx.closePath();
          ctx.fill();
          // Blade bevel shadow
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(s + 1, -22);
          ctx.lineTo(s + 4, -4);
          ctx.lineTo(s + 1, -4);
          ctx.closePath();
          ctx.fill();
          // Razor red/blood tip
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(s + 1, -22);
          ctx.lineTo(s, -17);
          ctx.lineTo(s + 2, -17);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (type === 'hydrant') {
      // Red City Fire Hydrant
      this.px(ctx, -9, -24, 18, 24, '#b91c1c');
      this.px(ctx, -7, -22, 14, 20, '#ef4444');
      // Flanged base
      this.px(ctx, -11, -4, 22, 4, '#7f1d1d');
      // Side brass valve caps
      this.px(ctx, -12, -15, 3, 6, '#d97706');
      this.px(ctx, 9, -15, 3, 6, '#d97706');

      if (hazardState === 'ruptured') {
        // Ruptured High-Pressure Vertical Water Geyser!
        ctx.save();
        const gTime = animTime * 15;
        // Outer spray plume
        ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.beginPath();
        ctx.moveTo(-10, -22);
        ctx.lineTo(-16 - Math.sin(gTime) * 3, -115);
        ctx.lineTo(16 + Math.cos(gTime) * 3, -115);
        ctx.lineTo(10, -22);
        ctx.closePath();
        ctx.fill();

        // Inner foaming white column
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.moveTo(-5, -24);
        ctx.lineTo(-8 + Math.cos(gTime * 1.5) * 2, -110);
        ctx.lineTo(8 - Math.sin(gTime * 1.5) * 2, -110);
        ctx.lineTo(5, -24);
        ctx.closePath();
        ctx.fill();

        // Water splash droplet mist at geyser apex
        for (let d = 0; d < 6; d++) {
          const dx = Math.sin(gTime + d * 1.2) * 22;
          const dy = -115 - Math.abs(Math.cos(gTime * 0.8 + d)) * 14;
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(dx - 1, dy - 1, 3, 3);
        }
        // Base ground splash puddle
        ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Intact Hydrant Top Dome & Bonnet Nut
        this.px(ctx, -6, -28, 12, 5, '#ef4444');
        this.px(ctx, -2, -31, 4, 3, '#d97706');
      }
    }
  }

  // RENDER PROJECTILES: SHURIKEN & KI FIREBALL
  drawProjectile(ctx, type, animTime) {
    if (type === 'shuriken') {
      ctx.save();
      ctx.rotate(animTime * 25);
      this.px(ctx, -6, -2, 12, 4, '#c0c8d0');
      this.px(ctx, -2, -6, 4, 12, '#c0c8d0');
      this.px(ctx, -2, -2, 4, 4, '#ffffff');
      ctx.restore();
    } else if (type === 'fireball') {
      // Dragon Ki blast
      ctx.save();
      const pulse = Math.sin(animTime * 20) * 2;
      // Flame core
      ctx.fillStyle = '#ffeedd';
      ctx.beginPath();
      ctx.arc(0, 0, 7 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Cyan / Blue dragon flame outer ring
      ctx.fillStyle = 'rgba(5, 217, 232, 0.7)';
      ctx.beginPath();
      ctx.arc(-2, 0, 12 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Tail flame sparks
      this.px(ctx, -18, -3, 8, 6, '#ff0055');
      this.px(ctx, -24, -1, 7, 3, '#ffd700');
      ctx.restore();
    }
  }

  // RENDER CHARACTER SELECT RETRO PORTRAIT CARD
  drawPortraitCard(ctx, characterId, x, y, isSelected, animTime) {
    ctx.save();
    ctx.translate(x, y);

    const cardW = 120;
    const cardH = 170;

    // Card Background & Neon Border
    ctx.fillStyle = isSelected ? '#1c1530' : '#110d1c';
    ctx.fillRect(-cardW / 2, 0, cardW, cardH);

    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.strokeStyle = isSelected ? (Math.floor(animTime * 6) % 2 === 0 ? '#ffd700' : '#ff0055') : '#36294d';
    ctx.strokeRect(-cardW / 2, 0, cardW, cardH);

    // Glowing selected corners
    if (isSelected) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-cardW / 2 - 2, -2, 6, 6);
      ctx.fillRect(cardW / 2 - 4, -2, 6, 6);
      ctx.fillRect(-cardW / 2 - 2, cardH - 4, 6, 6);
      ctx.fillRect(cardW / 2 - 4, cardH - 4, 6, 6);
    }

    // Character Viewport Box
    ctx.fillStyle = '#08060f';
    ctx.fillRect(-cardW / 2 + 8, 8, cardW - 16, 75);
    ctx.strokeStyle = isSelected ? '#05d9e8' : '#221933';
    ctx.strokeRect(-cardW / 2 + 8, 8, cardW - 16, 75);

    // Draw Character Fighting Stance inside box
    ctx.save();
    ctx.translate(0, 68);
    this.drawPlayer(ctx, isSelected ? 'idle' : 'walk', animTime, 1, characterId);
    ctx.restore();

    // Name Banner
    ctx.textAlign = 'center';
    ctx.font = '8px "Press Start 2P"';
    if (characterId === 'smellu') {
      ctx.fillStyle = '#ff2a6d';
      ctx.fillText('SMELLU', 0, 96);
      ctx.fillStyle = '#c9bede';
      ctx.font = '5px "Press Start 2P"';
      ctx.fillText('BALANCED DRAGON', 0, 106);
    } else if (characterId === 'lindin') {
      ctx.fillStyle = '#05d9e8';
      ctx.fillText('LINDIN', 0, 96);
      ctx.fillStyle = '#c9bede';
      ctx.font = '5px "Press Start 2P"';
      ctx.fillText('AGILE VIPER', 0, 106);
    } else if (characterId === 'smoro') {
      ctx.fillStyle = '#ffd700';
      ctx.fillText('SMORO', 0, 96);
      ctx.fillStyle = '#c9bede';
      ctx.font = '5px "Press Start 2P"';
      ctx.fillText('HEAVY IRON BULL', 0, 106);
    }

    // Stats Section
    const renderStat = (label, value, yOffset, color) => {
      ctx.fillStyle = '#888';
      ctx.font = '5px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText(label, -cardW / 2 + 10, yOffset);

      // 5 pips
      for (let p = 0; p < 5; p++) {
        ctx.fillStyle = p < value ? color : '#261c33';
        ctx.fillRect(-cardW / 2 + 54 + (p * 10), yOffset - 5, 8, 5);
      }
    };

    if (characterId === 'smellu') {
      renderStat('SPD', 3, 122, '#00ff66');
      renderStat('PWR', 3, 134, '#ffd700');
      renderStat('DEF', 3, 146, '#05d9e8');
    } else if (characterId === 'lindin') {
      renderStat('SPD', 5, 122, '#00ff66');
      renderStat('PWR', 2, 134, '#ffd700');
      renderStat('DEF', 2, 146, '#05d9e8');
    } else if (characterId === 'smoro') {
      renderStat('SPD', 2, 122, '#00ff66');
      renderStat('PWR', 5, 134, '#ffd700');
      renderStat('DEF', 5, 146, '#05d9e8');
    }

    // Special Move Name
    ctx.textAlign = 'center';
    ctx.font = '5px "Press Start 2P"';
    ctx.fillStyle = isSelected ? '#ffaa00' : '#666';
    const spName = characterId === 'smellu' ? 'KI WHIRLWIND' : (characterId === 'lindin' ? 'HURRICANE KICK' : 'EARTHQUAKE SLAM');
    ctx.fillText(`SP: ${spName}`, 0, 162);

    ctx.restore();
  }
}

window.spriteRenderer = new SpriteRenderer();
