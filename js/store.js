/* ------------------------------------------------------------------
   Tiny storage helper for the PROTOTYPE (localStorage only).

   Two things are saved (storage only, no game rules here):
   1. Gem status:         'new' -> 'discovered' -> 'collected'
   2. Challenge progress: the ids of the photo slots that have a saved photo

   The rules that turn this into "completed challenges" and "unlocked
   gems" live in js/progress.js.

   Photos live in IndexedDB (js/photos.js). localStorage only keeps this
   small metadata: which slots have a saved photo, and the gem status.
------------------------------------------------------------------- */

const EAStore = (function () {
  const GEM_KEY = 'ea-prototype-progress-v1';
  const CHALLENGE_KEY = 'ea-challenges-v2'; // v2: slot ids from the real challenges (old sample ticks are ignored)
  const memory = {}; // fallback if the browser blocks localStorage

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return memory[key] || {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return memory[key] || {}; // storage unavailable or data malformed
    }
  }

  function write(key, data) {
    memory[key] = data;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      /* storage blocked: progress will last for this page visit only */
    }
  }

  /* ----- gems ----- */
  function gemStatus(id) {
    const entry = read(GEM_KEY)[id];
    return entry && entry.status ? entry.status : 'new';
  }

  function setGemStatus(id, status) {
    const data = read(GEM_KEY);
    const now = new Date().toISOString();
    const previous = data[id] || {};
    data[id] = Object.assign({}, previous, {
      status: status,
      discoveredAt: previous.discoveredAt || now
    });
    if (status === 'collected') data[id].collectedAt = now;
    write(GEM_KEY, data);
  }

  function gemCount(status) {
    const data = read(GEM_KEY);
    return Object.keys(data).filter(function (id) {
      const s = data[id] && data[id].status;
      // a collected gem was also discovered
      return status === 'discovered' ? s === 'discovered' || s === 'collected' : s === status;
    }).length;
  }

  /* ----- challenges ----- */
  function capturedItems(challengeId) {
    const list = read(CHALLENGE_KEY)[challengeId];
    return Array.isArray(list) ? list : [];
  }

  function setItem(challengeId, itemId, captured) {
    const data = read(CHALLENGE_KEY);
    const current = Array.isArray(data[challengeId]) ? data[challengeId] : [];
    const without = current.filter(function (x) { return x !== itemId; });
    data[challengeId] = captured ? without.concat(itemId) : without;
    write(CHALLENGE_KEY, data);
  }

  return {
    // gems (names kept from the first version so older code keeps working)
    all: function () { return read(GEM_KEY); },
    status: gemStatus,
    set: setGemStatus,
    count: gemCount,
    // challenges
    capturedItems: capturedItems,
    setItem: setItem,
    reset: function () {
      write(GEM_KEY, {});
      write(CHALLENGE_KEY, {});
    }
  };
})();
