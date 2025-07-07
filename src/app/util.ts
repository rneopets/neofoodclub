import { useColorModeValue } from '@chakra-ui/react';
import { format, addDays, formatDistanceToNow, formatDistanceStrict, formatRelative } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { useMemo } from 'react';
import Cookies from 'universal-cookie';

import {
  LogitProbabilityData,
  RoundCalculationResult,
  PayoutTables,
  ProbabilityData,
  RoundState,
} from '../types';
import { Bet, BetAmount, BetValues, OddsData, ProbabilitiesData } from '../types/bets';

import {
  calculateArenaRatios,
  calculatePayoutTables,
  computePirateFAs,
  computePiratesBinary,
  computeLegacyProbabilities,
  computeLogitProbabilities,
  makeEmpty,
} from './maths';

export function generateRandomIntegerInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomPirateIndex(): number {
  return generateRandomIntegerInRange(1, 4);
}

function parseBets(betString: string): number[][] {
  return betString
    .replace(/[^a-y]/g, '')
    .split('')
    .map(char => 'abcdefghijklmnopqrstuvwxy'.indexOf(char))
    .reduce((prev: number[], next: number) => {
      prev.push(Math.floor(next / 5), next % 5);
      return prev;
    }, [])
    .reduce((t: number[][], e: number, r: number) => {
      const div = r % 5;
      if (div === 0) {
        t.push(makeEmpty(5));
      }
      const lastItem = t[t.length - 1];
      if (lastItem) {
        lastItem[div] = e;
      }
      return t;
    }, [])
    .reduce((t: number[][], e: number[], r: number) => {
      t[r + 1] = e;
      return t;
    }, []);
}

function parseBetAmounts(betAmountsString: string): BetAmount {
  const result = betAmountsString
    .match(/.{1,3}/g)
    ?.map(chunk => {
      let val = 0;
      for (let char = 0; char < chunk.length; char++) {
        val *= 52;
        val += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(chunk[char] ?? '');
      }
      return val - 70304;
    })
    .reduce((t: BetAmount, e, r) => {
      t.set(r + 1, e);
      return t;
    }, new Map<number, number>());

  return result || new Map<number, number>();
}

interface ParsedBetUrl {
  round: number;
  bets: Bet;
  betAmounts: BetAmount;
}

export function parseBetUrl(url: string): ParsedBetUrl {
  const urlParams = new URLSearchParams(url);

  // Initialize with empty Maps to ensure we always have the correct types
  const bets: Bet = new Map<number, number[]>();
  const betAmounts: BetAmount = new Map<number, number>();

  // temp variables for parsing
  let tempBets: number[][] = [];
  let tempBetAmounts = new Map<number, number>();

  // parse Bets
  const bet = urlParams.get('b');
  if (bet !== null) {
    tempBets = parseBets(bet);
  }

  // parse Bet Amounts
  const amounts = urlParams.get('a');
  if (amounts !== null && amounts !== '') {
    tempBetAmounts = parseBetAmounts(amounts);
  }

  // force data if none exists for bets and amounts alike
  // allow up to 15 bets
  const amountOfBets =
    Math.max(Object.keys(tempBets).length, tempBetAmounts.size, 10) > 10 ? 15 : 10;
  for (let index = 1; index <= amountOfBets; index++) {
    bets.set(index, tempBets[index] || makeEmpty(5));
    betAmounts.set(index, tempBetAmounts.get(index) || -1000);
  }

  const round = Number(urlParams.get('round')) || 0;

  return {
    round,
    bets,
    betAmounts,
  };
}

function makeBetsUrl(bets: number[][]): string {
  return Object.keys(bets)
    .sort((t, e) => Number(t) - Number(e))
    .map(t => bets[Number(t)])
    .reduce<number[]>((t, e) => {
      if (e) {
        t.push(...e);
      }
      return t;
    }, [])
    .reduce((t: number[], e: number, r: number) => {
      if (r % 2 === 0) {
        t.push(5 * e);
      } else if (t.length > 0) {
        const lastItem = t[t.length - 1];
        if (lastItem !== undefined) {
          t[t.length - 1] = lastItem + e;
        }
      }
      return t;
    }, [])
    .map((t: number) => 'abcdefghijklmnopqrstuvwxy'[t] as string)
    .join('');
}

function makeBetAmountsUrl(betAmounts: number[]): string {
  return betAmounts
    .map(t => {
      let e = '';
      t = (t % 70304) + 70304;
      for (let r = 0; r < 3; r++) {
        const n = t % 52;
        e = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[n] + e;
        t = (t - n) / 52;
      }
      return e;
    })
    .join('');
}

export function displayAsPercent(value: number, decimals?: number): string {
  if (value === undefined) {
    return '0%';
  }
  if (decimals === undefined) {
    return `${100 * value}%`;
  }
  return `${(100 * value).toFixed(decimals)}%`;
}

export function displayAsPlusMinus(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
}

function calculateMaxBet(baseMaxBet: number, round: number): number {
  return baseMaxBet + 2 * round;
}

export function calculateBaseMaxBet(maxBet: number, round: number): number {
  return maxBet - 2 * round;
}

export function getMaxBet(currentSelectedRound: number): number {
  const cookies = new Cookies();
  const baseMaxBet = cookies.get('baseMaxBet');

  // If no cookie is set, return -1000 (no max bet)
  if (baseMaxBet === undefined || baseMaxBet === null) {
    return -1000;
  }

  const value = calculateMaxBet(parseInt(baseMaxBet), currentSelectedRound);

  if (value < 1) {
    return -1000;
  }

  return Math.min(500_000, value);
}

export function getTableMode(): string {
  const validModes = ['normal', 'dropdown'];
  const cookies = new Cookies();
  let mode = cookies.get('tableMode');
  if (validModes.includes(mode) === false) {
    mode = 'normal';
  }
  return mode;
}

export function getBigBrainMode(): boolean {
  const cookies = new Cookies();
  const mode = cookies.get('bigBrainMode');
  return mode !== undefined ? mode : true; // Default to true if not set
}

export function getFaDetailsMode(): boolean {
  const cookies = new Cookies();
  const mode = cookies.get('faDetailsMode');
  return mode !== undefined ? mode : false; // Default to false if not set
}

export function getCustomOddsMode(): boolean {
  const cookies = new Cookies();
  const mode = cookies.get('customOddsMode');
  return mode !== undefined ? mode : false; // Default to false if not set
}

export function getOddsTimelineMode(): boolean {
  const cookies = new Cookies();
  const mode = cookies.get('oddsTimelineMode');
  return mode !== undefined ? mode : false; // Default to false if not set
}

export function getUseWebDomain(): boolean {
  const cookies = new Cookies();
  return cookies.get('useWebDomain');
}

export function getUseLogitModel(): boolean {
  const cookies = new Cookies();
  const mode = cookies.get('useLogitModel');
  return mode !== undefined ? mode : false; // Default to false if not set
}

export function isValidRound(roundState?: RoundState): boolean {
  return !!(
    roundState &&
    roundState.roundData &&
    roundState.roundData.round &&
    roundState.roundData.pirates?.[0]?.[0]
  );
}

export function anyBetsExist(betsObject?: Bet): boolean {
  if (!betsObject) {
    return false;
  }

  return Array.from(betsObject.values()).some(pirates => pirates.some(index => index > 0));
}

export function anyBetAmountsExist(betAmountsObject?: BetAmount): boolean {
  if (!betAmountsObject) {
    return false;
  }

  return Array.from(betAmountsObject.values()).some(amount => amount > 0);
}

export function makeBetURL(
  roundNumber: number,
  bets?: Bet,
  betAmounts?: BetAmount,
  includeBetAmounts: boolean = false,
): string {
  let url = `#round=${roundNumber}`;
  const anyBets = anyBetsExist(bets);

  if (anyBets && bets) {
    // Extract bet values using Array.from
    const betsValues = Array.from(bets.values());
    const b = makeBetsUrl(betsValues);
    url += `&b=${b}`;
  }

  if (anyBets && includeBetAmounts && anyBetAmountsExist(betAmounts) && betAmounts) {
    // Extract bet amount values using Array.from
    const betAmountsValues = Array.from(betAmounts.values());
    const a = makeBetAmountsUrl(betAmountsValues);
    url += `&a=${a}`;
  }

  return url;
}

export function calculateRoundOverPercentage(roundState?: RoundState): number {
  const roundStart = roundState?.roundData.start;

  if (roundStart === undefined) {
    return 0;
  }

  const now = new Date();
  const start = new Date(roundStart);
  const end = addDays(start, 1);
  const totalMillisInRange = end.getTime() - start.getTime();
  const elapsedMillis = now.getTime() - start.getTime();
  return Math.max(0, Math.min(100, 100 * (elapsedMillis / totalMillisInRange)));
}

function makeEmptyMap<K = number, V = unknown>(
  length: number,
  valueFactory: (index: number) => V,
): Map<K, V> {
  return new Map(Array.from({ length }, (_, i) => [(i + 1) as unknown as K, valueFactory(i)]));
}

export function makeEmptyBets(length: number): Bet {
  return makeEmptyMap(length, () => makeEmpty(5));
}

export function makeEmptyBetAmounts(length: number): BetAmount {
  return makeEmptyMap(length, () => -1000);
}

export function shuffleArray<T>(array: T[]): void {
  // shuffles the array in-place
  // from https://stackoverflow.com/a/12646864
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j] as T, array[i] as T];
  }
}

export function determineBetAmount(maxBet: number, betCap: number): number {
  // here we will determine a foolproof way to consistently give a bet amount to bets when generated

  // maxBet is the user-set max bet amount for a round.
  // betCap is the highest bet amount for a bet (1,000,000 / odds + 1) // (the +1 is so we cross the 1M line)

  // first, determine if there IS a max bet set. If not, just return -1000.
  if (maxBet < 1) {
    return -1000;
  }

  // if we've made it this far,
  // we must go with the smallest of maxBet, betCap, or 500K
  return Math.min(maxBet, betCap, 500_000);
}

export function amountAbbreviation(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${value / 1000000}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${value / 1000}k`;
  }
  return value.toString();
}

export function sortedIndices(arr: number[]): number[] {
  // returns the indices of the sorted array in least to greatest value
  // in: [3,4,1,2]
  // out:[2,3,0,1]
  // from https://stackoverflow.com/a/54323161
  return arr
    .map((val, ind) => ({ ind, val }))
    .sort((a, b) => (a.val > b.val ? 1 : a.val === b.val ? 0 : -1))
    .map(obj => obj.ind);
}

function getOdds(roundState?: RoundState | Partial<RoundState>): OddsData {
  // the odds we will use for things.
  // basically this just checks if the custom mode is on or not, and grabs the proper one.
  // returns the current round odds if there are no custom odds
  const odds = roundState?.roundData?.currentOdds ?? [];
  if (roundState?.advanced?.bigBrain && roundState?.advanced?.customOddsMode) {
    return roundState?.customOdds ?? odds;
  }
  return odds;
}

function getProbs(
  roundState: RoundState,
  legacyProbs: ProbabilityData,
  logitProbs: LogitProbabilityData,
): ProbabilitiesData {
  // returns the current round probs if there are no custom probs
  if (
    roundState.advanced.bigBrain &&
    roundState.advanced.customOddsMode &&
    roundState.customProbs !== null
  ) {
    return roundState.customProbs;
  }
  if (roundState.advanced.useLogitModel) {
    return logitProbs.used;
  }
  return legacyProbs.used;
}

export function makeBetValues(
  bets: Bet,
  betAmounts: BetAmount,
  odds: OddsData,
  probabilities: ProbabilitiesData,
): BetValues {
  const betOdds = new Map<number, number>();
  const betPayoffs = new Map<number, number>();
  const betProbabilities = new Map<number, number>();
  const betExpectedRatios = new Map<number, number>();
  const betNetExpected = new Map<number, number>();
  const betMaxBets = new Map<number, number>();
  const betBinaries = new Map<number, number>();

  for (let betIndex = 1; betIndex <= bets.size; betIndex++) {
    const bet = bets.get(betIndex) ?? makeEmpty(5);
    const binary = computePiratesBinary(bet);
    betBinaries.set(betIndex, binary);

    let oddsProduct = 1;
    let probProduct = 1;

    if (binary > 0) {
      for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
        const pirateIndex = bet[arenaIndex] ?? 0;
        if (pirateIndex > 0) {
          oddsProduct *= odds[arenaIndex]?.[pirateIndex] ?? 1;
          probProduct *= probabilities[arenaIndex]?.[pirateIndex] ?? 1;
        }
      }
    } else {
      oddsProduct = 0;
      probProduct = 0;
    }

    const amount = betAmounts.get(betIndex) ?? -1000;
    const payoff = Math.min(1_000_000, amount * oddsProduct);

    betOdds.set(betIndex, oddsProduct);
    betProbabilities.set(betIndex, probProduct);
    betPayoffs.set(betIndex, payoff);
    betExpectedRatios.set(betIndex, oddsProduct * probProduct);
    betNetExpected.set(betIndex, payoff * probProduct - amount);
    betMaxBets.set(betIndex, Math.floor(1_000_000 / (oddsProduct || 1)));
  }

  return {
    betOdds,
    betPayoffs,
    betProbabilities,
    betExpectedRatios,
    betNetExpected,
    betMaxBets,
    betBinaries,
  };
}

export function calculateRoundData(
  roundState?: RoundState,
  bets?: Bet,
  betAmounts?: BetAmount,
): RoundCalculationResult {
  // calculates all of the round's mathy data for visualization purposes.
  let calculated = false;
  let legacyProbabilities: ProbabilityData = {
    min: [],
    std: [],
    max: [],
    used: [],
  };
  let logitProbabilities: LogitProbabilityData = {
    prob: [],
    used: [],
  };
  let usedProbabilities: ProbabilitiesData = [];
  let pirateFAs: Map<number, number[][]> = new Map();
  let arenaRatios: number[] = [];
  let betOdds: Map<number, number> = new Map();
  let betPayoffs: Map<number, number> = new Map();
  let betProbabilities: Map<number, number> = new Map();
  let betExpectedRatios: Map<number, number> = new Map();
  let betNetExpected: Map<number, number> = new Map();
  let betMaxBets: Map<number, number> = new Map();
  let betBinaries: Map<number, number> = new Map();
  let payoutTables: PayoutTables = { odds: [], winnings: [] };
  let winningBetBinary = 0;

  // for payouttable + charts:
  let totalBetAmounts = 0;
  let totalBetExpectedRatios = 0;
  let totalBetNetExpected = 0;
  let totalWinningPayoff = 0;
  let totalWinningOdds = 0;
  let totalEnabledBets = 0;

  const odds = getOdds(roundState);
  if (isValidRound(roundState) && odds && bets && betAmounts) {
    if (roundState && roundState.roundData) {
      legacyProbabilities = computeLegacyProbabilities(roundState.roundData);
      logitProbabilities = computeLogitProbabilities(roundState.roundData);
      usedProbabilities = getProbs(roundState, legacyProbabilities, logitProbabilities);

      pirateFAs = computePirateFAs(roundState.roundData);
      arenaRatios = calculateArenaRatios(odds);
      winningBetBinary = computePiratesBinary(roundState.roundData.winners ?? makeEmpty(5));

      // keep the "cache" of bet data up to date
      const values = makeBetValues(bets, betAmounts, odds, usedProbabilities);

      betOdds = values.betOdds;
      betPayoffs = values.betPayoffs;
      betProbabilities = values.betProbabilities;
      betExpectedRatios = values.betExpectedRatios;
      betNetExpected = values.betNetExpected;
      betMaxBets = values.betMaxBets;
      betBinaries = values.betBinaries;

      for (const betKey of bets.keys()) {
        const betBinary = betBinaries.get(betKey) ?? 0;
        if (betBinary > 0) {
          totalEnabledBets += 1;
          // For amounts, we need to take the first value from the array
          const amount = betAmounts.get(betKey) as number;
          totalBetAmounts += amount;
          totalBetExpectedRatios += betExpectedRatios.get(betKey) as number;
          totalBetNetExpected += betNetExpected.get(betKey) as number;
          if ((winningBetBinary & betBinary) === betBinary) {
            // bet won
            totalWinningOdds += betOdds.get(betKey) as number;
            totalWinningPayoff += Math.min((betOdds.get(betKey) as number) * amount, 1_000_000);
          }
        }
      }

      // for charts
      payoutTables = calculatePayoutTables(bets, usedProbabilities, betOdds, betPayoffs);

      calculated = true;
    }
  }

  return {
    calculated,
    legacyProbabilities,
    logitProbabilities,
    usedProbabilities,
    pirateFAs,
    arenaRatios,
    betOdds,
    betPayoffs,
    betProbabilities,
    betExpectedRatios,
    betNetExpected,
    betMaxBets,
    betBinaries,
    odds,
    payoutTables,
    winningBetBinary,
    totalBetAmounts,
    totalBetExpectedRatios,
    totalBetNetExpected,
    totalWinningPayoff,
    totalWinningOdds,
    totalEnabledBets,
  };
}

// DateFormatter utility to replace react-moment
export function formatDate(
  date: string | Date | number,
  options: {
    format?: string;
    fromNow?: boolean;
    toNow?: boolean;
    calendar?: boolean;
    withTitle?: boolean;
    titleFormat?: string;
    tz?: string;
  } = {},
): string {
  const { format: formatStr, fromNow, toNow, calendar, tz = 'America/Los_Angeles' } = options;

  if (!date) {
    return '';
  }

  const dateObj = new Date(date);

  // Convert to timezone if specified
  const zonedDate = tz ? toZonedTime(dateObj, tz) : dateObj;

  // Return formatted date based on options
  if (fromNow) {
    return formatDistanceStrict(dateObj, new Date(), { addSuffix: true });
  } else if (toNow) {
    return formatDistanceStrict(dateObj, new Date(), { addSuffix: false });
  } else if (calendar) {
    return formatRelative(dateObj, new Date());
  } else if (formatStr) {
    const dateFnsFormat = convertMomentToDateFnsFormat(formatStr);
    return tz
      ? formatTz(zonedDate, dateFnsFormat, { timeZone: tz })
      : format(zonedDate, dateFnsFormat);
  }

  // Default format
  return format(zonedDate, 'yyyy-MM-dd HH:mm:ss');
}

// Helper function to convert moment.js format strings to date-fns format
function convertMomentToDateFnsFormat(momentFormat: string): string {
  return momentFormat
    .replace(/YYYY/g, 'yyyy')
    .replace(/DD/g, 'dd') // Two-digit day first
    .replace(/Do/g, 'do') // Ordinal day second
    .replace(/D/g, 'd') // Single day last
    .replace(/dddd/g, 'EEEE')
    .replace(/MM/g, 'MM')
    .replace(/MMMM/g, 'MMMM')
    .replace(/MMM/g, 'MMM')
    .replace(/HH/g, 'HH')
    .replace(/mm/g, 'mm')
    .replace(/ss/g, 'ss')
    .replace(/A/g, 'a')
    .replace(/LLL/g, 'MMM d, yyyy h:mm a')
    .replace(/LTS/g, 'h:mm:ss a')
    .replace(/llll/g, 'EEE, MMM d, yyyy h:mm a')
    .replace(/\[([^\]]+)\]/g, "'$1'"); // Convert [NST] to 'NST'
}

interface TableColors {
  blue: string;
  green: string;
  red: string;
  orange: string;
  gray: string;
  yellow: string;
}

export const useTableColors = (): TableColors => {
  const blue = useColorModeValue('nfc.blue', 'nfc.blueDark');
  const green = useColorModeValue('nfc.green', 'nfc.greenDark');
  const red = useColorModeValue('nfc.red', 'nfc.redDark');
  const orange = useColorModeValue('nfc.orange', 'nfc.orangeDark');
  const gray = useColorModeValue('nfc.gray', 'nfc.grayDark');
  const yellow = useColorModeValue('nfc.yellow', 'nfc.yellowDark');

  return useMemo(
    () => ({
      blue,
      green,
      red,
      orange,
      gray,
      yellow,
    }),
    [blue, green, red, orange, gray, yellow],
  );
};

/**
 * Helper functions for array operations to avoid inline callbacks
 */

/**
 * Cartesian product of arrays
 * @param arrays Arrays to compute product of
 * @returns Cartesian product array
 */
export function cartesianProduct<T>(...arrays: T[][]): T[][] {
  return arrays.reduce(
    (acc: T[][], current: T[]) =>
      acc.flatMap((item: T[]) => current.map((value: T) => [...item, value])),
    [[]],
  );
}

/**
 * Count non-zero elements in an array
 * @param array Array to check
 * @returns Count of non-zero elements
 */
export function countNonZeroElements(array: number[]): number {
  return array.reduce((count, value) => count + (value !== 0 ? 1 : 0), 0);
}
