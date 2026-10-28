/* ------------------------------------------------------------------
   Data loader - the ONE place that reads the real JSON files.

   fetch()es the two JSON files and joins each entry with its rules from
   data/game-config.js (matched by id). The JSON text is passed through
   untouched. Pages call EAData.load() and then use EAData.challenges / EAData.gems.

   fetch() of local files is blocked on file://, so the site needs any
   static server (python -m http.server, GitHub Pages, ...).
------------------------------------------------------------------- */

const EAData = (function () {
  const data = { challenges: [], gems: [] };
  let promise = null;

  function getJSON(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Could not load ' + url + ' (' + res.status + ')');
      return res.json();
    });
  }

  function buildChallenge(raw) {
    const rules = Object.assign({ type: 'single' }, GAME_CONFIG.challengeRules[raw.id]);
    const c = Object.assign({}, raw); // original JSON fields stay as they are
    c.rules = rules;
    c.isFinal = GAME_CONFIG.finalWave.indexOf(raw.id) !== -1;
    c.cover = GAME_CONFIG.covers[raw.id] || null;
    if (rules.type === 'collection') {
      c.required = rules.count;
      c.slotIds = [];
      for (let i = 1; i <= rules.count; i++) c.slotIds.push('s' + i);
    } else if (rules.type === 'multi') {
      c.required = rules.min;
    } else {
      c.required = 1;
    }
    return c;
  }

  function buildGem(raw) {
    const cfg = GAME_CONFIG.gems[raw.id] || { kind: 'physical', unlock: { challenges: 0 } };
    return Object.assign({}, raw, {
      kind: cfg.kind,
      unlock: cfg.unlock,
      theme: cfg.theme || null,
      image: cfg.image,
      imageAlt: cfg.imageAlt
    });
  }

  function load() {
    if (!promise) {
      promise = Promise.all([getJSON(GAME_CONFIG.files.challenges), getJSON(GAME_CONFIG.files.gems)]).then(function (res) {
        data.challenges = res[0].map(buildChallenge);
        data.gems = res[1].map(buildGem);
        return data;
      });
    }
    return promise;
  }

  function challenge(id) {
    return data.challenges.find(function (c) { return c.id === id; });
  }

  function gem(id) {
    return data.gems.find(function (g) { return g.id === id; });
  }

  // friendly message in the page if the JSON could not be loaded
  function showError(node, err) {
    if (!node) return;
    const onDisk = window.location.protocol === 'file:';
    node.innerHTML =
      '<div class="note"><p><strong>The content could not be loaded.</strong> ' +
      (onDisk
        ? 'This page was opened straight from disk, and browsers block loading the JSON files that way. Start a small local server in the project folder (for example <code>python -m http.server</code>) and open <code>http://localhost:8000</code>.'
        : 'Check your connection and reload the page.') +
      '</p></div>';
    if (window.console) console.error(err);
  }

  return {
    load: load,
    challenge: challenge,
    gem: gem,
    showError: showError,
    get challenges() { return data.challenges; },
    get gems() { return data.gems; }
  };
})();
