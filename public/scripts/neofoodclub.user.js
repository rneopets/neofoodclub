// ==UserScript==
// @name         neofoodclub
// @namespace    https://neofood.club/
// @version      1.0.1
// @description  Place your NeoFoodClub bets on the Neopets Food Club page, one click per bet
// @author       diceroll123
// @match        https://www.neopets.com/pirates/foodclub.phtml*
// @icon         https://neofood.club/icon-32x32.png
// @updateURL    https://neofood.club/scripts/neofoodclub.user.js
// @downloadURL  https://neofood.club/scripts/neofoodclub.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * Neopets no longer accepts bets through a URL, so neofood.club links to the bet page with the
 * bet set in the URL fragment instead:
 *
 *   https://www.neopets.com/pirates/foodclub.phtml?tab=bet#round=10014&b=<betsHash>
 *
 * On that page this script reads the bets from the fragment and
 *   - shows a panel with every bet in the set, each with a button that selects its pirates in the
 *     page's form and fills in the max bet amount (and places the bet too, if you turn on the
 *     "Place bets" setting), and
 *   - selects a bet's pirates in the page's own form when you click its row, so you can set the
 *     amount and place it yourself.
 *
 * Nothing is selected, filled in or placed until you click: a row, or a bet's button.
 *
 * Without a link in the address, the panel has a box to paste a bet URL into instead.
 *
 * It never talks to Neopets by itself. By default a button only sets that bet's pirates and amount
 * in the page's own form. With "Place bets" on, it also presses the page's own "Place a Bet" button,
 * so Neopets' token, checks and messages all still apply. Either way nothing is placed until you
 * click, and "Place bets" is off until you turn it on.
 */
(function () {
  'use strict';

  const ARENAS = 5;
  const BET_AMOUNT_MAX = 500000; // the largest bet amount neofoodclub will ever use
  const DEFAULT_MAX_WIN = 1000000;
  const CAP_KEY = 'neofoodclub.capBetAmounts';
  const PLACE_KEY = 'neofoodclub.placeBets';
  const PANEL_ID = 'nfc-panel';
  const STYLE_ID = 'nfc-style';

  // pirate id to the short name neofoodclub shows, SHORTHAND_PIRATE_NAMES in src/app/constants.ts
  const SHORTHAND_PIRATE_NAMES = {
    1: 'Dan',
    2: 'Sproggie',
    3: 'Orvinn',
    4: 'Lucky',
    5: 'Ed',
    6: 'Peg Leg',
    7: 'Bonnie',
    8: 'Puffo',
    9: 'Stuff',
    10: 'Squire',
    11: 'Crossblades',
    12: 'Stripey',
    13: 'Ned',
    14: 'Fair',
    15: 'Goob',
    16: 'Fran',
    17: 'Fed',
    18: 'Blackbeard',
    19: 'Buck',
    20: 'Tail',
  };

  // the panel's look, a single rule per selector
  const CSS = `
#nfc-panel{box-sizing:border-box;background:#1A202C;color:#F7FAFC;border:1px solid #2D3748;border-radius:12px;padding:12px 16px;margin:0 auto 16px;width:min(100%,760px);font-size:14px;text-align:left}
#nfc-panel .nfc-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#nfc-panel .nfc-title{font-size:18px;font-weight:bold;margin-right:auto}
#nfc-panel .nfc-coin{width:24px;height:24px}
#nfc-panel .nfc-setting{display:flex;align-items:center;gap:6px;color:#CBD5E0;cursor:pointer}
#nfc-panel .nfc-paste{margin-top:8px}
#nfc-panel .nfc-paste-box{box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid #2D3748;border-radius:6px;background:#2D3748;color:#F7FAFC}
#nfc-panel .nfc-paste-error{margin:4px 0 0;color:#FBD38D}
#nfc-panel .nfc-note{margin:8px 0 0;color:#FBD38D}
#nfc-panel .nfc-rows{margin-top:8px}
#nfc-panel .nfc-row{display:grid;grid-template-columns:2em minmax(0,1fr) 5em 8em 18em;align-items:center;column-gap:12px;padding:6px 8px 6px 12px;border-top:1px solid #2D3748;cursor:pointer}
#nfc-panel .nfc-row:hover{background:#2D3748}
#nfc-panel .nfc-row.nfc-picked{box-shadow:inset 3px 0 0 #48BB78}
#nfc-panel .nfc-num{font-weight:bold}
#nfc-panel .nfc-odds,#nfc-panel .nfc-amount{white-space:nowrap;text-align:right}
#nfc-panel .nfc-place{box-sizing:border-box;width:100%;margin:0;padding-left:0;padding-right:0;text-align:center;white-space:nowrap;cursor:pointer}
#nfc-panel .nfc-place[disabled]{opacity:.5;cursor:not-allowed}
#nfc-panel .nfc-place.nfc-done{filter:brightness(.6)}
#nfc-panel .nfc-footer{margin:8px 0 0;padding-top:8px;border-top:1px solid #2D3748;color:#CBD5E0}
@media (max-width:600px){#nfc-panel .nfc-row{grid-template-columns:2em minmax(0,1fr) auto auto;row-gap:6px}#nfc-panel .nfc-place{grid-column:1/-1}}`;

  const state = {
    link: null, // the bets from the address or the paste box: {round, bets, hash}
    placed: 0, // bets we saw get placed, a floor for the page's own count
    busy: false, // a place bet request is out
    picked: -1, // the bet that was selected by hand, or by its button
    submitting: -1, // the bet whose button pressed Place a Bet, until the request starts
    done: new Set(), // the bets placed with their button
  };

  const undo = []; // what start() set up, for stop()

  // ---------------------------------------------------------------------------------------------
  // bets, mirrors neofoodclub.rs math::bets_hash_to_bet_indices and neofoodclub's determineBetAmount
  // ---------------------------------------------------------------------------------------------

  /**
   * Decodes a bets hash into bets, each one 5 numbers (one per arena): 0 for no pick, 1 to 4 for
   * the pirate's position in the arena. Throws when the hash has characters outside a-y.
   */
  function decodeBets(hash) {
    if (!/^[a-y]*$/.test(hash)) {
      throw new Error('Invalid bets hash');
    }

    const values = [];
    for (const char of hash) {
      const value = char.charCodeAt(0) - 97;
      values.push(Math.floor(value / 5), value % 5);
    }

    const bets = [];
    for (let i = 0; i < values.length; i += ARENAS) {
      const bet = values.slice(i, i + ARENAS);
      while (bet.length < ARENAS) {
        bet.push(0);
      }
      // a chunk of zeros is padding, not a bet
      if (bet.some(Boolean)) {
        bets.push(bet);
      }
    }
    return bets;
  }

  /** Reads `round` and `b` from a location hash. Returns null when there are no bets in it. */
  function parseHash(hash) {
    const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    const betsHash = params.get('b');
    if (!betsHash) {
      return null;
    }

    try {
      const bets = decodeBets(betsHash);
      return bets.length ? { round: Number(params.get('round')) || 0, bets, hash: betsHash } : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Reads a bet from whatever was pasted: a neofood.club or Neopets bet URL, or just its fragment
   * (round=1234&b=abc). Returns null when there are no bets in it.
   */
  function parseBetInput(text) {
    const value = String(text || '').trim();
    const hashAt = value.indexOf('#');
    return parseHash(hashAt === -1 ? value : value.slice(hashAt + 1));
  }

  /**
   * The amount to stake on a bet. Capped: no more than is needed to reach the payout cap
   * (ceil(maxWin / odds)), the same as neofoodclub does. Uncapped: the full max bet.
   */
  function betAmount(totalOdds, maxBet, maxWin, capped) {
    if (!capped || !(totalOdds > 0)) {
      return maxBet;
    }
    return Math.min(maxBet, Math.ceil((maxWin || DEFAULT_MAX_WIN) / totalOdds), BET_AMOUNT_MAX);
  }

  // ---------------------------------------------------------------------------------------------
  // the Neopets form
  // ---------------------------------------------------------------------------------------------

  const byId = id => document.getElementById(id);
  const getForm = () => byId('fc-bet-form');
  const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
  const numberAttr = (el, name) => parseInt(el.getAttribute(name), 10) || 0;

  function formState(form) {
    return {
      betsPlaced: numberAttr(form, 'data-bets-placed'),
      maxBets: numberAttr(form, 'data-max-bets'),
      maxBet: numberAttr(form, 'data-max-bet'),
      maxWin: numberAttr(form, 'data-max-win'),
    };
  }

  function currentRound() {
    const pill = document.querySelector('.fc-round-pill');
    const match = pill && /\d+/.exec(pill.textContent);
    return match ? Number(match[0]) : 0;
  }

  /** The radio for pirate `position` (1 to 4) in `arena` (1 to 5), or null. */
  function pirateRadio(form, arena, position) {
    const row = form.querySelector(`.fc-bet-row[data-match="${arena}"]`);
    return (row && row.querySelectorAll('.fc-bet-pirate-radio')[position - 1]) || null;
  }

  function pirateName(radio) {
    const shorthand = SHORTHAND_PIRATE_NAMES[parseInt(radio.value, 10)];
    if (shorthand) {
      return shorthand;
    }
    const name = radio.closest('.fc-bet-pirate')?.querySelector('.fc-bet-pirate__name');
    return name ? name.textContent.trim() : '?';
  }

  /** The names and total odds of a bet, and whether every pick exists in the form. */
  function describeBet(form, bet) {
    const names = [];
    let odds = 1;
    let valid = true;

    bet.forEach((position, index) => {
      if (!position) {
        return;
      }
      const radio = position <= 4 ? pirateRadio(form, index + 1, position) : null;
      if (radio) {
        names.push(pirateName(radio));
        odds *= numberAttr(radio, 'data-odds') || 1;
      } else {
        valid = false;
      }
    });

    return { names, odds: names.length ? odds : 0, valid: valid && names.length > 0 };
  }

  function fillAmount(amount) {
    const input = byId('fc-bet-amount');
    if (input) {
      input.value = String(amount);
      fire(input, 'input');
    }
  }

  /**
   * Clears the form and ticks the pirates of `bet`. Whatever is in the amount box stays: the page's
   * reset empties it, and it could be an amount the user typed.
   */
  function fillPicks(form, bet) {
    const input = byId('fc-bet-amount');
    const amount = input ? input.value : '';

    const reset = byId('fc-bet-reset');
    if (reset) {
      reset.click();
    }
    if (amount && input.value !== amount) {
      fillAmount(amount);
    }

    bet.forEach((position, index) => {
      const radio = position ? pirateRadio(form, index + 1, position) : null;
      if (radio) {
        radio.checked = true;
        fire(radio, 'change');
      }
    });
  }

  // ---------------------------------------------------------------------------------------------
  // settings and what we know about the round
  // ---------------------------------------------------------------------------------------------

  /** A remembered on/off setting. `fallback` is used until the user has chosen. */
  function getFlag(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value === 'true';
    } catch (err) {
      return fallback;
    }
  }

  function setFlag(key, on) {
    try {
      window.localStorage.setItem(key, String(on));
    } catch (err) {
      // storage can be blocked, the setting just won't be remembered
    }
  }

  /** Clamp amounts like neofoodclub does. On by default. */
  const isCapped = () => getFlag(CAP_KEY, true);

  /** Press Neopets' Place a Bet button too, not just select the pirates and amount. Off by default. */
  const isPlacing = () => getFlag(PLACE_KEY, false);

  /** How many bets are placed, from the page or from what we saw happen, whichever is more. */
  const betsPlaced = form => Math.max(formState(form).betsPlaced, state.placed);

  /** Why the bets can't be used right now, or an empty string. */
  function problem(form) {
    if (!state.link) {
      return '';
    }

    const round = currentRound();
    if (state.link.round && state.link.round !== round) {
      return `This link is for round ${state.link.round}, but the page is on round ${round || '?'}.`;
    }

    const { maxBets } = formState(form);
    if (maxBets > 0 && betsPlaced(form) >= maxBets) {
      return `You have placed all ${maxBets} of your bets for this round.`;
    }
    return '';
  }

  // ---------------------------------------------------------------------------------------------
  // acting on a bet
  // ---------------------------------------------------------------------------------------------

  /** The form, bet and description for the bet at `index`, or null when it can't be used now. */
  function usableBet(index) {
    const form = getForm();
    const bet = state.link && state.link.bets[index];
    if (!form || !bet || state.busy || problem(form)) {
      return null;
    }

    const described = describeBet(form, bet);
    return described.valid ? { form, bet, described } : null;
  }

  /** Marks the bet that was selected. */
  function markPicked(index) {
    state.picked = index;
    render();
  }

  /** Click on a row: select the pirates of its bet, the amount is left as it is. */
  function selectBet(index) {
    const usable = usableBet(index);
    if (usable) {
      fillPicks(usable.form, usable.bet);
      markPicked(index);
    }
  }

  /**
   * Click on a bet's button: select its pirates and fill in the amount, and with the Place bets
   * setting on, press the page's own Place a Bet button too.
   */
  function fillBet(index) {
    const usable = usableBet(index);
    if (!usable) {
      return;
    }

    state.submitting = -1;
    const { form, bet, described } = usable;
    const { maxBet, maxWin } = formState(form);
    fillPicks(form, bet);
    if (isCapped()) {
      fillAmount(betAmount(described.odds, maxBet, maxWin, true));
    } else {
      byId('fc-bet-max')?.click();
    }

    if (isPlacing()) {
      // the page's own handler does the rest: token, checks, the request and its popups
      state.submitting = index;
      byId('fc-bet-submit')?.click();
    } else {
      markPicked(index);
    }
  }

  /** Uses a pasted bet URL. `complain` says whether to tell the user when it has no bets. */
  function applyBetInput(text, complain) {
    const link = parseBetInput(text);
    if (!link) {
      const error = document.querySelector(`#${PANEL_ID} .nfc-paste-error`);
      if (error) {
        error.textContent =
          complain && text.trim() ? 'That does not look like a NeoFoodClub bet URL.' : '';
      }
      return;
    }

    state.link = link;
    state.picked = -1;
    state.done.clear();
    try {
      // so a reload keeps the bets, like a link would
      const round = link.round ? `round=${link.round}&` : '';
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#${round}b=${link.hash}`,
      );
    } catch (err) {
      // the address can't be changed here, the bets just won't survive a reload
    }
    render();
  }

  // ---------------------------------------------------------------------------------------------
  // the page's own place bet request
  // ---------------------------------------------------------------------------------------------

  /** Watches (and doesn't touch) the page's request, to know when a bet went through. */
  function watchPlaceBet() {
    const original = window.fetch;
    if (typeof original !== 'function' || original.__nfcWrapped) {
      return;
    }

    window.fetch = function (input) {
      const promise = original.apply(this, arguments);
      const url = typeof input === 'string' ? input : input && input.url;
      if (!String(url).includes('place_bet.php')) {
        return promise;
      }

      const form = getForm();
      const base = state.link && form ? betsPlaced(form) : state.placed;
      const submitted = state.submitting;
      state.submitting = -1;
      state.busy = true;
      render();

      promise
        .then(response =>
          response
            .clone()
            .json()
            .then(data => {
              if (response.ok && data && !data.error && data.success !== false) {
                state.placed = base + 1;
                if (submitted >= 0) {
                  state.done.add(submitted);
                }
              }
            }),
        )
        .catch(() => undefined)
        .then(() => {
          state.busy = false;
          state.picked = -1;
          render();
        });

      return promise;
    };
    window.fetch.__nfcWrapped = true;
    undo.push(() => {
      window.fetch = original;
    });
  }

  // ---------------------------------------------------------------------------------------------
  // the panel
  // ---------------------------------------------------------------------------------------------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  const setText = (node, text) => {
    if (node.textContent !== text) {
      node.textContent = text;
    }
  };

  const buttonLabel = index =>
    `${isPlacing() ? 'Max Bet + Place Bet #' : 'Select Pirates + Fill Max Bet #'}${index + 1}`;

  function buildSetting(text, className, checked, onChange) {
    const label = el('label', `nfc-setting ${className}`);
    const box = el('input');
    box.type = 'checkbox';
    box.checked = checked;
    box.addEventListener('change', () => {
      onChange(box.checked);
      render();
    });
    label.append(box, text);
    return label;
  }

  /** The box for a bet URL, for when the page was opened without one. */
  function buildPasteBox() {
    const box = el('input', 'nfc-paste-box');
    box.type = 'text';
    box.placeholder = 'Paste a NeoFoodClub bet URL here';
    box.setAttribute('aria-label', 'NeoFoodClub bet URL');
    box.addEventListener('input', () => applyBetInput(box.value, false));
    box.addEventListener('change', () => applyBetInput(box.value, true));
    // the pasted text is only in the box once the event is done
    box.addEventListener('paste', () => window.setTimeout(() => applyBetInput(box.value, true), 0));

    const paste = el('div', 'nfc-paste');
    paste.append(box, el('p', 'nfc-paste-error'));
    return paste;
  }

  function buildPanel() {
    const head = el('div', 'nfc-head');
    const coin = el('img', 'nfc-coin');
    coin.src = 'https://neofood.club/icon-32x32.png';
    coin.alt = '';
    head.append(
      coin,
      el('span', 'nfc-title', 'NeoFoodClub'),
      buildSetting('Cap bet amounts', 'nfc-cap', isCapped(), on => setFlag(CAP_KEY, on)),
      buildSetting('Place bets', 'nfc-place-setting', isPlacing(), on => setFlag(PLACE_KEY, on)),
    );

    const note = el('p', 'nfc-note');
    note.hidden = true;

    const panel = el('div');
    panel.id = PANEL_ID;
    panel.append(head, buildPasteBox(), note, el('div', 'nfc-rows'), el('p', 'nfc-footer'));
    return panel;
  }

  function buildRow(index) {
    const row = el('div', 'nfc-row');
    row.tabIndex = 0;
    row.title = 'Click to select these pirates in the form';
    row.addEventListener('click', event => {
      // the button has its own job, a click on it is not a click on the row
      if (!event.target.closest('button')) {
        selectBet(index);
      }
    });
    row.addEventListener('keydown', event => {
      // only the row itself, Enter and Space on the button are the button's
      if (event.target === row && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        selectBet(index);
      }
    });

    const button = el('button', 'nfc-place button-default__2020 button-green__2020');
    button.type = 'button';
    button.addEventListener('click', () => fillBet(index));

    row.append(
      el('span', 'nfc-num', String(index + 1)),
      el('span', 'nfc-names'),
      el('span', 'nfc-odds'),
      el('span', 'nfc-amount'),
      button,
    );
    return row;
  }

  function updateRow(row, index, view) {
    const { names, odds, valid } = describeBet(view.form, state.link.bets[index]);

    // nfc-picked marks the bet that was selected
    row.className = ['nfc-row', index === state.picked && 'nfc-picked'].filter(Boolean).join(' ');

    const [, namesCell, oddsCell, amountCell, button] = row.children;
    setText(namesCell, names.join(' x ') || 'Unknown pirates');
    setText(oddsCell, odds ? `${odds}:1` : '-');
    setText(
      amountCell,
      valid
        ? `${betAmount(odds, view.maxBet, view.maxWin, view.capped).toLocaleString('en-US')} NP`
        : '-',
    );
    setText(button, buttonLabel(index));
    button.classList.toggle('nfc-done', isPlacing() && state.done.has(index));
    button.disabled = state.busy || Boolean(view.blocked) || !valid;
  }

  /** Brings the panel's rows, buttons and notes up to date with the form and our state. */
  function updatePanel(panel, form) {
    const view = {
      form,
      ...formState(form),
      capped: isCapped(),
      placed: betsPlaced(form),
      blocked: problem(form),
    };
    const q = selector => panel.querySelector(selector);

    // the box for a bet URL is only needed until there are bets
    q('.nfc-paste').hidden = Boolean(state.link);
    if (state.link) {
      q('.nfc-paste-error').textContent = '';
    }

    q('.nfc-note').textContent = view.blocked;
    q('.nfc-note').hidden = !view.blocked;

    // so people can keep track, the page itself doesn't say
    q('.nfc-footer').textContent =
      `You have placed ${view.placed} ${view.placed === 1 ? 'bet' : 'bets'} this round.`;

    // The rows and their buttons are made once per set of bets and then only updated. Making them
    // anew on every refresh could replace a button between the mouse going down and coming up, and
    // the click would be lost.
    const rows = q('.nfc-rows');
    const bets = state.link ? state.link.bets : [];
    if (rows.nfcLink !== state.link) {
      rows.nfcLink = state.link;
      rows.replaceChildren(...bets.map((bet, index) => buildRow(index)));
    }
    bets.forEach((bet, index) => updateRow(rows.children[index], index, view));
  }

  function render() {
    const form = getForm();
    if (!form) {
      return;
    }

    if (!byId(STYLE_ID)) {
      const style = el('style', '', CSS);
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    let panel = byId(PANEL_ID);
    if (!panel) {
      panel = buildPanel();
      const pill = document.querySelector('.fc-round-pill');
      if (pill) {
        pill.after(panel);
      } else {
        (form.closest('.fc-tab') || form.parentNode).prepend(panel);
      }
    }

    updatePanel(panel, form);
  }

  // ---------------------------------------------------------------------------------------------
  // start up
  // ---------------------------------------------------------------------------------------------

  function start() {
    // without a link in the address there is still the box to paste one into
    state.link = parseHash(window.location.hash);

    watchPlaceBet();
    render();

    // the bet tab is swapped in and out without a page load, and the page changes
    // data-bets-placed after a bet, so keep an eye on the document
    let pending = 0;
    const observer = new MutationObserver(mutations => {
      // our own changes to the panel shouldn't set us off again
      const panel = byId(PANEL_ID);
      if (!pending && mutations.some(({ target }) => !(panel && panel.contains(target)))) {
        pending = window.setTimeout(() => {
          pending = 0;
          render();
        }, 50);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-bets-placed'],
    });

    const onHashChange = () => {
      state.link = parseHash(window.location.hash);
      state.picked = -1;
      state.done.clear();
      byId(PANEL_ID)?.remove();
      render();
    };
    window.addEventListener('hashchange', onHashChange);

    undo.push(
      () => observer.disconnect(),
      () => window.removeEventListener('hashchange', onHashChange),
    );
  }

  // for the tests, which load this file into a page and drive it
  if (window.__NFC_USERSCRIPT_TEST__) {
    window.__NFC_USERSCRIPT_TEST__ = {
      decodeBets,
      parseHash,
      parseBetInput,
      betAmount,
      shorthandNames: SHORTHAND_PIRATE_NAMES,
      state,
      start,
      render,
      stop: () => undo.splice(0).forEach(fn => fn()),
    };
    return;
  }

  start();
})();
