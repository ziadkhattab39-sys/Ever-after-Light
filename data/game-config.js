/* ------------------------------------------------------------------
   GAME CONFIG - the rules the JSON files do not carry.

   The REAL CONTENT (names, descriptions, goals, riddles, hints) lives only in:
     data/ever_afterlight_challenges.json
     data/ever_afterlight_hidden_gems.json
   Nothing in this file rewrites that text. This file only says HOW each
   challenge is completed, which challenges belong to the final wave, and
   when each hidden gem unlocks. Everything is matched by id.

   Challenge "type" decides what counts as completed:
     collection  count items, each with its OWN photo slot. Done when every slot has a saved photo.
     multi       the player adds photos one by one. Done at `min` saved photos (up to `max`).
     single      one photo. Done when it is saved.

   Why these numbers? Only CH01 and CH02 state a number in their goal (10).
   Everything else is `single`, except CH03, CH04 and CH05 whose goals are
   plural ("shapes", "color variations", "different ... forms"). Those take several
   photos; `min` is the smallest honest reading of the goal. Change any value here.
------------------------------------------------------------------- */

const GAME_CONFIG = {
  files: {
    challenges: 'data/ever_afterlight_challenges.json',
    gems: 'data/ever_afterlight_hidden_gems.json'
  },

  // challenges that get the Final Wave palette (css: .theme-final)
  finalWave: ['CH11', 'CH12', 'CH13', 'CH14', 'CH15'],

  challengeRules: {
    CH01: { type: 'collection', count: 10, itemLabel: 'Faculty logo' },
    CH02: { type: 'collection', count: 10, itemLabel: 'Flower' },
    CH03: { type: 'multi', min: 1, max: 12, itemLabel: 'Natural shape' },
    CH04: { type: 'multi', min: 2, max: 12, itemLabel: 'Colour variation' },
    CH05: { type: 'multi', min: 2, max: 12, itemLabel: 'Daisy-like flower' }
    // every challenge not listed here is { type: 'single' }
  },

  // decorative cover for the first ten challenges (existing illustrations).
  // The final five use the Final Wave gradient cover instead.
  covers: {
    CH01: ['assets/img/samples/challenge-logos.svg', 'Illustration of shield-shaped badges on a wall'],
    CH02: ['assets/img/samples/challenge-flowers.svg', 'Illustration of several blooming flowers'],
    CH03: ['assets/img/samples/challenge-details.svg', 'Illustration of a row of stone arches and columns'],
    CH04: ['assets/img/samples/challenge-flowers.svg', 'Illustration of several blooming flowers'],
    CH05: ['assets/img/samples/challenge-flowers.svg', 'Illustration of several blooming flowers'],
    CH06: ['assets/img/samples/challenge-details.svg', 'Illustration of a row of stone arches and columns'],
    CH07: ['assets/img/samples/challenge-golden-hour.svg', 'Illustration of a low sun casting long shadows across a lawn'],
    CH08: ['assets/img/samples/challenge-golden-hour.svg', 'Illustration of a low sun casting long shadows across a lawn'],
    CH09: ['assets/img/samples/clock-tower-arch.svg', 'Illustration of a clock tower framed by a stone arch'],
    CH10: ['assets/img/samples/challenge-corners.svg', 'Illustration of a narrow lane ending at a small doorway']
  },

  /* Hidden gems.
     kind:    'physical' = a real place on campus, 'personal' = a discovery inside the player
     unlock:  { challenges: N }   opens once N challenges are completed
              { requires: [ids] } opens once every listed challenge is completed
     (the JSON has no unlock rules, so these are my choice - change freely.)
     A gem the player already opened never locks again. */
  gems: {
    HG01: {
      kind: 'physical', unlock: { requires: ['CH01', 'CH02', 'CH03', 'CH04', 'CH05'] },
      image: 'assets/img/samples/sunset-terrace.svg', imageAlt: 'Illustration of a railing in front of a golden sunset skyline'
    },
    HG02: {
      kind: 'physical', unlock: { requires: ['CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06', 'CH07', 'CH08', 'CH09', 'CH10'] },
      image: 'assets/img/samples/whispering-fig-tree.svg', imageAlt: 'Illustration of a large tree with a bench beneath it'
    },
    HG03: {
      kind: 'personal', unlock: { requires: ['CH11', 'CH12', 'CH13', 'CH14', 'CH15'] }, theme: 'final',
      image: null, imageAlt: ''
    }
  }
};
