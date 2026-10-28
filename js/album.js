/* ------------------------------------------------------------------
   Album page
   Built from what the player has really saved - nothing is hardcoded:
   - every challenge photo (one polaroid per saved slot)
   - every hidden gem that was collected, with the player's own photo
   Photos are keyed by slot, so replacing a photo updates its polaroid
   instead of adding a second one.
------------------------------------------------------------------- */
(function () {
  const mineGrid = document.getElementById('mine-grid');
  const emptyState = document.getElementById('empty-state');
  const countText = document.getElementById('album-count');
  const resetBtn = document.getElementById('reset-btn');
  if (!mineGrid) return;

  const esc = EAPhotoUI ? EAPhotoUI.esc : function (t) { return String(t); };

  function formatDate(iso) {
    const date = new Date(iso);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // turns the saved photo records into album entries
  function entries() {
    const saved = EAStore.all();
    const out = [];
    EAPhotos.all().forEach(function (rec) {
      if (rec.key.indexOf('gem:') === 0) {
        const gem = EAData.gem(rec.key.slice(4));
        if (!gem || !saved[gem.id] || saved[gem.id].status !== 'collected') return; // only collected gems
        out.push({
          key: rec.key, rec: rec, kind: 'gem', final: gem.theme === 'final',
          title: gem.name,
          alt: 'Your photo for ' + gem.name,
          meta: rec.caption ? rec.caption : 'Hidden gem'
        });
      } else {
        const c = EAData.challenge(rec.key.split(':')[0]);
        if (!c) return;
        out.push({
          key: rec.key, rec: rec, kind: 'challenge', final: c.isFinal,
          title: c.name,
          alt: 'Your photo for ' + c.name,
          meta: rec.caption ? rec.caption : c.category
        });
      }
    });
    return out.sort(function (a, b) { return new Date(a.rec.createdAt) - new Date(b.rec.createdAt); });
  }

  function renderCollection() {
    const list = entries();
    countText.innerHTML = '<span>' + list.length + '</span> ' + (list.length === 1 ? 'moment' : 'moments') + ' collected';
    emptyState.hidden = list.length > 0;

    mineGrid.innerHTML = list.map(function (e) {
      return (
        '<figure class="polaroid' + (e.final ? ' theme-final' : '') + '">' +
        '  <span class="chip chip-collected">' + (e.kind === 'gem' ? '✦ Hidden gem' : '✓ Challenge') + '</span>' +
        '  <img src="' + EAPhotos.url(e.key) + '" alt="' + esc(e.alt) + '" loading="lazy">' +
        '  <figcaption>' +
        '    <p class="place">' + esc(e.title) + '</p>' +
        '    <p class="meta">' + formatDate(e.rec.createdAt) + ' · ' + esc(e.meta) + '</p>' +
        '  </figcaption>' +
        '</figure>'
      );
    }).join('');
  }

  resetBtn.addEventListener('click', function () {
    if (window.confirm('Reset all your progress and delete your saved photos on this device?')) {
      EAStore.reset();
      EAPhotos.clear().then(renderCollection);
    }
  });

  Promise.all([EAData.load(), EAPhotos.load()]).then(renderCollection)
    .catch(function (err) { EAData.showError(mineGrid, err); });
})();
