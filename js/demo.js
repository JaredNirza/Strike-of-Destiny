/* ==========================================================================
   STRIKE OF DESTINY — Playable 2D Top-Down Roguelike Survival Mini-Demo
   HTML5 Canvas Engine (960x540 viewport in 1500x960 gothic arena)
   ========================================================================== */

(function (global) {
  'use strict';

  const WORLD_W = 1500;
  const WORLD_H = 960;
  const VIEW_W = 960;
  const VIEW_H = 540;
  const RUN_DURATION = 120; // 02:00 survival timer

  const HERO_CONFIGS = {
    kaito: {
      id: 'kaito',
      name: 'Kaito',
      title: 'Shadow Shinobi',
      color: '#00F5D4',
      maxHp: 100,
      speed: 255,
      damage: 22,
      cooldown: 0.24,
      weaponType: 'kunai',
      weaponName: 'Shadow Kunai',
      projectileSpeed: 640
    },
    gareth: {
      id: 'gareth',
      name: 'Sir Gareth',
      title: 'Iron Paladin',
      color: '#FFB703',
      maxHp: 165,
      speed: 195,
      damage: 38,
      cooldown: 0.46,
      weaponType: 'sword',
      weaponName: 'Iron Greatsword',
      slashRadius: 96
    },
    vex: {
      id: 'vex',
      name: 'Doctor Vex',
      title: 'Plague Alchemist',
      color: '#7AE582',
      maxHp: 115,
      speed: 215,
      damage: 18,
      cooldown: 0.56,
      weaponType: 'vial',
      weaponName: 'Venom Vials',
      projectileSpeed: 420
    },
    zephyr: {
      id: 'zephyr',
      name: 'Zephyr',
      title: 'Storm Warden',
      color: '#9D4EDD',
      maxHp: 110,
      speed: 225,
      damage: 26,
      cooldown: 0.42,
      weaponType: 'lightning',
      weaponName: 'Chain Lightning',
      range: 270
    }
  };

  const UPGRADE_POOL = [
    {
      id: 'multishot',
      category: 'weapon',
      catLabel: 'Weapon',
      name: 'Twin Strike',
      desc: '+1 extra projectile, wider slash arc, or +1 extra lightning chain target.',
      apply(p) { p.bonusCount += 1; }
    },
    {
      id: 'forged_edge',
      category: 'weapon',
      catLabel: 'Weapon',
      name: 'Bloodforged Edge',
      desc: 'Infuse your primary weapon with crimson steel for +25% attack damage.',
      apply(p) { p.damage = Math.round(p.damage * 1.25); }
    },
    {
      id: 'orbit_blades',
      category: 'weapon',
      catLabel: 'Weapon',
      name: 'Spectral Daggers',
      desc: 'Summon an orbiting arcane blade that slices undead who get too close.',
      apply(p) { p.orbitBlades += 1; }
    },
    {
      id: 'magnet_aura',
      category: 'stat',
      catLabel: 'Stat Boost',
      name: 'Magnetite Aura',
      desc: 'Increase XP Gem & Gold Coin pickup attraction radius by +45%.',
      apply(p) { p.pickupRadius = Math.round(p.pickupRadius * 1.45); }
    },
    {
      id: 'titan_heart',
      category: 'stat',
      catLabel: 'Stat Boost',
      name: 'Vitality Flask',
      desc: '+35 Maximum Health and immediately restore 45 HP.',
      apply(p) {
        p.maxHp += 35;
        p.hp = Math.min(p.maxHp, p.hp + 45);
      }
    },
    {
      id: 'wind_stride',
      category: 'stat',
      catLabel: 'Stat Boost',
      name: 'Windrunner Stride',
      desc: '+16% movement speed for tighter kiting and dodging.',
      apply(p) { p.speed = Math.round(p.speed * 1.16); }
    },
    {
      id: 'chrono_relic',
      category: 'relic',
      catLabel: 'Relic Trinket',
      name: 'Chrono Hourglass',
      desc: '-18% attack & dodge cooldown reduction across all abilities.',
      apply(p) {
        p.cooldown = Math.max(0.11, p.cooldown * 0.82);
        p.dashCooldownMax = Math.max(0.55, p.dashCooldownMax * 0.82);
      }
    },
    {
      id: 'vampiric_fang',
      category: 'relic',
      catLabel: 'Relic Trinket',
      name: 'Crimson Fang Relic',
      desc: 'Restore 3 HP every 5 undead slain and gain +15% crit strike chance.',
      apply(p) {
        p.vampiric += 3;
        p.critChance = Math.min(0.75, p.critChance + 0.15);
      }
    },
    {
      id: 'greed_charm',
      category: 'relic',
      catLabel: 'Relic Trinket',
      name: 'Gilded Signet',
      desc: '+40% Gold from slain enemies and +25% bonus XP gain.',
      apply(p) {
        p.goldMult += 0.4;
        p.xpMult += 0.25;
      }
    }
  ];

  class SurvivalDemo {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.canvas.width = VIEW_W;
      this.canvas.height = VIEW_H;
      this.ctx.imageSmoothingEnabled = false;

      // DOM elements
      this.elHpBar = document.getElementById('hud-hp-fill');
      this.elHpText = document.getElementById('hud-hp-text');
      this.elXpBar = document.getElementById('hud-xp-fill');
      this.elXpText = document.getElementById('hud-xp-text');
      this.elLevel = document.getElementById('hud-level');
      this.elGold = document.getElementById('hud-gold');
      this.elCombo = document.getElementById('hud-combo');
      this.elTimer = document.getElementById('hud-timer');
      this.elWaveLabel = document.getElementById('hud-wave-label');

      this.overlayStart = document.getElementById('demo-overlay-start');
      this.overlayLevelUp = document.getElementById('demo-overlay-levelup');
      this.overlayEnd = document.getElementById('demo-overlay-end');
      this.levelupCardsEl = document.getElementById('levelup-cards');

      this.selectedHeroId = 'kaito';
      this.state = 'idle'; // idle | playing | levelup | victory | gameover
      this.radarOpen = true;
      this.autoFire = false;
      this.sfxOn = true;

      this.keys = {};
      this.mouse = { x: VIEW_W / 2, y: VIEW_H / 2, down: false };
      this.camera = { x: 0, y: 0 };

      this.resetEntities();
      this.bindInputs();
      this.bindUI();
      this.drawIdleBackdrop();

      this.lastFrame = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }

    resetEntities() {
      const cfg = HERO_CONFIGS[this.selectedHeroId] || HERO_CONFIGS.kaito;
      const bs = (global.SODState && global.SODState.getBlacksmithBonuses)
        ? global.SODState.getBlacksmithBonuses()
        : { maxHp: 0, speedPct: 0, dmgPct: 0, pickupPct: 0, goldPct: 0 };

      this.player = {
        heroId: cfg.id,
        x: WORLD_W / 2,
        y: WORLD_H / 2,
        vx: 0,
        vy: 0,
        radius: 16,
        facingLeft: false,
        maxHp: Math.round(cfg.maxHp + bs.maxHp),
        hp: Math.round(cfg.maxHp + bs.maxHp),
        speed: Math.round(cfg.speed * (1 + bs.speedPct)),
        damage: Math.round(cfg.damage * (1 + bs.dmgPct)),
        cooldown: cfg.cooldown,
        attackTimer: 0,
        weaponType: cfg.weaponType,
        projectileSpeed: cfg.projectileSpeed || 500,
        slashRadius: cfg.slashRadius || 96,
        range: cfg.range || 260,
        bonusCount: 0,
        orbitBlades: 0,
        orbitAngle: 0,
        pickupRadius: Math.round(88 * (1 + bs.pickupPct)),
        goldMult: 1 + bs.goldPct,
        xpMult: 1,
        vampiric: 0,
        critChance: 0.08,
        dashTimer: 0,
        dashCooldown: 0,
        dashCooldownMax: 1.4,
        dashDirX: 1,
        dashDirY: 0,
        invulnTimer: 0,
        hitFlash: 0,
        level: 1,
        xp: 0,
        xpNext: 45,
        gold: 0,
        kills: 0,
        tookDamage: false,
        vampCounter: 0
      };

      this.timeRemaining = RUN_DURATION;
      this.elapsed = 0;
      this.spawnTimer = 0.6;
      this.bossSpawned = false;
      this.bossDefeated = false;
      this.combo = 0;
      this.comboTimer = 0;
      this.maxCombo = 0;
      this.shakeTime = 0;
      this.shakeIntensity = 0;
      this.bossBannerTimer = 0;

      this.enemies = [];
      this.projectiles = [];
      this.enemyProjectiles = [];
      this.poisonPools = [];
      this.slashArcs = [];
      this.lightningArcs = [];
      this.drops = [];
      this.particles = [];
      this.floatingTexts = [];
      this.afterimages = [];

      // Decorative dark-fantasy arena floor props (gravestones, runes, torches)
      this.props = [];
      for (let i = 0; i < 38; i++) {
        this.props.push({
          x: 70 + Math.random() * (WORLD_W - 140),
          y: 70 + Math.random() * (WORLD_H - 140),
          kind: i % 3 === 0 ? 'rune' : (i % 3 === 1 ? 'stone' : 'cracks')
        });
      }

      this.updateHUD();
    }

    bindInputs() {
      window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        this.keys[key] = true;

        if (this.state === 'playing') {
          if (key === ' ' || e.code === 'Space') {
            e.preventDefault();
            this.tryDash();
          } else if (key === 'm') {
            this.radarOpen = !this.radarOpen;
            this.syncToggleButtons();
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });

      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
        this.mouse.y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
      });

      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.mouse.down = true;
          if (this.state === 'playing') {
            this.tryAttack();
          }
        }
      });

      window.addEventListener('mouseup', () => {
        this.mouse.down = false;
      });
    }

    bindUI() {
      // Hero selector buttons
      document.querySelectorAll('.demo-hero-pick').forEach((btn) => {
        btn.addEventListener('click', () => {
          const heroId = btn.getAttribute('data-hero');
          this.selectHero(heroId);
        });
      });

      const startBtn = document.getElementById('btn-start-demo');
      if (startBtn) {
        startBtn.addEventListener('click', () => this.startRun());
      }

      const restartBtn = document.getElementById('btn-restart-demo');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => this.startRun());
      }

      const switchBtn = document.getElementById('btn-switch-hero');
      if (switchBtn) {
        switchBtn.addEventListener('click', () => {
          this.state = 'idle';
          this.overlayEnd.classList.add('hidden');
          this.overlayStart.classList.remove('hidden');
          this.resetEntities();
        });
      }

      const sfxBtn = document.getElementById('btn-demo-sfx');
      if (sfxBtn) {
        sfxBtn.addEventListener('click', () => {
          this.sfxOn = !this.sfxOn;
          if (global.SODAudio) global.SODAudio.setEnabled(this.sfxOn);
          this.syncToggleButtons();
        });
      }

      const radarBtn = document.getElementById('btn-demo-radar');
      if (radarBtn) {
        radarBtn.addEventListener('click', () => {
          this.radarOpen = !this.radarOpen;
          this.syncToggleButtons();
        });
      }

      const autoBtn = document.getElementById('btn-demo-autofire');
      if (autoBtn) {
        autoBtn.addEventListener('click', () => {
          this.autoFire = !this.autoFire;
          this.syncToggleButtons();
        });
      }

      this.syncToggleButtons();
    }

    syncToggleButtons() {
      const sfxBtn = document.getElementById('btn-demo-sfx');
      if (sfxBtn) {
        sfxBtn.textContent = this.sfxOn ? 'SFX: ON' : 'SFX: OFF';
        sfxBtn.classList.toggle('btn-cyan', this.sfxOn);
        sfxBtn.classList.toggle('btn-ghost', !this.sfxOn);
      }
      const radarBtn = document.getElementById('btn-demo-radar');
      if (radarBtn) {
        radarBtn.textContent = this.radarOpen ? 'RADAR (M): ON' : 'RADAR (M): OFF';
        radarBtn.classList.toggle('btn-cyan', this.radarOpen);
        radarBtn.classList.toggle('btn-ghost', !this.radarOpen);
      }
      const autoBtn = document.getElementById('btn-demo-autofire');
      if (autoBtn) {
        autoBtn.textContent = this.autoFire ? 'AUTO-FIRE: ON' : 'AUTO-FIRE: OFF';
        autoBtn.classList.toggle('btn-gold', this.autoFire);
        autoBtn.classList.toggle('btn-ghost', !this.autoFire);
      }
    }

    selectHero(heroId) {
      if (!HERO_CONFIGS[heroId]) return;
      this.selectedHeroId = heroId;
      document.querySelectorAll('.demo-hero-pick').forEach((btn) => {
        btn.classList.toggle('selected', btn.getAttribute('data-hero') === heroId);
      });
      const cfg = HERO_CONFIGS[heroId];
      const lbl = document.getElementById('start-hero-label');
      if (lbl) lbl.textContent = `${cfg.name} — ${cfg.title} (${cfg.weaponName})`;
      if (this.state !== 'playing') {
        this.resetEntities();
      }
    }

    startRun() {
      if (global.SODAudio) {
        global.SODAudio.setEnabled(this.sfxOn);
        global.SODAudio.playUpgrade();
      }
      this.resetEntities();
      this.state = 'playing';
      this.overlayStart.classList.add('hidden');
      this.overlayLevelUp.classList.add('hidden');
      this.overlayEnd.classList.add('hidden');

      // Spawn initial welcoming pack of zombies
      for (let i = 0; i < 4; i++) {
        this.spawnEnemy('zombie');
      }
    }

    tryDash() {
      const p = this.player;
      if (p.dashCooldown > 0 || p.dashTimer > 0) return;

      let dx = 0;
      let dy = 0;
      if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
      if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) dx += 1;

      if (dx === 0 && dy === 0) {
        const aimX = this.mouse.x + this.camera.x - p.x;
        const aimY = this.mouse.y + this.camera.y - p.y;
        const len = Math.hypot(aimX, aimY) || 1;
        dx = aimX / len;
        dy = aimY / len;
      } else {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      }

      p.dashDirX = dx;
      p.dashDirY = dy;
      p.dashTimer = 0.19;
      p.invulnTimer = 0.34;
      p.dashCooldown = p.dashCooldownMax;

      if (global.SODAudio) global.SODAudio.playShadow();
      this.spawnParticles(p.x, p.y, '#00F5D4', 10, 140);
    }

    tryAttack() {
      const p = this.player;
      if (p.attackTimer > 0) return;
      p.attackTimer = p.cooldown;

      const worldMouseX = this.mouse.x + this.camera.x;
      const worldMouseY = this.mouse.y + this.camera.y;
      const baseAngle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);
      p.facingLeft = Math.cos(baseAngle) < 0;

      const isCrit = Math.random() < p.critChance;
      const dmg = Math.round(p.damage * (isCrit ? 1.65 : 1));

      if (p.weaponType === 'kunai') {
        const count = 1 + p.bonusCount;
        const spread = 0.14;
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * spread;
          const angle = baseAngle + offset;
          this.projectiles.push({
            kind: 'kunai',
            x: p.x + Math.cos(angle) * 16,
            y: p.y + Math.sin(angle) * 16,
            vx: Math.cos(angle) * p.projectileSpeed,
            vy: Math.sin(angle) * p.projectileSpeed,
            angle,
            damage: dmg,
            crit: isCrit,
            life: 1.1,
            radius: 7,
            pierce: p.bonusCount >= 2 ? 1 : 0
          });
        }
        if (global.SODAudio) global.SODAudio.playKunai();
      } else if (p.weaponType === 'sword') {
        const radius = p.slashRadius + p.bonusCount * 16;
        const arcHalf = 1.05 + p.bonusCount * 0.14;
        this.slashArcs.push({
          x: p.x,
          y: p.y,
          angle: baseAngle,
          radius,
          arcHalf,
          life: 0.18,
          maxLife: 0.18,
          color: isCrit ? '#FFB703' : '#E2E8F0'
        });
        if (global.SODAudio) global.SODAudio.playSword();

        this.enemies.forEach((en) => {
          const dx = en.x - p.x;
          const dy = en.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= radius + en.radius) {
            let diff = Math.atan2(dy, dx) - baseAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) <= arcHalf) {
              this.damageEnemy(en, dmg, isCrit, dx / (dist || 1) * 150, dy / (dist || 1) * 150);
            }
          }
        });
      } else if (p.weaponType === 'vial') {
        const count = 1 + p.bonusCount;
        const distToMouse = Math.min(260, Math.max(70, Math.hypot(worldMouseX - p.x, worldMouseY - p.y)));
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * 0.24;
          const angle = baseAngle + offset;
          const tx = p.x + Math.cos(angle) * distToMouse;
          const ty = p.y + Math.sin(angle) * distToMouse;
          this.projectiles.push({
            kind: 'vial',
            x: p.x,
            y: p.y,
            vx: Math.cos(angle) * p.projectileSpeed,
            vy: Math.sin(angle) * p.projectileSpeed,
            targetX: tx,
            targetY: ty,
            damage: dmg,
            crit: isCrit,
            life: distToMouse / p.projectileSpeed,
            radius: 9
          });
        }
        if (global.SODAudio) global.SODAudio.playPoison();
      } else if (p.weaponType === 'lightning') {
        const maxChains = 3 + p.bonusCount;
        let firstTarget = null;
        let bestScore = Infinity;

        this.enemies.forEach((en) => {
          const d = Math.hypot(en.x - p.x, en.y - p.y);
          if (d <= p.range + 60) {
            const dMouse = Math.hypot(en.x - worldMouseX, en.y - worldMouseY);
            const score = dMouse * 0.7 + d * 0.3;
            if (score < bestScore) {
              bestScore = score;
              firstTarget = en;
            }
          }
        });

        if (firstTarget) {
          const hitSet = new Set();
          let currX = p.x;
          let currY = p.y;
          let currTarget = firstTarget;
          const points = [{ x: currX, y: currY }];

          for (let c = 0; c < maxChains && currTarget; c++) {
            hitSet.add(currTarget);
            points.push({ x: currTarget.x, y: currTarget.y });
            const chainDmg = Math.round(dmg * Math.pow(0.88, c));
            this.damageEnemy(currTarget, chainDmg, isCrit, 0, 0);
            currX = currTarget.x;
            currY = currTarget.y;

            let nextTarget = null;
            let nextDist = 175;
            this.enemies.forEach((cand) => {
              if (hitSet.has(cand) || cand.hp <= 0) return;
              const d = Math.hypot(cand.x - currX, cand.y - currY);
              if (d < nextDist) {
                nextDist = d;
                nextTarget = cand;
              }
            });
            currTarget = nextTarget;
          }

          this.lightningArcs.push({ points, life: 0.16, maxLife: 0.16 });
          if (global.SODAudio) global.SODAudio.playLightning();
        } else {
          // Whiff bolt toward cursor
          const endX = p.x + Math.cos(baseAngle) * 140;
          const endY = p.y + Math.sin(baseAngle) * 140;
          this.lightningArcs.push({
            points: [{ x: p.x, y: p.y }, { x: endX, y: endY }],
            life: 0.12,
            maxLife: 0.12
          });
          if (global.SODAudio) global.SODAudio.playLightning();
        }
      }
    }

    spawnPoisonPool(x, y, damage) {
      this.poisonPools.push({
        x,
        y,
        radius: 52 + this.player.bonusCount * 6,
        damage: Math.max(8, Math.round(damage * 0.55)),
        tickTimer: 0,
        life: 3.6,
        maxLife: 3.6
      });
      this.spawnParticles(x, y, '#7AE582', 10, 90);
    }

    spawnEnemy(type) {
      const p = this.player;
      const angle = Math.random() * Math.PI * 2;
      const dist = 420 + Math.random() * 140;
      const x = Math.max(36, Math.min(WORLD_W - 36, p.x + Math.cos(angle) * dist));
      const y = Math.max(36, Math.min(WORLD_H - 36, p.y + Math.sin(angle) * dist));

      const scaleFactor = 1 + (this.elapsed / 120) * 0.65;

      if (type === 'zombie') {
        this.enemies.push({
          type: 'zombie',
          x, y,
          radius: 17,
          hp: Math.round(40 * scaleFactor),
          maxHp: Math.round(40 * scaleFactor),
          speed: 78 + Math.random() * 16,
          damage: 11,
          xpValue: 12,
          goldChance: 0.45,
          hitFlash: 0,
          knockX: 0, knockY: 0,
          facingLeft: false
        });
      } else if (type === 'hound') {
        this.enemies.push({
          type: 'hound',
          x, y,
          radius: 14,
          hp: Math.round(28 * scaleFactor),
          maxHp: Math.round(28 * scaleFactor),
          speed: 148 + Math.random() * 20,
          damage: 14,
          xpValue: 16,
          goldChance: 0.55,
          hitFlash: 0,
          knockX: 0, knockY: 0,
          facingLeft: false
        });
      } else if (type === 'archer') {
        this.enemies.push({
          type: 'archer',
          x, y,
          radius: 16,
          hp: Math.round(34 * scaleFactor),
          maxHp: Math.round(34 * scaleFactor),
          speed: 92,
          damage: 12,
          shootTimer: 1.6 + Math.random() * 0.9,
          xpValue: 20,
          goldChance: 0.65,
          hitFlash: 0,
          knockX: 0, knockY: 0,
          facingLeft: false
        });
      } else if (type === 'boss') {
        this.enemies.push({
          type: 'boss',
          name: 'DREAD LORD MALAKOR',
          x, y,
          radius: 32,
          hp: 560,
          maxHp: 560,
          speed: 102,
          damage: 24,
          shootTimer: 2.0,
          xpValue: 120,
          goldChance: 1.0,
          hitFlash: 0,
          knockX: 0, knockY: 0,
          facingLeft: false
        });
        this.bossSpawned = true;
        this.bossBannerTimer = 3.2;
        this.triggerShake(0.45, 7);
        if (global.SODAudio) global.SODAudio.playBossSpawn();
      }
    }

    damageEnemy(en, amount, isCrit, knockX, knockY) {
      if (en.hp <= 0) return;
      en.hp -= amount;
      en.hitFlash = 0.11;
      if (en.type !== 'boss') {
        en.knockX += knockX || 0;
        en.knockY += knockY || 0;
      }

      this.floatingTexts.push({
        x: en.x + (Math.random() - 0.5) * 14,
        y: en.y - en.radius - 6,
        text: isCrit ? `${amount}!` : `${amount}`,
        color: isCrit ? '#FFB703' : '#F8FAFC',
        life: 0.55
      });

      this.spawnParticles(en.x, en.y, en.type === 'boss' ? '#9D4EDD' : '#E63946', 5, 110);
      if (global.SODAudio) global.SODAudio.playEnemy();

      if (en.hp <= 0) {
        this.onEnemyKilled(en);
      }
    }

    onEnemyKilled(en) {
      const p = this.player;
      p.kills += 1;
      this.combo += 1;
      this.comboTimer = 3.2;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      if (p.vampiric > 0) {
        p.vampCounter += 1;
        if (p.vampCounter >= 5) {
          p.vampCounter = 0;
          p.hp = Math.min(p.maxHp, p.hp + p.vampiric);
        }
      }

      // Drop XP gem
      this.drops.push({
        kind: 'xp',
        x: en.x + (Math.random() - 0.5) * 14,
        y: en.y + (Math.random() - 0.5) * 14,
        value: Math.round(en.xpValue * p.xpMult)
      });

      // Drop Gold Coin(s)
      if (Math.random() <= en.goldChance) {
        const coins = en.type === 'boss' ? 8 : 1;
        for (let i = 0; i < coins; i++) {
          this.drops.push({
            kind: 'gold',
            x: en.x + (Math.random() - 0.5) * 28,
            y: en.y + (Math.random() - 0.5) * 28,
            value: Math.round((en.type === 'boss' ? 25 : 10) * p.goldMult)
          });
        }
      }

      this.spawnParticles(en.x, en.y, '#FFB703', en.type === 'boss' ? 26 : 10, 160);

      // Sync with global Bestiary & Trophies
      if (global.SODState) {
        global.SODState.recordKill(en.type);
        if (p.kills === 1) global.SODState.unlockTrophy('firstBlood');
        if (p.heroId === 'vex' && p.kills >= 12) global.SODState.unlockTrophy('masterAlchemist');
      }

      if (en.type === 'boss') {
        this.bossDefeated = true;
        if (global.SODState) global.SODState.unlockTrophy('bossSlayer');
        this.finishRun(true, 'STAGE BOSS VANQUISHED!');
      }
    }

    damagePlayer(amount) {
      const p = this.player;
      if (p.invulnTimer > 0) return;
      p.hp = Math.max(0, p.hp - amount);
      p.invulnTimer = 0.65;
      p.hitFlash = 0.2;
      p.tookDamage = true;
      this.combo = 0;
      this.triggerShake(0.22, 6);
      if (global.SODAudio) global.SODAudio.playHurt();

      this.floatingTexts.push({
        x: p.x,
        y: p.y - 26,
        text: `-${amount}`,
        color: '#E63946',
        life: 0.65
      });

      if (p.hp <= 0) {
        this.finishRun(false, 'FALLEN IN BATTLE');
      }
    }

    triggerLevelUp() {
      const p = this.player;
      p.level += 1;
      p.xp -= p.xpNext;
      p.xpNext = Math.round(p.xpNext * 1.38 + 18);
      this.state = 'levelup';
      if (global.SODAudio) global.SODAudio.playLevelUp();

      // Pick 3 randomized distinct upgrades
      const pool = [...UPGRADE_POOL];
      const picks = [];
      for (let i = 0; i < 3 && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(idx, 1)[0]);
      }

      this.levelupCardsEl.innerHTML = '';
      picks.forEach((upg) => {
        const btn = document.createElement('button');
        btn.className = 'upgrade-choice-card';
        btn.innerHTML = `
          <span class="upg-cat-tag ${upg.category}">${upg.catLabel}</span>
          <div class="upg-card-name">${upg.name}</div>
          <p class="upg-card-desc">${upg.desc}</p>
          <span class="upg-card-cta">[ SELECT UPGRADE ]</span>
        `;
        btn.addEventListener('click', () => {
          upg.apply(this.player);
          if (global.SODAudio) global.SODAudio.playUpgrade();
          this.overlayLevelUp.classList.add('hidden');
          this.state = 'playing';
          this.updateHUD();
        });
        this.levelupCardsEl.appendChild(btn);
      });

      this.overlayLevelUp.classList.remove('hidden');
    }

    finishRun(victory, headingText) {
      this.state = victory ? 'victory' : 'gameover';

      if (global.SODState) {
        if (this.player.gold > 0) {
          global.SODState.addGold(this.player.gold);
        }
        if (victory && !this.player.tookDamage) {
          global.SODState.unlockTrophy('untouchable');
        }
        if (this.player.gold >= 100) {
          global.SODState.unlockTrophy('hoarder');
        }
      }

      if (global.SODAudio) {
        if (victory) global.SODAudio.playVictory();
        else global.SODAudio.playGameOver();
      }

      const titleEl = document.getElementById('end-overlay-title');
      const subEl = document.getElementById('end-overlay-sub');
      const statsEl = document.getElementById('end-run-stats');

      if (titleEl) {
        titleEl.textContent = headingText;
        titleEl.className = `demo-overlay-title ${victory ? 'victory' : 'gameover'}`;
      }
      if (subEl) {
        subEl.textContent = victory
          ? 'You survived the horde and earned gold for the Village Blacksmith!'
          : 'The undead overwhelmed you. Spend your earned gold at the Blacksmith and return stronger!';
      }
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="run-stat"><strong>${this.player.kills}</strong><span>UNDEAD SLAIN</span></div>
          <div class="run-stat"><strong>${this.player.gold}G</strong><span>GOLD BANKED</span></div>
          <div class="run-stat"><strong>LVL ${this.player.level}</strong><span>FINAL LEVEL</span></div>
          <div class="run-stat"><strong>${this.maxCombo}x</strong><span>MAX COMBO</span></div>
        `;
      }

      this.overlayEnd.classList.remove('hidden');
      this.updateHUD();
    }

    triggerShake(duration, intensity) {
      this.shakeTime = Math.max(this.shakeTime, duration);
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    spawnParticles(x, y, color, count, speed) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = (0.3 + Math.random() * 0.7) * speed;
        this.particles.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          color,
          size: 3 + Math.floor(Math.random() * 3),
          life: 0.25 + Math.random() * 0.25
        });
      }
    }

    update(dt) {
      if (this.state !== 'playing') return;

      const p = this.player;
      this.elapsed += dt;
      this.timeRemaining = Math.max(0, RUN_DURATION - this.elapsed);

      if (this.timeRemaining <= 0) {
        this.finishRun(true, 'SURVIVAL COMPLETE!');
        return;
      }

      // Spawn Stage Boss near end of 2-minute countdown (at 00:35 remaining)
      if (!this.bossSpawned && this.timeRemaining <= 35) {
        this.spawnEnemy('boss');
      }

      if (this.bossBannerTimer > 0) this.bossBannerTimer -= dt;
      if (this.shakeTime > 0) this.shakeTime -= dt;
      if (p.attackTimer > 0) p.attackTimer -= dt;
      if (p.dashCooldown > 0) p.dashCooldown -= dt;
      if (p.invulnTimer > 0) p.invulnTimer -= dt;
      if (p.hitFlash > 0) p.hitFlash -= dt;

      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 0;
      }

      // Player Movement / Dash
      if (p.dashTimer > 0) {
        p.dashTimer -= dt;
        const dashSpeed = p.speed * 2.85;
        p.x += p.dashDirX * dashSpeed * dt;
        p.y += p.dashDirY * dashSpeed * dt;
        this.afterimages.push({
          x: p.x,
          y: p.y,
          heroId: p.heroId,
          facingLeft: p.facingLeft,
          life: 0.22
        });
      } else {
        let mx = 0;
        let my = 0;
        if (this.keys['w'] || this.keys['arrowup']) my -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) my += 1;
        if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) mx += 1;
        if (mx !== 0 || my !== 0) {
          const len = Math.hypot(mx, my);
          mx /= len;
          my /= len;
          p.x += mx * p.speed * dt;
          p.y += my * p.speed * dt;
          if (mx !== 0) p.facingLeft = mx < 0;
        }
      }

      p.x = Math.max(26, Math.min(WORLD_W - 26, p.x));
      p.y = Math.max(26, Math.min(WORLD_H - 26, p.y));

      // Camera smooth center
      this.camera.x = Math.max(0, Math.min(WORLD_W - VIEW_W, p.x - VIEW_W / 2));
      this.camera.y = Math.max(0, Math.min(WORLD_H - VIEW_H, p.y - VIEW_H / 2));

      // Attack if holding mouse or autoFire enabled
      if (this.mouse.down || this.autoFire) {
        this.tryAttack();
      }

      // Orbiting Spectral Daggers
      if (p.orbitBlades > 0) {
        p.orbitAngle += dt * 4.2;
        const orbitR = 54;
        for (let b = 0; b < p.orbitBlades; b++) {
          const a = p.orbitAngle + (b * Math.PI * 2) / p.orbitBlades;
          const bx = p.x + Math.cos(a) * orbitR;
          const by = p.y + Math.sin(a) * orbitR;
          this.enemies.forEach((en) => {
            if (en.hp <= 0) return;
            if (Math.hypot(en.x - bx, en.y - by) < en.radius + 11) {
              if (!en.orbitCooldown || en.orbitCooldown <= 0) {
                this.damageEnemy(en, Math.round(p.damage * 0.65), false, 0, 0);
                en.orbitCooldown = 0.4;
              }
            }
          });
        }
      }

      // Enemy Wave Spawner
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < 36) {
        const progress = this.elapsed / RUN_DURATION;
        this.spawnTimer = Math.max(0.45, 1.45 - progress * 0.85);

        const roll = Math.random();
        if (progress < 0.25) {
          this.spawnEnemy(roll < 0.8 ? 'zombie' : 'hound');
        } else if (progress < 0.55) {
          if (roll < 0.5) this.spawnEnemy('zombie');
          else if (roll < 0.8) this.spawnEnemy('hound');
          else this.spawnEnemy('archer');
        } else {
          if (roll < 0.35) this.spawnEnemy('zombie');
          else if (roll < 0.7) this.spawnEnemy('hound');
          else this.spawnEnemy('archer');
        }
      }

      // Update Projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
        pr.life -= dt;

        let remove = pr.life <= 0;

        if (pr.kind === 'vial' && remove) {
          this.spawnPoisonPool(pr.x, pr.y, pr.damage);
        }

        if (!remove) {
          for (let j = 0; j < this.enemies.length; j++) {
            const en = this.enemies[j];
            if (en.hp <= 0) continue;
            if (Math.hypot(en.x - pr.x, en.y - pr.y) < en.radius + pr.radius) {
              this.damageEnemy(en, pr.damage, pr.crit, pr.vx * 0.14, pr.vy * 0.14);
              if (pr.kind === 'vial') {
                this.spawnPoisonPool(pr.x, pr.y, pr.damage);
                remove = true;
                break;
              } else if (pr.pierce > 0) {
                pr.pierce -= 1;
              } else {
                remove = true;
                break;
              }
            }
          }
        }

        if (remove) this.projectiles.splice(i, 1);
      }

      // Update Poison Pools
      for (let i = this.poisonPools.length - 1; i >= 0; i--) {
        const pool = this.poisonPools[i];
        pool.life -= dt;
        pool.tickTimer -= dt;
        if (pool.tickTimer <= 0) {
          pool.tickTimer = 0.38;
          this.enemies.forEach((en) => {
            if (en.hp > 0 && Math.hypot(en.x - pool.x, en.y - pool.y) <= pool.radius + en.radius) {
              this.damageEnemy(en, pool.damage, false, 0, 0);
            }
          });
        }
        if (pool.life <= 0) this.poisonPools.splice(i, 1);
      }

      // Update Enemy Projectiles
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = this.enemyProjectiles[i];
        ep.x += ep.vx * dt;
        ep.y += ep.vy * dt;
        ep.life -= dt;
        if (Math.hypot(ep.x - p.x, ep.y - p.y) < p.radius + ep.radius) {
          this.damagePlayer(ep.damage);
          this.enemyProjectiles.splice(i, 1);
          continue;
        }
        if (ep.life <= 0) this.enemyProjectiles.splice(i, 1);
      }

      // Update Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const en = this.enemies[i];
        if (en.hp <= 0) {
          this.enemies.splice(i, 1);
          continue;
        }
        if (en.hitFlash > 0) en.hitFlash -= dt;
        if (en.orbitCooldown > 0) en.orbitCooldown -= dt;

        const dx = p.x - en.x;
        const dy = p.y - en.y;
        const dist = Math.hypot(dx, dy) || 1;
        en.facingLeft = dx < 0;

        if (en.type === 'archer') {
          if (dist > 225) {
            en.x += (dx / dist) * en.speed * dt;
            en.y += (dy / dist) * en.speed * dt;
          } else if (dist < 140) {
            en.x -= (dx / dist) * en.speed * 0.65 * dt;
            en.y -= (dy / dist) * en.speed * 0.65 * dt;
          }
          en.shootTimer -= dt;
          if (en.shootTimer <= 0 && dist < 380) {
            en.shootTimer = 2.1;
            const spd = 270;
            this.enemyProjectiles.push({
              x: en.x, y: en.y,
              vx: (dx / dist) * spd,
              vy: (dy / dist) * spd,
              damage: en.damage,
              radius: 5,
              color: '#00F5D4',
              life: 2.0
            });
            if (global.SODAudio) global.SODAudio.playBullet();
          }
        } else if (en.type === 'boss') {
          en.x += (dx / dist) * en.speed * dt;
          en.y += (dy / dist) * en.speed * dt;
          en.shootTimer -= dt;
          if (en.shootTimer <= 0) {
            en.shootTimer = 2.4;
            const bolts = 8;
            const baseA = Math.atan2(dy, dx);
            for (let b = 0; b < bolts; b++) {
              const a = baseA + (b * Math.PI * 2) / bolts;
              this.enemyProjectiles.push({
                x: en.x, y: en.y,
                vx: Math.cos(a) * 235,
                vy: Math.sin(a) * 235,
                damage: 16,
                radius: 7,
                color: '#E63946',
                life: 2.6
              });
            }
            if (global.SODAudio) global.SODAudio.playBullet();
          }
        } else {
          en.x += (dx / dist) * en.speed * dt;
          en.y += (dy / dist) * en.speed * dt;
        }

        // Apply knockback decay
        en.x += en.knockX * dt;
        en.y += en.knockY * dt;
        en.knockX *= 0.84;
        en.knockY *= 0.84;

        en.x = Math.max(24, Math.min(WORLD_W - 24, en.x));
        en.y = Math.max(24, Math.min(WORLD_H - 24, en.y));

        // Contact damage
        if (dist < en.radius + p.radius - 2) {
          this.damagePlayer(en.damage);
        }
      }

      // Update Drops (Magnet Pickup)
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        const dx = p.x - d.x;
        const dy = p.y - d.y;
        const dist = Math.hypot(dx, dy);

        if (dist < p.pickupRadius) {
          const pull = 360 * dt;
          d.x += (dx / (dist || 1)) * pull;
          d.y += (dy / (dist || 1)) * pull;
        }

        if (dist < p.radius + 10) {
          if (d.kind === 'xp') {
            p.xp += d.value;
            if (global.SODAudio) global.SODAudio.playXP();
            if (p.xp >= p.xpNext) {
              this.drops.splice(i, 1);
              this.triggerLevelUp();
              return;
            }
          } else {
            p.gold += d.value;
            if (global.SODAudio) global.SODAudio.playCoin();
          }
          this.drops.splice(i, 1);
        }
      }

      // Update Visual Effects
      for (let i = this.slashArcs.length - 1; i >= 0; i--) {
        this.slashArcs[i].life -= dt;
        if (this.slashArcs[i].life <= 0) this.slashArcs.splice(i, 1);
      }
      for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
        this.lightningArcs[i].life -= dt;
        if (this.lightningArcs[i].life <= 0) this.lightningArcs.splice(i, 1);
      }
      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].life -= dt;
        if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 28 * dt;
        ft.life -= dt;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }

      this.updateHUD();
    }

    updateHUD() {
      const p = this.player;
      if (this.elHpBar) this.elHpBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
      if (this.elHpText) this.elHpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
      if (this.elXpBar) this.elXpBar.style.width = `${Math.min(100, (p.xp / p.xpNext) * 100)}%`;
      if (this.elXpText) this.elXpText.textContent = `${p.xp} / ${p.xpNext}`;
      if (this.elLevel) this.elLevel.textContent = `LVL ${p.level}`;
      if (this.elGold) this.elGold.textContent = `${p.gold}G`;
      if (this.elCombo) this.elCombo.textContent = `${this.combo}x COMBO`;

      const mins = Math.floor(this.timeRemaining / 60);
      const secs = Math.floor(this.timeRemaining % 60);
      if (this.elTimer) {
        this.elTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      if (this.elWaveLabel) {
        if (this.bossSpawned) this.elWaveLabel.textContent = 'BOSS WAVE';
        else if (this.elapsed > 60) this.elWaveLabel.textContent = 'WAVE 3 • HORDE';
        else if (this.elapsed > 28) this.elWaveLabel.textContent = 'WAVE 2 • HUNTERS';
        else this.elWaveLabel.textContent = 'WAVE 1 • UNDEAD';
      }
    }

    drawIdleBackdrop() {
      const ctx = this.ctx;
      ctx.fillStyle = '#090B10';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      this.drawArenaFloor(ctx, 0, 0);
      if (global.SODSprites) {
        global.SODSprites.drawSprite(ctx, this.selectedHeroId, VIEW_W / 2, VIEW_H / 2, 4);
      }
    }

    drawArenaFloor(ctx, camX, camY) {
      // Dark stone tile grid
      const tile = 48;
      const startX = -((camX % tile) + tile) % tile;
      const startY = -((camY % tile) + tile) % tile;

      ctx.strokeStyle = 'rgba(43, 49, 71, 0.35)';
      ctx.lineWidth = 1;
      for (let x = startX; x < VIEW_W; x += tile) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, VIEW_H);
        ctx.stroke();
      }
      for (let y = startY; y < VIEW_H; y += tile) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(VIEW_W, y);
        ctx.stroke();
      }

      // Arena boundary wall
      ctx.strokeStyle = '#E63946';
      ctx.lineWidth = 4;
      ctx.strokeRect(-camX + 4, -camY + 4, WORLD_W - 8, WORLD_H - 8);

      // Floor props
      this.props.forEach((pr) => {
        const sx = pr.x - camX;
        const sy = pr.y - camY;
        if (sx < -30 || sx > VIEW_W + 30 || sy < -30 || sy > VIEW_H + 30) return;
        if (pr.kind === 'rune') {
          ctx.strokeStyle = 'rgba(123, 44, 191, 0.22)';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx - 10, sy - 10, 20, 20);
        } else if (pr.kind === 'stone') {
          ctx.fillStyle = 'rgba(30, 34, 51, 0.7)';
          ctx.fillRect(sx - 8, sy - 10, 16, 18);
          ctx.fillStyle = 'rgba(68, 77, 110, 0.5)';
          ctx.fillRect(sx - 6, sy - 8, 12, 3);
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.fillRect(sx - 6, sy, 12, 2);
          ctx.fillRect(sx, sy - 4, 2, 8);
        }
      });
    }

    render() {
      const ctx = this.ctx;
      if (this.state === 'idle') {
        this.drawIdleBackdrop();
        return;
      }

      ctx.save();
      let shakeX = 0;
      let shakeY = 0;
      if (this.shakeTime > 0) {
        shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
        shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      }
      const camX = Math.round(this.camera.x + shakeX);
      const camY = Math.round(this.camera.y + shakeY);

      ctx.fillStyle = '#090B10';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      this.drawArenaFloor(ctx, camX, camY);

      // Poison Pools
      this.poisonPools.forEach((pool) => {
        const sx = pool.x - camX;
        const sy = pool.y - camY;
        const alpha = Math.min(0.45, (pool.life / pool.maxLife) * 0.55);
        ctx.fillStyle = `rgba(122, 229, 130, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, pool.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(52, 211, 153, ${alpha + 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Drops (XP Gems & Gold Coins)
      this.drops.forEach((d) => {
        const sx = d.x - camX;
        const sy = d.y - camY;
        if (d.kind === 'xp') {
          ctx.fillStyle = '#00F5D4';
          ctx.fillRect(sx - 4, sy - 6, 8, 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx - 2, sy - 3, 3, 3);
        } else {
          ctx.fillStyle = '#FFB703';
          ctx.fillRect(sx - 5, sy - 5, 10, 10);
          ctx.fillStyle = '#FFF3B0';
          ctx.fillRect(sx - 2, sy - 2, 4, 4);
        }
      });

      // Dash Afterimages
      this.afterimages.forEach((img) => {
        if (global.SODSprites) {
          global.SODSprites.drawSprite(ctx, img.heroId, img.x - camX, img.y - camY, 2.5, {
            flipX: img.facingLeft,
            alpha: img.life * 2
          });
        }
      });

      // Enemies
      let activeBoss = null;
      this.enemies.forEach((en) => {
        const sx = en.x - camX;
        const sy = en.y - camY;
        const scale = en.type === 'boss' ? 4.2 : 2.5;
        if (en.type === 'boss') activeBoss = en;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(sx - en.radius * 0.8, sy + en.radius * 0.65, en.radius * 1.6, 6);

        if (global.SODSprites) {
          global.SODSprites.drawSprite(ctx, en.type, sx, sy, scale, {
            flipX: en.facingLeft,
            flashWhite: en.hitFlash > 0
          });
        }

        // Mini HP bar if damaged (non-boss)
        if (en.type !== 'boss' && en.hp < en.maxHp) {
          const bw = 28;
          ctx.fillStyle = '#090B10';
          ctx.fillRect(sx - bw / 2, sy - en.radius - 10, bw, 5);
          ctx.fillStyle = '#E63946';
          ctx.fillRect(sx - bw / 2 + 1, sy - en.radius - 9, (bw - 2) * (en.hp / en.maxHp), 3);
        }
      });

      // Player
      const p = this.player;
      const px = p.x - camX;
      const py = p.y - camY;

      // Subtle pickup radius ring
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, p.pickupRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Player shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(px - 14, py + 14, 28, 6);

      if (global.SODSprites) {
        global.SODSprites.drawSprite(ctx, p.heroId, px, py, 2.75, {
          flipX: p.facingLeft,
          flashWhite: p.hitFlash > 0,
          alpha: p.invulnTimer > 0 && Math.floor(this.elapsed * 20) % 2 === 0 ? 0.55 : 1
        });
      }

      // Dash Cooldown pip under player
      if (p.dashCooldown > 0) {
        const pct = 1 - p.dashCooldown / p.dashCooldownMax;
        ctx.fillStyle = '#0B0C10';
        ctx.fillRect(px - 16, py + 23, 32, 4);
        ctx.fillStyle = '#00F5D4';
        ctx.fillRect(px - 16, py + 23, 32 * pct, 4);
      }

      // Orbiting Spectral Daggers
      if (p.orbitBlades > 0) {
        for (let b = 0; b < p.orbitBlades; b++) {
          const a = p.orbitAngle + (b * Math.PI * 2) / p.orbitBlades;
          const bx = px + Math.cos(a) * 54;
          const by = py + Math.sin(a) * 54;
          ctx.fillStyle = '#9D4EDD';
          ctx.fillRect(bx - 5, by - 5, 10, 10);
          ctx.fillStyle = '#00F5D4';
          ctx.fillRect(bx - 2, by - 2, 4, 4);
        }
      }

      // Sword Slash Arcs
      this.slashArcs.forEach((arc) => {
        const sx = arc.x - camX;
        const sy = arc.y - camY;
        const alpha = arc.life / arc.maxLife;
        ctx.save();
        ctx.strokeStyle = arc.color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(sx, sy, arc.radius - 8, arc.angle - arc.arcHalf, arc.angle + arc.arcHalf);
        ctx.stroke();
        ctx.restore();
      });

      // Chain Lightning Arcs
      this.lightningArcs.forEach((bolt) => {
        ctx.save();
        ctx.globalAlpha = bolt.life / bolt.maxLife;
        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        bolt.points.forEach((pt, idx) => {
          const jx = pt.x - camX + (idx > 0 ? (Math.random() - 0.5) * 10 : 0);
          const jy = pt.y - camY + (idx > 0 ? (Math.random() - 0.5) * 10 : 0);
          if (idx === 0) ctx.moveTo(jx, jy);
          else ctx.lineTo(jx, jy);
        });
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });

      // Player Projectiles
      this.projectiles.forEach((pr) => {
        const sx = pr.x - camX;
        const sy = pr.y - camY;
        if (pr.kind === 'kunai') {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(pr.angle);
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(-8, -2, 16, 4);
          ctx.fillStyle = '#00F5D4';
          ctx.fillRect(-10, -2, 4, 4);
          ctx.restore();
        } else if (pr.kind === 'vial') {
          ctx.fillStyle = '#7AE582';
          ctx.fillRect(sx - 5, sy - 5, 10, 10);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx - 2, sy - 7, 4, 3);
        }
      });

      // Enemy Projectiles
      this.enemyProjectiles.forEach((ep) => {
        const sx = ep.x - camX;
        const sy = ep.y - camY;
        ctx.fillStyle = ep.color;
        ctx.fillRect(sx - ep.radius, sy - ep.radius, ep.radius * 2, ep.radius * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      });

      // Particles
      this.particles.forEach((pt) => {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - camX, pt.y - camY, pt.size, pt.size);
      });

      // Floating Damage Numbers
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      this.floatingTexts.forEach((ft) => {
        ctx.fillStyle = '#000000';
        ctx.fillText(ft.text, ft.x - camX + 1, ft.y - camY + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x - camX, ft.y - camY);
      });

      // Stage Boss Top Health Bar
      if (activeBoss) {
        const bw = 420;
        const bx = (VIEW_W - bw) / 2;
        const by = 16;
        ctx.fillStyle = 'rgba(11, 12, 16, 0.9)';
        ctx.fillRect(bx - 6, by - 4, bw + 12, 34);
        ctx.strokeStyle = '#E63946';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 6, by - 4, bw + 12, 34);

        ctx.fillStyle = '#FFB703';
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(activeBoss.name, VIEW_W / 2, by + 9);

        ctx.fillStyle = '#1E1B29';
        ctx.fillRect(bx, by + 15, bw, 10);
        ctx.fillStyle = '#E63946';
        ctx.fillRect(bx, by + 15, bw * Math.max(0, activeBoss.hp / activeBoss.maxHp), 10);
      }

      // Boss Arrival Banner
      if (this.bossBannerTimer > 0) {
        ctx.fillStyle = 'rgba(230, 57, 70, 0.85)';
        ctx.fillRect(0, VIEW_H / 2 - 28, VIEW_W, 56);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '15px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WARNING: STAGE BOSS APPROACHING!', VIEW_W / 2, VIEW_H / 2 + 6);
      }

      // Mini-Radar Overlay (Toggle with M)
      if (this.radarOpen) {
        const rw = 144;
        const rh = 94;
        const rx = VIEW_W - rw - 14;
        const ry = 14;
        ctx.fillStyle = 'rgba(11, 12, 16, 0.84)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);

        // Enemies on radar
        this.enemies.forEach((en) => {
          const ex = rx + (en.x / WORLD_W) * rw;
          const ey = ry + (en.y / WORLD_H) * rh;
          ctx.fillStyle = en.type === 'boss' ? '#FFB703' : '#E63946';
          const sz = en.type === 'boss' ? 6 : 3;
          ctx.fillRect(ex - sz / 2, ey - sz / 2, sz, sz);
        });

        // Player on radar
        const rpx = rx + (p.x / WORLD_W) * rw;
        const rpy = ry + (p.y / WORLD_H) * rh;
        ctx.fillStyle = '#00F5D4';
        ctx.fillRect(rpx - 3, rpy - 3, 6, 6);

        ctx.fillStyle = '#00F5D4';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('RADAR [M]', rx + 6, ry + rh - 6);
      }

      // Aim Reticle
      ctx.strokeStyle = '#00F5D4';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.mouse.x - 7, this.mouse.y - 7, 14, 14);
      ctx.fillStyle = '#E63946';
      ctx.fillRect(this.mouse.x - 1, this.mouse.y - 1, 2, 2);

      ctx.restore();
    }

    loop(now) {
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      this.update(dt);
      this.render();
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  global.SODDemo = null;
  window.addEventListener('DOMContentLoaded', () => {
    global.SODDemo = new SurvivalDemo();
  });
})(window);
