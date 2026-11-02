/**
 * CARPE'S KUNG FU RAGE - MULTI-STAGE SYSTEM & PARALLAX ENGINE
 * Stage 1: Chinatown Neon Alleyway (Rainstorm)
 * Stage 2: Pagoda Rooftops & High-Speed Moving Train (Night Rush)
 * Stage 3: Underground Ninja Dojo & The Dragon Clan Shrine (Final Duel)
 */

class Stage {
  constructor() {
    this.width = 16000; // Colossal 16,000px marathon levels across 20 intense combat zones!
    this.minY = 152;   // Expanded top boundary of walking lane
    this.maxY = 264;   // Expanded bottom boundary of walking lane
    this.cameraX = 0;
    this.locked = false;
    this.lockTargetX = 0;
    this.showGoSign = false;
    this.goBlinkTimer = 0;
    this.currentZoneIndex = 0;
    this.currentStageNum = 1;
    this.stageCleared = false;
    this.stageClearTimer = 0;

    this.trainOffset = 0;
    this.emberParticles = [];

    // Game Mode & Vertical Mechanics
    this.gameMode = localStorage.getItem('kungfu_gamemode') || 'HORIZONTAL';
    this.verticalScrollY = 0;
    this.altitude = 0;
    this.targetAltitude = 0;
    this.isAscending = false;
    this.ascentTimer = 0;
    this.risingWindParticles = [];

    // Stage Names
    this.horizontalStageNames = {
      1: 'CHINATOWN NEON ALLEYWAY',
      2: 'PAGODA ROOFTOPS & TRAIN',
      3: 'UNDERGROUND DRAGON SHRINE'
    };
    this.verticalStageNames = {
      1: 'DRAGON PAGODA - 100 FLOORS',
      2: 'CYBER SKY ELEVATOR',
      3: "HEAVEN'S PEAK CRANE SUMMIT"
    };

    this.loadStage(1);
  }

  getStageName(stageNum = this.currentStageNum) {
    if (this.gameMode === 'VERTICAL') {
      if (this.gameMode !== 'ENDLESS' && this.verticalStageNames[stageNum]) {
        return this.verticalStageNames[stageNum];
      }
      const floorStart = (stageNum - 1) * 20 + 1;
      const floorEnd = stageNum * 20;
      return `PAGODA SECTOR ${stageNum} (FLOORS ${floorStart}-${floorEnd})`;
    }
    if (this.gameMode !== 'ENDLESS' && this.horizontalStageNames[stageNum]) {
      return this.horizontalStageNames[stageNum];
    }
    const proc = this.getProceduralStageName(stageNum);
    return proc.title;
  }

  get stageNames() {
    const self = this;
    return new Proxy({}, {
      get(target, prop) {
        const num = parseInt(prop, 10);
        if (!isNaN(num)) {
          return self.getStageName(num);
        }
        return `STAGE ${prop}`;
      }
    });
  }

  setGameMode(mode) {
    this.gameMode = mode;
    localStorage.setItem('kungfu_gamemode', mode);
    this.loadStage(this.currentStageNum);
  }

  loadStage(stageNum) {
    this.currentStageNum = stageNum;
    this.cameraX = 0;
    this.locked = false;
    this.showGoSign = false;
    this.currentZoneIndex = 0;
    this.stageCleared = false;
    this.stageClearTimer = 0;
    this.spawnQueue = [];
    this.verticalScrollY = 0;
    this.altitude = (stageNum - 1) * 3000;
    this.targetAltitude = this.altitude;
    this.isAscending = false;

    if (typeof window !== 'undefined' && window.gameLogger) {
      const stageName = this.getStageName(stageNum);
      window.gameLogger.log('STAGE', `Loaded Stage ${stageNum} (${this.gameMode}): ${stageName}`);
    }
    this.ascentTimer = 0;
    this.risingWindParticles = [];

    // Configure Weather
    if (window.weatherSystem) {
      window.weatherSystem.setStage(stageNum);
    }

    if (this.gameMode === 'VERTICAL') {
      this.width = 480;
      this.minY = 160;
      this.maxY = 255;
      if (stageNum === 1 && this.gameMode !== 'ENDLESS') {
        this.zones = this.createVerticalStage1Zones();
      } else if (stageNum === 2 && this.gameMode !== 'ENDLESS') {
        this.zones = this.createVerticalStage2Zones();
      } else if (stageNum === 3 && this.gameMode !== 'ENDLESS') {
        this.zones = this.createVerticalStage3Zones();
      } else {
        this.zones = this.createProceduralVerticalStageZones(stageNum);
      }
    } else {
      this.width = 16000;
      this.minY = 152;
      this.maxY = 264;
      if (stageNum === 1 && this.gameMode !== 'ENDLESS') {
        this.zones = this.createStage1Zones();
      } else if (stageNum === 2 && this.gameMode !== 'ENDLESS') {
        this.zones = this.createStage2Zones();
      } else if (stageNum === 3 && this.gameMode !== 'ENDLESS') {
        this.zones = this.createStage3Zones();
      } else {
        this.zones = this.createProceduralStageZones(stageNum);
      }
    }
  }

  createStage1Zones() {
    return [
        {
          triggerX: 450,
          lockAt: 450,
          cleared: false,
          enemies: [
            { type: 'thug', xOffset: -40, y: 175 },
            { type: 'thug', xOffset: 500, y: 225 },
            { type: 'zombie', xOffset: 530, y: 195 }
          ],
          breakables: [
            { type: 'crate', x: 550, y: 200, drops: 'nunchaku' }
          ]
        },
        {
          triggerX: 1200,
          lockAt: 1200,
          cleared: false,
          enemies: [
            { type: 'ninja', xOffset: 500, y: 170 },
            { type: 'zombie', xOffset: -40, y: 235 },
            { type: 'ninja', xOffset: 520, y: 245 },
            { type: 'thug', xOffset: 550, y: 200 }
          ],
          breakables: [
            { type: 'barrel', x: 1350, y: 185, drops: 'daggers' },
            { type: 'crate', x: 1470, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 2000,
          lockAt: 2000,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 180 },
            { type: 'zombie', xOffset: -40, y: 230 },
            { type: 'ninja', xOffset: 530, y: 210 },
            { type: 'thug', xOffset: 550, y: 195 }
          ],
          breakables: [
            { type: 'crate', x: 2180, y: 205, drops: 'pipe' }
          ]
        },
        {
          triggerX: 2800,
          lockAt: 2800,
          cleared: false,
          enemies: [
            { type: 'kicker', xOffset: 500, y: 175 },
            { type: 'kicker', xOffset: 530, y: 245 },
            { type: 'bruiser', xOffset: -40, y: 210 },
            { type: 'thug', xOffset: 550, y: 200 }
          ],
          breakables: [
            { type: 'barrel', x: 2960, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 3600,
          lockAt: 3600,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'assassin', xOffset: -40, y: 240 },
            { type: 'ninja', xOffset: 530, y: 210 },
            { type: 'thug', xOffset: 550, y: 180 }
          ],
          reinforcements: [
            [
              { type: 'ronin', xOffset: 500, y: 180 },
              { type: 'kicker', xOffset: -40, y: 235 }
            ]
          ],
          breakables: [
            { type: 'crate', x: 3780, y: 200, drops: 'scroll' },
            { type: 'barrel', x: 3880, y: 245, drops: 'pizza' }
          ]
        },
        {
          triggerX: 4400,
          lockAt: 4400,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 520, y: 210 },
            { type: 'thug', xOffset: -40, y: 175 },
            { type: 'thug', xOffset: 550, y: 240 }
          ],
          reinforcements: [
            [
              { type: 'assassin', xOffset: 500, y: 180 },
              { type: 'ninja', xOffset: -40, y: 220 },
              { type: 'kicker', xOffset: 530, y: 240 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 4580, y: 190, drops: 'pizza' },
            { type: 'crate', x: 4680, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 5200,
          lockAt: 5200,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 175 },
            { type: 'ronin', xOffset: -40, y: 235 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'bruiser', xOffset: 560, y: 190 }
          ],
          breakables: [
            { type: 'barrel', x: 5380, y: 200, drops: 'pizza' }
          ]
        },
        {
          triggerX: 6000,
          lockAt: 6000,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'assassin', xOffset: 530, y: 245 },
            { type: 'kicker', xOffset: -40, y: 210 },
            { type: 'ninja', xOffset: 560, y: 185 }
          ],
          reinforcements: [
            [
              { type: 'club_giant', xOffset: 520, y: 205 },
              { type: 'ronin', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'crate', x: 6180, y: 195, drops: 'scroll' },
            { type: 'barrel', x: 6280, y: 245, drops: 'pizza' }
          ]
        },
        {
          triggerX: 6800,
          lockAt: 6800,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 180 },
            { type: 'kicker', xOffset: -40, y: 235 },
            { type: 'assassin', xOffset: 530, y: 210 },
            { type: 'bruiser', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 7000, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 7600,
          lockAt: 7600,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'club_giant', xOffset: -40, y: 235 },
            { type: 'ronin', xOffset: 530, y: 210 }
          ],
          reinforcements: [
            [
              { type: 'assassin', xOffset: 500, y: 175 },
              { type: 'kicker', xOffset: -40, y: 240 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 7780, y: 190, drops: 'pizza' },
            { type: 'barrel', x: 7880, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 8400,
          lockAt: 8400,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'kicker', xOffset: 530, y: 245 },
            { type: 'bruiser', xOffset: -40, y: 210 },
            { type: 'ninja', xOffset: 560, y: 180 }
          ],
          breakables: [
            { type: 'crate', x: 8600, y: 195, drops: 'pizza' }
          ]
        },
        {
          triggerX: 9200,
          lockAt: 9200,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 175 },
            { type: 'ronin', xOffset: -40, y: 235 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'assassin', xOffset: 560, y: 185 }
          ],
          reinforcements: [
            [
              { type: 'club_giant', xOffset: 520, y: 205 },
              { type: 'bruiser', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 9380, y: 190, drops: 'scroll' },
            { type: 'crate', x: 9480, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 10000,
          lockAt: 10000,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 180 },
            { type: 'ronin', xOffset: -40, y: 235 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'barrel', x: 10200, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 10800,
          lockAt: 10800,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 520, y: 205 },
            { type: 'bruiser', xOffset: -40, y: 180 },
            { type: 'assassin', xOffset: 550, y: 240 }
          ],
          reinforcements: [
            [
              { type: 'ronin', xOffset: 500, y: 180 },
              { type: 'ronin', xOffset: -40, y: 230 },
              { type: 'kicker', xOffset: 530, y: 210 }
            ]
          ],
          breakables: [
            { type: 'crate', x: 10980, y: 190, drops: 'pizza' },
            { type: 'barrel', x: 11080, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 11600,
          lockAt: 11600,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'assassin', xOffset: -40, y: 240 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 560, y: 180 }
          ],
          reinforcements: [
            [
              { type: 'club_giant', xOffset: 520, y: 205 },
              { type: 'kicker', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 11800, y: 195, drops: 'pizza' }
          ]
        },
        {
          triggerX: 12400,
          lockAt: 12400,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 180 },
            { type: 'ronin', xOffset: -40, y: 230 },
            { type: 'bruiser', xOffset: 530, y: 210 },
            { type: 'assassin', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 12600, y: 190, drops: 'scroll' }
          ]
        },
        {
          triggerX: 13200,
          lockAt: 13200,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'kicker', xOffset: -40, y: 235 },
            { type: 'assassin', xOffset: 530, y: 210 },
            { type: 'ronin', xOffset: 560, y: 175 }
          ],
          reinforcements: [
            [
              { type: 'assassin', xOffset: -40, y: 180 },
              { type: 'kicker', xOffset: 520, y: 240 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 13380, y: 190, drops: 'pizza' },
            { type: 'crate', x: 13480, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 14000,
          lockAt: 14000,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 180 },
            { type: 'club_giant', xOffset: -40, y: 235 },
            { type: 'ronin', xOffset: 530, y: 210 },
            { type: 'bruiser', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 14200, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 14800,
          lockAt: 14800,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'ronin', xOffset: -40, y: 235 },
            { type: 'assassin', xOffset: 530, y: 210 },
            { type: 'kicker', xOffset: 560, y: 175 },
            { type: 'ninja', xOffset: 580, y: 245 }
          ],
          breakables: [
            { type: 'barrel', x: 14980, y: 190, drops: 'scroll' },
            { type: 'crate', x: 15080, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 15600,
          lockAt: 15600,
          cleared: false,
          isBossZone: true,
          bossType: 'master_shen',
          enemies: [
            { type: 'boss', bossType: 'master_shen', xOffset: 380, y: 205 },
            { type: 'ninja', xOffset: -40, y: 175 },
            { type: 'assassin', xOffset: 520, y: 245 },
            { type: 'ronin', xOffset: 550, y: 190 }
          ],
          breakables: [
            { type: 'barrel', x: 15760, y: 180, drops: 'pizza' },
            { type: 'barrel', x: 15860, y: 245, drops: 'scroll' }
          ]
        }
    ];
  }

  createStage2Zones() {
    return [
        {
          triggerX: 450,
          lockAt: 450,
          cleared: false,
          enemies: [
            { type: 'ninja', xOffset: 500, y: 180 },
            { type: 'zombie', xOffset: -40, y: 230 },
            { type: 'kicker', xOffset: 520, y: 205 }
          ],
          breakables: [
            { type: 'crate', x: 550, y: 200, drops: 'daggers' }
          ]
        },
        {
          triggerX: 1200,
          lockAt: 1200,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 175 },
            { type: 'zombie', xOffset: -40, y: 230 },
            { type: 'ninja', xOffset: 530, y: 210 },
            { type: 'thug', xOffset: 550, y: 190 }
          ],
          breakables: [
            { type: 'barrel', x: 1350, y: 185, drops: 'pipe' },
            { type: 'crate', x: 1470, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 2000,
          lockAt: 2000,
          cleared: false,
          enemies: [
            { type: 'bruiser', xOffset: 510, y: 185 },
            { type: 'bruiser', xOffset: -40, y: 235 },
            { type: 'kicker', xOffset: 530, y: 210 }
          ],
          breakables: [
            { type: 'barrel', x: 2180, y: 200, drops: 'pizza' }
          ]
        },
        {
          triggerX: 2800,
          lockAt: 2800,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'assassin', xOffset: -40, y: 240 },
            { type: 'ronin', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 550, y: 190 }
          ],
          breakables: [
            { type: 'crate', x: 2960, y: 205, drops: 'scroll' }
          ]
        },
        {
          triggerX: 3600,
          lockAt: 3600,
          cleared: false,
          enemies: [
            { type: 'kicker', xOffset: 500, y: 175 },
            { type: 'kicker', xOffset: -40, y: 235 },
            { type: 'ronin', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 550, y: 185 }
          ],
          reinforcements: [
            [
              { type: 'assassin', xOffset: 500, y: 180 },
              { type: 'bruiser', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 3780, y: 195, drops: 'pizza' },
            { type: 'crate', x: 3880, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 4400,
          lockAt: 4400,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 520, y: 205 },
            { type: 'bruiser', xOffset: -40, y: 180 },
            { type: 'kicker', xOffset: 550, y: 240 }
          ],
          reinforcements: [
            [
              { type: 'ronin', xOffset: 500, y: 180 },
              { type: 'ninja', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 4580, y: 200, drops: 'pizza' }
          ]
        },
        {
          triggerX: 5200,
          lockAt: 5200,
          cleared: false,
          enemies: [
            { type: 'bruiser', xOffset: 500, y: 180 },
            { type: 'kicker', xOffset: -40, y: 230 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'ronin', xOffset: 550, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 5380, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 6000,
          lockAt: 6000,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'assassin', xOffset: -40, y: 240 },
            { type: 'club_giant', xOffset: 530, y: 210 }
          ],
          reinforcements: [
            [
              { type: 'ronin', xOffset: 500, y: 185 },
              { type: 'kicker', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 6180, y: 195, drops: 'scroll' },
            { type: 'crate', x: 6280, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 6800,
          lockAt: 6800,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 180 },
            { type: 'ronin', xOffset: -40, y: 230 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'bruiser', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'barrel', x: 7000, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 7600,
          lockAt: 7600,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'bruiser', xOffset: -40, y: 235 },
            { type: 'ronin', xOffset: 530, y: 210 }
          ],
          reinforcements: [
            [
              { type: 'assassin', xOffset: 500, y: 175 },
              { type: 'kicker', xOffset: -40, y: 240 }
            ]
          ],
          breakables: [
            { type: 'crate', x: 7780, y: 200, drops: 'pizza' },
            { type: 'barrel', x: 7880, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 8400,
          lockAt: 8400,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'kicker', xOffset: 530, y: 245 },
            { type: 'ronin', xOffset: -40, y: 210 },
            { type: 'ninja', xOffset: 560, y: 180 }
          ],
          breakables: [
            { type: 'barrel', x: 8600, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 9200,
          lockAt: 9200,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 175 },
            { type: 'ronin', xOffset: -40, y: 235 },
            { type: 'bruiser', xOffset: 530, y: 210 },
            { type: 'assassin', xOffset: 560, y: 185 }
          ],
          reinforcements: [
            [
              { type: 'club_giant', xOffset: 520, y: 205 },
              { type: 'bruiser', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'crate', x: 9380, y: 195, drops: 'scroll' },
            { type: 'barrel', x: 9480, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 10000,
          lockAt: 10000,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 180 },
            { type: 'kicker', xOffset: -40, y: 235 },
            { type: 'ninja', xOffset: 530, y: 210 },
            { type: 'ronin', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 10200, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 10800,
          lockAt: 10800,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 520, y: 205 },
            { type: 'club_giant', xOffset: -40, y: 185 },
            { type: 'assassin', xOffset: 550, y: 240 }
          ],
          reinforcements: [
            [
              { type: 'ronin', xOffset: 500, y: 180 },
              { type: 'kicker', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 10980, y: 190, drops: 'pizza' },
            { type: 'barrel', x: 11080, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 11600,
          lockAt: 11600,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'kicker', xOffset: -40, y: 240 },
            { type: 'bruiser', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 560, y: 180 }
          ],
          reinforcements: [
            [
              { type: 'ronin', xOffset: 500, y: 180 },
              { type: 'assassin', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 11800, y: 195, drops: 'pizza' }
          ]
        },
        {
          triggerX: 12400,
          lockAt: 12400,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 180 },
            { type: 'ronin', xOffset: -40, y: 230 },
            { type: 'club_giant', xOffset: 530, y: 210 }
          ],
          breakables: [
            { type: 'crate', x: 12600, y: 190, drops: 'scroll' }
          ]
        },
        {
          triggerX: 13200,
          lockAt: 13200,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'assassin', xOffset: -40, y: 235 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'ronin', xOffset: 560, y: 175 }
          ],
          reinforcements: [
            [
              { type: 'bruiser', xOffset: -40, y: 185 },
              { type: 'kicker', xOffset: 520, y: 240 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 13380, y: 190, drops: 'pizza' },
            { type: 'crate', x: 13480, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 14000,
          lockAt: 14000,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 180 },
            { type: 'bruiser', xOffset: -40, y: 235 },
            { type: 'ronin', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 14200, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 14800,
          lockAt: 14800,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'bruiser', xOffset: -40, y: 235 },
            { type: 'assassin', xOffset: 530, y: 210 },
            { type: 'ronin', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 14980, y: 190, drops: 'pizza' },
            { type: 'barrel', x: 15080, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 15600,
          lockAt: 15600,
          cleared: false,
          isBossZone: true,
          bossType: 'iron_fang',
          enemies: [
            { type: 'boss', bossType: 'iron_fang', xOffset: 380, y: 205 },
            { type: 'bruiser', xOffset: -40, y: 180 },
            { type: 'club_giant', xOffset: 520, y: 240 },
            { type: 'kicker', xOffset: 550, y: 195 }
          ],
          breakables: [
            { type: 'barrel', x: 15760, y: 180, drops: 'pizza' },
            { type: 'crate', x: 15860, y: 240, drops: 'scroll' }
          ]
        }
    ];
  }

  createStage3Zones() {
    return [
        {
          triggerX: 450,
          lockAt: 450,
          cleared: false,
          enemies: [
            { type: 'ninja', xOffset: 500, y: 175 },
            { type: 'zombie', xOffset: 520, y: 235 },
            { type: 'ronin', xOffset: -40, y: 205 }
          ],
          breakables: [
            { type: 'barrel', x: 550, y: 190, drops: 'nunchaku' }
          ]
        },
        {
          triggerX: 1200,
          lockAt: 1200,
          cleared: false,
          enemies: [
            { type: 'kicker', xOffset: 500, y: 180 },
            { type: 'zombie', xOffset: -40, y: 230 },
            { type: 'ninja', xOffset: 530, y: 210 },
            { type: 'zombie', xOffset: 550, y: 195 }
          ],
          breakables: [
            { type: 'crate', x: 1350, y: 195, drops: 'daggers' },
            { type: 'barrel', x: 1470, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 2000,
          lockAt: 2000,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 175 },
            { type: 'ronin', xOffset: -40, y: 240 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 550, y: 185 }
          ],
          breakables: [
            { type: 'barrel', x: 2180, y: 195, drops: 'scroll' }
          ]
        },
        {
          triggerX: 2800,
          lockAt: 2800,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'assassin', xOffset: -40, y: 240 },
            { type: 'ronin', xOffset: 530, y: 210 },
            { type: 'bruiser', xOffset: 550, y: 190 }
          ],
          breakables: [
            { type: 'barrel', x: 2960, y: 200, drops: 'pizza' }
          ]
        },
        {
          triggerX: 3600,
          lockAt: 3600,
          cleared: false,
          enemies: [
            { type: 'kicker', xOffset: 500, y: 175 },
            { type: 'kicker', xOffset: -40, y: 235 },
            { type: 'bruiser', xOffset: 530, y: 210 },
            { type: 'ronin', xOffset: 550, y: 190 }
          ],
          reinforcements: [
            [
              { type: 'assassin', xOffset: 500, y: 180 },
              { type: 'assassin', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'crate', x: 3780, y: 200, drops: 'scroll' },
            { type: 'barrel', x: 3880, y: 235, drops: 'pizza' }
          ]
        },
        {
          triggerX: 4400,
          lockAt: 4400,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 520, y: 205 },
            { type: 'ronin', xOffset: -40, y: 180 },
            { type: 'ninja', xOffset: 550, y: 235 }
          ],
          reinforcements: [
            [
              { type: 'kicker', xOffset: 500, y: 175 },
              { type: 'kicker', xOffset: -40, y: 240 },
              { type: 'assassin', xOffset: 530, y: 210 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 4580, y: 190, drops: 'pizza' },
            { type: 'crate', x: 4680, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 5200,
          lockAt: 5200,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 180 },
            { type: 'ronin', xOffset: -40, y: 230 },
            { type: 'bruiser', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 5380, y: 195, drops: 'pizza' }
          ]
        },
        {
          triggerX: 6000,
          lockAt: 6000,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'assassin', xOffset: -40, y: 235 },
            { type: 'assassin', xOffset: 530, y: 210 }
          ],
          reinforcements: [
            [
              { type: 'ronin', xOffset: 500, y: 180 },
              { type: 'kicker', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 6180, y: 195, drops: 'scroll' },
            { type: 'barrel', x: 6280, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 6800,
          lockAt: 6800,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'kicker', xOffset: -40, y: 235 },
            { type: 'ronin', xOffset: 530, y: 210 },
            { type: 'bruiser', xOffset: 560, y: 180 }
          ],
          breakables: [
            { type: 'crate', x: 7000, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 7600,
          lockAt: 7600,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'club_giant', xOffset: -40, y: 235 },
            { type: 'bruiser', xOffset: 530, y: 210 }
          ],
          reinforcements: [
            [
              { type: 'assassin', xOffset: 500, y: 180 },
              { type: 'ronin', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'crate', x: 7780, y: 200, drops: 'pizza' },
            { type: 'barrel', x: 7880, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 8400,
          lockAt: 8400,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'assassin', xOffset: -40, y: 240 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'ronin', xOffset: 560, y: 185 }
          ],
          breakables: [
            { type: 'barrel', x: 8600, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 9200,
          lockAt: 9200,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 180 },
            { type: 'ronin', xOffset: -40, y: 230 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'bruiser', xOffset: 560, y: 175 }
          ],
          reinforcements: [
            [
              { type: 'club_giant', xOffset: 520, y: 205 },
              { type: 'ninja', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 9380, y: 190, drops: 'scroll' },
            { type: 'crate', x: 9480, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 10000,
          lockAt: 10000,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 180 },
            { type: 'assassin', xOffset: -40, y: 235 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 10200, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 10800,
          lockAt: 10800,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 520, y: 205 },
            { type: 'club_giant', xOffset: -40, y: 185 },
            { type: 'ronin', xOffset: 550, y: 240 }
          ],
          reinforcements: [
            [
              { type: 'assassin', xOffset: 500, y: 180 },
              { type: 'kicker', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 10980, y: 190, drops: 'pizza' },
            { type: 'barrel', x: 11080, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 11600,
          lockAt: 11600,
          cleared: false,
          enemies: [
            { type: 'assassin', xOffset: 500, y: 175 },
            { type: 'assassin', xOffset: -40, y: 240 },
            { type: 'ronin', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 560, y: 185 }
          ],
          reinforcements: [
            [
              { type: 'club_giant', xOffset: 520, y: 205 },
              { type: 'bruiser', xOffset: -40, y: 230 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 11800, y: 195, drops: 'pizza' }
          ]
        },
        {
          triggerX: 12400,
          lockAt: 12400,
          cleared: false,
          enemies: [
            { type: 'ronin', xOffset: 500, y: 180 },
            { type: 'ronin', xOffset: -40, y: 230 },
            { type: 'kicker', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 12600, y: 190, drops: 'scroll' }
          ]
        },
        {
          triggerX: 13200,
          lockAt: 13200,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'ronin', xOffset: -40, y: 235 },
            { type: 'assassin', xOffset: 530, y: 210 },
            { type: 'kicker', xOffset: 560, y: 180 }
          ],
          reinforcements: [
            [
              { type: 'assassin', xOffset: -40, y: 180 },
              { type: 'ronin', xOffset: 520, y: 240 }
            ]
          ],
          breakables: [
            { type: 'barrel', x: 13380, y: 190, drops: 'pizza' },
            { type: 'crate', x: 13480, y: 240, drops: 'pizza' }
          ]
        },
        {
          triggerX: 14000,
          lockAt: 14000,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 180 },
            { type: 'club_giant', xOffset: -40, y: 235 },
            { type: 'bruiser', xOffset: 530, y: 210 },
            { type: 'ninja', xOffset: 560, y: 175 }
          ],
          breakables: [
            { type: 'crate', x: 14200, y: 190, drops: 'pizza' }
          ]
        },
        {
          triggerX: 14800,
          lockAt: 14800,
          cleared: false,
          enemies: [
            { type: 'club_giant', xOffset: 500, y: 185 },
            { type: 'ronin', xOffset: -40, y: 235 },
            { type: 'assassin', xOffset: 530, y: 210 },
            { type: 'kicker', xOffset: 560, y: 180 },
            { type: 'ninja', xOffset: 580, y: 245 }
          ],
          breakables: [
            { type: 'crate', x: 14980, y: 195, drops: 'pizza' },
            { type: 'barrel', x: 15080, y: 240, drops: 'scroll' }
          ]
        },
        {
          triggerX: 15600,
          lockAt: 15600,
          cleared: false,
          isBossZone: true,
          bossType: 'kuroda',
          enemies: [
            { type: 'boss', bossType: 'kuroda', xOffset: 380, y: 205 },
            { type: 'ninja', xOffset: -40, y: 175 },
            { type: 'assassin', xOffset: 520, y: 245 },
            { type: 'ronin', xOffset: 550, y: 190 }
          ],
          breakables: [
            { type: 'barrel', x: 15760, y: 180, drops: 'pizza' },
            { type: 'barrel', x: 15860, y: 240, drops: 'scroll' }
          ]
        }
    ];
  }

  // ==========================================
  // VERTICAL STAGES (PAGODA ASCENT & TOWER CLIMB)
  // ==========================================
  createVerticalStage1Zones() {
    const pool = [
      { enemies: [{ type: 'thug', xOffset: 90, y: 185 }, { type: 'ninja', xOffset: 380, y: 220 }], breakables: [{ type: 'crate', x: 240, y: 195, drops: 'nunchaku' }] },
      { enemies: [{ type: 'ninja', xOffset: 110, y: 180 }, { type: 'zombie', xOffset: 370, y: 230 }], breakables: [{ type: 'barrel', x: 240, y: 200, drops: 'pizza' }] },
      { enemies: [{ type: 'bruiser', xOffset: 130, y: 195 }, { type: 'thug', xOffset: 350, y: 215 }, { type: 'thug', xOffset: 390, y: 180 }] },
      { enemies: [{ type: 'ronin', xOffset: 100, y: 190 }, { type: 'assassin', xOffset: 380, y: 225 }], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'daggers' }] },
      // Floor 5: Mid-Boss Master Shen (Phantom Clone)
      { isBossZone: true, bossType: 'master_shen', enemies: [{ type: 'boss', bossType: 'master_shen', xOffset: 240, y: 195, isBoss: true }, { type: 'ninja', xOffset: 90, y: 180 }, { type: 'ninja', xOffset: 390, y: 230 }] },
      { enemies: [{ type: 'kicker', xOffset: 100, y: 185 }, { type: 'zombie', xOffset: 380, y: 220 }] },
      { enemies: [{ type: 'club_giant', xOffset: 240, y: 195 }, { type: 'thug', xOffset: 90, y: 215 }], breakables: [{ type: 'crate', x: 380, y: 200, drops: 'pipe' }] },
      { enemies: [{ type: 'zombie', xOffset: 90, y: 180 }, { type: 'zombie', xOffset: 390, y: 230 }, { type: 'assassin', xOffset: 240, y: 210 }] },
      { enemies: [{ type: 'ronin', xOffset: 110, y: 190 }, { type: 'kicker', xOffset: 370, y: 220 }] },
      // Floor 10: Mid-Boss Iron Fang Oni
      { isBossZone: true, bossType: 'iron_fang', enemies: [{ type: 'boss', bossType: 'iron_fang', xOffset: 240, y: 200, isBoss: true }, { type: 'bruiser', xOffset: 90, y: 185 }, { type: 'bruiser', xOffset: 390, y: 225 }] },
      { enemies: [{ type: 'ninja', xOffset: 90, y: 180 }, { type: 'ninja', xOffset: 390, y: 230 }, { type: 'zombie', xOffset: 240, y: 205 }] },
      { enemies: [{ type: 'club_giant', xOffset: 240, y: 195 }, { type: 'kicker', xOffset: 100, y: 220 }], breakables: [{ type: 'barrel', x: 380, y: 200, drops: 'scroll' }] },
      { enemies: [{ type: 'ronin', xOffset: 100, y: 185 }, { type: 'ronin', xOffset: 380, y: 225 }, { type: 'ninja', xOffset: 240, y: 205 }] },
      { enemies: [{ type: 'assassin', xOffset: 100, y: 180 }, { type: 'assassin', xOffset: 380, y: 230 }, { type: 'assassin', xOffset: 240, y: 205 }] },
      // Floor 15: Gauntlet with Reinforcements
      { enemies: [{ type: 'bruiser', xOffset: 100, y: 190 }, { type: 'zombie', xOffset: 380, y: 220 }], reinforcements: [[{ type: 'ninja', xOffset: 80, y: 180 }, { type: 'kicker', xOffset: 400, y: 230 }]], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'pizza' }] },
      { enemies: [{ type: 'ninja', xOffset: 100, y: 185 }, { type: 'ronin', xOffset: 380, y: 225 }], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'pistols' }] },
      { enemies: [{ type: 'club_giant', xOffset: 110, y: 195 }, { type: 'kicker', xOffset: 370, y: 215 }] },
      { enemies: [{ type: 'kicker', xOffset: 90, y: 180 }, { type: 'ronin', xOffset: 390, y: 230 }, { type: 'kicker', xOffset: 240, y: 205 }] },
      { enemies: [{ type: 'assassin', xOffset: 100, y: 185 }, { type: 'ronin', xOffset: 240, y: 210 }, { type: 'bruiser', xOffset: 380, y: 225 }] },
      // Floor 20: Pinnacle Grandmaster Kuroda
      { isBossZone: true, bossType: 'kuroda', enemies: [{ type: 'boss', bossType: 'kuroda', xOffset: 240, y: 195, isBoss: true }, { type: 'ninja', xOffset: 90, y: 180 }, { type: 'ninja', xOffset: 390, y: 230 }] }
    ];
    return pool.map((p, i) => ({
      floorNum: i + 1,
      cleared: false,
      isBossZone: p.isBossZone || false,
      bossType: p.bossType,
      enemies: p.enemies || [],
      breakables: p.breakables,
      reinforcements: p.reinforcements
    }));
  }

  createVerticalStage2Zones() {
    const pool = [
      { enemies: [{ type: 'ninja', xOffset: 100, y: 185 }, { type: 'ninja', xOffset: 380, y: 225 }], breakables: [{ type: 'crate', x: 240, y: 195, drops: 'pistols' }] },
      { enemies: [{ type: 'thug', xOffset: 110, y: 180 }, { type: 'zombie', xOffset: 370, y: 230 }] },
      { enemies: [{ type: 'ronin', xOffset: 130, y: 195 }, { type: 'kicker', xOffset: 350, y: 215 }], breakables: [{ type: 'barrel', x: 240, y: 200, drops: 'pizza' }] },
      { enemies: [{ type: 'assassin', xOffset: 90, y: 185 }, { type: 'ninja', xOffset: 390, y: 220 }] },
      // Floor 5: Mid-Boss Cyber Ninja Master
      { isBossZone: true, bossType: 'master_shen', enemies: [{ type: 'boss', bossType: 'master_shen', xOffset: 240, y: 195, isBoss: true }, { type: 'assassin', xOffset: 100, y: 180 }, { type: 'kicker', xOffset: 380, y: 225 }] },
      { enemies: [{ type: 'bruiser', xOffset: 110, y: 190 }, { type: 'club_giant', xOffset: 370, y: 210 }] },
      { enemies: [{ type: 'zombie', xOffset: 90, y: 180 }, { type: 'zombie', xOffset: 390, y: 230 }, { type: 'ronin', xOffset: 240, y: 205 }], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'daggers' }] },
      { enemies: [{ type: 'kicker', xOffset: 100, y: 185 }, { type: 'kicker', xOffset: 380, y: 225 }] },
      { enemies: [{ type: 'ronin', xOffset: 120, y: 190 }, { type: 'bruiser', xOffset: 360, y: 215 }] },
      // Floor 10: Mid-Boss Cyber Oni
      { isBossZone: true, bossType: 'iron_fang', enemies: [{ type: 'boss', bossType: 'iron_fang', xOffset: 240, y: 200, isBoss: true }, { type: 'club_giant', xOffset: 90, y: 190 }, { type: 'kicker', xOffset: 390, y: 220 }] },
      { enemies: [{ type: 'ninja', xOffset: 90, y: 180 }, { type: 'assassin', xOffset: 390, y: 230 }, { type: 'zombie', xOffset: 240, y: 205 }] },
      { enemies: [{ type: 'club_giant', xOffset: 100, y: 195 }, { type: 'ronin', xOffset: 380, y: 215 }], breakables: [{ type: 'barrel', x: 240, y: 200, drops: 'scroll' }] },
      { enemies: [{ type: 'kicker', xOffset: 100, y: 185 }, { type: 'assassin', xOffset: 380, y: 225 }] },
      { enemies: [{ type: 'ronin', xOffset: 100, y: 180 }, { type: 'ronin', xOffset: 380, y: 230 }, { type: 'bruiser', xOffset: 240, y: 205 }] },
      // Floor 15: Gauntlet with Reinforcements
      { enemies: [{ type: 'club_giant', xOffset: 100, y: 190 }, { type: 'zombie', xOffset: 380, y: 220 }], reinforcements: [[{ type: 'kicker', xOffset: 80, y: 180 }, { type: 'ronin', xOffset: 400, y: 230 }]], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'pizza' }] },
      { enemies: [{ type: 'ninja', xOffset: 90, y: 185 }, { type: 'ninja', xOffset: 390, y: 225 }], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'pipe' }] },
      { enemies: [{ type: 'bruiser', xOffset: 110, y: 195 }, { type: 'assassin', xOffset: 370, y: 215 }] },
      { enemies: [{ type: 'kicker', xOffset: 90, y: 180 }, { type: 'club_giant', xOffset: 390, y: 230 }] },
      { enemies: [{ type: 'assassin', xOffset: 100, y: 185 }, { type: 'ronin', xOffset: 240, y: 210 }, { type: 'bruiser', xOffset: 380, y: 225 }] },
      // Floor 20: Pinnacle Cyber Master Shen
      { isBossZone: true, bossType: 'master_shen', enemies: [{ type: 'boss', bossType: 'master_shen', xOffset: 240, y: 195, isBoss: true }, { type: 'assassin', xOffset: 90, y: 180 }, { type: 'ronin', xOffset: 390, y: 230 }] }
    ];
    return pool.map((p, i) => ({
      floorNum: i + 1,
      cleared: false,
      isBossZone: p.isBossZone || false,
      bossType: p.bossType,
      enemies: p.enemies || [],
      breakables: p.breakables,
      reinforcements: p.reinforcements
    }));
  }

  createVerticalStage3Zones() {
    const pool = [
      { enemies: [{ type: 'ronin', xOffset: 100, y: 185 }, { type: 'ronin', xOffset: 380, y: 225 }], breakables: [{ type: 'crate', x: 240, y: 195, drops: 'nunchaku' }] },
      { enemies: [{ type: 'assassin', xOffset: 110, y: 180 }, { type: 'kicker', xOffset: 370, y: 230 }], breakables: [{ type: 'barrel', x: 240, y: 200, drops: 'pizza' }] },
      { enemies: [{ type: 'club_giant', xOffset: 130, y: 195 }, { type: 'zombie', xOffset: 350, y: 215 }] },
      { enemies: [{ type: 'bruiser', xOffset: 100, y: 190 }, { type: 'ninja', xOffset: 380, y: 225 }], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'pistols' }] },
      // Floor 5: Mid-Boss Iron Fang Oni
      { isBossZone: true, bossType: 'iron_fang', enemies: [{ type: 'boss', bossType: 'iron_fang', xOffset: 240, y: 200, isBoss: true }, { type: 'ninja', xOffset: 90, y: 180 }, { type: 'kicker', xOffset: 390, y: 225 }] },
      { enemies: [{ type: 'kicker', xOffset: 100, y: 185 }, { type: 'ronin', xOffset: 380, y: 220 }] },
      { enemies: [{ type: 'assassin', xOffset: 100, y: 190 }, { type: 'assassin', xOffset: 380, y: 220 }], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'daggers' }] },
      { enemies: [{ type: 'zombie', xOffset: 90, y: 180 }, { type: 'zombie', xOffset: 390, y: 230 }, { type: 'club_giant', xOffset: 240, y: 210 }] },
      { enemies: [{ type: 'bruiser', xOffset: 110, y: 190 }, { type: 'ronin', xOffset: 370, y: 220 }] },
      // Floor 10: Mid-Boss Master Shen
      { isBossZone: true, bossType: 'master_shen', enemies: [{ type: 'boss', bossType: 'master_shen', xOffset: 240, y: 195, isBoss: true }, { type: 'bruiser', xOffset: 90, y: 185 }, { type: 'assassin', xOffset: 390, y: 225 }] },
      { enemies: [{ type: 'ronin', xOffset: 90, y: 180 }, { type: 'kicker', xOffset: 390, y: 230 }, { type: 'ninja', xOffset: 240, y: 205 }] },
      { enemies: [{ type: 'club_giant', xOffset: 100, y: 195 }, { type: 'club_giant', xOffset: 380, y: 215 }], breakables: [{ type: 'barrel', x: 240, y: 200, drops: 'scroll' }] },
      { enemies: [{ type: 'kicker', xOffset: 100, y: 185 }, { type: 'kicker', xOffset: 380, y: 225 }] },
      { enemies: [{ type: 'assassin', xOffset: 100, y: 180 }, { type: 'assassin', xOffset: 380, y: 230 }, { type: 'ronin', xOffset: 240, y: 205 }] },
      // Floor 15: Gauntlet with Reinforcements
      { enemies: [{ type: 'boss', bossType: 'iron_fang', xOffset: 240, y: 200, isBoss: true }, { type: 'zombie', xOffset: 100, y: 190 }], reinforcements: [[{ type: 'assassin', xOffset: 80, y: 180 }, { type: 'ronin', xOffset: 400, y: 230 }]], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'pizza' }] },
      { enemies: [{ type: 'club_giant', xOffset: 100, y: 185 }, { type: 'kicker', xOffset: 380, y: 225 }], breakables: [{ type: 'crate', x: 240, y: 200, drops: 'pipe' }] },
      { enemies: [{ type: 'ronin', xOffset: 110, y: 195 }, { type: 'assassin', xOffset: 370, y: 215 }] },
      { enemies: [{ type: 'kicker', xOffset: 90, y: 180 }, { type: 'club_giant', xOffset: 390, y: 230 }] },
      { enemies: [{ type: 'assassin', xOffset: 100, y: 185 }, { type: 'ronin', xOffset: 240, y: 210 }, { type: 'bruiser', xOffset: 380, y: 225 }] },
      // Floor 20: Ultimate Celestial Grandmaster Kuroda Duel
      { isBossZone: true, bossType: 'kuroda', enemies: [{ type: 'boss', bossType: 'kuroda', xOffset: 240, y: 195, isBoss: true }, { type: 'boss', bossType: 'iron_fang', xOffset: 90, y: 200, isBoss: true }, { type: 'ninja', xOffset: 390, y: 230 }] }
    ];
    return pool.map((p, i) => ({
      floorNum: i + 1,
      cleared: false,
      isBossZone: p.isBossZone || false,
      bossType: p.bossType,
      enemies: p.enemies || [],
      breakables: p.breakables,
      reinforcements: p.reinforcements
    }));
  }

  // ==========================================
  // PROCEDURAL ENDLESS LEVEL GENERATOR
  // Dynamic Infinite Combat Zones & Waves
  // ==========================================
  createProceduralStageZones(stageNum) {
    const zones = [];
    const totalZones = 20;
    const weaponTypes = ['nunchaku', 'daggers', 'pipe', 'pistols'];

    // Deterministic pseudo-random seed helper based on stageNum
    let seed = stageNum * 7919;
    const nextRand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < totalZones; i++) {
      const zoneNum = i + 1;
      const triggerX = 500 + i * 780;
      const isMidBoss = (zoneNum === 10);
      const isFinalBoss = (zoneNum === totalZones);
      const enemies = [];
      const breakables = [];
      const reinforcements = [];

      if (isFinalBoss) {
        // Pinnacle Stage Boss
        const bossArchetypes = ['kuroda', 'iron_fang', 'master_shen'];
        const bType = bossArchetypes[(stageNum + i) % bossArchetypes.length];
        const bossTitles = {
          kuroda: `GRANDMASTER KURODA (LV.${stageNum})`,
          iron_fang: `DEMONIC IRON FANG (LV.${stageNum})`,
          master_shen: `SHADOW LORD SHEN (LV.${stageNum})`
        };

        enemies.push({
          type: 'boss',
          bossType: bType,
          bossName: bossTitles[bType],
          xOffset: 380,
          y: 205,
          isBoss: true
        });

        // Elite Minion Guards
        enemies.push({ type: 'ninja', xOffset: -40, y: 175 });
        enemies.push({ type: 'ronin', xOffset: 520, y: 245 });
        enemies.push({ type: 'kicker', xOffset: 550, y: 190 });

        // Late-battle reinforcements
        reinforcements.push([
          { type: 'assassin', xOffset: -40, y: 180 },
          { type: 'bruiser', xOffset: 530, y: 235 }
        ]);

        // Stage-ending restorative supplies
        breakables.push({ type: 'barrel', x: triggerX + 80, y: 180, drops: 'pizza' });
        breakables.push({ type: 'crate', x: triggerX + 220, y: 240, drops: 'scroll' });
      } else if (isMidBoss) {
        // Mid-Stage Boss
        const midType = (stageNum % 2 === 0) ? 'iron_fang' : 'master_shen';
        enemies.push({
          type: 'boss',
          bossType: midType,
          bossName: `PHANTOM ${midType.toUpperCase()} (STAGE ${stageNum})`,
          xOffset: 400,
          y: 200,
          isBoss: true
        });
        enemies.push({ type: 'ronin', xOffset: -30, y: 180 });
        enemies.push({ type: 'ninja', xOffset: 520, y: 230 });

        breakables.push({ type: 'crate', x: triggerX + 150, y: 210, drops: 'pizza' });
        breakables.push({ type: 'barrel', x: triggerX + 280, y: 190, drops: 'scroll' });
      } else {
        // Normal Tactical Wave
        const baseCount = zoneNum < 6 ? 3 : (zoneNum < 14 ? 4 : 5);
        const count = baseCount + (nextRand() > 0.5 ? 1 : 0);

        for (let e = 0; e < count; e++) {
          let chosenType;
          const r = nextRand();
          if (zoneNum < 5) {
            chosenType = r < 0.5 ? 'thug' : (r < 0.8 ? 'ninja' : 'zombie');
          } else if (zoneNum < 12) {
            chosenType = r < 0.3 ? 'ninja' : (r < 0.55 ? 'ronin' : (r < 0.75 ? 'kicker' : (r < 0.9 ? 'bruiser' : 'zombie')));
          } else {
            chosenType = r < 0.25 ? 'ronin' : (r < 0.5 ? 'assassin' : (r < 0.75 ? 'club_giant' : (r < 0.9 ? 'kicker' : 'bruiser')));
          }

          const xOff = (e % 2 === 0) ? (500 + Math.round(nextRand() * 60)) : (-40 - Math.round(nextRand() * 40));
          const yPos = 165 + Math.round(nextRand() * 85);

          // Chance for weapon on thug / ronin / ninja
          let wep = null;
          if (nextRand() < 0.28) {
            wep = weaponTypes[Math.floor(nextRand() * weaponTypes.length)];
          }

          enemies.push({ type: chosenType, xOffset: xOff, y: yPos, weapon: wep });
        }

        // Tactical Breakable Crate / Barrel
        if (zoneNum % 2 === 1 || nextRand() < 0.6) {
          const bType = nextRand() < 0.5 ? 'crate' : 'barrel';
          const dropRoll = nextRand();
          let drop = 'pizza';
          if (dropRoll < 0.30) drop = 'pizza';
          else if (dropRoll < 0.50) drop = 'scroll';
          else if (dropRoll < 0.75) drop = weaponTypes[Math.floor(nextRand() * weaponTypes.length)];
          else drop = 'pistols';

          breakables.push({
            type: bType,
            x: triggerX + 120 + Math.round(nextRand() * 200),
            y: 180 + Math.round(nextRand() * 60),
            drops: drop
          });
        }

        // High-level reinforcement wave for late zones
        if (zoneNum >= 12 && nextRand() < 0.45) {
          reinforcements.push([
            { type: 'ninja', xOffset: -40, y: 175 },
            { type: 'kicker', xOffset: 520, y: 235 }
          ]);
        }
      }

      zones.push({
        triggerX,
        lockAt: triggerX,
        cleared: false,
        isBossZone: isFinalBoss,
        bossType: isFinalBoss ? enemies[0].bossType : (isMidBoss ? enemies[0].bossType : null),
        enemies,
        breakables,
        reinforcements
      });
    }

    return zones;
  }

  createProceduralVerticalStageZones(stageNum) {
    const zones = [];
    const totalFloors = 20;
    const weaponTypes = ['nunchaku', 'daggers', 'pipe', 'pistols'];

    let seed = stageNum * 6173 + 101;
    const nextRand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < totalFloors; i++) {
      const floorNum = i + 1;
      const globalFloor = (stageNum - 1) * 20 + floorNum;
      const isMidBoss = (floorNum === 10);
      const isFinalBoss = (floorNum === totalFloors);
      const enemies = [];
      const breakables = [];
      const reinforcements = [];

      if (isFinalBoss) {
        const bossArchetypes = ['kuroda', 'iron_fang', 'master_shen'];
        const bType = bossArchetypes[(stageNum + i) % bossArchetypes.length];
        enemies.push({
          type: 'boss',
          bossType: bType,
          bossName: `TOWER EMPEROR ${bType.toUpperCase()} (FLOOR ${globalFloor})`,
          xOffset: 240,
          y: 195,
          isBoss: true
        });
        enemies.push({ type: 'ninja', xOffset: 90, y: 180 });
        enemies.push({ type: 'ninja', xOffset: 390, y: 230 });

        reinforcements.push([
          { type: 'assassin', xOffset: 80, y: 190 },
          { type: 'ronin', xOffset: 400, y: 220 }
        ]);
        breakables.push({ type: 'crate', x: 240, y: 200, drops: 'pizza' });
      } else if (isMidBoss) {
        enemies.push({
          type: 'boss',
          bossType: 'iron_fang',
          bossName: `FLOOR ${globalFloor} ONI GUARDIAN`,
          xOffset: 240,
          y: 200,
          isBoss: true
        });
        enemies.push({ type: 'bruiser', xOffset: 90, y: 185 });
        enemies.push({ type: 'kicker', xOffset: 390, y: 225 });
        breakables.push({ type: 'barrel', x: 240, y: 200, drops: 'scroll' });
      } else {
        const count = floorNum < 6 ? 2 : (floorNum < 14 ? 3 : 4);
        for (let e = 0; e < count; e++) {
          const r = nextRand();
          let chosenType;
          if (floorNum < 6) chosenType = r < 0.6 ? 'thug' : 'ninja';
          else if (floorNum < 14) chosenType = r < 0.4 ? 'ninja' : (r < 0.7 ? 'ronin' : 'kicker');
          else chosenType = r < 0.35 ? 'assassin' : (r < 0.7 ? 'club_giant' : 'bruiser');

          const xPos = 80 + Math.round(nextRand() * 320);
          const yPos = 175 + Math.round(nextRand() * 65);
          enemies.push({ type: chosenType, xOffset: xPos, y: yPos });
        }

        if (floorNum % 3 === 0) {
          breakables.push({
            type: nextRand() < 0.5 ? 'crate' : 'barrel',
            x: 180 + Math.round(nextRand() * 120),
            y: 190 + Math.round(nextRand() * 30),
            drops: nextRand() < 0.4 ? 'pizza' : (nextRand() < 0.7 ? 'scroll' : weaponTypes[Math.floor(nextRand() * weaponTypes.length)])
          });
        }
      }

      zones.push({
        floorNum,
        cleared: false,
        isBossZone: isFinalBoss,
        bossType: isFinalBoss ? enemies[0].bossType : (isMidBoss ? enemies[0].bossType : null),
        enemies,
        breakables,
        reinforcements
      });
    }

    return zones;
  }

  reset() {
    this.loadStage(1);
  }

  update(dt, player, activeEnemies) {
    this.goBlinkTimer += dt * 4;

    // ==========================================
    // VERTICAL GAME MODE (PAGODA / ELEVATOR ASCENT)
    // ==========================================
    if (this.gameMode === 'VERTICAL') {
      this.cameraX = 0; // Fixed horizontal camera in vertical climb

      if (this.isAscending) {
        this.ascentTimer -= dt;
        this.verticalScrollY += dt * 440;
        this.altitude += dt * 140;

        if (Math.random() < 0.6) {
          this.risingWindParticles.push({
            x: 35 + Math.random() * 410,
            y: -10,
            vy: 480 + Math.random() * 320,
            len: 18 + Math.random() * 30,
            color: Math.random() < 0.3 ? '#05d9e8' : '#ffffff'
          });
        }

        if (this.ascentTimer <= 0) {
          this.isAscending = false;
          this.currentZoneIndex++;
          this.locked = false;
          if (window.soundEngine) window.soundEngine.playPickup();
          if (window.combatSystem) {
            const currentFloor = (this.currentStageNum - 1) * 20 + this.currentZoneIndex + 1;
            window.combatSystem.spawnComboText(240, 50, `FLOOR ${currentFloor}`, '#ffd700');
          }
        }
      } else {
        this.verticalScrollY += dt * 18;
      }

      // Update wind particles
      for (let i = this.risingWindParticles.length - 1; i >= 0; i--) {
        const wp = this.risingWindParticles[i];
        wp.y += wp.vy * dt;
        if (wp.y > 290) this.risingWindParticles.splice(i, 1);
      }

      // Check floor spawning
      if (!this.locked && !this.isAscending && this.currentZoneIndex < this.zones.length) {
        const zone = this.zones[this.currentZoneIndex];
        if (!zone.cleared) {
          this.locked = true;
          this.showGoSign = false;

          if (zone.isBossZone) {
            if (window.soundEngine) {
              window.soundEngine.startBGM('boss');
              window.soundEngine.playBossIntro();
              window.soundEngine.playBossLaugh(zone.bossType || 'master_shen');
            }
            if (window.combatSystem) {
              window.combatSystem.triggerScreenShake(8, 0.5);
              window.combatSystem.spawnComboText(240, 50, 'FLOOR BOSS!', '#ff0055');
            }
          }

          zone.enemies.forEach(e => {
            this.spawnQueue.push({
              type: e.type,
              bossType: e.bossType,
              x: e.xOffset,
              y: e.y
            });
          });

          if (zone.breakables) {
            zone.breakables.forEach(b => {
              this.spawnQueue.push({
                isBreakable: true,
                type: b.type,
                x: b.x,
                y: b.y,
                drops: b.drops
              });
            });
          }
        }
      }

      // Check if current floor is cleared
      if (this.locked && !this.isAscending) {
        const remainingEnemies = activeEnemies.filter(e => !e.isDead);
        const zone = this.zones[this.currentZoneIndex];

        // Reinforcement wave
        if (zone && zone.reinforcements && zone.reinforcements.length > 0 && remainingEnemies.length <= 2 && this.spawnQueue.length === 0) {
          const nextWave = zone.reinforcements.shift();
          nextWave.forEach(e => {
            this.spawnQueue.push({
              type: e.type,
              bossType: e.bossType,
              x: e.xOffset,
              y: e.y
            });
          });
          if (window.soundEngine) window.soundEngine.playSwing(280);
          if (window.combatSystem) window.combatSystem.spawnComboText(240, 50, 'REINFORCEMENTS!', '#ff0055');
        }

        if (remainingEnemies.length === 0 && this.spawnQueue.length === 0 && (!zone || !zone.reinforcements || zone.reinforcements.length === 0)) {
          if (zone) zone.cleared = true;
          if (this.currentZoneIndex < this.zones.length - 1) {
            this.isAscending = true;
            this.ascentTimer = 1.7;
            this.targetAltitude = this.altitude + 200;
            if (window.soundEngine) window.soundEngine.playSwing(420);
            if (window.combatSystem) {
              window.combatSystem.triggerScreenShake(4, 0.3);
              window.combatSystem.spawnComboText(240, 50, 'ASCENDING ELEVATOR!', '#00ffcc');
            }
          } else {
            // Floor 20 Pinnacle cleared!
            this.locked = false;
            this.currentZoneIndex++;
          }
        }
      }

      return;
    }

    this.trainOffset += dt * 380; // Speeding train simulation in Stage 2

    // Update Fire Embers in Stage 3 or Volcanic/Shrine procedural stages
    const hasEmbers = (this.currentStageNum === 3) ||
                      (this.currentStageNum > 3 && (this.currentStageNum % 8 === 3 || this.currentStageNum % 8 === 6));
    if (hasEmbers) {
      if (Math.random() < 0.25) {
        this.emberParticles.push({
          x: Math.random() * 480,
          y: 200 + Math.random() * 60,
          vx: (Math.random() * 2 - 1) * 0.8,
          vy: -1.2 - Math.random() * 1.8,
          size: 2 + Math.random() * 2,
          life: 0.6 + Math.random() * 0.4
        });
      }
      for (let i = this.emberParticles.length - 1; i >= 0; i--) {
        const ep = this.emberParticles[i];
        ep.x += ep.vx;
        ep.y += ep.vy;
        ep.life -= dt;
        if (ep.life <= 0) this.emberParticles.splice(i, 1);
      }
    }

    // Check encounter zone triggers
    if (!this.locked && this.currentZoneIndex < this.zones.length) {
      const zone = this.zones[this.currentZoneIndex];
      if (!zone.cleared && player.x >= zone.triggerX) {
        this.locked = true;
        this.lockTargetX = zone.lockAt;
        this.showGoSign = false;

        // Spawn Zone Enemies & Breakables
        if (zone.isBossZone) {
          window.soundEngine.startBGM('boss');
          window.soundEngine.playBossIntro();
          window.soundEngine.playBossLaugh(zone.bossType || (zone.enemies[0] ? zone.enemies[0].bossType : 'master_shen'));
          window.combatSystem.triggerScreenShake(8, 0.5);
        }

        zone.enemies.forEach(e => {
          this.spawnQueue.push({
            type: e.type,
            bossType: e.bossType,
            x: this.cameraX + e.xOffset,
            y: e.y
          });
        });

        if (zone.breakables) {
          zone.breakables.forEach(b => {
            this.spawnQueue.push({
              isBreakable: true,
              type: b.type,
              x: b.x,
              y: b.y,
              drops: b.drops
            });
          });
        }
      }
    }

    // Check if locked zone is cleared
    if (this.locked) {
      const remainingEnemies = activeEnemies.filter(e => !e.isDead);
      const zone = this.zones[this.currentZoneIndex];

      // Reinforcement wave spawn!
      if (zone && zone.reinforcements && zone.reinforcements.length > 0 && remainingEnemies.length <= 2 && this.spawnQueue.length === 0) {
        const nextWave = zone.reinforcements.shift();
        nextWave.forEach(e => {
          this.spawnQueue.push({
            type: e.type,
            bossType: e.bossType,
            x: this.cameraX + e.xOffset,
            y: e.y
          });
        });
        window.soundEngine.playSwing(280);
        window.combatSystem.spawnComboText(this.cameraX + 240, 50, 'REINFORCEMENTS!', '#ff0055');
      }

      if (remainingEnemies.length === 0 && this.spawnQueue.length === 0 && (!zone || !zone.reinforcements || zone.reinforcements.length === 0)) {
        this.locked = false;
        if (zone) zone.cleared = true;
        this.currentZoneIndex++;
        this.showGoSign = true;
        window.soundEngine.playSwing(440);
      }
    }

    // Smooth Camera Scrolling (tracks center between 2 AI companions in Auto-Play)
    if (!this.locked) {
      const focusX = (typeof window !== 'undefined' && window.game && window.game.companion && window.game.autoPlay)
        ? Math.max(player.x - 240, (player.x + window.game.companion.x) / 2)
        : player.x;
      const targetCamX = focusX - 180;
      if (targetCamX > this.cameraX) {
        this.cameraX += (targetCamX - this.cameraX) * 0.1;
      }
    } else {
      if (Math.abs(this.cameraX - this.lockTargetX) > 1) {
        this.cameraX += (this.lockTargetX - this.cameraX) * 0.08;
      }
    }

    // Stage boundary
    this.cameraX = Math.max(0, Math.min(this.width - 480, this.cameraX));

    if (this.showGoSign && player.x > this.cameraX + 260) {
      this.showGoSign = false;
    }
  }

  // DRAW PARALLAX BACKGROUND ACCORDING TO CURRENT STAGE
  drawBackground(ctx) {
    if (this.gameMode === 'VERTICAL') {
      if (this.currentStageNum === 1 && this.gameMode !== 'ENDLESS') {
        this.drawVerticalStage1Background(ctx, this.verticalScrollY);
      } else if (this.currentStageNum === 2 && this.gameMode !== 'ENDLESS') {
        this.drawVerticalStage2Background(ctx, this.verticalScrollY);
      } else if (this.currentStageNum === 3 && this.gameMode !== 'ENDLESS') {
        this.drawVerticalStage3Background(ctx, this.verticalScrollY);
      } else {
        this.drawProceduralVerticalBackground(ctx, this.verticalScrollY, this.currentStageNum);
      }
    } else {
      if (this.currentStageNum === 1 && this.gameMode !== 'ENDLESS') {
        this.drawStage1Background(ctx, this.cameraX);
      } else if (this.currentStageNum === 2 && this.gameMode !== 'ENDLESS') {
        this.drawStage2Background(ctx, this.cameraX);
      } else if (this.currentStageNum === 3 && this.gameMode !== 'ENDLESS') {
        this.drawStage3Background(ctx, this.cameraX);
      } else {
        this.drawProceduralBackground(ctx, this.cameraX, this.currentStageNum);
      }
    }
  }

  // ==========================================
  // STAGE 1: CHINATOWN NEON ALLEYWAY
  // ==========================================
  drawStage1Background(ctx, camX) {
    // 1. Deep Sky & Moon
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 160);
    skyGradient.addColorStop(0, '#0c0714');
    skyGradient.addColorStop(0.6, '#1e0c2b');
    skyGradient.addColorStop(1, '#3b123d');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, 480, 160);

    ctx.fillStyle = '#ffeedd';
    ctx.beginPath();
    ctx.arc(380 - (camX * 0.02), 45, 26, 0, Math.PI * 2);
    ctx.fill();

    // 2. Pagoda Skyline (Infinite procedural screen-bound wrapping)
    ctx.fillStyle = '#170a24';
    const roofSpacing = 180;
    const roofShift = (camX * 0.2) % roofSpacing;
    for (let x = -roofShift - roofSpacing; x < 480 + roofSpacing; x += roofSpacing) {
      ctx.fillRect(x, 75, 120, 85);
      ctx.beginPath();
      ctx.moveTo(x - 25, 75);
      ctx.lineTo(x + 60, 45);
      ctx.lineTo(x + 145, 75);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Chinatown Neon Signs & Lanterns (Infinite procedural screen-bound wrapping)
    const now = performance.now();
    const bldgSpacing = 240;
    const bldgShift = (camX * 0.5) % bldgSpacing;
    const baseIdx = Math.floor((camX * 0.5) / bldgSpacing);
    let step = 0;
    for (let x = -bldgShift - bldgSpacing; x < 480 + bldgSpacing; x += bldgSpacing, step++) {
      const i = baseIdx + step;
      ctx.fillStyle = '#261138';
      ctx.fillRect(x, 85, 200, 75);

      // Flickering Neon Signs
      const flicker = (Math.sin(now * 0.01 + i) > -0.92);
      if (flicker) {
        const signIndex = ((i % 3) + 3) % 3;
        if (signIndex === 0) {
          ctx.fillStyle = '#ff2a6d';
          ctx.fillRect(x + 30, 95, 45, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = '7px "Press Start 2P"';
          ctx.fillText('功夫', x + 36, 106);
        } else if (signIndex === 1) {
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(x + 40, 92, 60, 16);
          ctx.fillStyle = '#111';
          ctx.font = '7px "Press Start 2P"';
          ctx.fillText('DOJO', x + 50, 104);
        } else {
          ctx.fillStyle = '#05d9e8';
          ctx.fillRect(x + 50, 96, 50, 14);
          ctx.fillStyle = '#111';
          ctx.font = '6px "Press Start 2P"';
          ctx.fillText('NINJA', x + 54, 106);
        }
      }

      // Red Lanterns
      ctx.fillStyle = '#ff2244';
      ctx.fillRect(x + 15, 112, 10, 14);
      ctx.fillRect(x + 17, 110, 6, 2);
      ctx.fillRect(x + 18, 126, 4, 6);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(x + 16, 116, 8, 4);
    }

    // 4. Ground Asphalt (Wet street with rain gloss)
    ctx.fillStyle = '#3a2d4c';
    ctx.fillRect(0, 155, 480, 12);
    ctx.fillStyle = '#261c33';
    ctx.fillRect(0, 165, 480, 2);

    const streetGrad = ctx.createLinearGradient(0, 167, 0, 270);
    streetGrad.addColorStop(0, '#1c172b');
    streetGrad.addColorStop(0.4, '#231d36');
    streetGrad.addColorStop(1, '#161224');
    ctx.fillStyle = streetGrad;
    ctx.fillRect(0, 167, 480, 103);

    // Street markings & grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = - (camX % 60); x < 480; x += 60) {
      ctx.fillRect(x, 167, 2, 103);
    }
  }

  // ==========================================
  // STAGE 2: PAGODA ROOFTOPS & SPEEDING TRAIN
  // ==========================================
  drawStage2Background(ctx, camX) {
    // 1. Midnight Stormy Sky with Fast Wind Clouds
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 160);
    skyGradient.addColorStop(0, '#060a17');
    skyGradient.addColorStop(0.6, '#0d182e');
    skyGradient.addColorStop(1, '#1b2845');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, 480, 160);

    // Blood Moon
    ctx.fillStyle = '#ff4455';
    ctx.beginPath();
    ctx.arc(410 - (camX * 0.03), 40, 24, 0, Math.PI * 2);
    ctx.fill();

    // Speeding Mountain Ridge & Pagoda Spires
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < 18; i++) {
      const spX = (i * 120) - ((camX + this.trainOffset * 0.25) % 120);
      ctx.beginPath();
      ctx.moveTo(spX, 150);
      ctx.lineTo(spX + 60, 60);
      ctx.lineTo(spX + 120, 150);
      ctx.fill();
    }

    // Telegraph wires rushing by
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 75);
    ctx.lineTo(480, 75);
    ctx.moveTo(0, 95);
    ctx.lineTo(480, 95);
    ctx.stroke();

    // 2. High-Speed Moving Train Roofs / Pagoda Tiled Catwalks
    // Moving speed lines
    const moveX = (this.trainOffset % 60);

    // Train Upper Rim
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 155, 480, 12);

    // Riveted Metal Train Roof Pavement
    const trainGrad = ctx.createLinearGradient(0, 167, 0, 270);
    trainGrad.addColorStop(0, '#1e293b');
    trainGrad.addColorStop(0.5, '#293548');
    trainGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = trainGrad;
    ctx.fillRect(0, 167, 480, 103);

    // Metal plates and rivet seams moving backward!
    ctx.fillStyle = '#475569';
    for (let x = -moveX; x < 480; x += 60) {
      ctx.fillRect(x, 167, 4, 103);
      // Rivets
      ctx.fillStyle = '#94a3b8';
      for (let ry = 175; ry < 265; ry += 16) {
        ctx.fillRect(x + 1, ry, 2, 2);
      }
      ctx.fillStyle = '#475569';
    }

    // Rooftop Safety Catwalk Railing
    ctx.fillStyle = '#ffaa00';
    for (let x = - (moveX % 80); x < 480; x += 80) {
      ctx.fillRect(x, 165, 30, 3);
    }
  }

  // ==========================================
  // STAGE 3: UNDERGROUND DRAGON SHRINE
  // ==========================================
  drawStage3Background(ctx, camX) {
    // 1. Ancient Subterranean Cavern
    const caveGrad = ctx.createLinearGradient(0, 0, 0, 160);
    caveGrad.addColorStop(0, '#080508');
    caveGrad.addColorStop(0.6, '#180a14');
    caveGrad.addColorStop(1, '#2c0c1b');
    ctx.fillStyle = caveGrad;
    ctx.fillRect(0, 0, 480, 160);

    // Stalactites hanging from cavern roof (Infinite procedural screen-bound wrapping)
    ctx.fillStyle = '#1a0b14';
    const stSpacing = 50;
    const stShift = (camX * 0.1) % stSpacing;
    const baseStIdx = Math.floor((camX * 0.1) / stSpacing);
    let stStep = 0;
    for (let x = -stShift - stSpacing; x < 480 + stSpacing; x += stSpacing, stStep++) {
      const idx = baseStIdx + stStep;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 15, 35 + (((idx % 3) + 3) % 3) * 15);
      ctx.lineTo(x + 30, 0);
      ctx.fill();
    }

    // 2. Crimson Torii Gates & Stone Dragon Pillars (Infinite procedural screen-bound wrapping)
    const toriiSpacing = 260;
    const toriiShift = (camX * 0.4) % toriiSpacing;
    const baseToriiIdx = Math.floor((camX * 0.4) / toriiSpacing);
    let toriiStep = 0;
    for (let x = -toriiShift - toriiSpacing; x < 480 + toriiSpacing; x += toriiSpacing, toriiStep++) {
      const idx = baseToriiIdx + toriiStep;
      // Torii Gate Arch
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(x, 50, 12, 115);
      ctx.fillRect(x + 90, 50, 12, 115);
      ctx.fillRect(x - 10, 50, 122, 14); // Crossbeam
      ctx.fillRect(x - 16, 44, 134, 6);  // Top flare beam

      // Burning Torches / Braziers
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 48, 120, 6, 45);
      const flameBob = Math.sin(performance.now() * 0.015 + idx) * 3;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(x + 51, 115 + flameBob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x + 51, 115 + flameBob, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Colossal Carved Stone Dragon Head Shrine overlooking arena
    const shrineX = (this.width - 320) - camX;
    if (shrineX > -200 && shrineX < 500) {
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(shrineX + 60, 40, 160, 125);
      // Dragon Eyes Glowing Ruby
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(shrineX + 100, 75, 16, 8);
      ctx.fillRect(shrineX + 160, 75, 16, 8);
      ctx.fillStyle = '#ffd700';
      ctx.font = '8px "Press Start 2P"';
      ctx.fillText('龍 魂 神 殿', shrineX + 80, 30);
    }

    // 4. Ancient Polished Temple Stone Floor
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(0, 155, 480, 12);

    const stoneGrad = ctx.createLinearGradient(0, 167, 0, 270);
    stoneGrad.addColorStop(0, '#1c0710');
    stoneGrad.addColorStop(0.5, '#2e0a1b');
    stoneGrad.addColorStop(1, '#17040d');
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(0, 167, 480, 103);

    // Stone Slab Flagstones
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let x = - (camX % 80); x < 480; x += 80) {
      ctx.strokeRect(x, 167, 80, 35);
      ctx.strokeRect(x + 40, 202, 80, 35);
      ctx.strokeRect(x, 237, 80, 33);
    }

    // Dragon Clan Golden Circular Floor Crest
    const sealX = 1200 - camX;
    if (sealX > -100 && sealX < 580) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sealX, 215, 60, 26, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw Rising Flame Embers
    for (const ep of this.emberParticles) {
      ctx.fillStyle = '#f97316';
      ctx.fillRect(Math.round(ep.x), Math.round(ep.y), Math.round(ep.size), Math.round(ep.size));
    }
  }

  // ==========================================
  // VERTICAL STAGE BACKGROUNDS
  // ==========================================
  drawVerticalStage1Background(ctx, scrollY) {
    // 1. Deep night mountain sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 160);
    skyGrad.addColorStop(0, '#04020a');
    skyGrad.addColorStop(0.5, '#160824');
    skyGrad.addColorStop(1, '#2f0f3a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 480, 160);

    // Crescent Moon
    ctx.fillStyle = '#ffeedd';
    ctx.beginPath();
    ctx.arc(410, 40, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0414';
    ctx.beginPath();
    ctx.arc(404, 38, 18, 0, Math.PI * 2);
    ctx.fill();

    // 2. Pagoda Towers & Mountain Silhouettes scrolling downward
    ctx.fillStyle = '#0f0618';
    const mtnShift = (scrollY * 0.12) % 180;
    for (let my = -mtnShift; my < 270; my += 180) {
      ctx.beginPath();
      ctx.moveTo(0, my + 140);
      ctx.lineTo(140, my + 60);
      ctx.lineTo(260, my + 130);
      ctx.lineTo(380, my + 50);
      ctx.lineTo(480, my + 140);
      ctx.lineTo(480, my + 200);
      ctx.lineTo(0, my + 200);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Pagoda Eaves & Roofs rushing down
    const roofSpacing = 110;
    const roofShift = (scrollY * 0.6) % roofSpacing;
    for (let ry = -roofShift - roofSpacing; ry < 270 + roofSpacing; ry += roofSpacing) {
      // Sweeping Curved Pagoda Eaves
      ctx.fillStyle = '#5c1020';
      ctx.beginPath();
      ctx.moveTo(30, ry + 20);
      ctx.quadraticCurveTo(240, ry - 10, 450, ry + 20);
      ctx.lineTo(430, ry + 32);
      ctx.quadraticCurveTo(240, ry + 8, 50, ry + 32);
      ctx.closePath();
      ctx.fill();

      // Golden dragon ornaments on roof corners
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(26, ry + 16, 8, 8);
      ctx.fillRect(446, ry + 16, 8, 8);

      // Hanging Red Lanterns
      ctx.fillStyle = '#ff1133';
      ctx.fillRect(90, ry + 34, 12, 16);
      ctx.fillRect(378, ry + 34, 12, 16);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(93, ry + 38, 6, 8);
      ctx.fillRect(381, ry + 38, 6, 8);
    }

    // 4. Balcony Arena Floor & Wooden Railings
    ctx.fillStyle = '#220b18';
    ctx.fillRect(36, 155, 408, 115);

    // Floor Planks
    ctx.strokeStyle = '#381226';
    ctx.lineWidth = 1;
    for (let py = 160; py < 270; py += 14) {
      ctx.beginPath();
      ctx.moveTo(36, py);
      ctx.lineTo(444, py);
      ctx.stroke();
    }

    // Left Balustrade / Red Pillar
    ctx.fillStyle = '#8b152b';
    ctx.fillRect(20, 120, 18, 150);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(18, 115, 22, 8);
    ctx.fillRect(18, 260, 22, 10);

    // Right Balustrade / Red Pillar
    ctx.fillStyle = '#8b152b';
    ctx.fillRect(442, 120, 18, 150);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(440, 115, 22, 8);
    ctx.fillRect(440, 260, 22, 10);

    // Draw rising wind particles
    this.drawRisingWindParticles(ctx);
  }

  drawVerticalStage2Background(ctx, scrollY) {
    // Cyberpunk gradient sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 160);
    skyGrad.addColorStop(0, '#02030d');
    skyGrad.addColorStop(0.6, '#0a0d24');
    skyGrad.addColorStop(1, '#1b1236');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 480, 160);

    // Twinkling neon skyscraper skyline far below
    ctx.fillStyle = '#060814';
    const cityShift = (scrollY * 0.08) % 160;
    for (let cy = -cityShift; cy < 270; cy += 160) {
      for (let bx = 50; bx < 430; bx += 40) {
        ctx.fillRect(bx, cy + 90, 32, 180);
        ctx.fillStyle = ((bx * 7) % 2 === 0) ? '#05d9e8' : '#ff0055';
        ctx.fillRect(bx + 4, cy + 110, 4, 6);
        ctx.fillRect(bx + 14, cy + 130, 4, 6);
        ctx.fillStyle = '#060814';
      }
    }

    // Rushing elevator steel cables
    ctx.strokeStyle = '#445566';
    ctx.lineWidth = 2;
    const cableX = [70, 140, 210, 270, 340, 410];
    const cableShift = (scrollY * 1.8) % 30;
    for (const cx of cableX) {
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, 270);
      ctx.stroke();

      for (let jy = -cableShift; jy < 270; jy += 30) {
        ctx.fillStyle = '#88aacc';
        ctx.fillRect(cx - 2, jy, 4, 3);
      }
    }

    // Giant neon holographic corporate billboards passing by
    const billboardSpacing = 160;
    const bbShift = (scrollY * 0.8) % billboardSpacing;
    const kanjiList = ['龍', '電', '夜', '狂', '拳'];
    let kIdx = 0;
    for (let by = -bbShift - billboardSpacing; by < 270 + billboardSpacing; by += billboardSpacing) {
      const kanji = kanjiList[(Math.floor(scrollY / billboardSpacing) + kIdx) % kanjiList.length];
      kIdx++;
      ctx.fillStyle = 'rgba(255, 0, 85, 0.85)';
      ctx.font = '24px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText(kanji, 45, by + 40);
      ctx.fillStyle = 'rgba(5, 217, 232, 0.85)';
      ctx.textAlign = 'right';
      ctx.fillText(kanji, 435, by + 100);
    }

    // Elevator Platform Base (Diamond-plate industrial cage floor)
    ctx.fillStyle = '#121622';
    ctx.fillRect(36, 155, 408, 115);

    // Hazard Stripes on edges
    ctx.fillStyle = '#ffd700';
    for (let hx = 36; hx < 444; hx += 16) {
      ctx.fillRect(hx, 155, 8, 4);
      ctx.fillRect(hx, 266, 8, 4);
    }

    // Steel cage vertical framework on sides
    ctx.fillStyle = '#252e42';
    ctx.fillRect(20, 0, 18, 270);
    ctx.fillRect(442, 0, 18, 270);

    // Beacon lights on elevator frame (steady glow without harsh strobing)
    ctx.fillStyle = '#ff2a6d';
    ctx.fillRect(24, 40, 10, 10);
    ctx.fillRect(446, 40, 10, 10);
    ctx.fillRect(24, 200, 10, 10);
    ctx.fillRect(446, 200, 10, 10);

    // Draw rising wind particles
    this.drawRisingWindParticles(ctx);
  }

  drawVerticalStage3Background(ctx, scrollY) {
    // Upper stratosphere celestial sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 160);
    skyGrad.addColorStop(0, '#000005');
    skyGrad.addColorStop(0.6, '#080518');
    skyGrad.addColorStop(1, '#1b0826');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 480, 160);

    // Starfield
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 30; s++) {
      const sx = (s * 37) % 480;
      const sy = (s * 23) % 130;
      ctx.fillRect(sx, sy, (s % 3 === 0) ? 2 : 1, (s % 3 === 0) ? 2 : 1);
    }

    // Blood Moon
    ctx.fillStyle = '#ff2a6d';
    ctx.beginPath();
    ctx.arc(240, 45, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(240, 45, 24, 0, Math.PI * 2);
    ctx.fill();

    // Boiling sea of thunderclouds below
    const cloudShift = (scrollY * 0.15) % 120;
    for (let cy = 110 - cloudShift; cy < 270; cy += 120) {
      ctx.fillStyle = 'rgba(35, 15, 55, 0.7)';
      ctx.beginPath();
      ctx.arc(100, cy + 20, 50, 0, Math.PI * 2);
      ctx.arc(220, cy + 10, 65, 0, Math.PI * 2);
      ctx.arc(360, cy + 25, 55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavy yellow lattice construction crane framework rushing down
    const craneSpacing = 80;
    const craneShift = (scrollY * 0.9) % craneSpacing;
    ctx.strokeStyle = '#e5a912';
    ctx.lineWidth = 3;
    for (let cry = -craneShift - craneSpacing; cry < 270 + craneSpacing; cry += craneSpacing) {
      ctx.beginPath();
      ctx.moveTo(30, cry);
      ctx.lineTo(450, cry);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(30, cry);
      ctx.lineTo(450, cry + craneSpacing);
      ctx.moveTo(450, cry);
      ctx.lineTo(30, cry + craneSpacing);
      ctx.stroke();
    }

    // Crane Tower Girders
    ctx.fillStyle = '#d49605';
    ctx.fillRect(16, 0, 20, 270);
    ctx.fillRect(444, 0, 20, 270);
    ctx.fillStyle = '#332000';
    ctx.fillRect(22, 0, 8, 270);
    ctx.fillRect(450, 0, 8, 270);

    // Crane Platform Floor
    ctx.fillStyle = '#181204';
    ctx.fillRect(36, 155, 408, 115);

    // Aviation Warning Beacon (steady glow without harsh strobing)
    ctx.fillStyle = '#ff0033';
    ctx.fillRect(20, 30, 12, 12);
    ctx.fillRect(448, 30, 12, 12);

    // Draw rising wind particles
    this.drawRisingWindParticles(ctx);
  }

  drawRisingWindParticles(ctx) {
    ctx.save();
    for (const wp of this.risingWindParticles) {
      ctx.strokeStyle = wp.color || '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wp.x, wp.y);
      ctx.lineTo(wp.x, wp.y + wp.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ==========================================
  // PROCEDURAL STAGE NAMING & THEME MATRIX
  // ==========================================
  getProceduralStageName(stageNum) {
    const prefixes = [
      'SHADOW', 'NEON', 'CYBER', 'DRAGON', 'CRIMSON', 'IRON', 'MIDNIGHT',
      'INFERNAL', 'GHOST', 'CHAOS', 'STORM', 'VIPER', 'BLOOD', 'TITAN',
      'CELESTIAL', 'VOID', 'PHANTOM', 'RISING', 'BLACK LOTUS', 'SAVAGE'
    ];
    const locales = [
      'ALLEYWAYS', 'PAGODA', 'ROOFTOPS', 'HIGHWAY', 'SANCTUM', 'DOCKS',
      'CITADEL', 'FOUNDRY', 'TEMPLE', 'HARBOR', 'SUMMIT', 'UNDERWORLD',
      'FORTRESS', 'SECTOR', 'BASTION', 'DOJO', 'SPIRE', 'PENTHOUSE'
    ];
    const subtitles = [
      '~ THE ENDLESS INVASION ~',
      '~ SYNDICATE VENGEANCE ~',
      '~ THE GAUNTLET OF BLOOD ~',
      '~ CLASH OF THE CLANS ~',
      '~ RECKONING AT MIDNIGHT ~',
      '~ DRAGON AWAKENING ~',
      '~ HIGH-ALTITUDE WARFARE ~',
      '~ ENTER THE ABYSS ~',
      '~ THE FINAL ASCENT ~',
      '~ KUNG FU MAYHEM ~'
    ];

    const pIdx = Math.abs((stageNum * 7 + 3) % prefixes.length);
    const lIdx = Math.abs((stageNum * 13 + 5) % locales.length);
    const sIdx = Math.abs((stageNum * 11 + 2) % subtitles.length);

    return {
      title: `${prefixes[pIdx]} ${locales[lIdx]}`,
      subtitle: subtitles[sIdx]
    };
  }

  getProceduralTheme(stageNum) {
    const themes = [
      {
        id: 'CHINATOWN_NEON',
        skyTop: '#0c0714', skyMid: '#1e0c2b', skyBottom: '#3b123d',
        moonColor: '#ffeedd', moonX: 380, moonY: 45, moonRadius: 26,
        ambientColor: 'rgba(255, 42, 109, 0.10)',
        groundColor: '#120f1c', curbColor: '#ff2a6d',
        decor: 'pagodas',
        signs: ['武', '龍', '怒', '館', '道']
      },
      {
        id: 'CYBER_ROOFTOPS',
        skyTop: '#050b1a', skyMid: '#0a1d3b', skyBottom: '#183860',
        moonColor: '#05d9e8', moonX: 120, moonY: 40, moonRadius: 22,
        ambientColor: 'rgba(5, 217, 232, 0.10)',
        groundColor: '#0e1424', curbColor: '#05d9e8',
        decor: 'skyscrapers',
        signs: ['CYBER', 'NEON', 'ROBOT', 'CHIP']
      },
      {
        id: 'ANCIENT_SHRINE',
        skyTop: '#140608', skyMid: '#280c10', skyBottom: '#421418',
        moonColor: '#ffd700', moonX: 240, moonY: 35, moonRadius: 22,
        ambientColor: 'rgba(255, 215, 0, 0.10)',
        groundColor: '#180a0c', curbColor: '#ffd700',
        decor: 'torii_pillars',
        signs: ['神', '虎', '力', '炎']
      },
      {
        id: 'HARBOR_DOCKS',
        skyTop: '#030812', skyMid: '#081728', skyBottom: '#10283e',
        moonColor: '#e0f4ff', moonX: 400, moonY: 38, moonRadius: 24,
        ambientColor: 'rgba(0, 200, 255, 0.08)',
        groundColor: '#101822', curbColor: '#00ddff',
        decor: 'containers',
        signs: ['CARGO', 'PORT', 'DOCK', 'SHIP']
      },
      {
        id: 'TOXIC_UNDERWORLD',
        skyTop: '#041009', skyMid: '#0a2415', skyBottom: '#143d23',
        moonColor: '#55ff77', moonX: 200, moonY: 42, moonRadius: 20,
        ambientColor: 'rgba(85, 255, 119, 0.10)',
        groundColor: '#0b1610', curbColor: '#00ff66',
        decor: 'pipes',
        signs: ['BIO', 'HAZARD', 'TOXIC', 'MUTANT']
      },
      {
        id: 'VOLCANIC_FORGE',
        skyTop: '#160402', skyMid: '#300a05', skyBottom: '#551508',
        moonColor: '#ff5522', moonX: 350, moonY: 40, moonRadius: 28,
        ambientColor: 'rgba(255, 85, 34, 0.12)',
        groundColor: '#1a0805', curbColor: '#ff4400',
        decor: 'foundry',
        signs: ['鍛', '鉄', '火', '灼']
      },
      {
        id: 'BAMBOO_GROVE',
        skyTop: '#060a14', skyMid: '#0d1828', skyBottom: '#1a2a40',
        moonColor: '#ffffff', moonX: 320, moonY: 32, moonRadius: 25,
        ambientColor: 'rgba(200, 225, 255, 0.08)',
        groundColor: '#0a1016', curbColor: '#7be495',
        decor: 'bamboo',
        signs: ['竹', '月', '影', '林']
      },
      {
        id: 'GOLDEN_SUMMIT',
        skyTop: '#1a0a20', skyMid: '#351630', skyBottom: '#58253e',
        moonColor: '#ffd700', moonX: 180, moonY: 36, moonRadius: 24,
        ambientColor: 'rgba(255, 215, 0, 0.10)',
        groundColor: '#1a1020', curbColor: '#ffd700',
        decor: 'penthouse',
        signs: ['天', '頂', '金', '極']
      }
    ];

    const idx = Math.abs((stageNum - 1) % themes.length);
    return themes[idx];
  }

  drawProceduralBackground(ctx, camX, stageNum) {
    const theme = this.getProceduralTheme(stageNum);

    // 1. Sky Gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 160);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(0.55, theme.skyMid);
    sky.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 480, 160);

    // 2. Celestial Body (Moon / Sun)
    ctx.save();
    ctx.fillStyle = theme.moonColor;
    ctx.beginPath();
    const moonShiftX = ((theme.moonX - camX * 0.02) % 520 + 520) % 520;
    ctx.arc(moonShiftX, theme.moonY, theme.moonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Soft celestial glow halo
    ctx.fillStyle = theme.ambientColor;
    ctx.beginPath();
    ctx.arc(moonShiftX, theme.moonY, theme.moonRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Far Silhouette Skyline (Speed: camX * 0.15)
    ctx.fillStyle = '#0b0614';
    const farSpacing = 160;
    const farShift = (camX * 0.15) % farSpacing;
    for (let x = -farShift - farSpacing; x < 480 + farSpacing; x += farSpacing) {
      if (theme.decor === 'skyscrapers' || theme.decor === 'penthouse') {
        ctx.fillRect(x, 60, 65, 100);
        ctx.fillRect(x + 75, 45, 55, 115);
      } else if (theme.decor === 'bamboo') {
        ctx.fillRect(x + 20, 30, 8, 130);
        ctx.fillRect(x + 60, 20, 10, 140);
        ctx.fillRect(x + 110, 40, 7, 120);
      } else if (theme.decor === 'containers') {
        ctx.fillRect(x, 80, 110, 80);
        ctx.fillRect(x + 20, 50, 70, 30);
      } else {
        ctx.fillRect(x, 70, 110, 90);
        ctx.beginPath();
        ctx.moveTo(x - 10, 70);
        ctx.lineTo(x + 55, 45);
        ctx.lineTo(x + 120, 70);
        ctx.fill();
      }
    }

    // 4. Midground Structures & Neon Signs (Speed: camX * 0.5)
    const midSpacing = 220;
    const midShift = (camX * 0.5) % midSpacing;
    for (let x = -midShift - midSpacing; x < 480 + midSpacing; x += midSpacing) {
      ctx.fillStyle = '#140d1f';
      ctx.fillRect(x, 90, 80, 70);

      const signIndex = Math.abs(Math.floor((x + camX * 0.5) / midSpacing)) % theme.signs.length;
      const signText = theme.signs[signIndex];

      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 20, 100, 40, 45);
      ctx.strokeStyle = theme.curbColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 20, 100, 40, 45);

      ctx.fillStyle = theme.curbColor;
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(signText, x + 40, 128);
    }

    // 5. Ground Walking Lane (y: 152 to 264)
    ctx.fillStyle = theme.groundColor;
    ctx.fillRect(0, 152, 480, 118);

    // Glowing Top Curb Line
    ctx.strokeStyle = theme.curbColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 152);
    ctx.lineTo(480, 152);
    ctx.stroke();

    // Perspective Road Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let py = 168; py < 264; py += 16) {
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(480, py);
      ctx.stroke();
    }

    // Bottom Curb line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, 264);
    ctx.lineTo(480, 264);
    ctx.stroke();
  }

  drawProceduralVerticalBackground(ctx, scrollY, stageNum) {
    const theme = this.getProceduralTheme(stageNum);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 270);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(0.6, theme.skyMid);
    sky.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 480, 270);

    // Elevator Shaft Columns (left & right borders)
    ctx.fillStyle = '#110b1a';
    ctx.fillRect(0, 0, 60, 270);
    ctx.fillRect(420, 0, 60, 270);

    ctx.strokeStyle = theme.curbColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 0); ctx.lineTo(60, 270);
    ctx.moveTo(420, 0); ctx.lineTo(420, 270);
    ctx.stroke();

    // Elevator Cables
    ctx.strokeStyle = '#33254c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(75, 0); ctx.lineTo(75, 270);
    ctx.moveTo(405, 0); ctx.lineTo(405, 270);
    ctx.stroke();

    // Ascending Floor Indicators passing by
    const floorH = 90;
    const shiftY = (scrollY * 0.8) % floorH;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let y = -shiftY - floorH; y < 270 + floorH; y += floorH) {
      ctx.fillRect(60, y, 360, 3);
    }

    // Walking Platform (y: 160 to 255)
    ctx.fillStyle = theme.groundColor;
    ctx.fillRect(60, 160, 360, 95);
    ctx.strokeStyle = theme.curbColor;
    ctx.strokeRect(60, 160, 360, 95);

    // Altitude & Floor Readout on shaft
    ctx.fillStyle = theme.curbColor;
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(`LV.${stageNum}`, 8, 30);
    ctx.fillText(`${Math.round(this.altitude)}M`, 8, 45);
  }

  // Draw the iconic retro arcade "GO --->" indicator (steady display without harsh blinking)
  drawGoSign(ctx) {
    if (!this.showGoSign && !this.isAscending) return;

    ctx.save();
    ctx.font = '14px "Press Start 2P", monospace';

    if (this.gameMode === 'VERTICAL') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText('▲ ASCEND ▲', 242, 62);
      ctx.fillStyle = '#00ffcc';
      ctx.fillText('▲ ASCEND ▲', 240, 60);
    } else {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000000';
      ctx.fillText('GO  ===>', 452, 62);
      ctx.fillStyle = '#ffd700';
      ctx.fillText('GO  ===>', 450, 60);
    }
    ctx.restore();
  }
}

window.Stage = Stage;
