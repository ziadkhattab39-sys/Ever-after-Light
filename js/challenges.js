/* ------------------------------------------------------------------
   Challenges page
   - one expandable card per challenge, rendered from ever_afterlight_challenges.json
   - each card has photo slots (js/photo-ui.js); a slot only counts once its photo is saved
   - the number of COMPLETED challenges decides which hidden gems unlock
     (rules in js/progress.js, saved flags in js/store.js, photos in js/photos.js)
------------------------------------------------------------------- */
(function () {
  const list = document.getElementById('challenge-list');
  const track = document.getElementById('unlock-track');
  const progressText = document.getElementById('challenge-progress');
  const nextUnlock = document.getElementById('next-unlock');
  const banner = document.getElementById('unlock-banner');
  if (!list) return;

  const esc = EAPhotoUI.esc;

  const LOCK_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  // the compass star from the Final Wave logo, drawn small for the card covers
  const STAR_SVG =
    '<svg viewBox="0 0 64 64" width="64" height="64" fill="currentColor" aria-hidden="true">' +
    '<path d="M32 2l3.2 22.4L58 32l-22.8 7.6L32 62l-3.2-22.4L6 32l22.8-7.6z"/>' +
    '<path opacity=".55" d="M32 16l2.4 11.6L46 32l-11.6 4.4L32 48l-2.4-11.6L18 32l11.6-4.4z"/></svg>';

  const CHIP = {
    new: { label: 'Not started', cls: 'chip-new' },
    progress: { label: 'In progress', cls: 'chip-found' },
    completed: { label: '✓ Completed', cls: 'chip-collected' }
  };

  let challenges = [];
  let lastDone = 0;
  let lastUnlocked = [];

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function parseKey(key) {
    const i = key.indexOf(':');
    return { challengeId: key.slice(0, i), slotId: key.slice(i + 1) };
  }

  /* ---------- photo area of one card ---------- */
  function photoHelp(c) {
    const r = c.rules;
    if (r.type === 'collection') return 'Add one photo for each of the ' + r.count + '. A slot only counts once its photo is saved, and you can name each one if you like.';
    if (r.type === 'multi') return 'Add your photos one by one (up to ' + r.max + '). This challenge is complete with at least ' + plural(r.min, 'photo') + '.';
    return 'Add your photo. You can replace or remove it any time.';
  }

  function photosHTML(c) {
    const r = c.rules;
    const state = EAProgress.challengeState(c);
    if (r.type === 'collection') {
      return c.slotIds.map(function (slot, i) {
        return EAPhotoUI.slotHTML({ key: EAProgress.slotKey(c.id, slot), label: r.itemLabel + ' ' + (i + 1), caption: true });
      }).join('');
    }
    if (r.type === 'multi') {
      const saved = state.doneIds.map(function (slot, i) {
        return EAPhotoUI.slotHTML({ key: EAProgress.slotKey(c.id, slot), label: r.itemLabel + ' ' + (i + 1), caption: true });
      }).join('');
      const next = state.count < r.max
        ? EAPhotoUI.slotHTML({ key: EAProgress.slotKey(c.id, 'new'), label: r.itemLabel + ' ' + (state.count + 1), addText: state.count ? 'Add another photo' : 'Add photo' })
        : '';
      return saved + next;
    }
    return EAPhotoUI.slotHTML({ key: EAProgress.slotKey(c.id, 's1'), label: 'Your photo', wide: true });
  }

  function renderPhotos(c) {
    const grid = list.querySelector('.ch-photos[data-challenge="' + c.id + '"] .photo-grid');
    grid.innerHTML = photosHTML(c);
  }

  /* ---------- build the cards once ---------- */
  function coverHTML(c) {
    if (c.isFinal) {
      return '<span class="ch-cover final-cover" aria-hidden="true">' + STAR_SVG + '<span class="final-cover-id">' + esc(c.id) + '</span></span>';
    }
    return '<img class="ch-cover" src="' + c.cover[0] + '" alt="' + esc(c.cover[1]) + '" loading="lazy">';
  }

  function cardHTML(c, index) {
    return (
      '<li class="challenge-card' + (c.isFinal ? ' theme-final' : '') + '" data-id="' + c.id + '">' +
      '<details' + (index === 0 ? ' open' : '') + '>' + // first card starts open so the photo slots are easy to find
      '  <summary>' + coverHTML(c) +
      '    <span class="ch-main">' +
      '      <span class="ch-head"><span class="eyebrow">' + esc(c.category) + '</span><span class="chip" data-chip></span></span>' +
      '      <span class="ch-title">' + esc(c.name) + '</span>' +
      '      <span class="ch-desc">' + esc(c.goal) + '</span>' +
      '      <span class="ch-progress">' +
      '        <span class="progress" data-bar role="progressbar" aria-label="' + esc(c.name) + ' progress" aria-valuemin="0" aria-valuemax="' + c.required + '"><span class="progress-fill"></span></span>' +
      '        <span class="ch-count" data-count></span>' +
      '      </span>' +
      '      <span class="ch-toggle" aria-hidden="true"></span>' +
      '    </span>' +
      '  </summary>' +
      '  <div class="ch-body">' +
      '    <p class="ch-instructions">' + esc(c.description) + '</p>' +
      '    <p class="ch-goal"><span class="label">Goal</span> ' + esc(c.goal) + '</p>' +
      '    <div class="ch-photos" data-challenge="' + c.id + '">' +
      '      <p class="photo-help">' + esc(photoHelp(c)) + '</p>' +
      '      <ul class="photo-grid" aria-label="' + esc(c.name) + ' photos"></ul>' +
      '    </div>' +
      '  </div>' +
      '</details>' +
      '</li>'
    );
  }

  function dividerHTML() {
    return (
      '<li class="wave-divider theme-final" aria-labelledby="wave-title">' +
      '<img class="wave-logo" src="assets/final-wave/minimal-logo.webp" alt="Ever Afterlight. Your story, left in light." width="900" height="506">' +
      '<div class="wave-text">' +
      '<p class="eyebrow">The final wave</p>' +
      '<h2 id="wave-title">Five challenges, entirely yours</h2>' +
      '<p>These last five leave campus behind. Photograph your own light, your own summer, your own days and your own escape.</p>' +
      '<p class="wave-progress" id="wave-progress" aria-live="polite"></p>' +
      '</div></li>'
    );
  }

  function buildCards() {
    let html = '';
    let dividerDone = false;
    challenges.forEach(function (c, index) {
      if (c.isFinal && !dividerDone) { html += dividerHTML(); dividerDone = true; }
      html += cardHTML(c, index);
    });
    list.innerHTML = html;
    challenges.forEach(renderPhotos);
  }

  /* ---------- refresh numbers and states (open cards stay open) ---------- */
  function countText(c, state) {
    if (c.rules.type === 'multi') {
      return state.done + ' / ' + state.total + ' captured' + (state.count > state.total ? ' (+' + (state.count - state.total) + ' more)' : '');
    }
    return state.done + ' / ' + state.total + ' captured';
  }

  function refreshCards() {
    challenges.forEach(function (c) {
      const card = list.querySelector('.challenge-card[data-id="' + c.id + '"]');
      const state = EAProgress.challengeState(c);

      card.classList.toggle('is-done', state.status === 'completed');
      card.querySelector('[data-count]').textContent = countText(c, state);

      const bar = card.querySelector('[data-bar]');
      bar.setAttribute('aria-valuenow', state.done);
      bar.querySelector('.progress-fill').style.width = (state.done / state.total) * 100 + '%';

      const chip = card.querySelector('[data-chip]');
      chip.textContent = CHIP[state.status].label;
      chip.className = 'chip ' + CHIP[state.status].cls;
    });

    const waveText = document.getElementById('wave-progress');
    if (waveText) {
      const finals = challenges.filter(function (c) { return c.isFinal; });
      const done = finals.filter(function (c) { return EAProgress.challengeState(c).status === 'completed'; }).length;
      waveText.textContent = done + ' of ' + finals.length + ' final challenges completed';
    }
  }

  function refreshSummary() {
    const done = EAProgress.completedCount();
    progressText.innerHTML = '<span>' + done + '</span> of ' + challenges.length + ' challenges completed';

    const next = EAProgress.nextLockedGem();
    if (!next) {
      nextUnlock.textContent = 'Every hidden gem is open. Nicely done.';
    } else {
      nextUnlock.textContent = 'Complete ' + plural(EAProgress.remainingFor(next), 'more challenge') + ' to open the next hidden gem.';
    }
  }

  function refreshTrack() {
    track.innerHTML = EAData.gems.map(function (g) {
      const open = EAProgress.isGemUnlocked(g);
      return (
        '<li class="track-item ' + (open ? 'is-open' : 'is-locked') + (g.theme === 'final' ? ' theme-final' : '') + '">' +
        '<span class="track-state" aria-hidden="true">' + (open ? '✓' : LOCK_SVG) + '</span>' +
        '<span class="track-text">' +
        '<span class="track-name">' + esc(EAProgress.displayName(g)) + '</span>' +
        '<span class="track-need">' + (open ? 'Open' : EAProgress.needText(g)) + '</span>' +
        '</span></li>'
      );
    }).join('');
  }

  function refreshAll() {
    refreshCards();
    refreshSummary();
    refreshTrack();
  }

  /* ---------- announce newly unlocked gems ---------- */
  function announceChange() {
    const now = EAProgress.completedCount();
    const unlocked = EAProgress.unlockedGemIds();
    if (now > lastDone) {
      const opened = EAData.gems.filter(function (g) {
        return unlocked.indexOf(g.id) !== -1 && lastUnlocked.indexOf(g.id) === -1;
      });
      if (opened.length) {
        // real places are not named here: the name would give the riddle away
        const names = opened.map(function (g) { return g.kind === 'personal' ? '“' + esc(g.name) + '”' : 'a new hidden place'; });
        banner.innerHTML =
          '<strong>Challenge complete!</strong> You unlocked ' + names.join(' and ') + '. ' +
          '<a href="gems.html">Go and find ' + (opened.length === 1 ? 'it' : 'them') + ' →</a>';
      } else {
        banner.innerHTML = '<strong>Challenge complete!</strong> Nice shooting.';
      }
      banner.hidden = false;
    } else if (now < lastDone) {
      banner.hidden = true;
    }
    lastDone = now;
    lastUnlocked = unlocked;
  }

  /* ---------- photo events (one set of handlers for every card) ---------- */
  function afterChange(c, focusKey) {
    renderPhotos(c);
    refreshAll();
    announceChange();
    if (focusKey) EAPhotoUI.focusSlot(list.querySelector('.ch-photos[data-challenge="' + c.id + '"]'), focusKey);
  }

  EAPhotoUI.attach(list, {
    onFile: function (key, file) {
      const p = parseKey(key);
      const c = EAData.challenge(p.challengeId);
      let slotId = p.slotId;
      if (slotId === 'new') slotId = 'p' + Date.now().toString(36); // a new photo on a "multi" challenge
      const realKey = EAProgress.slotKey(c.id, slotId);
      return EAPhotos.save(realKey, file).then(function () {
        EAStore.setItem(c.id, slotId, true); // flag only after the photo is really saved
        afterChange(c, p.slotId === 'new' ? EAProgress.slotKey(c.id, 'new') : realKey);
      });
    },
    onRemove: function (key) {
      const p = parseKey(key);
      const c = EAData.challenge(p.challengeId);
      return EAPhotos.remove(key).then(function () {
        EAStore.setItem(c.id, p.slotId, false);
        afterChange(c, c.rules.type === 'multi' ? EAProgress.slotKey(c.id, 'new') : key);
      });
    },
    onCaption: function (key, text) {
      return EAPhotos.setCaption(key, text);
    }
  });

  /* ---------- start ---------- */
  Promise.all([EAData.load(), EAPhotos.load()]).then(function () {
    challenges = EAData.challenges;
    lastDone = EAProgress.completedCount();
    lastUnlocked = EAProgress.unlockedGemIds();
    buildCards();
    refreshAll();
    if (!EAPhotos.isAvailable()) {
      banner.innerHTML = '<strong>Photos can’t be saved here.</strong> This browser is blocking local storage (private browsing?), so uploads won’t count.';
      banner.hidden = false;
    }
  }).catch(function (err) { EAData.showError(list, err); });
})();
