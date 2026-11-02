const { AILearningEngine } = require('../src/learning.js');

// Simulate the exact state after zone 0 is cleared
const engine = new AILearningEngine();

const stage = {
  gameMode: 'HORIZONTAL',
  width: 16000,
  minY: 152,
  maxY: 264,
  cameraX: 450,
  locked: false,
  currentZoneIndex: 1,
  zones: [
    { triggerX: 450, lockAt: 450, cleared: true },
    { triggerX: 1200, lockAt: 1200, cleared: false }
  ]
};

const player = {
  x: 450,
  y: 210,
  z: 0,
  vx: 0,
  vy: 0,
  speed: 2.4,
  characterId: 'smellu',
  state: 'idle',
  facing: 1,
  animTime: 0,
  stateTimer: 0,
  comboInputWindow: 0,
  dodgeCooldown: 0,
  attackCooldown: 0,
  specialMeter: 30,
  maxSpecial: 100,
  isInvulnerable: false,
  invulnTimer: 0,
  weapon: { type: 'pistols', hits: 36 },
  health: 76,
  maxHealth: 100,
  score: 1600,
  updatePhysics(dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.z += (this.vz || 0);
  },
  handleWallCollision(s) {
    const leftWall = s.cameraX + 20;
    const rightWall = s.cameraX + 460;
    if (this.x <= leftWall) {
      this.x = leftWall;
      if (this.vx < 0) this.vx = 0;
    } else if (this.x >= rightWall) {
      this.x = rightWall;
      if (this.vx > 0) this.vx = 0;
    }
  }
};

const companion = {
  x: 410,
  y: 218,
  z: 0,
  vx: 0,
  vy: 0,
  speed: 3.3,
  characterId: 'lindin',
  state: 'idle',
  facing: 1,
  animTime: 0,
  stateTimer: 0,
  comboInputWindow: 0,
  dodgeCooldown: 0,
  attackCooldown: 0,
  specialMeter: 30,
  maxSpecial: 85,
  isDead: false,
  reviveTimer: 0,
  targetEnemy: null,
  updatePhysics(dt) {
    this.x += this.vx;
    this.y += this.vy;
  },
  handleWallCollision(s) {
    const leftWall = s.cameraX + 20;
    const rightWall = s.cameraX + 460;
    if (this.x <= leftWall) {
      this.x = leftWall;
      if (this.vx < 0) this.vx = 0;
    } else if (this.x >= rightWall) {
      this.x = rightWall;
      if (this.vx > 0) this.vx = 0;
    }
  },
  updateAI(dt, enemies, p, s) {
    const canAct = (this.state === 'idle' || this.state === 'walk') && this.z === 0;
    if (enemies.length === 0) {
      const idealX = p.x - (p.facing * 44);
      const idealY = p.y + 8;
      const dx = idealX - this.x;
      const dy = idealY - this.y;

      if (Math.hypot(dx, dy) > 28 && canAct) {
        this.state = 'walk';
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = Math.sign(dx) * (this.speed * 1.15);
        this.vy = Math.sign(dy) * (this.speed * 0.8);
      } else if (canAct) {
        this.state = 'idle';
        this.vx = 0;
        this.vy = 0;
        this.facing = -p.facing;
      }
    }
  }
};

global.window = {
  game: {
    companion: companion,
    autoPlay: true,
    pickups: [],
    breakables: []
  }
};

console.log('Simulating 300 frames of post-zone progression...');
for (let frame = 1; frame <= 300; frame++) {
  const dt = 0.016;

  // 1. Stage update
  if (!stage.locked) {
    const focusX = (player.x + companion.x) / 2;
    const targetCamX = focusX - 180;
    if (targetCamX > stage.cameraX) {
      stage.cameraX += (targetCamX - stage.cameraX) * 0.1;
    }
  }

  // 2. Player AI
  engine.updatePlayerAI(player, [], companion, stage, dt, global.window.game);
  player.updatePhysics(dt);
  player.handleWallCollision(stage);

  // 3. Companion AI
  companion.updateAI(dt, [], player, stage);
  companion.updatePhysics(dt);
  companion.handleWallCollision(stage);

  if (frame % 50 === 0 || frame <= 10) {
    console.log(`Frame ${frame}: PlayerX=${player.x.toFixed(1)}, CompX=${companion.x.toFixed(1)}, CamX=${stage.cameraX.toFixed(1)}, PlayerState=${player.state}, Goal=${engine.leaderCurrentGoal}`);
  }
}
