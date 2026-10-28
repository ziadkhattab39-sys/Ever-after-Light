/* ------------------------------------------------------------------
   Progress rules - the one place that connects challenges to gems.

   - A slot only counts when its photo is really saved (EAPhotos has it).
     Ticking nothing, or a leftover flag without a photo, never counts.
   - A challenge is "completed" when it has `required` saved photos:
       collection -> every one of its slots (10 for CH01 and CH02)
       multi      -> at least rules.min photos
       single     -> its one photo
   - A gem unlocks from its `unlock` rule (data/game-config.js):
       { challenges: N }   N completed challenges
       { requires: [ids] } these specific challenges completed
   - A gem the visitor has already opened stays unlocked.
------------------------------------------------------------------- */

const EAProgress = (function () {
  function slotKey(challengeId, slotId) {
    return challengeId + ':' + slotId;
  }

  function challengeState(challenge) {
    let ids = EAStore.capturedItems(challenge.id).filter(function (slot) {
      return EAPhotos.has(slotKey(challenge.id, slot));
    });
    if (challenge.rules.type === 'collection') {
      ids = ids.filter(function (slot) { return challenge.slotIds.indexOf(slot) !== -1; });
    } else if (challenge.rules.type === 'single') {
      ids = ids.filter(function (slot) { return slot === 's1'; });
    }
    const total = challenge.required;
    const done = Math.min(ids.length, total);
    return {
      doneIds: ids,        // slots with a saved photo
      count: ids.length,   // photos saved (can exceed `total` on multi challenges)
      done: done,
      total: total,
      status: ids.length >= total ? 'completed' : ids.length > 0 ? 'progress' : 'new'
    };
  }

  function isCompleted(challengeId) {
    const c = EAData.challenge(challengeId);
    return Boolean(c) && challengeState(c).status === 'completed';
  }

  function completedCount() {
    return EAData.challenges.filter(function (c) { return challengeState(c).status === 'completed'; }).length;
  }

  function meetsRule(gem) {
    const rule = gem.unlock || {};
    if (rule.requires) return rule.requires.every(isCompleted);
    return completedCount() >= (rule.challenges || 0);
  }

  function isGemUnlocked(gem) {
    return meetsRule(gem) || EAStore.status(gem.id) !== 'new';
  }

  function unlockedGemCount() {
    return EAData.gems.filter(isGemUnlocked).length;
  }

  function unlockedGemIds() {
    return EAData.gems.filter(isGemUnlocked).map(function (g) { return g.id; });
  }

  // how many more challenges a locked gem still needs (0 = nothing missing)
  function remainingFor(gem) {
    const rule = gem.unlock || {};
    if (rule.requires) return rule.requires.filter(function (id) { return !isCompleted(id); }).length;
    return Math.max(0, (rule.challenges || 0) - completedCount());
  }

  // a short phrase for what a gem needs, e.g. "Unlocks after 3 challenges"
  function needText(gem) {
    const rule = gem.unlock || {};
    if (rule.requires) return 'Unlocks after ' + rule.requires[0] + '–' + rule.requires[rule.requires.length - 1] + ' are completed';
    if (!rule.challenges) return 'Open from the start';
    return 'Unlocks after ' + rule.challenges + ' challenge' + (rule.challenges === 1 ? '' : 's');
  }

  // the locked gem that is closest to opening (null = nothing left to unlock)
  function nextLockedGem() {
    const locked = EAData.gems.filter(function (g) { return !isGemUnlocked(g); });
    if (!locked.length) return null;
    return locked.slice().sort(function (a, b) { return remainingFor(a) - remainingFor(b); })[0];
  }

  // Real campus places are only named once the player has found them (the name would spoil the riddle).
  // A personal gem is not a place, so its name is shown as soon as it is unlocked.
  function isRevealed(gem) {
    return isGemUnlocked(gem) && (gem.kind === 'personal' || EAStore.status(gem.id) !== 'new');
  }

  // what to call a gem in lists and banners
  function displayName(gem) {
    return isRevealed(gem) ? gem.name : isGemUnlocked(gem) ? 'A hidden place' : 'Mystery gem';
  }

  return {
    isRevealed: isRevealed,
    displayName: displayName,
    slotKey: slotKey,
    challengeState: challengeState,
    isCompleted: isCompleted,
    completedCount: completedCount,
    isGemUnlocked: isGemUnlocked,
    unlockedGemCount: unlockedGemCount,
    unlockedGemIds: unlockedGemIds,
    remainingFor: remainingFor,
    needText: needText,
    nextLockedGem: nextLockedGem
  };
})();
