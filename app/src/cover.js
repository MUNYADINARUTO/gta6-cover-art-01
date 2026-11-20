// Neon Shore Cover Studio — the cover engine.
// Draws GTA-style multi-panel poster art on a 2D canvas: each panel holds a photo with its
// own crop and zoom, graded with a Vice City sunset or neon colour grade, above a sunset
// title band with bold Anton lettering, a neon Pacifico subtitle and a wanted-star meter.
// Everything is drawn from the photos on the person's own machine; no network, no Rockstar
// artwork, no game font — the lettering is Anton and Pacifico, both SIL Open Font License.

/** The four grades: a canvas filter for the photo, an overlay gradient and a glow,
 * plus the four sunset-band colours the title band is painted with. */
export const GRADES = {
  sunset: { label: 'Vice Sunset', filter: 'saturate(1.35) contrast(1.07) brightness(1.02)', top: '#ffb347', bottom: '#ff2e88', alpha: 0.34, glow: 'rgba(255,110,60,0.20)', band: ['#2a0a4a', '#c81d7a', '#ff7a2f', '#ffc46b'] },
  neon: { label: 'Neon Nights', filter: 'saturate(1.5) contrast(1.1)', top: '#00e5ff', bottom: '#ff00a8', alpha: 0.45, glow: 'rgba(255,0,168,0.22)', band: ['#061a4d', '#7b00e0', '#ff00a8', '#00e5ff'] },
  pink: { label: 'Hot Pink', filter: 'saturate(1.45) contrast(1.05)', top: '#ff7ad9', bottom: '#7b2fff', alpha: 0.42, glow: 'rgba(255,95,162,0.20)', band: ['#2b0a4a', '#ff2e88', '#b44bff', '#ff9de2'] },
  teal: { label: 'Teal Dusk', filter: 'saturate(1.3) contrast(1.08)', top: '#5ff2c8', bottom: '#1c46ff', alpha: 0.34, glow: 'rgba(0,229,255,0.18)', band: ['#03263a', '#0077b6', '#00c2a8', '#a5ffe9'] },
};

/** The four layouts: hero plus three, a 2x2 grid, a three-column comic strip, full bleed. */
export const LAYOUTS = {
  hero: { label: 'Hero + Trio', panels: 4 },
  four: { label: 'Four Corners', panels: 4 },
  strip: { label: 'Comic Strip', panels: 3 },
  bleed: { label: 'Full Bleed', panels: 4 },
};

/** The three post sizes the bounty asks for. */
export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

/** A fresh per-panel crop: which photo, how far zoomed, and how far panned. */
export function freshCrop(photo, zoom, ox, oy) {
  return { photo, zoom, ox, oy };
}

/** Default crops so one photo fills every panel with a different framing.
 * The vertical pan favours the top of the photo, where a person's face usually is. */
export function defaultCrops(count) {
  const crops = [];
  const oyBias = [0.55, 0.35, 0.25, 0.5];
  const oxBias = [-0.2, 0.2, 0.45, -0.45];
  for (let i = 0; i < count; i++) {
    crops.push(freshCrop(0, 1.1 + (i % 3) * 0.1, oxBias[i % 4], oyBias[i % 4]));
  }
  return crops;
}

/**
 * Panel rectangles for a layout at W x H, in pixels.
 * Returns { panels: [{x, y, w, h, rot}], band: {x, y, w, h}, gutter }.
 * The title band sits at the foot; panels fill the rest inside a white frame.
 */
export function layoutPanels(layout, W, H) {
  const g = Math.max(3, Math.round(Math.min(W, H) * 0.008)); // white gutter
  const f = Math.max(4, Math.round(g * 1.6)); // outer white frame
  const cw = W - 2 * f; // content width
  const ch = H - 2 * f; // content height
  const bh = Math.round(ch * 0.34); // title band height
  const ph = ch - bh - g; // photo area height
  const band = { x: f, y: f + ph + g, w: cw, h: bh };
  let panels = [];
  if (layout === 'hero') {
    const rw = Math.round(cw * 0.36);
    const hw = cw - rw - g;
    const rh = (ph - 2 * g) / 3;
    panels = [
      { x: f, y: f, w: hw, h: ph, rot: 0 },
      { x: f + hw + g, y: f, w: rw, h: rh, rot: 0 },
      { x: f + hw + g, y: f + rh + g, w: rw, h: rh, rot: 0 },
      { x: f + hw + g, y: f + 2 * (rh + g), w: rw, h: rh, rot: 0 },
    ];
  } else if (layout === 'four') {
    const pw = (cw - g) / 2;
    const phh = (ph - g) / 2;
    panels = [
      { x: f, y: f, w: pw, h: phh, rot: 0 },
      { x: f + pw + g, y: f, w: pw, h: phh, rot: 0 },
      { x: f, y: f + phh + g, w: pw, h: phh, rot: 0 },
      { x: f + pw + g, y: f + phh + g, w: pw, h: phh, rot: 0 },
    ];
  } else if (layout === 'strip') {
    const pw = (cw - 2 * g) / 3;
    panels = [
      { x: f, y: f, w: pw, h: ph, rot: 0 },
      { x: f + pw + g, y: f, w: pw, h: ph, rot: 0 },
      { x: f + 2 * (pw + g), y: f, w: pw, h: ph, rot: 0 },
    ];
  } else { // bleed: one full-bleed photo, three tilted snapshots over the band's top edge
    const s = Math.round(Math.min(W, H) * 0.2);
    const cy = band.y - Math.round(s * 0.42);
    panels = [
      { x: f, y: f, w: cw, h: ch, rot: 0 },
      { x: Math.round(W * 0.16 - s / 2), y: cy, w: s, h: s, rot: -0.1 },
      { x: Math.round(W * 0.5 - s / 2), y: cy - Math.round(s * 0.06), w: s, h: s, rot: 0.03 },
      { x: Math.round(W * 0.84 - s / 2), y: cy, w: s, h: s, rot: 0.09 },
    ];
  }
  return { panels, band, gutter: g, frame: f };
}

let noiseCanvas = null;
/** A small tile of random grey noise, reused as the film-grain pattern. */
function grainTile() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 128;
  noiseCanvas.height = 128;
  const nctx = noiseCanvas.getContext('2d');
  const data = nctx.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 20);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  return noiseCanvas;
}

/** Draws a five-pointed star path centred at (cx, cy) with outer radius r. */
function starPath(ctx, cx, cy, r) {
  const inner = r * 0.42;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Draws one photo into a panel rect with the panel's crop and the grade's colour.
 * The photo is cover-fit, then zoomed and panned by the crop; a rotated panel (the
 * bleed layout's snapshots) is drawn turned around its own centre.
 */
function drawPhotoPanel(ctx, panel, img, crop, grade, selected) {
  const { x, y, w, h, rot } = panel;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rot) ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * crop.zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    const dx = (w - pw) / 2 + crop.ox * Math.max(0, (pw - w) / 2);
    const dy = (h - ph) / 2 + crop.oy * Math.max(0, (ph - h) / 2);
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, pw, ph);
    ctx.filter = 'none';
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, grade.top);
    wash.addColorStop(1, grade.bottom);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grade.alpha;
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = grade.glow;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  } else {
    const empty = ctx.createLinearGradient(0, 0, w, h);
    empty.addColorStop(0, '#3a1c5e');
    empty.addColorStop(1, '#160a24');
    ctx.fillStyle = empty;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `bold ${Math.max(14, h * 0.09)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ add a photo', w / 2, h / 2);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
  // White poster border around the panel; cyan when it is the selected one.
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rot) ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.strokeStyle = selected ? '#19e3ff' : '#ffffff';
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Draws the sunset title band: gradient sky, sun rays, halftone dots, the big Anton
 * title, the neon Pacifico subtitle, a wanted-star meter and a small place badge.
 */
function drawTitleBand(ctx, band, state, W) {
  const { x, y, w, h } = band;
  const grade = GRADES[state.grade];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(x, y, x + w, y + h);
  sky.addColorStop(0, grade.band[0]);
  sky.addColorStop(0.45, grade.band[1]);
  sky.addColorStop(0.8, grade.band[2]);
  sky.addColorStop(1, grade.band[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // Sun rays fanning up from behind the title.
  const sunX = x + w * 0.5;
  const sunY = y + h * 1.05;
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  for (let i = -5; i <= 5; i++) {
    const a = -Math.PI / 2 + i * 0.16;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.arc(sunX, sunY, h * 2.2, a - 0.045, a + 0.045);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Halftone dots rising from the foot of the band.
  ctx.fillStyle = 'rgba(20,6,32,0.28)';
  const step = Math.max(10, h * 0.09);
  for (let row = 0; row < 3; row++) {
    const yy = y + h - step * (row + 0.6);
    const r = Math.max(1.5, step * (0.16 + row * 0.05));
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      ctx.beginPath();
      ctx.arc(xx + (row % 2 ? step / 2 : 0), yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The big title, fitted to the band and sheared a touch like poster lettering.
  const title = (state.title || 'NEON SHORE').trim().toUpperCase();
  let size = h * 0.52;
  const setTitleFont = (s) => { ctx.font = `${s}px Anton, 'Arial Black', sans-serif`; };
  setTitleFont(size);
  while (ctx.measureText(title).width > w * 0.9 && size > 12) {
    size -= 2;
    setTitleFont(size);
  }
  const titleY = y + h * 0.56;
  ctx.save();
  ctx.translate(x + w / 2, titleY);
  ctx.transform(1, 0, -0.05, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleFill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  titleFill.addColorStop(0, '#ffffff');
  titleFill.addColorStop(1, '#ffd76a');
  ctx.shadowColor = 'rgba(20,4,36,0.65)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineWidth = Math.max(2, size / 14);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a24';
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = titleFill;
  ctx.fillText(title, 0, 0);
  ctx.restore();
  // The neon script subtitle, glowing under the title.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const subSize = Math.max(14, h * 0.17);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = grade.bottom;
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillStyle = '#eafcff';
    ctx.fillText(sub, x + w / 2, y + h * 0.86);
    ctx.shadowBlur = 0;
  }
  // Wanted-star meter, top right of the band.
  const starR = Math.max(8, h * 0.085);
  const gap = starR * 2.25;
  const total = gap * 4 + starR * 2;
  let sx = x + w - total - w * 0.03;
  const sy = y + h * 0.16;
  for (let i = 0; i < 5; i++) {
    starPath(ctx, sx + starR, sy, starR);
    ctx.fillStyle = i < state.stars ? '#ffd23e' : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, starR * 0.12);
    ctx.strokeStyle = '#160a24';
    ctx.stroke();
    sx += gap;
  }
  // Small place badge, top left of the band.
  ctx.font = `bold ${Math.max(11, h * 0.085)}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.max(2, h * 0.02)}px`; } catch { /* older canvas */ }
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('SUNSET COUNTY', x + w * 0.03, y + h * 0.16);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  ctx.restore();
}

/**
 * Draws the whole cover onto ctx at W x H from the editor state.
 * state: { layout, grade, title, subtitle, stars, photos, crops, selected }.
 * photos are Image elements (or null); crops[i] is { photo, zoom, ox, oy }.
 */
export function drawCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const { panels, band, gutter } = layoutPanels(state.layout, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  const n = panels.length;
  for (let i = 0; i < n; i++) {
    const crop = state.crops[i] || freshCrop(0, 1.15, 0, 0);
    const img = state.photos[crop.photo] || null;
    drawPhotoPanel(ctx, panels[i], img, crop, grade, i === state.selected);
  }
  // In the bleed layout the snapshots sit on top of the full-bleed photo, so the
  // band is drawn after the panels with a scrim the photos can show through.
  if (state.layout === 'bleed') {
    const scrim = ctx.createLinearGradient(0, band.y - band.h * 0.4, 0, band.y + band.h);
    scrim.addColorStop(0, 'rgba(42,10,74,0)');
    scrim.addColorStop(0.45, 'rgba(42,10,74,0.55)');
    scrim.addColorStop(1, 'rgba(42,10,74,0.72)');
    ctx.fillStyle = scrim;
    ctx.fillRect(band.x, band.y - band.h * 0.4, band.w, band.h * 1.4);
  }
  drawTitleBand(ctx, band, state, W);
  // Film grain and a soft vignette over the whole poster.
  const tile = grainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,20,0.26)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  void gutter;
}
