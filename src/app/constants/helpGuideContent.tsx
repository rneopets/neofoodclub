import { Link } from '@chakra-ui/react';
import * as React from 'react';

import { GlossaryFormula, seeGlossary } from '../components/help/glossaryContentHelpers';
import { GlossaryRef } from '../components/help/GlossaryRef';
import { HelpOddsTimelineExample } from '../components/help/HelpOddsTimelineExample';

export interface GlossaryEntry {
  id: string;
  term: string;
  definition: React.ReactNode;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const FOOD_CLUB_BET_PAGE = 'https://www.neopets.com/pirates/foodclub.phtml?type=bet';

/** Food Club glossary. Keep sorted A-Z by `term` when adding or editing entries. */
export const HELP_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    id: 'bet-set',
    term: 'Bet set',
    definition: 'A named group of bets and optionally their amounts.',
  },
  {
    id: 'big-brain',
    term: 'Big Brain Mode',
    definition: (
      <>
        A NeoFoodClub-only setting that adds extra table columns: legacy and logit win chances, FA
        (Food Adjustment), optional <GlossaryRef id="odds-timeline">odds timeline</GlossaryRef>, and
        custom probability or <GlossaryRef id="odds">odds</GlossaryRef> you can edit by hand.
      </>
    ),
  },
  {
    id: 'bust',
    term: 'Bust',
    definition: 'When none of your bets win for the round. You collect 0 units for that day.',
  },
  {
    id: 'bust-rate',
    term: 'Bust rate',
    definition:
      'The chance your set wins nothing. NeoFoodClub shows this in the payout table on the 0 units row. Safer sets often sit around 10-30% bust rate; riskier sets can be 40% or higher.',
  },
  {
    id: 'bustproof',
    term: 'Bustproof set',
    definition: (
      <>
        A bet set on a <GlossaryRef id="positive-negative-arena">positive arena</GlossaryRef>{' '}
        arranged in such a way that you profit no matter which pirate in the arena wins. Also called
        &quot;bp&quot;.
      </>
    ),
  },
  {
    id: 'due',
    term: 'Due',
    definition:
      'A pirate on a long losing streak who might win soon. Outcomes are still random; betting on "due" pirates is risky and not based on reality.',
  },
  {
    id: 'dutching',
    term: 'Dutching',
    definition:
      'On rough days, using all ten bets to cover enough outcomes that you still profit. Each line should pay at least 10:1 so one hit can cover your total stake.',
  },
  {
    id: 'er',
    term: 'ER (Expected Ratio)',
    definition: (
      <>
        Expected return for one bet line before stake size is included. Shown as E.R. in the payout
        table (Big Brain mode). Per line:
        <GlossaryFormula>{'ER = odds x probability'}</GlossaryFormula>
        <GlossaryRef id="odds">Odds</GlossaryRef> is the product of your picked pirates&apos; odds;
        probability is the product of their win chances. Add every line&apos;s ER to get{' '}
        <GlossaryRef id="ter">TER</GlossaryRef>.
      </>
    ),
  },
  {
    id: 'experimental-model',
    term: 'Experimental model',
    definition: (
      <>
        Optional probability model (logit) here on NeoFoodClub instead of the legacy &quot;min, std,
        and max&quot; model which is based purely on the <GlossaryRef id="odds">odds</GlossaryRef>{' '}
        of one round. The values for this model are based on historical data of the thousands of
        Food Club rounds that we have data for, and the values are updated at the end of each month
        and can be found within our GitHub repository for anyone to audit. Found to be about 13%
        better on average when compared with bet amounts from 1K to 20K, getting better the higher
        the bet amount. The experimental model can be toggled on in Settings. With Big Brain setting
        on, the table shows logit win percentages.
      </>
    ),
  },
  {
    id: 'fa',
    term: 'FA (Food Adjustment)',
    definition: (
      <>
        How the food in an arena affects each pirate. Favorites help, allergies hurt.{' '}
        <GlossaryRef id="odds">Opening odds</GlossaryRef> reflect this already. NeoFoodClub shows FA
        as a number in Big Brain mode.
      </>
    ),
  },
  {
    id: 'gambit',
    term: 'Gambit',
    definition:
      'One pirate picked in each of the five arenas. All bets using permutations of those five only. All five must win for the biggest payout for the entire round.',
  },
  {
    id: 'max-bet',
    term: 'Max bet',
    definition: (
      <>
        Two limits apply; Neopets uses whichever is lower for each line. <br />
        <br />
        <strong>Your max bet</strong> is your account stake cap (50 + 2 NP per day your account has
        existed). Get it from the{' '}
        <Link href={FOOD_CLUB_BET_PAGE} target="_blank" rel="noopener noreferrer">
          Food Club bet page
        </Link>{' '}
        on Neopets.
        <br />
        <br />
        <strong>Per-line max bet</strong> (Maxbet column) is the most you can stake on that line
        without winnings going over 1M NP. Per line:
        <GlossaryFormula>{'MAXBET = 1,000,000 / odds'}</GlossaryFormula>
        Example: 100:1 odds → 10,000 NP cap even if your account max bet is higher.
      </>
    ),
  },
  {
    id: 'max-ter',
    term: 'Max TER set',
    definition: (
      <>
        Bets with amounts to maximize total expected return for the current{' '}
        <GlossaryRef id="odds">odds</GlossaryRef> and probabilities. Best lines change as odds move
        through the day. Also called MER.
      </>
    ),
  },
  {
    id: 'nfc',
    term: 'NeoFoodClub (NFC)',
    definition:
      'The site you are currently reading. Build Food Club bets, share sets by URL, and place bets faster.',
  },
  {
    id: 'ne',
    term: 'Net expected (NE)',
    definition: (
      <>
        Expected profit for one bet line after stake and win chance are included. Shown as N.E. in
        the payout table (Big Brain mode). Per line:
        <GlossaryFormula>{'NE = bet amount x ER − bet amount'}</GlossaryFormula>
        Same as <GlossaryRef id="payoff">payoff</GlossaryRef> x probability minus your stake (before
        the 1M NP winnings cap). Average over time, not a promise for today.
      </>
    ),
  },
  {
    id: 'odds',
    term: 'Odds',
    definition: (
      <>
        The payout multiplier for a pirate if they win (for example, 3:1 pays three times your stake
        on that line). <GlossaryRef id="odds">Opening odds</GlossaryRef> are set before the round
        from simulations and reflect how likely each pirate is to win, including food effects.{' '}
        <GlossaryRef id="odds">Current odds</GlossaryRef> update as more people bet; they change
        your payout if you bet now, but not the underlying chance of winning. After you place a bet,
        your payout odds are locked in for that line.
      </>
    ),
  },
  {
    id: 'odds-timeline',
    term: 'Odds timeline',
    definition: (
      <>
        A compact bar chart of how one pirate&apos;s <GlossaryRef id="odds">odds</GlossaryRef> moved
        during the round. Each colored segment is an odds value; width shows how long it lasted.
        Click a bar in the table (with Big Brain on) to open the full timeline drawer. Example (not
        interactive):
        <HelpOddsTimelineExample />
        Useful when odds shift late before bets lock.
      </>
    ),
  },
  {
    id: 'partial',
    term: 'Partial',
    definition:
      'You had winning bets but collected fewer than 10 units total, so you did not break even on what you staked.',
  },
  {
    id: 'payoff',
    term: 'Payoff',
    definition: (
      <>
        What one bet line would pay if it wins, before the 1M NP cap. Shown in the Payoff column
        (Big Brain mode). Per line:
        <GlossaryFormula>{'payoff = odds x bet amount'}</GlossaryFormula>
        <GlossaryRef id="odds">Odds</GlossaryRef> is the product of your picked pirates&apos; odds
        on that line.
      </>
    ),
  },
  {
    id: 'positive-negative-arena',
    term: 'Positive / negative arena',
    definition: (
      <>
        How favorable an arena looks from current <GlossaryRef id="odds">odds</GlossaryRef>.
        NeoFoodClub shows an arena ratio per arena when Big Brain is enabled (Ratio column).
        Positive means above 0%, usually with a clear favorite. Negative means at or below 0%. For
        each arena, convert each pirate&apos;s odds to an implied chance (1 / odds), add those four
        values, then:
        <GlossaryFormula>
          {`arena ratio = 1 / (1/odds₁ + 1/odds₂ + 1/odds₃ + 1/odds₄) − 1`}
        </GlossaryFormula>
        Example: odds 2, 3, 6, and 13 → 1/2 + 1/3 + 1/6 + 1/13 ≈ 1.08 → ratio ≈ -0.07 (negative).
        Odds 13, 13, 13, and 2 → sum ≈ 0.73 → ratio ≈ +0.37 (positive).
      </>
    ),
  },
  {
    id: 'roi',
    term: 'ROI (Return on Investment)',
    definition:
      'Win total divided by bet total, in units, over a period you track. Below 1 is a loss, 1 to 2 is profit, above 2 means you doubled. Long-term stat; NeoFoodClub does not store your lifetime ROI.',
  },
  {
    id: 'round',
    term: 'Round',
    definition: (
      <>
        One Food Club day. Pirates and foods are fixed for the round.{' '}
        <GlossaryRef id="odds">Odds</GlossaryRef> update until results post. Gates close around
        1:45PM NST to 2:15 PM NST when you cannot place new bets. Check the NeoFoodClub header for
        the current round.
      </>
    ),
  },
  {
    id: 'safety',
    term: 'Safety',
    definition: (
      <>
        In a <GlossaryRef id="positive-negative-arena">positive arena</GlossaryRef>, betting mostly
        on likely winners (2:1 odds pirates) while still covering other pirates in case of an{' '}
        <GlossaryRef id="upset">upset</GlossaryRef>.
      </>
    ),
  },
  {
    id: 'ten-bet',
    term: 'Ten-bet',
    definition:
      'A set built around chosen pirates (one to three per arena) that covers many strong combinations across ten lines. You can generate or build a ten-bet set using the generate/build menus.',
  },
  {
    id: 'ter',
    term: 'TER (Total Expected Return)',
    definition: (
      <>
        Total expected return for your whole set (also called expected ratio). Shown in the payout
        table footer. Sum every line&apos;s <GlossaryRef id="er">ER</GlossaryRef>:
        <GlossaryFormula>{"TER = sum of all your bets' ERs"}</GlossaryFormula>
        Above 10 is generally profitable in expectation; above 20 often means a strong shot at
        doubling stake. Higher TER often means higher bust rate. Not a guarantee for one round.
      </>
    ),
  },
  {
    id: 'trophy-run',
    term: 'Trophy run',
    definition:
      'Holding winnings without collecting so one collect is as large as possible for the high score list. You can hold up to seven days across eight rounds. Many players save toward month end when scores reset.',
  },
  {
    id: 'units',
    term: 'Units',
    definition:
      'How Food Club results are counted in multiples of your stake. One unit equals what you bet on a line. A 15:1 win pays 15 units.',
  },
  {
    id: 'upset',
    term: 'Upset',
    definition: 'When the favorite pirate in an arena (often at 2:1 odds) loses.',
  },
];

/** Food Club FAQs. Keep sorted A-Z by `question` when adding or editing entries. */
export const HELP_FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'trophies',
    question: 'How do Food Club trophies work?',
    answer: (
      <>
        Trophies go to the largest single Collect Winnings on the high score list. You can hold bets
        up to seven days and eight rounds before old wins expire. Many players save winnings near
        month end when scores reset, then collect on the first of the month.
        {seeGlossary('Trophy run')}
      </>
    ),
  },
  {
    id: 'how-many-bets',
    question: 'How many different bets are there?',
    answer: (
      <>
        3,124. In each of the five arenas you pick one of five options (no pirate, or any of the
        four pirates), so the total is (5 x 5 x 5 x 5 x 5) - 1 for the "empty bet".
      </>
    ),
  },
  {
    id: 'how-much-np',
    question: 'How much NP do I need to start?',
    answer: (
      <>
        For moderate-risk sets, many players keep about a week of max bets in the bank. You can bet
        less per line if you want less risk. More bankroll lets you ride losing streaks without
        stress.
        {seeGlossary('Max bet')}
      </>
    ),
  },
  {
    id: 'how-often-lose',
    question: 'How often will I lose?',
    answer: (
      <>
        Food Club is luck-based. Even careful players can lose often; safe styles might lose roughly
        a quarter of days, and losing streaks happen. It is still worth it for many players over
        months because expected value is positive with good sets.
        {seeGlossary('Bust rate')}
      </>
    ),
  },
  {
    id: 'account-age',
    question: 'How old should my account be to play?',
    answer: (
      <>
        Many players start around one year of account age. Older accounts have a higher max bet and
        earn more per win. Expect roughly 1.6x to 2.2x back over the long run if you follow solid
        sets. Max bet is 50 NP plus 2 NP per day of account age (shown on the{' '}
        <Link href={FOOD_CLUB_BET_PAGE} target="_blank" rel="noopener noreferrer">
          Food Club bet page
        </Link>
        ). You can place ten bets per round.
        {seeGlossary('Max bet')}
      </>
    ),
  },
  {
    id: 'newbie-math',
    question: "I'm new. Do I need math?",
    answer:
      "If you can count to ten you have enough for Food Club basics. Easiest path: copy one person's full ten-bet set each day. Do not mix bets from different posters or use only part of a set. Lower your bet amount per line if the set feels too risky.",
  },
  {
    id: 'food-adjustments-faq',
    question: 'What are food adjustments and allergies?',
    answer: (
      <>
        Each pirate reacts to foods served in their arena. Favorites can help performance, allergies
        can hurt. Opening odds usually already reflect this.
        {seeGlossary('FA (Food Adjustment)')}
      </>
    ),
  },
  {
    id: 'what-is-fc',
    question: 'What is Food Club?',
    answer: (
      <>
        A daily Neopets betting game on pirate eating contests. Five arenas, four pirates each.
        Smart sets are profitable over time; older accounts win more because max bet is higher. Many
        players see about 1.7x to 2.2x back long term.
        {seeGlossary('Max bet')}
      </>
    ),
  },
  {
    id: 'max-daily-winnings',
    question: "What's the highest one set can win in a day?",
    answer: (
      <>
        10 million NP in theory: ten lines, each paying up to the 1M NP winnings cap. In practice
        that means very risky bets on a day when long shots all hit, or, more plausibly for huge
        totals, a much later date when your <GlossaryRef id="max-bet">max bet</GlossaryRef> is high
        and you hit strong lines at low <GlossaryRef id="odds">odds</GlossaryRef> so each line can
        stake enough to reach the cap. Most days and sets are far below that. The best outcome in
        NeoFoodClub&apos;s data so far was round 6255, where the winning{' '}
        <GlossaryRef id="gambit">gambit</GlossaryRef> paid 123,045 units.
      </>
    ),
  },
  {
    id: 'gates-and-timing',
    question: 'When can I bet? What does "gates closed" mean?',
    answer: (
      <>
        Gates close for a 30-minute window at 1:45 PM NST and open at 2:15 PM NST. That is the
        window during which you cannot place new bets while one round ends and the next begins. When
        the gates open, the next round has begun.
        {seeGlossary('Round')}
      </>
    ),
  },
  {
    id: 'why-odds-change',
    question: 'Why do odds change?',
    answer: (
      <>
        Odds shift as more people bet. That does not change the chance of a pirate winning, only how
        much you would be paid if you bet now. After you place a bet, your payout odds are locked
        in.
        {seeGlossary('Odds')}
      </>
    ),
  },
];
