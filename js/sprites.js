/* ==========================================================================
   STRIKE OF DESTINY — Crisp Procedural Pixel-Art Sprite Renderer
   16x16 Sprites for Heroes, Monsters, Boss, and Trophies
   ========================================================================== */

(function (global) {
  'use strict';

  const PALETTES = {
    kaito: {
      '.': null,
      'k': '#11131D', // outline
      'n': '#1F263B', // shinobi hood/suit
      's': '#2F3B5C', // armor highlight
      'c': '#00F5D4', // cyan scarf/eyes
      'r': '#E63946', // crimson sash
      'f': '#F2C6A0', // skin
      'm': '#CBD5E1', // kunai blade
      'w': '#FFFFFF'
    },
    gareth: {
      '.': null,
      'k': '#10121A',
      'a': '#64748B', // iron plate
      'l': '#94A3B8', // light steel
      'd': '#334155', // dark iron
      'g': '#FFB703', // gold trim/plume
      'r': '#E63946', // crimson cape
      'b': '#E2E8F0', // greatsword blade
      'c': '#00F5D4'
    },
    vex: {
      '.': null,
      'k': '#0F111A',
      'h': '#2D1B3D', // plague hat/coat
      'v': '#7B2CBF', // violet trim
      'm': '#E2E8F0', // beak mask
      'p': '#7AE582', // poison vial glow
      'g': '#34D399', // bright venom
      'o': '#FFB703', // lens/buckle
      'd': '#1A1326'
    },
    zephyr: {
      '.': null,
      'k': '#0E101A',
      'w': '#2A1E47', // storm cloak
      'v': '#7B2CBF', // arcane violet
      'c': '#00F5D4', // electric cyan
      'y': '#FFB703', // lightning gold
      'l': '#E0F2FE', // white-blue arc
      'f': '#E9C4A7', // skin
      's': '#4C1D95'
    },
    zombie: {
      '.': null,
      'k': '#0B0D12',
      'g': '#5A7D5A', // decayed skin
      'l': '#7EA87E', // highlight
      'd': '#3B523B', // shadow
      'r': '#E63946', // blood/eyes
      't': '#3A2E39', // tattered cloth
      'b': '#6B4423'
    },
    hound: {
      '.': null,
      'k': '#0B0C10',
      'f': '#4A2C2A', // dark fur
      'h': '#753B36', // fur highlight
      'r': '#E63946', // rabid eyes/jaws
      'w': '#F8FAFC', // fangs
      'd': '#2A1717'
    },
    archer: {
      '.': null,
      'k': '#0B0C10',
      'b': '#E2E8F0', // bone
      's': '#94A3B8', // bone shadow
      'r': '#E63946', // eye socket glow
      'w': '#8B5A2B', // bow wood
      'v': '#7B2CBF', // tattered hood
      'c': '#00F5D4'  // arrow tip
    },
    boss: {
      '.': null,
      'k': '#09090D',
      'a': '#261C33', // dread armor
      'v': '#7B2CBF', // arcane core
      'r': '#E63946', // crimson eyes/blade
      'g': '#FFB703', // crown/horns
      'l': '#4A3763', // armor highlight
      'w': '#F8FAFC'
    },
    trophy: {
      '.': null,
      'k': '#0B0C10',
      'g': '#FFB703',
      'y': '#FFE066',
      'd': '#B45309',
      'r': '#E63946',
      'c': '#00F5D4',
      'v': '#9D4EDD',
      'p': '#7AE582',
      'w': '#F8FAFC'
    }
  };

  const SPRITES = {
    kaito: [
      '.....kkkkkk.....',
      '....knnnnnnk....',
      '...knssssssnk...',
      '...knkckkcknk...',
      '...knffkkffnk...',
      '....kcccccck....',
      '...kcnnnnnnck...',
      '..kcnnrrrrnnck..',
      '..kcnnsnnnsnck..',
      '..k.knnnnnnk.k..',
      '....knnnnnnk.km.',
      '....knskknskkmw.',
      '....knk..knkkm..',
      '....knk..knk....',
      '...kksk..kskk...',
      '................'
    ],
    gareth: [
      '......kggk......',
      '.....kggggk.....',
      '....kllllllk....',
      '...klaaaaaalk...',
      '...klkkckkklk...',
      '...klddddddlk...',
      '..krkllllllkrk..',
      '..krkaaggaakrk..',
      '..krkaaaaaakrk.b',
      '..krkdaaaadkrkbb',
      '...k.kddddk.kggk',
      '.....ka..ak..kg.',
      '.....kl..lk.....',
      '.....kd..dk.....',
      '....kkk..kkk....',
      '................'
    ],
    vex: [
      '....kkkkkkkk....',
      '...khhhhhhhhk...',
      '..khhvvvvvvhhk..',
      '....khhhhhhk....',
      '...khokmmokhk...',
      '...khhmmmmmmk...',
      '....khhmmhhk....',
      '...khhvvvvhhk...',
      '..khhdhhhhdhhk..',
      '..khhdhoohdhhk.p',
      '..k.khddddhk.kpg',
      '....khhhhhhk.kpp',
      '....khk..khk..kk',
      '....khk..khk....',
      '...kkdk..kdkk...',
      '................'
    ],
    zephyr: [
      '.....kcyyck.....',
      '....kwwwwwwk....',
      '...kwvvvvvvwk...',
      '...kwkckkckwk...',
      '...kwffffffwk...',
      '....kcccccck....',
      '...kwvvvvvvwk...',
      '..kwvswyyswvwk..',
      '..kwvswwwwsvwk.l',
      '..k.kwwwwwwk.kcl',
      '....ksvvvvsk.ky.',
      '....ksk..ksk.kc.',
      '....kwk..kwk....',
      '....kwk..kwk....',
      '...kkck..kckk...',
      '................'
    ],
    zombie: [
      '.....kkkkkk.....',
      '....kllllllk....',
      '...klgggggglk...',
      '...kgrkggkrgk...',
      '...kggkggkggk...',
      '....kggddggk....',
      '...kttttttttk...',
      '..kggttbbttggk..',
      '..kggttttttggk..',
      '..k.kttrrttkk...',
      '....kttttttk....',
      '....kdg..gdk....',
      '....kdg..gdk....',
      '....kdk..kdk....',
      '...kkdk..kdkk...',
      '................'
    ],
    hound: [
      '................',
      '................',
      '..kk........kk..',
      '..kfk......kfk..',
      '..kffkkkkkkffk..',
      '.kfffhhhhhhfffk.',
      '.kfrfhhhhhhffk..',
      'kffwwfhhhhffffk.',
      'kfffffhhhhfffffk',
      '.kkkkfffffffdfk.',
      '....kffdddfffk..',
      '...kffk...kffk..',
      '...kfk.....kfk..',
      '..kdk.......kdk.',
      '................',
      '................'
    ],
    archer: [
      '....kkkkkkkk....',
      '...kvvvvvvvvk...',
      '...kvbbbbbbvk...',
      '...kvbrbbrbvk...',
      '....kbbssbbk....',
      '.....kbkkbk.....',
      '...kwkbbbbk.....',
      '..kw.kbsbsk..c..',
      '..kw.kbbbbk.cc..',
      '..kw.kbsbskcc...',
      '...kwkbbbbk.....',
      '.....kb..bk.....',
      '.....ks..sk.....',
      '.....kb..bk.....',
      '....kkk..kkk....',
      '................'
    ],
    boss: [
      '..kg........gk..',
      '..kggk....kggk..',
      '...kggkkkkggk...',
      '...kaalgglaak...',
      '..kalrrkkrrlak..',
      '..kaaaaaaaaaak..',
      '.kkaavvvvvvaakk.',
      'krkalvwwwwvlakrk',
      'krkalvvvvvvlakrk',
      'krk.kaaaaaak.krk',
      '.k..kalgglak..k.',
      '....kaakkaak....',
      '...kaak..kaak...',
      '...kllk..kllk...',
      '..kkkkk..kkkkk..',
      '................'
    ],
    trophyFirstBlood: [
      '................',
      '.......kk.......',
      '......krrk......',
      '.....krrrrk.....',
      '....krrwwrrk....',
      '....krrrrrrk....',
      '.....krrrrk.....',
      '......kggk......',
      '....kkgyygkk....',
      '.....kggggk.....',
      '......kddk......',
      '......kggk......',
      '.....kddddk.....',
      '....kggggggk....',
      '................',
      '................'
    ],
    trophyBossSlayer: [
      '................',
      '..kg...kg...gk..',
      '..kgg.kggk.ggk..',
      '..kggggggggggk..',
      '..kgyygyygyygk..',
      '..kggrgvvgrggk..',
      '..kggggggggggk..',
      '...kddddddddk...',
      '....kggggggk....',
      '.....kgyygk.....',
      '......kddk......',
      '.....kggggk.....',
      '....kddddddk....',
      '................',
      '................',
      '................'
    ],
    trophyAlchemist: [
      '................',
      '......kkkk......',
      '.....kggggk.....',
      '......kwwk......',
      '......kwwk......',
      '.....kwppwk.....',
      '....kwppppwk....',
      '...kwppggppwk...',
      '...kwppppppwk...',
      '...kwppwwppwk...',
      '....kwppppwk....',
      '.....kwwwwk.....',
      '......kkkk......',
      '................',
      '................',
      '................'
    ],
    trophyUntouchable: [
      '................',
      '.....kkkkkk.....',
      '....kcccccck....',
      '...kcwwwwwwck...',
      '...kcwccccwck...',
      '...kcwcvvcwck...',
      '...kcwcvvcwck...',
      '...kcwccccwck...',
      '....kcwwwwck....',
      '.....kcccck.....',
      '......kcck......',
      '.......kk.......',
      '................',
      '................',
      '................',
      '................'
    ],
    trophyHoarder: [
      '................',
      '.....kkkkkk.....',
      '....kggggggk....',
      '...kgyyyyyygk...',
      '...kgyggggykk...',
      '...kgygddgygk...',
      '...kgygddgygk...',
      '...kgyggggykk...',
      '...kgyyyyyygk...',
      '....kggggggk....',
      '.....kddddk.....',
      '....kggggggk....',
      '................',
      '................',
      '................',
      '................'
    ]
  };

  function getPaletteFor(spriteKey) {
    if (spriteKey.startsWith('trophy')) return PALETTES.trophy;
    return PALETTES[spriteKey] || PALETTES.kaito;
  }

  /**
   * Draw a 16x16 pixel sprite centered at (cx, cy) with pixel size `scale`.
   */
  function drawSprite(ctx, spriteKey, cx, cy, scale = 3, opts = {}) {
    const grid = SPRITES[spriteKey];
    if (!grid) return;
    const palette = getPaletteFor(spriteKey);
    const flipX = Boolean(opts.flipX);
    const flashWhite = Boolean(opts.flashWhite);
    const alpha = opts.alpha !== undefined ? opts.alpha : 1;

    const w = 16 * scale;
    const h = 16 * scale;
    const startX = Math.round(cx - w / 2);
    const startY = Math.round(cy - h / 2);

    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;

    for (let row = 0; row < grid.length; row++) {
      const line = grid[row];
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = flashWhite ? '#FFFFFF' : color;
        const drawCol = flipX ? (15 - col) : col;
        ctx.fillRect(startX + drawCol * scale, startY + row * scale, scale, scale);
      }
    }
    ctx.restore();
  }

  /**
   * Populate any canvas with a data-sprite attribute.
   */
  function renderStaticSprites() {
    document.querySelectorAll('canvas[data-sprite]').forEach((canvas) => {
      const key = canvas.getAttribute('data-sprite');
      const scale = parseInt(canvas.getAttribute('data-scale') || '4', 10);
      const size = 16 * scale;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, size, size);
      drawSprite(ctx, key, size / 2, size / 2, scale);
    });
  }

  global.SODSprites = {
    drawSprite,
    renderStaticSprites,
    SPRITES
  };
})(window);
