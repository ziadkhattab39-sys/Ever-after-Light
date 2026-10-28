/* Home page: fills the small "glimpse" preview from the real hidden gems JSON. */
(function () {
  const teaser = document.getElementById('teaser');
  const miniGrid = document.getElementById('mini-grid');
  if (!teaser || !miniGrid) return;

  Promise.all([EAData.load(), EAPhotos.load()]).then(function () {
    const gem = EAData.gems[0];
    let index = 0;

    teaser.innerHTML =
      '<p class="label">A riddle from the hidden gems</p>' +
      '<p class="riddle-style" id="teaser-style"></p>' +
      '<p class="quote" id="teaser-quote"></p>' +
      '<div class="teaser-actions">' +
      '  <button type="button" class="btn btn-ghost" id="teaser-next">Show another riddle</button>' +
      '  <a class="btn btn-primary" href="gems.html?open=' + gem.id + '">Try this riddle</a>' +
      '</div>';

    // textContent keeps the data from being treated as HTML
    function show() {
      const r = gem.riddles[index];
      document.getElementById('teaser-style').textContent = r.style;
      document.getElementById('teaser-quote').textContent = '“' + r.text + '”';
    }
    show();
    document.getElementById('teaser-next').addEventListener('click', function () {
      index = (index + 1) % gem.riddles.length;
      show();
    });

    // unlocked gems link to their riddles; locked ones stay a mystery and point to the challenges
    miniGrid.innerHTML = EAData.gems.map(function (g) {
      const art = g.image
        ? '<img src="' + g.image + '" alt="" loading="lazy">'
        : '<span class="mini-art" aria-hidden="true">✦</span>';
      if (!EAProgress.isGemUnlocked(g)) {
        return (
          '<a class="mini-card is-locked' + (g.theme === 'final' ? ' theme-final' : '') + '" href="challenges.html">' + art +
          '<span>Locked gem<small>Unlocked by challenges</small></span></a>'
        );
      }
      return (
        '<a class="mini-card' + (g.theme === 'final' ? ' theme-final' : '') + '" href="gems.html?open=' + g.id + '">' + art +
        '<span></span></a>'
      );
    }).join('') + '<p class="mini-note">Finish photo challenges to reveal more of them.</p>';

    // names go in with textContent (and real places stay unnamed until found)
    const spans = miniGrid.querySelectorAll('a.mini-card:not(.is-locked) > span');
    EAData.gems.filter(EAProgress.isGemUnlocked).forEach(function (g, i) {
      spans[i].textContent = EAProgress.displayName(g);
    });
  }).catch(function (err) { EAData.showError(teaser, err); });
})();
