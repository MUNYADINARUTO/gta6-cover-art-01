// Neon Shore Cover Studio — wires the editor: photos, panels, layout and grade
// pickers, the caption, drag-to-pan and zoom per panel, and the PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, layoutPanels, GRADES, LAYOUTS, SIZES, defaultCrops, freshCrop } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const zoomInput = document.getElementById('zoom');
const panelLabel = document.getElementById('panelLabel');

const state = {
  layout: 'hero',
  grade: 'sunset',
  size: '1080x1080',
  title: 'NEON SHORE',
  subtitle: 'a sunset story',
  stars: 5,
  photos: [null, null, null],
  crops: defaultCrops(4),
  selected: 0,
  onePhoto: true,
};

let fontsReady = false;
/** Loads the bundled OFL fonts before the first draw so canvas lettering uses them. */
async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
  } catch { /* system fallbacks still draw */ }
  fontsReady = true;
}

/** Sizes the preview canvas to the chosen post size's aspect and redraws.
 * In shot-cover mode the canvas already holds the export size, so it is left alone. */
function redraw() {
  const { w, h } = SIZES[state.size];
  if (!document.body.classList.contains('shot-cover')) {
    const pw = 900;
    const ph = Math.round((900 * h) / w);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
  }
  drawCover(ctx, canvas.width, canvas.height, state);
  const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
  panelLabel.textContent = `Panel ${state.selected + 1} of ${panels.length}`;
  const crop = state.crops[state.selected];
  if (crop) zoomInput.value = String(Math.round(crop.zoom * 100));
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Puts an image in a photo slot and refreshes the slot's thumbnail and crops. */
function setPhoto(slot, img) {
  state.photos[slot] = img;
  const thumb = document.getElementById(`thumb${slot + 1}`);
  if (thumb) thumb.src = img.src;
  if (state.onePhoto && slot === 0) {
    state.crops = defaultCrops(4);
  }
  redraw();
}

/** Reads a file input's first image into a photo slot. */
async function readFileInto(slot, file) {
  if (!file) return;
  const img = await loadImage(URL.createObjectURL(file));
  setPhoto(slot, img);
  setStatus(`Photo ${slot + 1} loaded — drag the preview to frame it, then export.`);
}

for (let slot = 0; slot < 3; slot++) {
  document.getElementById(`photo${slot + 1}`).addEventListener('change', (e) => {
    readFileInto(slot, e.target.files[0]).catch(() => setStatus('That file could not be read as a photo.'));
  });
  document.getElementById(`sample${slot + 1}`).addEventListener('click', async () => {
    try {
      const img = await loadImage(`samples/${slot === 1 ? 'pier' : 'boulevard'}.jpg`);
      setPhoto(slot, img);
      setStatus(`Sample photo ${slot + 1} loaded.`);
    } catch { setStatus('The sample photo could not be loaded.'); }
  });
}

/** Builds the layout picker buttons from LAYOUTS. */
const layoutRow = document.getElementById('layouts');
for (const [key, def] of Object.entries(LAYOUTS)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pick' + (key === state.layout ? ' on' : '');
  b.textContent = def.label;
  b.addEventListener('click', () => {
    state.layout = key;
    state.crops = defaultCrops(layoutPanels(key, 100, 100).panels.length);
    state.selected = 0;
    layoutRow.querySelectorAll('.pick').forEach((el) => el.classList.remove('on'));
    b.classList.add('on');
    redraw();
  });
  layoutRow.appendChild(b);
}

/** Builds the grade picker buttons from GRADES. */
const gradeRow = document.getElementById('grades');
for (const [key, def] of Object.entries(GRADES)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pick' + (key === state.grade ? ' on' : '');
  b.textContent = def.label;
  b.addEventListener('click', () => {
    state.grade = key;
    gradeRow.querySelectorAll('.pick').forEach((el) => el.classList.remove('on'));
    b.classList.add('on');
    redraw();
  });
  gradeRow.appendChild(b);
}

/** Builds the post-size picker buttons from SIZES. */
const sizeRow = document.getElementById('sizes');
for (const [key, def] of Object.entries(SIZES)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pick' + (key === state.size ? ' on' : '');
  b.textContent = def.label;
  b.addEventListener('click', () => {
    state.size = key;
    sizeRow.querySelectorAll('.pick').forEach((el) => el.classList.remove('on'));
    b.classList.add('on');
    redraw();
  });
  sizeRow.appendChild(b);
}

/** Builds the wanted-star meter buttons. */
const starRow = document.getElementById('stars');
for (let i = 1; i <= 5; i++) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'star' + (i <= state.stars ? ' on' : '');
  b.textContent = '★';
  b.setAttribute('aria-label', `${i} stars`);
  b.addEventListener('click', () => {
    state.stars = i;
    starRow.querySelectorAll('.star').forEach((el, j) => el.classList.toggle('on', j < i));
    redraw();
  });
  starRow.appendChild(b);
}

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
zoomInput.addEventListener('input', () => {
  const crop = state.crops[state.selected];
  if (crop) {
    crop.zoom = Math.max(1, Math.min(3, Number(zoomInput.value) / 100));
    redraw();
  }
});

document.getElementById('onePhoto').addEventListener('change', (e) => {
  state.onePhoto = e.target.checked;
  if (state.onePhoto) state.crops = defaultCrops(4);
  redraw();
});

document.getElementById('resetCrops').addEventListener('click', () => {
  state.crops = defaultCrops(4);
  state.selected = 0;
  redraw();
  setStatus('Crops reset — every panel reframed from its photo.');
});

/** Assigns the selected panel a different loaded photo. */
document.querySelectorAll('[data-assign]').forEach((b) => {
  b.addEventListener('click', () => {
    const slot = Number(b.dataset.assign);
    if (!state.photos[slot]) {
      setStatus(`Photo ${slot + 1} is empty — load one first, or try a sample.`);
      return;
    }
    state.crops[state.selected].photo = slot;
    state.onePhoto = false;
    document.getElementById('onePhoto').checked = false;
    redraw();
  });
});

/** Finds which panel a preview point falls in, at the preview canvas's own size. */
function panelAt(px, py) {
  const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const i = panelAt(px, py);
  if (i < 0) return;
  state.selected = i;
  drag = { x: px, y: py, ox: state.crops[i].ox, oy: state.crops[i].oy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
  const p = panels[state.selected];
  const crop = state.crops[state.selected];
  const img = state.photos[crop.photo];
  if (img) {
    // One-to-one dragging: a pointer move of N pixels pans the photo N pixels.
    const base = Math.max(p.w / img.naturalWidth, p.h / img.naturalHeight) * crop.zoom;
    const sx = Math.max(1, (img.naturalWidth * base - p.w) / 2);
    const sy = Math.max(1, (img.naturalHeight * base - p.h) / 2);
    crop.ox = Math.max(-1, Math.min(1, drag.ox + (px - drag.x) / sx));
    crop.oy = Math.max(-1, Math.min(1, drag.oy + (py - drag.y) / sy));
  }
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const crop = state.crops[state.selected];
  if (!crop) return;
  crop.zoom = Math.max(1, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

/** Renders the cover at a post size and downloads it as a PNG. */
function exportSize(key) {
  const { w, h } = SIZES[key];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, { ...state, selected: -1 });
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-shore-cover-${w}x${h}.png`;
    a.click();
    setStatus(`Saved neon-shore-cover-${w}x${h}.png`);
  }, 'image/png');
}

document.getElementById('export').addEventListener('click', () => exportSize(state.size));
document.getElementById('exportAll').addEventListener('click', () => {
  for (const key of Object.keys(SIZES)) exportSize(key);
  setStatus('Saved all three sizes: 1080 x 1080, 1080 x 1350 and 1920 x 1080.');
});

window.addEventListener('error', (e) => { document.title = `SHOT-ERROR: ${e.message}`; });

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  loadFonts().then(() => runShot(shot, params, state, { loadImage, setPhoto, redraw, setStatus }));
} else {
  loadFonts().then(redraw);
  redraw();
}
