import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SHORTHAND_PIRATE_NAMES } from '../constants';

type Bet = Array<number>;

interface Hooks {
  decodeBets: (hash: string) => Bet[];
  parseHash: (hash: string) => { round: number; bets: Bet[]; hash: string } | null;
  parseBetInput: (text: string) => { round: number; bets: Bet[]; hash: string } | null;
  shorthandNames: Record<number, string>;
  betAmount: (totalOdds: number, maxBet: number, maxWin: number, capped: boolean) => number;
  start: () => void;
  stop: () => void;
  render: () => void;
}

// the ten bets of the bets hash used in the neofoodclub.rs docs
const TEN_BETS_HASH = 'jmbcoemycobmbhofmdcoamyck';
const TEN_BETS = [
  [1, 4, 2, 2, 0],
  [1, 0, 2, 2, 4],
  [0, 4, 2, 2, 4],
  [4, 0, 2, 2, 4],
  [0, 1, 2, 2, 0],
  [1, 1, 2, 2, 4],
  [1, 0, 2, 2, 0],
  [3, 0, 2, 2, 4],
  [0, 0, 2, 2, 4],
  [4, 0, 2, 2, 0],
];

const SCRIPT = readFileSync(
  resolve(__dirname, '../../../public/scripts/neofoodclub.user.js'),
  'utf8',
);

function loadScript(): Hooks {
  const win = window as unknown as { __NFC_USERSCRIPT_TEST__: boolean | Hooks };
  win.__NFC_USERSCRIPT_TEST__ = true;
  new Function(SCRIPT)();
  return win.__NFC_USERSCRIPT_TEST__ as unknown as Hooks;
}

interface PageOptions {
  round?: number;
  betsPlaced?: number;
  maxBets?: number;
  maxBet?: number;
  maxWin?: number;
}

/** The parts of the Neopets bet tab the script uses, in the same structure as the live page. */
function buildPage(options: PageOptions = {}): { submit: ReturnType<typeof vi.fn> } {
  const { round = 10014, betsPlaced = 0, maxBets = 10, maxBet = 20000, maxWin = 1000000 } = options;

  const rows = [1, 2, 3, 4, 5]
    .map(
      arena => `
      <div class="fc-bet-row" data-match="${arena}">
        ${[1, 2, 3, 4]
          .map(
            position => `
          <label class="fc-bet-pirate">
            <input type="radio" class="fc-bet-pirate-radio" name="winner_${arena}"
              value="${100 + arena * 10 + position}" data-odds="${position + 1}" data-match="${arena}">
            <span class="fc-bet-pirate__name">P${arena}${position}</span>
          </label>`,
          )
          .join('')}
      </div>`,
    )
    .join('');

  document.body.innerHTML = `
    <section class="fc-tab fc-tab--bet" data-tab-panel="bet">
      <div class="fc-round-pill">Round ${round}</div>
      <form id="fc-bet-form" data-ck="token" data-max-bet="${maxBet}" data-max-win="${maxWin}"
        data-max-bets="${maxBets}" data-bets-placed="${betsPlaced}" data-balance="100000">
        <div class="fc-bet-table">${rows}</div>
        <input id="fc-bet-amount" type="text">
        <button id="fc-bet-max" type="button">Max</button>
        <button id="fc-bet-reset" type="button">Reset</button>
        <button id="fc-bet-submit" type="button">Place a Bet</button>
      </form>
    </section>`;

  // stand-ins for the page's own handlers
  const form = document.getElementById('fc-bet-form') as HTMLFormElement;
  document.getElementById('fc-bet-reset')?.addEventListener('click', () => {
    form.querySelectorAll<HTMLInputElement>('.fc-bet-pirate-radio').forEach(radio => {
      radio.checked = false;
    });
    (document.getElementById('fc-bet-amount') as HTMLInputElement).value = '';
  });
  document.getElementById('fc-bet-max')?.addEventListener('click', () => {
    (document.getElementById('fc-bet-amount') as HTMLInputElement).value = String(maxBet);
  });

  const submit = vi.fn();
  document.getElementById('fc-bet-submit')?.addEventListener('click', submit);
  return { submit };
}

function checkedValues(): number[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('.fc-bet-pirate-radio:checked'),
  ).map(radio => Number(radio.value));
}

/** The form values (100 + arena * 10 + position, not real pirate ids) a bet should leave ticked. */
function expectedValues(bet: number[]): number[] {
  return bet.flatMap((position, index) => (position ? [100 + (index + 1) * 10 + position] : []));
}

function panelButton(betNumber: number): HTMLButtonElement {
  return screen(`#nfc-panel .nfc-row:nth-child(${betNumber}) button`) as HTMLButtonElement;
}

function screen(selector: string): Element {
  const found = document.querySelector(selector);
  if (!found) {
    throw new Error(`nothing matches ${selector}`);
  }
  return found;
}

describe('neofoodclub userscript: decoding', () => {
  let hooks: Hooks;

  beforeEach(() => {
    hooks = loadScript();
  });

  it('decodes the examples from neofoodclub.rs', () => {
    expect(hooks.decodeBets('')).toEqual([]);
    expect(hooks.decodeBets('f')).toEqual([[1, 0, 0, 0, 0]]);
    expect(hooks.decodeBets('faa')).toEqual([[1, 0, 0, 0, 0]]);
    expect(hooks.decodeBets('faafaafaafaafaafaa')).toEqual([
      [1, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 1, 0],
      [0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0],
    ]);
    expect(hooks.decodeBets(TEN_BETS_HASH)).toEqual(TEN_BETS);
  });

  it('has the same shorthand pirate names as neofoodclub', () => {
    expect(
      new Map(Object.entries(hooks.shorthandNames).map(([id, name]) => [Number(id), name])),
    ).toEqual(SHORTHAND_PIRATE_NAMES);
  });

  it('throws on characters outside a-y', () => {
    expect(() => hooks.decodeBets('abz')).toThrow();
    expect(() => hooks.decodeBets('ABC')).toThrow();
  });

  it('reads the round and bets from the fragment', () => {
    expect(hooks.parseHash(`#round=10014&b=${TEN_BETS_HASH}&a=AaYAbWAcUAdSAeQ`)).toEqual({
      round: 10014,
      bets: TEN_BETS,
      hash: TEN_BETS_HASH,
    });
  });

  it('ignores fragments without usable bets', () => {
    expect(hooks.parseHash('')).toBeNull();
    expect(hooks.parseHash('#round=10014')).toBeNull();
    expect(hooks.parseHash('#round=10014&b=')).toBeNull();
    expect(hooks.parseHash('#round=10014&b=zzz')).toBeNull();
  });

  it('reads a bet from a pasted URL or fragment', () => {
    const expected = { round: 10014, bets: TEN_BETS, hash: TEN_BETS_HASH };
    const fragment = `round=10014&b=${TEN_BETS_HASH}`;

    expect(hooks.parseBetInput(`https://neofood.club/#${fragment}`)).toEqual(expected);
    expect(
      hooks.parseBetInput(`  https://www.neopets.com/pirates/foodclub.phtml?tab=bet#${fragment}  `),
    ).toEqual(expected);
    expect(hooks.parseBetInput(`#${fragment}`)).toEqual(expected);
    expect(hooks.parseBetInput(fragment)).toEqual(expected);
    expect(hooks.parseBetInput(`https://neofood.club/15/#${fragment}&a=AaYAbWAcUAdSAeQ`)).toEqual(
      expected,
    );
  });

  it('finds no bets in other text', () => {
    expect(hooks.parseBetInput('')).toBeNull();
    expect(hooks.parseBetInput('   ')).toBeNull();
    expect(hooks.parseBetInput('hello')).toBeNull();
    expect(hooks.parseBetInput('https://neofood.club/#round=10014')).toBeNull();
    expect(hooks.parseBetInput('https://neofood.club/#round=10014&b=zzz')).toBeNull();
  });

  it('clamps amounts like determineBetAmount does', () => {
    // capped: min(maxBet, ceil(maxWin / odds), 500000)
    expect(hooks.betAmount(90, 20000, 1000000, true)).toBe(11112);
    expect(hooks.betAmount(90, 5000, 1000000, true)).toBe(5000);
    expect(hooks.betAmount(2, 900000, 1000000, true)).toBe(500000);
    expect(hooks.betAmount(90, 20000, 0, true)).toBe(11112);
    // uncapped: the full max bet
    expect(hooks.betAmount(90, 20000, 1000000, false)).toBe(20000);
  });
});

describe('neofoodclub userscript: on the bet page', () => {
  let hooks: Hooks;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', `/#round=10014&b=${TEN_BETS_HASH}`);
    hooks = loadScript();
  });

  afterEach(() => {
    hooks.stop();
    document.body.innerHTML = '';
    document.head.querySelector('#nfc-style')?.remove();
  });

  it('hides the box for a bet URL when the page was opened with one', () => {
    buildPage();
    hooks.start();

    expect(document.querySelector<HTMLElement>('#nfc-panel .nfc-paste')?.hidden).toBe(true);
  });

  describe('without a bet fragment', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/');
    });

    function pasteBox(): HTMLInputElement {
      return screen('#nfc-panel .nfc-paste-box') as HTMLInputElement;
    }

    function paste(text: string): void {
      pasteBox().value = text;
      pasteBox().dispatchEvent(new Event('input', { bubbles: true }));
    }

    it('shows the panel with a box to paste a bet URL into, and no bets', () => {
      const { submit } = buildPage();
      hooks.start();

      const panel = document.getElementById('nfc-panel');
      expect(panel?.previousElementSibling).toHaveClass('fc-round-pill');
      expect(document.querySelector<HTMLElement>('#nfc-panel .nfc-paste')?.hidden).toBe(false);
      expect(pasteBox().placeholder).toMatch(/bet url/i);
      expect(document.querySelectorAll('#nfc-panel .nfc-row')).toHaveLength(0);
      expect(document.querySelector('#nfc-panel .nfc-footer')?.textContent).toBe(
        'You have placed 0 bets this round.',
      );
      expect(checkedValues()).toEqual([]);
      expect(submit).not.toHaveBeenCalled();
    });

    it('shows the bets from a pasted URL, selecting nothing on its own', () => {
      const { submit } = buildPage({ betsPlaced: 2 });
      hooks.start();

      paste(`https://neofood.club/#round=10014&b=${TEN_BETS_HASH}`);

      expect(document.querySelectorAll('#nfc-panel .nfc-row')).toHaveLength(10);
      expect(document.querySelector<HTMLElement>('#nfc-panel .nfc-paste')?.hidden).toBe(true);
      expect(checkedValues()).toEqual([]);
      expect(submit).not.toHaveBeenCalled();
    });

    it('takes a Neopets bet page URL, and keeps the bets in the address for a reload', () => {
      buildPage();
      hooks.start();

      paste(
        `https://www.neopets.com/pirates/foodclub.phtml?tab=bet#round=10014&b=${TEN_BETS_HASH}`,
      );

      expect(document.querySelectorAll('#nfc-panel .nfc-row')).toHaveLength(10);
      expect(window.location.hash).toBe(`#round=10014&b=${TEN_BETS_HASH}`);
    });

    it('does not complain while still typing, but does when something else is pasted', async () => {
      buildPage();
      hooks.start();

      paste('https://neo');
      expect(document.querySelector('#nfc-panel .nfc-paste-error')?.textContent).toBe('');

      pasteBox().value = 'not a bet';
      pasteBox().dispatchEvent(new Event('paste', { bubbles: true }));
      await vi.waitFor(() =>
        expect(document.querySelector('#nfc-panel .nfc-paste-error')?.textContent).toMatch(
          /does not look like/i,
        ),
      );
      expect(document.querySelectorAll('#nfc-panel .nfc-row')).toHaveLength(0);
    });

    it('still checks the round of a pasted bet', () => {
      buildPage({ round: 10014 });
      hooks.start();

      paste(`https://neofood.club/#round=10013&b=${TEN_BETS_HASH}`);

      expect(document.querySelector('#nfc-panel .nfc-note')?.textContent).toContain('round 10013');
      expect(checkedValues()).toEqual([]);
      expect(panelButton(1)).toBeDisabled();
    });

    it('places a pasted bet with its button like any other', () => {
      window.localStorage.setItem('neofoodclub.placeBets', 'true');
      const { submit } = buildPage();
      hooks.start();

      paste(`https://neofood.club/#round=10014&b=${TEN_BETS_HASH}`);
      panelButton(2).click();

      expect(checkedValues()).toEqual(expectedValues(TEN_BETS[1] as number[]));
      expect(submit).toHaveBeenCalledTimes(1);
    });
  });

  it('adds the panel between the round pill and the bet table, in the neofoodclub blue', () => {
    buildPage();
    hooks.start();

    const panel = document.getElementById('nfc-panel');
    expect(panel).not.toBeNull();
    expect(panel?.previousElementSibling).toHaveClass('fc-round-pill');
    expect(panel?.nextElementSibling).toBe(document.getElementById('fc-bet-form'));
    expect(document.getElementById('nfc-style')?.textContent).toContain('#1A202C');
    expect(panel?.querySelector('img')?.getAttribute('src')).toBe(
      'https://neofood.club/icon-32x32.png',
    );
    expect(panel?.querySelector('.nfc-title')?.textContent).toBe('NeoFoodClub');
  });

  it('lines the rows up in fixed columns with same-sized buttons', () => {
    buildPage();
    hooks.start();

    const css = document.getElementById('nfc-style')?.textContent ?? '';
    // one fixed set of columns for every row, the last one is the button
    expect(css).toMatch(
      /\.nfc-row\{display:grid;grid-template-columns:2em minmax\(0,1fr\) 5em 8em 18em/,
    );
    expect(css).toMatch(/\.nfc-place\{[^}]*width:100%/);
    // every row has the same five cells, so they all land in the same columns
    document.querySelectorAll('#nfc-panel .nfc-row').forEach(row => {
      expect(row.children).toHaveLength(5);
      expect(row.lastElementChild?.tagName).toBe('BUTTON');
    });
  });

  it('keeps the selected row bar clear of the bet number', () => {
    buildPage();
    hooks.start();

    const css = document.getElementById('nfc-style')?.textContent ?? '';
    const bar = /\.nfc-picked\{box-shadow:inset (\d+)px/.exec(css);
    const padding = /\.nfc-row\{[^}]*padding:\d+px \d+px \d+px (\d+)px/.exec(css);
    expect(bar).not.toBeNull();
    expect(padding).not.toBeNull();
    // the row's left padding is wider than the bar, so the bar sits in the gutter
    expect(Number(padding?.[1])).toBeGreaterThan(Number(bar?.[1]));
  });

  it('shows the shorthand pirate names, like neofoodclub does', () => {
    buildPage();
    // use real pirate ids for the first bet [1, 4, 2, 2, 0]: Goob, Bonnie, Ned and Tail
    const ids = [
      ['111', 15], // arena 1 position 1 is Gooblah
      ['124', 7], // arena 2 position 4 is Bonnie
      ['132', 13], // arena 3 position 2 is Ned
      ['142', 20], // arena 4 position 2 is Tailhook
    ] as const;
    ids.forEach(([key, id]) => {
      const radio = document.querySelector<HTMLInputElement>(`input[value="${key}"]`);
      (radio as HTMLInputElement).value = String(id);
    });
    hooks.start();

    expect(document.querySelector('#nfc-panel .nfc-row:first-child .nfc-names')?.textContent).toBe(
      'Goob x Bonnie x Ned x Tail',
    );
  });

  it('falls back to the page name for a pirate it does not know', () => {
    buildPage();
    hooks.start();

    expect(document.querySelector('#nfc-panel .nfc-row:first-child .nfc-names')?.textContent).toBe(
      'P11 x P24 x P32 x P42',
    );
  });

  it('lists all ten bets with pirate names joined by " x " and the total odds', () => {
    buildPage();
    hooks.start();

    const rows = document.querySelectorAll('#nfc-panel .nfc-row');
    expect(rows).toHaveLength(10);
    // [1, 4, 2, 2, 0]: P11 (2:1), P24 (5:1), P32 (3:1), P42 (3:1)
    expect(rows[0]?.querySelector('.nfc-names')?.textContent).toBe('P11 x P24 x P32 x P42');
    expect(rows[0]?.querySelector('.nfc-odds')?.textContent).toBe('90:1');
    // [0, 0, 2, 2, 4]
    expect(rows[8]?.querySelector('.nfc-names')?.textContent).toBe('P32 x P42 x P54');
  });

  it('gives every bet its own place bet button', () => {
    buildPage({ betsPlaced: 2 });
    hooks.start();

    const buttons = document.querySelectorAll<HTMLButtonElement>('#nfc-panel .nfc-place');
    expect(buttons).toHaveLength(10);
    expect(buttons[0]?.textContent).toBe('Select Pirates + Fill Max Bet #1');
    expect(buttons[9]?.textContent).toBe('Select Pirates + Fill Max Bet #10');
    expect(buttons[0]?.className).toContain('button-green__2020');
  });

  it.each([0, 2, 9])(
    'selects, fills in and places nothing on its own, with %i bets placed',
    async betsPlaced => {
      const { submit } = buildPage({ betsPlaced });
      (document.getElementById('fc-bet-amount') as HTMLInputElement).value = '777';
      hooks.start();
      await new Promise(done => setTimeout(done, 150));

      expect(checkedValues()).toEqual([]);
      expect((document.getElementById('fc-bet-amount') as HTMLInputElement).value).toBe('777');
      expect(document.querySelectorAll('#nfc-panel .nfc-picked')).toHaveLength(0);
      expect(submit).not.toHaveBeenCalled();
    },
  );

  it('selects the pirates of a bet when its row is clicked, without an amount or submitting', async () => {
    const { submit } = buildPage();
    hooks.start();
    expect(checkedValues()).toEqual([]);

    (document.querySelector('#nfc-panel .nfc-row:nth-child(4) .nfc-names') as HTMLElement).click();

    expect(checkedValues()).toEqual(expectedValues(TEN_BETS[3] as number[]));
    expect((document.getElementById('fc-bet-amount') as HTMLInputElement).value).toBe('');
    expect(document.querySelectorAll('#nfc-panel .nfc-picked')).toHaveLength(1);
    expect(document.querySelector('#nfc-panel .nfc-row:nth-child(4)')).toHaveClass('nfc-picked');
    expect(submit).not.toHaveBeenCalled();

    // the page changing around it doesn't change the user's choice
    await new Promise(done => setTimeout(done, 150));
    expect(checkedValues()).toEqual(expectedValues(TEN_BETS[3] as number[]));
  });

  it('selects a bet from the keyboard too', () => {
    buildPage();
    hooks.start();

    const row = document.querySelector('#nfc-panel .nfc-row:nth-child(2)') as HTMLElement;
    expect(row.tabIndex).toBe(0);
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(checkedValues()).toEqual(expectedValues(TEN_BETS[1] as number[]));
  });

  it('does not select a bet from a row when the link is for another round', () => {
    window.history.replaceState(null, '', `/#round=10013&b=${TEN_BETS_HASH}`);
    buildPage({ round: 10014 });
    hooks.start();

    (document.querySelector('#nfc-panel .nfc-row:nth-child(4) .nfc-names') as HTMLElement).click();

    expect(checkedValues()).toEqual([]);
  });

  it('places a bet with its button only, clicking the button does not also pick the row', () => {
    window.localStorage.setItem('neofoodclub.placeBets', 'true');
    const { submit } = buildPage();
    hooks.start();

    panelButton(4).click();

    expect(submit).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('#nfc-panel .nfc-picked')).toHaveLength(0);
  });

  describe("the row and the button do not get in each other's way", () => {
    function amountValue(): string {
      return (document.getElementById('fc-bet-amount') as HTMLInputElement).value;
    }

    function typeAmount(value: string): void {
      const input = document.getElementById('fc-bet-amount') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function rowNames(betNumber: number): HTMLElement {
      return screen(`#nfc-panel .nfc-row:nth-child(${betNumber}) .nfc-names`) as HTMLElement;
    }

    it('keeps an amount the user typed when a row is clicked', () => {
      buildPage();
      hooks.start();
      typeAmount('1234');

      rowNames(4).click();
      expect(amountValue()).toBe('1234');
      expect(checkedValues()).toEqual(expectedValues(TEN_BETS[3] as number[]));

      rowNames(6).click();
      expect(amountValue()).toBe('1234');
      expect(checkedValues()).toEqual(expectedValues(TEN_BETS[5] as number[]));
    });

    it('keeps the amount a button filled in when another row is clicked', () => {
      buildPage({ maxBet: 20000 });
      hooks.start();

      panelButton(4).click();
      expect(amountValue()).toBe('4445');

      rowNames(2).click();
      expect(amountValue()).toBe('4445');
      expect(checkedValues()).toEqual(expectedValues(TEN_BETS[1] as number[]));
    });

    it('does not place anything when a row is clicked, even with Place bets on', () => {
      window.localStorage.setItem('neofoodclub.placeBets', 'true');
      const { submit } = buildPage();
      hooks.start();

      rowNames(3).click();

      expect(checkedValues()).toEqual(expectedValues(TEN_BETS[2] as number[]));
      expect(submit).not.toHaveBeenCalled();
    });

    it('does not select the row when its button is clicked', () => {
      buildPage();
      hooks.start();
      rowNames(2).click();
      expect(document.querySelector('#nfc-panel .nfc-row:nth-child(2)')).toHaveClass('nfc-picked');

      panelButton(5).click();

      // the button's own bet is in the form, and only that row is marked
      expect(checkedValues()).toEqual(expectedValues(TEN_BETS[4] as number[]));
      expect(document.querySelectorAll('#nfc-panel .nfc-picked')).toHaveLength(1);
      expect(document.querySelector('#nfc-panel .nfc-row:nth-child(5)')).toHaveClass('nfc-picked');
    });

    it('does not select the row for Enter or Space on the button', () => {
      buildPage();
      hooks.start();

      const button = panelButton(7);
      for (const key of ['Enter', ' ']) {
        button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      }

      expect(checkedValues()).toEqual([]);
      expect(document.querySelectorAll('#nfc-panel .nfc-picked')).toHaveLength(0);
    });

    it('keeps the same rows and buttons when the panel is refreshed, so a click is not lost', () => {
      buildPage();
      hooks.start();
      const row = screen('#nfc-panel .nfc-row:nth-child(3)');
      const button = panelButton(3);

      hooks.render();
      hooks.render();
      rowNames(5).click();
      hooks.render();

      expect(screen('#nfc-panel .nfc-row:nth-child(3)')).toBe(row);
      expect(panelButton(3)).toBe(button);
      // and what they show still follows the state
      expect(document.querySelector('#nfc-panel .nfc-row:nth-child(5)')).toHaveClass('nfc-picked');
      expect(document.querySelector('#nfc-panel .nfc-row:nth-child(3)')).not.toHaveClass(
        'nfc-picked',
      );
    });

    it('places a bet once when its button is clicked twice while the request is out', () => {
      window.localStorage.setItem('neofoodclub.placeBets', 'true');
      const original = window.fetch;
      // a request that never finishes, like one still on its way
      const request = vi.fn(() => new Promise<Response>(() => undefined));
      window.fetch = request as unknown as typeof window.fetch;
      try {
        const { submit } = buildPage();
        // the page's own handler sends the request as soon as the button is pressed
        document.getElementById('fc-bet-submit')?.addEventListener('click', () => {
          void window.fetch('/np-templates/ajax/pirates/foodclub/place_bet.php');
        });
        hooks.start();

        panelButton(2).click();
        panelButton(2).click();
        rowNames(2).click();

        expect(submit).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledTimes(1);
        document.querySelectorAll<HTMLButtonElement>('#nfc-panel .nfc-place').forEach(button => {
          expect(button).toBeDisabled();
        });
      } finally {
        window.fetch = original;
      }
    });

    it('uses the link pasted later for the rows, not stale ones', () => {
      window.history.replaceState(null, '', '/');
      buildPage();
      hooks.start();
      expect(document.querySelectorAll('#nfc-panel .nfc-row')).toHaveLength(0);

      const box = screen('#nfc-panel .nfc-paste-box') as HTMLInputElement;
      box.value = `https://neofood.club/#round=10014&b=${TEN_BETS_HASH}`;
      box.dispatchEvent(new Event('input', { bubbles: true }));

      expect(document.querySelectorAll('#nfc-panel .nfc-row')).toHaveLength(10);
      rowNames(2).click();
      expect(checkedValues()).toEqual(expectedValues(TEN_BETS[1] as number[]));
    });
  });

  it('refuses a link for another round', () => {
    window.history.replaceState(null, '', `/#round=10013&b=${TEN_BETS_HASH}`);
    const { submit } = buildPage({ round: 10014 });
    hooks.start();

    expect(checkedValues()).toEqual([]);
    expect(document.querySelector('#nfc-panel .nfc-note')?.textContent).toContain('round 10013');
    document.querySelectorAll<HTMLButtonElement>('#nfc-panel .nfc-place').forEach(button => {
      expect(button).toBeDisabled();
    });
    expect(submit).not.toHaveBeenCalled();
  });

  it('refuses when all bets are already placed', () => {
    buildPage({ betsPlaced: 10 });
    hooks.start();

    expect(checkedValues()).toEqual([]);
    expect(document.querySelector('#nfc-panel .nfc-note')?.textContent).toContain('all 10');
    expect(panelButton(1)).toBeDisabled();
  });

  it('does not mute any of the rows', () => {
    buildPage({ betsPlaced: 2 });
    hooks.start();

    const css = document.getElementById('nfc-style')?.textContent ?? '';
    expect(css).not.toContain('#A0AEC0');
    expect(css).not.toMatch(/\.nfc-row[^{]*\{[^}]*color:/);
  });

  it.each([
    [0, 'You have placed 0 bets this round.'],
    [1, 'You have placed 1 bet this round.'],
    [2, 'You have placed 2 bets this round.'],
    [10, 'You have placed 10 bets this round.'],
  ])('ends with a footer saying how many bets are placed (%i)', (betsPlaced, text) => {
    buildPage({ betsPlaced });
    hooks.start();

    const panel = document.getElementById('nfc-panel');
    expect(panel?.lastElementChild).toHaveClass('nfc-footer');
    expect(panel?.lastElementChild?.textContent).toBe(text);
  });

  it('selects the pirates and fills in the capped amount, without placing the bet by default', () => {
    const { submit } = buildPage({ maxBet: 20000 });
    hooks.start();

    panelButton(4).click();

    expect(checkedValues()).toEqual(expectedValues(TEN_BETS[3] as number[]));
    expect((document.getElementById('fc-bet-amount') as HTMLInputElement).value).toBe('4445');
    expect(submit).not.toHaveBeenCalled();
    expect(document.querySelector('#nfc-panel .nfc-row:nth-child(4)')).toHaveClass('nfc-picked');
  });

  it('has the Place bets setting off by default, and remembers it', () => {
    buildPage();
    hooks.start();

    const checkbox = document.querySelector<HTMLInputElement>(
      '#nfc-panel .nfc-place-setting input',
    );
    expect(checkbox?.checked).toBe(false);
    expect(window.localStorage.getItem('neofoodclub.placeBets')).toBeNull();

    checkbox?.click();

    expect(window.localStorage.getItem('neofoodclub.placeBets')).toBe('true');
    expect(panelButton(1)).toHaveTextContent('Max Bet + Place Bet #1');
    expect(panelButton(10)).toHaveTextContent('Max Bet + Place Bet #10');

    checkbox?.click();

    expect(window.localStorage.getItem('neofoodclub.placeBets')).toBe('false');
    expect(panelButton(1)).toHaveTextContent('Select Pirates + Fill Max Bet #1');
  });

  it('starts with the Place bets setting on when it was left on', () => {
    window.localStorage.setItem('neofoodclub.placeBets', 'true');
    buildPage();
    hooks.start();

    expect(
      document.querySelector<HTMLInputElement>('#nfc-panel .nfc-place-setting input')?.checked,
    ).toBe(true);
    expect(panelButton(2)).toHaveTextContent('Max Bet + Place Bet #2');
  });

  it('presses the page submit button too when Place bets is on, with the capped amount', () => {
    window.localStorage.setItem('neofoodclub.placeBets', 'true');
    const { submit } = buildPage({ maxBet: 20000 });
    hooks.start();

    panelButton(4).click();

    expect(checkedValues()).toEqual(expectedValues(TEN_BETS[3] as number[]));
    // bet 4 is [4, 0, 2, 2, 4]: 5 * 3 * 3 * 5 = 225:1, ceil(1,000,000 / 225) = 4445
    expect((document.getElementById('fc-bet-amount') as HTMLInputElement).value).toBe('4445');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('uses the page max bet when the cap is turned off, and remembers the setting', () => {
    window.localStorage.setItem('neofoodclub.placeBets', 'true');
    const { submit } = buildPage({ maxBet: 20000 });
    hooks.start();

    const checkbox = document.querySelector<HTMLInputElement>('#nfc-panel .nfc-cap input');
    expect(checkbox?.checked).toBe(true);
    checkbox?.click();
    expect(window.localStorage.getItem('neofoodclub.capBetAmounts')).toBe('false');
    expect(
      document.querySelector('#nfc-panel .nfc-row:nth-child(4) .nfc-amount'),
    ).toHaveTextContent('20,000 NP');

    panelButton(4).click();

    expect((document.getElementById('fc-bet-amount') as HTMLInputElement).value).toBe('20000');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('never submits on its own', () => {
    const { submit } = buildPage({ betsPlaced: 1 });
    hooks.start();
    hooks.start();

    expect(submit).not.toHaveBeenCalled();
  });
});

describe('neofoodclub userscript: watching the page place a bet', () => {
  let hooks: Hooks;
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
    window.localStorage.clear();
    window.history.replaceState(null, '', `/#round=10014&b=${TEN_BETS_HASH}`);
    hooks = loadScript();
  });

  afterEach(() => {
    hooks.stop();
    window.fetch = originalFetch;
    document.body.innerHTML = '';
    document.head.querySelector('#nfc-style')?.remove();
  });

  function footer(): string | null | undefined {
    return document.querySelector('#nfc-panel .nfc-footer')?.textContent;
  }

  it('leaves the page request alone, and counts the bet after it goes through', async () => {
    const answer = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ck: 'new' }))));
    window.fetch = answer as unknown as typeof window.fetch;
    buildPage();
    hooks.start();
    expect(footer()).toBe('You have placed 0 bets this round.');

    const response = await window.fetch('/np-templates/ajax/pirates/foodclub/place_bet.php', {
      method: 'POST',
      body: '{}',
    });
    await response.json();
    await vi.waitFor(() => expect(footer()).toBe('You have placed 1 bet this round.'));

    expect(answer).toHaveBeenCalledTimes(1);
    expect(answer).toHaveBeenCalledWith('/np-templates/ajax/pirates/foodclub/place_bet.php', {
      method: 'POST',
      body: '{}',
    });
  });

  it('counts the bet in the footer after a successful bet', async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ck: 'new' }))),
    ) as unknown as typeof window.fetch;
    buildPage({ betsPlaced: 2 });
    hooks.start();
    expect(document.querySelector('#nfc-panel .nfc-footer')?.textContent).toBe(
      'You have placed 2 bets this round.',
    );

    const response = await window.fetch('/np-templates/ajax/pirates/foodclub/place_bet.php');
    await response.json();

    await vi.waitFor(() =>
      expect(document.querySelector('#nfc-panel .nfc-footer')?.textContent).toBe(
        'You have placed 3 bets this round.',
      ),
    );
  });

  it('does not count a bet that failed', async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'nope' }), { status: 400 })),
    ) as unknown as typeof window.fetch;
    buildPage();
    hooks.start();

    const response = await window.fetch('/np-templates/ajax/pirates/foodclub/place_bet.php');
    await response.json();
    await new Promise(done => setTimeout(done, 100));

    expect(footer()).toBe('You have placed 0 bets this round.');
  });

  it('ignores other requests', async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve(new Response('{}')),
    ) as unknown as typeof window.fetch;
    buildPage();
    hooks.start();

    await window.fetch('/np-templates/ajax/pirates/foodclub/tab.php?tab=bet');
    await new Promise(done => setTimeout(done, 100));

    expect(footer()).toBe('You have placed 0 bets this round.');
  });
});
