/* ==========================================================================
   STRIKE OF DESTINY — Interactive UI, Background FX, Trailer Theater,
   Blacksmith Simulator, Bestiary, Trophies, Controls & Soundboard
   ========================================================================== */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------------------
     1. SHARED SITE STATE (Blacksmith, Bestiary Counts, Village Trophies)
     ------------------------------------------------------------------------ */
  const BLACKSMITH_ITEMS = [
    {
      id: 'vitality',
      name: "Blacksmith's Vitality",
      desc: 'Reinforce your armor for +20 Max Health per rank.',
      baseCost: 120,
      stepCost: 90,
      maxLevel: 5,
      bonusLabel: (lvl) => `+${lvl * 20} Max HP`
    },
    {
      id: 'boots',
      name: 'Windrunner Boots',
      desc: 'Forged featherweight greaves granting +6% Movement Speed per rank.',
      baseCost: 140,
      stepCost: 100,
      maxLevel: 5,
      bonusLabel: (lvl) => `+${lvl * 6}% Speed`
    },
    {
      id: 'steel',
      name: 'Sharpened Steel',
      desc: 'Temper all hero weapons for +10% Overall Damage per rank.',
      baseCost: 150,
      stepCost: 110,
      maxLevel: 5,
      bonusLabel: (lvl) => `+${lvl * 10}% Damage`
    },
    {
      id: 'magnetite',
      name: 'Magnetite Relic',
      desc: 'Arcane lodestone granting +18% Pickup Radius for XP gems & gold.',
      baseCost: 110,
      stepCost: 85,
      maxLevel: 5,
      bonusLabel: (lvl) => `+${lvl * 18}% Pickup Radius`
    },
    {
      id: 'greed',
      name: 'Greed Goblet',
      desc: 'Cursed chalice increasing Gold Drops by +20% per rank.',
      baseCost: 130,
      stepCost: 95,
      maxLevel: 5,
      bonusLabel: (lvl) => `+${lvl * 20}% Gold Drops`
    }
  ];

  const DEFAULT_STATE = {
    gold: 1200,
    blacksmith: { vitality: 0, boots: 0, steel: 0, magnetite: 0, greed: 0 },
    defeated: { zombie: 142, hound: 68, archer: 51, boss: 3 },
    trophies: {
      firstBlood: true,
      bossSlayer: false,
      masterAlchemist: false,
      untouchable: false,
      hoarder: false
    }
  };

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem('sod_showcase_state_v1');
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);
      return {
        gold: typeof parsed.gold === 'number' ? parsed.gold : DEFAULT_STATE.gold,
        blacksmith: { ...DEFAULT_STATE.blacksmith, ...(parsed.blacksmith || {}) },
        defeated: { ...DEFAULT_STATE.defeated, ...(parsed.defeated || {}) },
        trophies: { ...DEFAULT_STATE.trophies, ...(parsed.trophies || {}) }
      };
    } catch (_) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function saveState() {
    try {
      localStorage.setItem('sod_showcase_state_v1', JSON.stringify(state));
    } catch (_) {}
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('sod-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  global.SODState = {
    getBlacksmithBonuses() {
      return {
        maxHp: state.blacksmith.vitality * 20,
        speedPct: state.blacksmith.boots * 0.06,
        dmgPct: state.blacksmith.steel * 0.10,
        pickupPct: state.blacksmith.magnetite * 0.18,
        goldPct: state.blacksmith.greed * 0.20
      };
    },
    addGold(amount) {
      state.gold += amount;
      saveState();
      renderBlacksmith();
    },
    recordKill(enemyType) {
      if (state.defeated[enemyType] !== undefined) {
        state.defeated[enemyType] += 1;
        saveState();
        updateBestiaryCounts();
      }
    },
    unlockTrophy(id) {
      if (state.trophies[id] === false) {
        state.trophies[id] = true;
        saveState();
        renderTrophies();
        showToast(`TROPHY UNLOCKED: ${TROPHY_META[id]?.name || id}!`);
      }
    }
  };

  /* ------------------------------------------------------------------------
     2. BACKGROUND FLOATING EMBERS & XP-GEM PARTICLES
     ------------------------------------------------------------------------ */
  function initBackgroundParticles() {
    const canvas = document.getElementById('bg-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    const count = 48;
    for (let i = 0; i < count; i++) {
      const kind = i % 4 === 0 ? 'xp' : (i % 4 === 1 ? 'gold' : 'ember');
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: -(12 + Math.random() * 24),
        vx: (Math.random() - 0.5) * 14,
        size: kind === 'xp' ? 5 : 3 + Math.floor(Math.random() * 2),
        alpha: 0.25 + Math.random() * 0.5,
        kind,
        phase: Math.random() * Math.PI * 2
      });
    }

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.phase += dt * 1.8;
        p.x += (p.vx + Math.sin(p.phase) * 8) * dt;
        p.y += p.vy * dt;
        if (p.y < -12) {
          p.y = h + 12;
          p.x = Math.random() * w;
        }
        if (p.x < -12) p.x = w + 12;
        if (p.x > w + 12) p.x = -12;

        ctx.save();
        ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(p.phase * 2));
        if (p.kind === 'xp') {
          ctx.fillStyle = '#00F5D4';
          ctx.fillRect(p.x - 2, p.y - 4, 4, 8);
          ctx.fillRect(p.x - 4, p.y - 2, 8, 4);
        } else if (p.kind === 'gold') {
          ctx.fillStyle = '#FFB703';
          ctx.fillRect(p.x, p.y, p.size, p.size);
        } else {
          ctx.fillStyle = '#E63946';
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.restore();
      });

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------------
     3. HERO PARALLAX & LIVE PIXEL DIORAMA
     ------------------------------------------------------------------------ */
  function initHeroVisuals() {
    const moon = document.querySelector('.hero-moon');
    const mountains = document.querySelector('.hero-mountains');

    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > 900) return;
      if (moon) moon.style.transform = `translate3d(0, ${y * 0.16}px, 0)`;
      if (mountains) mountains.style.transform = `translate3d(0, ${y * 0.08}px, 0)`;
    }, { passive: true });

    const canvas = document.getElementById('hero-diorama');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 300;
    ctx.imageSmoothingEnabled = false;

    const heroes = ['kaito', 'gareth', 'vex', 'zephyr'];
    let t = 0;

    function drawDiorama() {
      t += 0.025;
      ctx.fillStyle = '#0A0C13';
      ctx.fillRect(0, 0, 400, 300);

      // Crimson moon glow
      const grad = ctx.createRadialGradient(310, 62, 10, 310, 62, 95);
      grad.addColorStop(0, 'rgba(230, 57, 70, 0.55)');
      grad.addColorStop(1, 'rgba(10, 12, 19, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 300);

      // Stone floor grid
      ctx.strokeStyle = 'rgba(43, 49, 71, 0.45)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 400; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 120);
        ctx.lineTo(x, 300);
        ctx.stroke();
      }
      for (let y = 120; y < 300; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(400, y);
        ctx.stroke();
      }

      // Draw Heroes on left/center
      if (global.SODSprites) {
        const heroIdx = Math.floor(t / 2.2) % heroes.length;
        const activeHero = heroes[heroIdx];
        const bob = Math.sin(t * 4) * 3;

        // Subtle arcane circle under hero
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(126, 206, 36, 12, 0, 0, Math.PI * 2);
        ctx.stroke();

        global.SODSprites.drawSprite(ctx, activeHero, 126, 178 + bob, 3.5);

        // Animated attack beam/projectile toward enemies
        const prog = (t * 1.4) % 1;
        const px = 152 + prog * 120;
        ctx.fillStyle = activeHero === 'vex' ? '#7AE582' : (activeHero === 'gareth' ? '#FFB703' : '#00F5D4');
        ctx.fillRect(px - 8, 176, 16, 4);

        // Undead wave on right
        global.SODSprites.drawSprite(ctx, 'zombie', 278, 164 - bob * 0.7, 3, { flipX: true });
        global.SODSprites.drawSprite(ctx, 'hound', 252, 224 + bob * 0.6, 2.8, { flipX: true });
        global.SODSprites.drawSprite(ctx, 'archer', 332, 198, 3, { flipX: true });

        // Floating XP gems
        ctx.fillStyle = '#00F5D4';
        ctx.fillRect(212, 238 + Math.sin(t * 5) * 4, 6, 8);
        ctx.fillStyle = '#FFB703';
        ctx.fillRect(194, 248 + Math.cos(t * 5) * 4, 7, 7);

        // Label badge
        ctx.fillStyle = 'rgba(11, 12, 16, 0.85)';
        ctx.fillRect(12, 12, 186, 26);
        ctx.strokeStyle = '#2B3147';
        ctx.strokeRect(12, 12, 186, 26);
        ctx.fillStyle = '#FFB703';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText(`HERO: ${activeHero.toUpperCase()}`, 22, 29);
      }

      requestAnimationFrame(drawDiorama);
    }
    requestAnimationFrame(drawDiorama);
  }

  /* ------------------------------------------------------------------------
     4. OFFICIAL TRAILER THEATER (Animated 4-Chapter Pixel Preview Player)
     ------------------------------------------------------------------------ */
  function initTrailerTheater() {
    const canvas = document.getElementById('trailer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 360;
    ctx.imageSmoothingEnabled = false;

    const overlay = document.getElementById('trailer-overlay');
    const bigPlay = document.getElementById('trailer-big-play');
    const btnPlay = document.getElementById('trailer-play-btn');
    const btnMute = document.getElementById('trailer-mute-btn');
    const progWrap = document.getElementById('trailer-progress-wrap');
    const progFill = document.getElementById('trailer-progress-fill');
    const timeEl = document.getElementById('trailer-time');
    const thumbs = document.querySelectorAll('.trailer-thumb');

    const TOTAL_DURATION = 48; // 00:48 showcase reel (12s per chapter)
    let playing = false;
    let currentTime = 0;
    let muted = false;

    const CHAPTERS = [
      { title: 'WAVE SURVIVAL', sub: 'Outmaneuver relentless undead hordes across cursed ruins', start: 0 },
      { title: 'LEVEL-UP CHOICES', sub: 'Draft randomized Weapons, Stat Boosts & Relic Trinkets', start: 12 },
      { title: 'BOSS ENCOUNTERS', sub: 'Confront Dread Lord Malakor as the countdown peaks', start: 24 },
      { title: 'VILLAGE TROPHIES', sub: 'Forge permanent Blacksmith upgrades & unlock badges', start: 36 }
    ];

    function setPlaying(val) {
      playing = val;
      if (overlay) overlay.classList.toggle('hidden', playing);
      if (btnPlay) btnPlay.textContent = playing ? 'PAUSE' : 'PLAY';
      if (playing && !muted && global.SODAudio) {
        global.SODAudio.playUpgrade();
      }
    }

    if (bigPlay) bigPlay.addEventListener('click', () => setPlaying(true));
    if (btnPlay) btnPlay.addEventListener('click', () => setPlaying(!playing));
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        muted = !muted;
        btnMute.textContent = muted ? 'AUDIO: OFF' : 'AUDIO: ON';
      });
    }

    if (progWrap) {
      progWrap.addEventListener('click', (e) => {
        const rect = progWrap.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        currentTime = pct * TOTAL_DURATION;
        updateTrailerUI();
      });
    }

    thumbs.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        currentTime = CHAPTERS[idx].start;
        setPlaying(true);
        updateTrailerUI();
      });
    });

    // Render mini static previews on the 4 thumbnail canvases
    document.querySelectorAll('canvas[data-thumb-scene]').forEach((tc) => {
      const scene = parseInt(tc.getAttribute('data-thumb-scene'), 10);
      tc.width = 160;
      tc.height = 90;
      const tctx = tc.getContext('2d');
      tctx.imageSmoothingEnabled = false;
      drawSceneFrame(tctx, 160, 90, scene, 1.8, true);
    });

    function updateTrailerUI() {
      const pct = (currentTime / TOTAL_DURATION) * 100;
      if (progFill) progFill.style.width = `${pct}%`;
      const curS = Math.floor(currentTime);
      if (timeEl) {
        timeEl.textContent = `00:${String(curS).padStart(2, '0')} / 00:${TOTAL_DURATION}`;
      }
      const activeIdx = Math.min(3, Math.floor(currentTime / 12));
      thumbs.forEach((b, i) => b.classList.toggle('active', i === activeIdx));
    }

    function drawSceneFrame(c, W, H, chapterIdx, t, compact) {
      c.fillStyle = '#090B11';
      c.fillRect(0, 0, W, H);

      // Subtle arena tiles
      c.strokeStyle = 'rgba(43, 49, 71, 0.35)';
      c.lineWidth = 1;
      const step = compact ? 16 : 36;
      for (let x = 0; x < W; x += step) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      }
      for (let y = 0; y < H; y += step) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      }

      const s = compact ? 1.3 : 3.4;

      if (chapterIdx === 0 && global.SODSprites) {
        // Wave Survival
        const hx = W * 0.3 + Math.sin(t * 2) * (compact ? 8 : 26);
        const hy = H * 0.55 + Math.cos(t * 2.5) * (compact ? 4 : 16);
        global.SODSprites.drawSprite(c, 'kaito', hx, hy, s);
        for (let i = 0; i < 4; i++) {
          const ex = W * (0.62 + i * 0.08) - ((t * 14) % (compact ? 18 : 60));
          const ey = H * (0.3 + i * 0.16);
          global.SODSprites.drawSprite(c, i % 2 === 0 ? 'zombie' : 'hound', ex, ey, s * 0.9, { flipX: true });
        }
        // Kunai streaks
        c.fillStyle = '#00F5D4';
        c.fillRect(hx + (compact ? 14 : 42), hy - 2, compact ? 14 : 38, compact ? 2 : 4);
      } else if (chapterIdx === 1) {
        // Level-Up Choices
        const cardW = W * 0.24;
        const cardH = H * 0.52;
        const colors = ['#E63946', '#00F5D4', '#9D4EDD'];
        for (let i = 0; i < 3; i++) {
          const cx = W * (0.12 + i * 0.27);
          const cy = H * 0.26 + Math.sin(t * 3 + i) * (compact ? 2 : 6);
          c.fillStyle = '#141826';
          c.fillRect(cx, cy, cardW, cardH);
          c.strokeStyle = colors[i];
          c.lineWidth = compact ? 1 : 2;
          c.strokeRect(cx, cy, cardW, cardH);
          c.fillStyle = colors[i];
          c.fillRect(cx + 6, cy + 8, cardW - 12, compact ? 4 : 10);
        }
      } else if (chapterIdx === 2 && global.SODSprites) {
        // Boss Encounters
        global.SODSprites.drawSprite(c, 'gareth', W * 0.26, H * 0.56, s);
        global.SODSprites.drawSprite(c, 'boss', W * 0.7, H * 0.52 + Math.sin(t * 3) * (compact ? 3 : 8), s * 1.45, { flipX: true });
        // Boss radial orbs
        c.fillStyle = '#E63946';
        for (let a = 0; a < 6; a++) {
          const ang = t * 1.6 + (a * Math.PI * 2) / 6;
          const r = compact ? 24 : 74;
          c.fillRect(W * 0.7 + Math.cos(ang) * r, H * 0.52 + Math.sin(ang) * r, compact ? 3 : 7, compact ? 3 : 7);
        }
      } else if (global.SODSprites) {
        // Village Trophies
        const keys = ['trophyFirstBlood', 'trophyBossSlayer', 'trophyAlchemist', 'trophyUntouchable', 'trophyHoarder'];
        keys.forEach((k, i) => {
          const tx = W * (0.16 + i * 0.17);
          const ty = H * 0.52 + Math.sin(t * 3 + i) * (compact ? 2 : 7);
          global.SODSprites.drawSprite(c, k, tx, ty, s * 0.9);
        });
      }

      if (!compact) {
        const ch = CHAPTERS[chapterIdx];
        c.fillStyle = 'rgba(11, 12, 16, 0.82)';
        c.fillRect(0, H - 64, W, 64);
        c.fillStyle = '#FFB703';
        c.font = '12px "Press Start 2P", monospace';
        c.fillText(`CHAPTER 0${chapterIdx + 1}: ${ch.title}`, 22, H - 36);
        c.fillStyle = '#A0AABF';
        c.font = '13px "Space Grotesk", sans-serif';
        c.fillText(ch.sub, 22, H - 14);
      }
    }

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing) {
        currentTime += dt;
        if (currentTime >= TOTAL_DURATION) currentTime = 0;
        updateTrailerUI();
      }
      const activeIdx = Math.min(3, Math.floor(currentTime / 12));
      drawSceneFrame(ctx, 640, 360, activeIdx, now / 1000, false);
      requestAnimationFrame(loop);
    }
    updateTrailerUI();
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------------
     5. 10-STEP CORE GAMEPLAY LOOP TIMELINE
     ------------------------------------------------------------------------ */
  const LOOP_STEPS_DATA = [
    { num: '01', name: 'Select Hero', desc: 'Choose Kaito, Sir Gareth, Doctor Vex, or Zephyr—each bringing a unique primary weapon, stat spread, and tactical role.' },
    { num: '02', name: 'Start Standard Campaign', desc: 'Enter the cursed gothic arena in single-player survival mode with your Blacksmith meta-upgrades active.' },
    { num: '03', name: 'Fight Undead Waves', desc: 'Fend off escalating waves of Horde Zombies, Rabid Hunting Hounds, and ranged Skeleton Archers using WASD, Mouse, and Dodge.' },
    { num: '04', name: 'Collect Gold & XP', desc: 'Slain enemies drop shimmering XP Gems and Gold Coins pulled into your hero by your Magnetite pickup radius.' },
    { num: '05', name: 'Level Up', desc: 'Fill the arcane XP bar to pause the chaos and unlock a pivotal power spike mid-run.' },
    { num: '06', name: 'Choose Weapons / Stats / Relics', desc: 'Draft 1 of 3 randomized upgrades: new weapon evolutions, attribute boosts, or cooldown-reducing Relic Trinkets.' },
    { num: '07', name: 'Survive Stronger Waves', desc: 'Adapt your build as enemy density, speed, and ranged pressure surge toward the climax of the stage.' },
    { num: '08', name: 'Defeat Stage Boss', desc: 'Endure the Stage Boss assault, dodge lethal bullet patterns, and claim massive gold bounties and Village Trophies.' },
    { num: '09', name: 'Upgrade at Blacksmith', desc: 'Return to the Village Blacksmith to spend banked Gold on 5 permanent stat-forging upgrades.' },
    { num: '10', name: 'Start Stronger Run', desc: 'Redeploy with permanently enhanced vitality, speed, steel, and greed—or challenge the secret stage!' }
  ];

  function initLoopTimeline() {
    const container = document.getElementById('loop-steps');
    const titleEl = document.getElementById('loop-detail-title');
    const descEl = document.getElementById('loop-detail-desc');
    if (!container) return;

    function selectStep(idx) {
      const item = LOOP_STEPS_DATA[idx];
      if (titleEl) titleEl.textContent = `STEP ${item.num} — ${item.name.toUpperCase()}`;
      if (descEl) descEl.textContent = item.desc;
      container.querySelectorAll('.loop-step').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
      });
    }

    container.innerHTML = '';
    LOOP_STEPS_DATA.forEach((step, idx) => {
      const btn = document.createElement('button');
      btn.className = 'loop-step';
      btn.innerHTML = `
        <div class="loop-num">STEP ${step.num}</div>
        <div class="loop-name">${step.name}</div>
      `;
      btn.addEventListener('click', () => {
        selectStep(idx);
        if (global.SODAudio) global.SODAudio.playXP();
      });
      container.appendChild(btn);
    });
    selectStep(0);
  }

  /* ------------------------------------------------------------------------
     6. LEVEL-UP UPGRADE PREVIEWER TABS
     ------------------------------------------------------------------------ */
  const UPGRADE_TABS_DATA = {
    weapons: [
      { icon: '⚔', color: '#E63946', name: 'Twin Strike Evolution', desc: 'Adds extra kunais, widens Paladin sword arcs, throws dual poison vials, or chains additional Storm bolts.', badge: '+1 PROJECTILE / CHAIN' },
      { icon: '✦', color: '#9D4EDD', name: 'Spectral Daggers', desc: 'Summons orbiting dark-energy blades that shred melee hordes closing in around your hero.', badge: 'AUTO-ORBIT AOE' },
      { icon: '🔥', color: '#FFB703', name: 'Bloodforged Edge', desc: 'Infuses primary attacks with crimson steel for devastating critical hits against Stage Bosses.', badge: '+25% WEAPON DMG' }
    ],
    stats: [
      { icon: '🧲', color: '#00F5D4', name: 'Magnetite Aura', desc: 'Dramatically expands XP Gem & Gold Coin attraction radius so you scoop loot while kiting.', badge: '+45% PICKUP RADIUS' },
      { icon: '❤', color: '#E63946', name: 'Vitality Flask', desc: 'Bolsters maximum health pool and immediately restores lost HP in the heat of combat.', badge: '+35 MAX HP & HEAL' },
      { icon: '⚡', color: '#FFB703', name: 'Windrunner Stride', desc: 'Boosts base movement speed for tighter dodging around Rabid Hounds and Skeleton Arrows.', badge: '+16% MOVE SPEED' }
    ],
    relics: [
      { icon: '⏳', color: '#9D4EDD', name: 'Chrono Hourglass', desc: 'Ancient arcane trinket that accelerates attack cadence and refreshes your Spacebar dodge faster.', badge: '-18% COOLDOWN' },
      { icon: '🩸', color: '#E63946', name: 'Crimson Fang Relic', desc: 'Passive lifesteal trinket restoring health every 5 undead slain while raising critical chance.', badge: 'LIFE-ON-KILL + CRIT' },
      { icon: '👑', color: '#FFB703', name: 'Gilded Signet', desc: 'Amplifies both Gold Coin drops for the Village Blacksmith and XP gain for rapid leveling.', badge: '+40% GOLD / +25% XP' }
    ]
  };

  function initUpgradePreviewer() {
    const listEl = document.getElementById('upgrade-preview-list');
    const tabBtns = document.querySelectorAll('.upgrade-tab-btn');
    if (!listEl) return;

    function renderTab(key) {
      const items = UPGRADE_TABS_DATA[key] || UPGRADE_TABS_DATA.weapons;
      listEl.innerHTML = items.map((it) => `
        <div class="upgrade-item">
          <div class="upgrade-icon-box" style="color:${it.color};border-color:${it.color}">${it.icon}</div>
          <div>
            <h4>${it.name}</h4>
            <p>${it.desc}</p>
            <span class="upgrade-stat-badge">${it.badge}</span>
          </div>
        </div>
      `).join('');
      tabBtns.forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === key));
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        renderTab(btn.getAttribute('data-tab'));
        if (global.SODAudio) global.SODAudio.playXP();
      });
    });

    renderTab('weapons');
  }

  /* ------------------------------------------------------------------------
     7. INTERACTIVE VILLAGE BLACKSMITH SIMULATOR
     ------------------------------------------------------------------------ */
  function renderBlacksmith() {
    const walletEl = document.getElementById('bs-gold-amount');
    const listEl = document.getElementById('bs-forge-list');
    const summaryEl = document.getElementById('bs-bonus-summary');
    if (!listEl) return;

    if (walletEl) walletEl.textContent = `${state.gold.toLocaleString()} GOLD`;

    listEl.innerHTML = '';
    BLACKSMITH_ITEMS.forEach((item) => {
      const lvl = state.blacksmith[item.id] || 0;
      const isMax = lvl >= item.maxLevel;
      const cost = item.baseCost + lvl * item.stepCost;
      const canAfford = !isMax && state.gold >= cost;

      const row = document.createElement('div');
      row.className = 'forge-row';

      let pips = '';
      for (let i = 0; i < item.maxLevel; i++) {
        pips += `<span class="forge-pip ${i < lvl ? 'filled' : ''}"></span>`;
      }

      row.innerHTML = `
        <div>
          <div class="forge-name">${item.name} <span style="color:var(--gold);font-size:0.7rem;">(${item.bonusLabel(lvl)})</span></div>
          <div class="forge-desc">${item.desc}</div>
          <div class="forge-pips">${pips}</div>
        </div>
        <button class="btn btn-sm ${isMax ? 'btn-ghost' : 'btn-gold'} forge-buy-btn" ${canAfford ? '' : 'disabled'}>
          ${isMax ? 'MAXED' : `FORGE • ${cost}G`}
        </button>
      `;

      const buyBtn = row.querySelector('.forge-buy-btn');
      if (buyBtn && !isMax) {
        buyBtn.addEventListener('click', () => {
          if (state.gold < cost) return;
          state.gold -= cost;
          state.blacksmith[item.id] = lvl + 1;
          saveState();
          renderBlacksmith();
          if (global.SODAudio) global.SODAudio.playUpgrade();
          showToast(`FORGED ${item.name.toUpperCase()} RANK ${lvl + 1}!`);
        });
      }

      listEl.appendChild(row);
    });

    if (summaryEl) {
      const b = global.SODState.getBlacksmithBonuses();
      summaryEl.innerHTML = `
        <span>DEMO BONUSES ACTIVE:</span>
        <span>+${b.maxHp} HP</span>
        <span>+${Math.round(b.speedPct * 100)}% SPD</span>
        <span>+${Math.round(b.dmgPct * 100)}% DMG</span>
        <span>+${Math.round(b.pickupPct * 100)}% MAGNET</span>
        <span>+${Math.round(b.goldPct * 100)}% GOLD</span>
      `;
    }
  }

  function initBlacksmithControls() {
    const addBtn = document.getElementById('bs-add-gold');
    const resetBtn = document.getElementById('bs-reset');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        state.gold += 500;
        saveState();
        renderBlacksmith();
        if (global.SODAudio) global.SODAudio.playCoin();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.gold = DEFAULT_STATE.gold;
        state.blacksmith = { ...DEFAULT_STATE.blacksmith };
        saveState();
        renderBlacksmith();
        showToast('BLACKSMITH RESET TO 1,200 SAMPLE GOLD');
      });
    }
    renderBlacksmith();
  }

  /* ------------------------------------------------------------------------
     8. BESTIARY FILTER, DEFEATED COUNTERS, SPECIAL LEVEL & VILLAGE TROPHIES
     ------------------------------------------------------------------------ */
  function updateBestiaryCounts() {
    Object.keys(state.defeated).forEach((key) => {
      const el = document.querySelector(`[data-defeated="${key}"]`);
      if (el) el.textContent = state.defeated[key].toLocaleString();
    });
  }

  function initBestiary() {
    updateBestiaryCounts();
    const filterBtns = document.querySelectorAll('.bestiary-filter-btn');
    const cards = document.querySelectorAll('.monster-card');

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        filterBtns.forEach((b) => b.classList.toggle('active', b === btn));
        cards.forEach((card) => {
          const cat = card.getAttribute('data-category');
          card.classList.toggle('hidden', filter !== 'all' && cat !== filter);
        });
      });
    });

    // Special Level Secret Intel Toggle
    const secretBtn = document.getElementById('btn-secret-intel');
    const secretBox = document.getElementById('secret-intel-extra');
    if (secretBtn && secretBox) {
      secretBtn.addEventListener('click', () => {
        const revealed = secretBox.getAttribute('data-revealed') === 'true';
        secretBox.setAttribute('data-revealed', String(!revealed));
        secretBox.innerHTML = !revealed
          ? `
            <div class="special-intel-row"><span>STAGE CODENAME</span><span>RYAN JACOB SOLOMON</span></div>
            <div class="special-intel-row"><span>ENEMY DENSITY</span><span>2.5x NIGHTMARE SURGE</span></div>
            <div class="special-intel-row"><span>GOLD MULTIPLIER</span><span>+150% BONUS BOUNTY</span></div>
            <div class="special-intel-row"><span>UNLOCK CONDITION</span><span>CLEAR STANDARD CAMPAIGN</span></div>
          `
          : `
            <div class="special-intel-row"><span>STAGE CODENAME</span><span>RYAN JACOB SOLOMON</span></div>
            <div class="special-intel-row"><span>THREAT CLASS</span><span>[ REDACTED — EXTREME ]</span></div>
            <div class="special-intel-row"><span>REWARD TIER</span><span>MYTHIC TROPHY & GOLD</span></div>
            <div class="special-intel-row"><span>ACCESS</span><span>POST-CAMPAIGN SECRET</span></div>
          `;
        secretBtn.textContent = !revealed ? 'HIDE SECRET INTEL' : 'DECRYPT STAGE INTEL';
        if (global.SODAudio) global.SODAudio.playShadow();
      });
    }
  }

  const TROPHY_META = {
    firstBlood: {
      name: 'First Blood',
      desc: 'Slay your first undead creature in battle.',
      sprite: 'trophyFirstBlood'
    },
    bossSlayer: {
      name: 'Boss Slayer',
      desc: 'Defeat the Stage Boss before time expires.',
      sprite: 'trophyBossSlayer'
    },
    masterAlchemist: {
      name: 'Master Alchemist',
      desc: 'Eliminate 12+ foes using Doctor Vex.',
      sprite: 'trophyAlchemist'
    },
    untouchable: {
      name: 'Untouchable',
      desc: 'Complete a survival run without taking damage.',
      sprite: 'trophyUntouchable'
    },
    hoarder: {
      name: 'Hoarder',
      desc: 'Collect 100+ Gold Coins in a single run.',
      sprite: 'trophyHoarder'
    }
  };

  let previewAllTrophies = false;

  function renderTrophies() {
    const grid = document.getElementById('trophies-grid');
    if (!grid) return;

    grid.innerHTML = '';
    Object.keys(TROPHY_META).forEach((id) => {
      const meta = TROPHY_META[id];
      const unlocked = previewAllTrophies || Boolean(state.trophies[id]);
      const card = document.createElement('div');
      card.className = `pixel-card trophy-card ${unlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="trophy-badge-icon">
          <canvas data-sprite="${meta.sprite}" data-scale="3"></canvas>
        </div>
        <div class="trophy-name">${meta.name}</div>
        <p class="trophy-desc">${meta.desc}</p>
        <span class="trophy-status">${unlocked ? 'UNLOCKED' : 'LOCKED'}</span>
      `;
      grid.appendChild(card);
    });

    if (global.SODSprites) global.SODSprites.renderStaticSprites();
  }

  function initTrophies() {
    const toggleBtn = document.getElementById('btn-preview-trophies');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        previewAllTrophies = !previewAllTrophies;
        toggleBtn.textContent = previewAllTrophies ? 'SHOW REAL PROGRESS' : 'PREVIEW ALL UNLOCKED';
        renderTrophies();
        if (global.SODAudio) global.SODAudio.playXP();
      });
    }
    renderTrophies();
  }

  /* ------------------------------------------------------------------------
     9. INTERACTIVE KEYBIND DIAGRAM & 9-CATEGORY AUDIO SOUNDBOARD
     ------------------------------------------------------------------------ */
  function initControlsAndSoundboard() {
    const keyEls = document.querySelectorAll('[data-bind-key]');
    const legendEls = document.querySelectorAll('[data-bind-legend]');

    function highlightBind(action) {
      keyEls.forEach((el) => {
        el.classList.toggle('active', el.getAttribute('data-bind-action') === action);
      });
      legendEls.forEach((el) => {
        el.classList.toggle('active', el.getAttribute('data-bind-legend') === action);
      });
    }

    keyEls.forEach((el) => {
      el.addEventListener('click', () => {
        const action = el.getAttribute('data-bind-action');
        highlightBind(action);
        if (global.SODAudio) {
          if (action === 'attack') global.SODAudio.playKunai();
          else if (action === 'dodge') global.SODAudio.playShadow();
          else global.SODAudio.playXP();
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(k)) highlightBind('move');
      else if (k === ' ') highlightBind('dodge');
      else if (k === 'm') highlightBind('radar');
    });

    // 9-Category Soundboard
    document.querySelectorAll('.sfx-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-sfx');
        if (global.SODAudio) {
          global.SODAudio.setEnabled(true);
          global.SODAudio.playByCategory(cat);
        }
        btn.classList.add('playing');
        setTimeout(() => btn.classList.remove('playing'), 380);
      });
    });
  }

  /* ------------------------------------------------------------------------
     10. NAVIGATION, CRT TOGGLE & HERO CARD PLAY BUTTONS
     ------------------------------------------------------------------------ */
  function initNavigation() {
    const crtBtn = document.getElementById('btn-crt-toggle');
    if (crtBtn) {
      crtBtn.addEventListener('click', () => {
        const active = document.body.classList.toggle('crt-active');
        crtBtn.classList.toggle('active', active);
        crtBtn.textContent = active ? 'CRT: ON' : 'CRT: OFF';
        if (global.SODAudio) global.SODAudio.playXP();
      });
    }

    const mobileBtn = document.getElementById('nav-mobile-toggle');
    const navLinks = document.getElementById('nav-links');
    if (mobileBtn && navLinks) {
      mobileBtn.addEventListener('click', () => {
        navLinks.classList.toggle('open');
      });
      navLinks.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => navLinks.classList.remove('open'));
      });
    }

    // Hero Showcase "Play in Demo" buttons
    document.querySelectorAll('[data-play-hero]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const heroId = btn.getAttribute('data-play-hero');
        if (global.SODDemo) global.SODDemo.selectHero(heroId);
        const demoSection = document.getElementById('demo');
        if (demoSection) demoSection.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ------------------------------------------------------------------------
     BOOTSTRAP
     ------------------------------------------------------------------------ */
  window.addEventListener('DOMContentLoaded', () => {
    if (global.SODSprites) global.SODSprites.renderStaticSprites();
    initNavigation();
    initBackgroundParticles();
    initHeroVisuals();
    initTrailerTheater();
    initLoopTimeline();
    initUpgradePreviewer();
    initBlacksmithControls();
    initBestiary();
    initTrophies();
    initControlsAndSoundboard();
  });
})(window);
