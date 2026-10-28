/* ------------------------------------------------------------------
   Photo storage (IndexedDB) - images never go into localStorage.

   One record per photo slot, keyed by a string, so replacing a photo
   overwrites the same record (no duplicates in the album):
     'CH01:s3'        challenge CH01, slot s3
     'CH04:p17...'    a photo added to a "multi" challenge
     'gem:HG02'       the player's photo for a hidden gem

   record = { key, blob, caption, createdAt, savedAt }

   Everything is read once into memory (EAPhotos.load) so the pages can
   render synchronously. Photos are scaled down to 1600px (JPEG) before
   saving: phone photos are huge and the browser's storage is limited.
------------------------------------------------------------------- */

const EAPhotos = (function () {
  const DB_NAME = 'ever-afterlight';
  const STORE = 'photos';
  const MAX_SIDE = 1600;
  const cache = {};     // key -> record
  const urls = {};      // key -> object URL for the <img>
  let dbPromise = null;
  let loadPromise = null;
  let available = true;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        if (!window.indexedDB) { reject(new Error('IndexedDB is not available')); return; }
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE, { keyPath: 'key' }); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }
    return dbPromise;
  }

  // runs fn(store) inside a transaction; resolves when the transaction has committed
  function run(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(STORE, mode);
        let result;
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = tx.onabort = function () { reject(tx.error || new Error('Storage failed')); };
        const req = fn(tx.objectStore(STORE));
        if (req) req.onsuccess = function () { result = req.result; };
      });
    });
  }

  // read everything once; never rejects, so pages still work without storage
  function load() {
    if (!loadPromise) {
      loadPromise = run('readonly', function (s) { return s.getAll(); })
        .then(function (list) {
          (list || []).forEach(function (r) { cache[r.key] = r; });
        })
        .catch(function () { available = false; });
    }
    return loadPromise;
  }

  /* ---------- image preparation ---------- */
  function decode(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return decodeWithImg(file); });
    }
    return decodeWithImg(file);
  }

  function decodeWithImg(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function prepare(file) {
    if (!file || !/^image\//.test(file.type)) {
      return Promise.reject(new Error('Please choose an image file.'));
    }
    return decode(file).then(function (img) {
      const w = img.width || img.naturalWidth;
      const h = img.height || img.naturalHeight;
      const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // PNGs with transparency become JPEG, so give them a white base
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (img.close) img.close();
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error('This image could not be saved.'));
        }, 'image/jpeg', 0.85);
      });
    }, function () {
      throw new Error('This browser cannot read that image. Try a JPEG or PNG.');
    });
  }

  function revokeUrl(key) {
    if (urls[key]) { URL.revokeObjectURL(urls[key]); delete urls[key]; }
  }

  /* ---------- public ---------- */
  // resolves with the saved record only after IndexedDB has committed it
  function save(key, file) {
    return prepare(file).then(function (blob) {
      const now = new Date().toISOString();
      const previous = cache[key];
      const record = {
        key: key,
        blob: blob,
        caption: previous ? previous.caption : '',
        createdAt: previous ? previous.createdAt : now, // album order stays stable when a photo is replaced
        savedAt: now
      };
      return run('readwrite', function (s) { return s.put(record); }).then(function () {
        cache[key] = record;
        revokeUrl(key);
        return record;
      }, function () {
        throw new Error('Could not save the photo on this device (is private browsing on?).');
      });
    });
  }

  function setCaption(key, caption) {
    const previous = cache[key];
    if (!previous) return Promise.resolve();
    const record = Object.assign({}, previous, { caption: caption });
    return run('readwrite', function (s) { return s.put(record); }).then(function () { cache[key] = record; });
  }

  function remove(key) {
    return run('readwrite', function (s) { return s.delete(key); }).then(function () {
      delete cache[key];
      revokeUrl(key);
    });
  }

  function clear() {
    return run('readwrite', function (s) { return s.clear(); }).then(function () {
      Object.keys(cache).forEach(function (k) { delete cache[k]; revokeUrl(k); });
    }).catch(function () { /* nothing stored */ });
  }

  function url(key) {
    const r = cache[key];
    if (!r) return null;
    if (!urls[key]) urls[key] = URL.createObjectURL(r.blob);
    return urls[key];
  }

  return {
    load: load,
    save: save,
    setCaption: setCaption,
    remove: remove,
    clear: clear,
    url: url,
    get: function (key) { return cache[key] || null; },
    has: function (key) { return Boolean(cache[key]); },
    all: function () { return Object.keys(cache).map(function (k) { return cache[k]; }); },
    isAvailable: function () { return available; }
  };
})();
