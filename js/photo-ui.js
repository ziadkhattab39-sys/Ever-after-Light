/* ------------------------------------------------------------------
   Photo slot - the one small component every photo uses
   (challenge checklists, single photos, extra photos, hidden gems).

   A slot shows a thumbnail (click = open the full image in a new tab),
   an Add / Replace button, Remove, and an optional caption field.

   EAPhotoUI.slotHTML(...)  -> markup for one slot
   EAPhotoUI.attach(container, handlers) -> wires one container (event delegation,
     so the container can be re-rendered as often as needed)
------------------------------------------------------------------- */

const EAPhotoUI = (function () {
  const CAMERA =
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.2" r="3.4"/></svg>';

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /* opts: key, label, caption (show a caption field), captionLabel, placeholder,
           removable (default true), wide (larger preview) */
  function slotHTML(opts) {
    const record = EAPhotos.get(opts.key);
    const has = Boolean(record);
    const removable = opts.removable !== false;
    const label = esc(opts.label);
    const thumb = has
      ? '<a class="slot-thumb" href="' + EAPhotos.url(opts.key) + '" target="_blank" rel="noopener" title="Open the full photo">' +
        '<img src="' + EAPhotos.url(opts.key) + '" alt="Your photo: ' + label + '"></a>'
      : '<span class="slot-thumb is-empty" aria-hidden="true">' + CAMERA + '</span>';
    const caption = opts.caption && has
      ? '<input class="slot-caption" type="text" maxlength="60" value="' + esc(record.caption || '') + '" ' +
        'placeholder="' + esc(opts.placeholder || 'Name it (optional)') + '" aria-label="' + esc(opts.captionLabel || 'Name for ' + opts.label) + '">'
      : '';
    return (
      '<li class="photo-slot' + (has ? ' has-photo' : '') + (opts.wide ? ' is-wide' : '') + '" data-key="' + esc(opts.key) + '">' +
      thumb +
      '<div class="slot-body">' +
      '<p class="slot-label">' + label + (has ? ' <span class="slot-check" aria-label="photo saved">✓</span>' : '') + '</p>' +
      caption +
      '<div class="slot-actions">' +
      '<label class="btn btn-ghost btn-sm slot-pick"><span>' + (has ? 'Replace photo' : esc(opts.addText || 'Add photo')) + '</span>' +
      '<input type="file" accept="image/*" class="slot-file visually-hidden" aria-label="' + (has ? 'Replace photo: ' : 'Add photo: ') + label + '"></label>' +
      (has && removable ? '<button type="button" class="link-btn" data-action="remove">Remove</button>' : '') +
      '</div>' +
      '<p class="slot-error" role="alert"></p>' +
      '</div></li>'
    );
  }

  /* handlers:
       onFile(key, file, slotEl)    -> Promise (save the photo, update progress, re-render)
       onRemove(key, slotEl)        -> Promise
       onCaption(key, text)         -> Promise (optional)
     A rejected promise shows its message inside the slot. */
  function attach(container, handlers) {
    function fail(slot, err) {
      slot.classList.remove('is-busy');
      const box = slot.querySelector('.slot-error');
      if (box) box.textContent = (err && err.message) || 'Something went wrong. Please try again.';
    }

    container.addEventListener('change', function (event) {
      const slot = event.target.closest('.photo-slot');
      if (!slot) return;
      const key = slot.dataset.key;

      if (event.target.matches('.slot-file')) {
        const file = event.target.files && event.target.files[0];
        event.target.value = ''; // lets the same file be chosen again later
        if (!file) return;
        slot.classList.add('is-busy');
        slot.querySelector('.slot-error').textContent = '';
        Promise.resolve(handlers.onFile(key, file, slot)).catch(function (err) { fail(slot, err); });
      } else if (event.target.matches('.slot-caption') && handlers.onCaption) {
        Promise.resolve(handlers.onCaption(key, event.target.value.trim())).catch(function (err) { fail(slot, err); });
      }
    });

    container.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-action="remove"]');
      if (!btn) return;
      const slot = btn.closest('.photo-slot');
      slot.classList.add('is-busy');
      Promise.resolve(handlers.onRemove(slot.dataset.key, slot)).catch(function (err) { fail(slot, err); });
    });
  }

  // after a re-render, put keyboard focus back on the slot that was just used
  function focusSlot(container, key) {
    const slots = container.querySelectorAll('.photo-slot');
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].dataset.key === key) {
        const target = slots[i].querySelector('.slot-file');
        if (target) target.focus({ preventScroll: true });
        return;
      }
    }
  }

  return { slotHTML: slotHTML, attach: attach, focusSlot: focusSlot, esc: esc };
})();
