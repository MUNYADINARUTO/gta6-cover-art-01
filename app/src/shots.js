// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover shows the cover alone, full frame. The query picks the scene:
// size (1080x1080, 1080x1350, 1920x1080), layout, grade, photo and photo2 (sample
// names), caption, subtitle and stars. window.__shotReady is set once painted.
import { SIZES, layoutPanels, defaultCrops } from './cover.js';

export async function runShot(shot, query, state, app) {
  const pick = (name, fallback) => query.get(name) ?? fallback;
  state.layout = pick('layout', 'hero');
  state.grade = pick('grade', 'sunset');
  state.size = pick('size', '1080x1080');
  state.title = pick('caption', 'NEON SHORE');
  state.subtitle = pick('subtitle', 'a sunset story');
  state.stars = Number(pick('stars', '5')) || 5;
  state.onePhoto = query.get('onePhoto') !== '0';
  state.crops = defaultCrops(layoutPanels(state.layout, 100, 100).panels.length);
  state.selected = -1;
  const photoA = await app.loadImage(`samples/${pick('photo', 'boulevard')}.jpg`);
  app.setPhoto(0, photoA);
  const photoBName = pick('photo2', '');
  if (photoBName) {
    const photoB = await app.loadImage(`samples/${photoBName}.jpg`);
    app.setPhoto(1, photoB);
    if (!state.onePhoto) {
      state.crops.forEach((c, i) => { c.photo = i % 2; });
    }
  }
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('onePhoto').checked = state.onePhoto;
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const { w, h } = SIZES[state.size];
    const cover = document.getElementById('cover');
    cover.width = w;
    cover.height = h;
  }
  app.redraw();
  app.setStatus('Screenshot scene ready.');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.title = 'SHOT-READY';
    window.__shotReady = true;
  }));
}
