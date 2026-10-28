/* ------------------------------------------------------------------
   Hidden Gems page
   - renders the cards from ever_afterlight_hidden_gems.json (via js/data.js)
   - opens a <dialog> with the gem's three riddles (tabs A / B / C)
   - "Revelio" reveals a riddle's hint (only riddles that HAVE a hint in the JSON show it)
   - "I've found it" -> the place (or, for the final gem, the personal discovery) is revealed,
     the player adds a photo, and only then can it go into the album

   The JSON has no riddle answers, so discovery is the player's own claim:
   nothing to type, and nothing invented.
------------------------------------------------------------------- */
(function () {
  const grid = document.getElementById('gem-grid');
  const progressText = document.getElementById('progress-text');
  const dialog = document.getElementById('gem-dialog');
  if (!grid || !dialog) return;

  const esc = EAPhotoUI.esc;

  const el = {
    img: document.getElementById('dlg-img'),
    illus: document.getElementById('dlg-illus'),
    cat: document.getElementById('dlg-cat'),
    chip: document.getElementById('dlg-chip'),
    title: document.getElementById('dlg-title'),
    riddlePanel: document.getElementById('riddle-panel'),
    tabs: document.getElementById('riddle-tabs'),
    style: document.getElementById('riddle-style'),
    riddleQ: document.getElementById('riddle-q'),
    hintList: document.getElementById('hint-list'),
    foundBtn: document.getElementById('found-btn'),
    revelioWrap: document.getElementById('revelio-wrap'),
    revelioBtn: document.getElementById('revelio-btn'),
    foundNote: document.getElementById('found-note'),
    foundPanel: document.getElementById('found-panel'),
    banner: document.getElementById('found-banner'),
    story: document.getElementById('found-story'),
    photoLabel: document.getElementById('photo-label'),
    photoTask: document.getElementById('photo-task'),
    photoGrid: document.getElementById('gem-photo'),
    collectBtn: document.getElementById('collect-btn'),
    collectNote: document.getElementById('collect-note'),
    albumLink: document.getElementById('album-link'),
    close: document.getElementById('dlg-close')
  };

  const STATUS = {
    new: { label: 'Not found yet', cls: 'chip-new' },
    discovered: { label: 'Discovered', cls: 'chip-found' },
    collected: { label: '✓ In your album', cls: 'chip-collected' }
  };

  // wording that differs between a real place and the personal final gem
  const COPY = {
    physical: {
      eyebrow: 'Hidden place',
      foundBtn: 'I’ve found it',
      foundNote: 'There is no answer to type. When you are standing there, tap the button.',
      photoLabel: 'Your photo',
      photoTask: 'Capture the moment',
      slotLabel: 'Your photo of this place',
      captionPlaceholder: ''
    },
    personal: {
      eyebrow: 'Personal discovery',
      foundBtn: 'I’ve found my discovery',
      foundNote: 'There is no right answer here. It only has to be true for you.',
      photoLabel: 'Your newest discovery',
      photoTask: 'Capture your newest discovery',
      slotLabel: 'Your discovery',
      captionPlaceholder: 'Name your discovery (optional)'
    }
  };

  const LOCK_ICON =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  const STAR_SVG =
    '<svg viewBox="0 0 64 64" width="72" height="72" fill="currentColor" aria-hidden="true">' +
    '<path d="M32 2l3.2 22.4L58 32l-22.8 7.6L32 62l-3.2-22.4L6 32l22.8-7.6z"/>' +
    '<path opacity=".55" d="M32 16l2.4 11.6L46 32l-11.6 4.4L32 48l-2.4-11.6L18 32l11.6-4.4z"/></svg>';

  let current = null;       // the gem open in the dialog
  let riddleIndex = 0;
  let revealed = {};        // 'HG03:A' -> true once Revelio was used (kept while the page is open)

  /* ---------- helpers ---------- */
  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function statusChip(node, status) {
    node.className = 'chip ' + STATUS[status].cls;
    node.textContent = STATUS[status].label;
  }

  function photoKey(gem) {
    return 'gem:' + gem.id;
  }

  /* ---------- grid ---------- */
  function mediaHTML(gem) {
    if (gem.image) return '<img src="' + gem.image + '" alt="' + esc(gem.imageAlt) + '" loading="lazy">';
    return '<span class="gem-art" aria-hidden="true">' + STAR_SVG + '</span>';
  }

  function renderGrid() {
    grid.innerHTML = EAData.gems.map(function (gem) {
      const status = EAStore.status(gem.id);
      const theme = gem.theme === 'final' ? ' theme-final' : '';

      // locked: not enough challenges completed yet (name and details stay hidden)
      if (!EAProgress.isGemUnlocked(gem)) {
        const left = EAProgress.remainingFor(gem);
        const need = 'Complete ' + plural(left, 'more challenge') + ' (' + EAProgress.needText(gem).replace('Unlocks after ', '') + ') to reveal this ' + (gem.kind === 'personal' ? 'discovery' : 'place') + '.';
        return (
          '<li class="gem-card is-locked' + theme + '">' +
          '  <div class="gem-media">' + mediaHTML(gem).replace(/alt="[^"]*"/, 'alt="" aria-hidden="true"') +
          '    <span class="chip chip-status chip-locked">' + LOCK_ICON + ' Locked</span>' +
          '  </div>' +
          '  <div class="gem-body">' +
          '    <p class="eyebrow">Hidden gem</p>' +
          '    <h3>Not revealed yet</h3>' +
          '    <p>' + need + '</p>' +
          '    <a class="gem-open gem-cta" href="challenges.html">Go to challenges →</a>' +
          '  </div>' +
          '</li>'
        );
      }

      const revealedName = EAProgress.isRevealed(gem);
      return (
        '<li class="gem-card' + theme + '">' +
        '  <div class="gem-media">' + mediaHTML(gem) +
        '    <span class="chip chip-status ' + STATUS[status].cls + '">' + STATUS[status].label + '</span>' +
        '  </div>' +
        '  <div class="gem-body">' +
        '    <p class="eyebrow">' + COPY[gem.kind].eyebrow + '</p>' +
        '    <h3><button type="button" class="gem-open" data-id="' + gem.id + '">' + esc(EAProgress.displayName(gem)) + '</button></h3>' +
        '    <p class="gem-text">' + (revealedName ? esc(gem.description) : plural(gem.riddles.length, 'riddle') + ' waiting for you.') + '</p>' +
        '    <span class="gem-cta" aria-hidden="true">' + (status === 'new' ? 'Open the riddles →' : 'View this ' + (gem.kind === 'personal' ? 'discovery' : 'place') + ' →') + '</span>' +
        '  </div>' +
        '</li>'
      );
    }).join('');

    const found = EAStore.count('discovered');
    progressText.innerHTML = '<span>' + found + '</span> of ' + EAData.gems.length + ' hidden gems discovered';

    const unlockLine = document.getElementById('unlock-line');
    if (unlockLine) {
      const next = EAProgress.nextLockedGem();
      const done = EAProgress.completedCount();
      unlockLine.innerHTML =
        EAProgress.unlockedGemCount() + ' of ' + EAData.gems.length + ' unlocked · ' + plural(done, 'challenge') + ' completed. ' +
        (next ? '<a href="challenges.html">' + 'Complete ' + plural(EAProgress.remainingFor(next), 'more challenge') + ' to unlock the next gem →' + '</a>'
          : 'Everything is open.');
    }
  }

  grid.addEventListener('click', function (event) {
    const btn = event.target.closest('.gem-open');
    if (btn && btn.dataset.id) openGem(btn.dataset.id);
  });

  /* ---------- riddles ---------- */
  function renderTabs() {
    el.tabs.innerHTML = current.riddles.map(function (r, i) {
      return '<button type="button" class="riddle-tab" data-index="' + i + '" aria-pressed="' + (i === riddleIndex) + '">Riddle ' + esc(r.id) + '</button>';
    }).join('');
  }

  function showRiddle() {
    const r = current.riddles[riddleIndex];
    el.style.textContent = r.style;     // JSON text goes in with textContent, never as HTML
    el.riddleQ.textContent = r.text;
    el.hintList.innerHTML = '';

    const hasHint = Boolean(r.hint);
    el.revelioWrap.hidden = !hasHint;
    const done = hasHint && revealed[current.id + ':' + r.id];
    el.revelioBtn.disabled = Boolean(done);
    el.revelioBtn.innerHTML = done ? 'Revealed <span aria-hidden="true">✦</span>' : 'Revelio <span aria-hidden="true">✦</span>';
    if (done) addHint(r.hint, false);
    renderTabs();
  }

  function addHint(text, animate) {
    const p = document.createElement('p');
    p.className = 'hint-reveal' + (animate ? ' is-new' : '');
    const label = document.createElement('span');
    label.className = 'hint-tag';
    label.textContent = 'Hint';
    p.appendChild(label);
    p.appendChild(document.createTextNode(' ' + text));
    el.hintList.appendChild(p);
  }

  // a short burst of sparkles around the button (pure decoration, removed afterwards)
  function sparkle() {
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.setAttribute('aria-hidden', 'true');
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
      const dist = 34 + Math.random() * 30;
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      s.style.animationDelay = Math.random() * 120 + 'ms';
      el.revelioWrap.appendChild(s);
      setTimeout(function () { s.remove(); }, 1100);
    }
  }

  el.revelioBtn.addEventListener('click', function () {
    const r = current.riddles[riddleIndex];
    if (!r.hint || revealed[current.id + ':' + r.id]) return;
    revealed[current.id + ':' + r.id] = true;
    sparkle();
    addHint(r.hint, true);
    el.revelioBtn.disabled = true;
    el.revelioBtn.innerHTML = 'Revealed <span aria-hidden="true">✦</span>';
  });

  el.tabs.addEventListener('click', function (event) {
    const tab = event.target.closest('.riddle-tab');
    if (!tab) return;
    riddleIndex = Number(tab.dataset.index);
    showRiddle();
    const again = el.tabs.querySelector('[data-index="' + riddleIndex + '"]');
    if (again) again.focus();
  });

  /* ---------- found panel: photo + album ---------- */
  function renderGemPhoto() {
    const copy = COPY[current.kind];
    const collected = EAStore.status(current.id) === 'collected';
    el.photoGrid.innerHTML = EAPhotoUI.slotHTML({
      key: photoKey(current),
      label: copy.slotLabel,
      wide: true,
      caption: current.kind === 'personal',
      placeholder: copy.captionPlaceholder,
      captionLabel: 'Name your discovery',
      removable: !collected // once it is in the album the photo can be replaced, not removed
    });
    updateCollect();
  }

  function updateCollect() {
    const hasPhoto = EAPhotos.has(photoKey(current));
    const collected = EAStore.status(current.id) === 'collected';
    el.collectBtn.disabled = collected || !hasPhoto;
    el.collectBtn.textContent = collected ? '✓ Added to your album' : 'Add to my album';
    el.albumLink.hidden = !collected;
    el.collectNote.textContent = collected
      ? 'Replace the photo above any time. Your album updates, it never duplicates.'
      : hasPhoto ? 'Ready when you are.' : 'Add a photo to put this in your album.';
  }

  // decides what the dialog shows based on saved progress
  function syncPanels(announce) {
    const status = EAStore.status(current.id);
    statusChip(el.chip, status);

    el.riddlePanel.hidden = status !== 'new';
    el.foundPanel.hidden = status === 'new';
    el.title.textContent = EAProgress.isRevealed(current) ? current.name : 'A hidden place';

    if (status !== 'new') {
      const copy = COPY[current.kind];
      el.story.textContent = current.description;
      el.photoLabel.textContent = copy.photoLabel;
      el.photoTask.textContent = copy.photoTask;
      el.banner.textContent = announce || 'You’ve discovered ' + current.name + '.';
      renderGemPhoto();
    }
  }

  function openGem(id) {
    const gem = EAData.gem(id);
    if (!gem || !EAProgress.isGemUnlocked(gem)) return; // locked gems can't be opened (also blocks ?open= links)
    current = gem;
    riddleIndex = 0;
    const copy = COPY[gem.kind];

    dialog.classList.toggle('theme-final', gem.theme === 'final');
    dialog.dataset.kind = gem.kind;

    // media: the gem's illustration, or the master logo for the final gem
    if (gem.image) {
      el.img.src = gem.image;
      el.img.alt = gem.imageAlt;
      el.img.classList.remove('is-logo');
      el.illus.hidden = false;
    } else {
      el.img.src = 'assets/final-wave/master-logo.webp';
      el.img.alt = 'Ever Afterlight. Every place holds a story.';
      el.img.classList.add('is-logo');
      el.illus.hidden = true;
    }

    el.cat.textContent = copy.eyebrow;
    el.foundBtn.textContent = copy.foundBtn;
    el.foundNote.textContent = copy.foundNote;
    showRiddle();
    syncPanels();

    if (!dialog.open) {
      dialog.showModal();
      document.body.classList.add('no-scroll');
      dialog.scrollTop = 0;
    }
  }

  function markDiscovered() {
    EAStore.set(current.id, 'discovered');
    syncPanels(current.kind === 'personal' ? 'You’ve found “' + current.name + '”.' : 'You found ' + current.name + '.');
    renderGrid();
    el.banner.focus(); // move focus so screen readers announce the result
  }

  /* ---------- events ---------- */
  el.foundBtn.addEventListener('click', markDiscovered);

  EAPhotoUI.attach(el.photoGrid, {
    onFile: function (key, file) {
      return EAPhotos.save(key, file).then(function () {
        renderGemPhoto();
        EAPhotoUI.focusSlot(el.photoGrid, key);
      });
    },
    onRemove: function (key) {
      return EAPhotos.remove(key).then(function () {
        renderGemPhoto();
        EAPhotoUI.focusSlot(el.photoGrid, key);
      });
    },
    onCaption: function (key, text) {
      return EAPhotos.setCaption(key, text);
    }
  });

  el.collectBtn.addEventListener('click', function () {
    if (!EAPhotos.has(photoKey(current))) return; // a gem only joins the album with a saved photo
    EAStore.set(current.id, 'collected');
    syncPanels();
    renderGrid();
  });

  el.close.addEventListener('click', function () { dialog.close(); });

  // clicking the dimmed backdrop closes the dialog
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', function () {
    document.body.classList.remove('no-scroll');
  });

  /* ---------- start ---------- */
  Promise.all([EAData.load(), EAPhotos.load()]).then(function () {
    renderGrid();
    // deep link from the home page: gems.html?open=HG01
    const requested = new URLSearchParams(window.location.search).get('open');
    if (requested) openGem(requested);
  }).catch(function (err) { EAData.showError(grid, err); });
})();
