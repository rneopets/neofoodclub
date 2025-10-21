import {
  Flex,
  Stack,
  VStack,
  HStack,
  Spacer,
  Wrap,
  WrapItem,
  Button,
  ButtonGroup,
  IconButton,
  Menu,
  Editable,
  Dialog,
  Text,
  Heading,
  Badge,
  Separator,
  Card,
  useClipboard,
  Portal,
  Icon,
} from '@chakra-ui/react';
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  FaMarkdown,
  FaCode,
  FaClone,
  FaPlus,
  FaTrash,
  FaChevronDown,
  FaWandMagicSparkles,
  FaShapes,
  FaShuffle,
  FaLink,
  FaSackDollar,
  FaCheck,
} from 'react-icons/fa6';

import { PayoutData, RoundData, RoundState, RoundCalculationResult } from '../types';
import { Bet, BetAmount } from '../types/bets';

import PirateSelect from './components/PirateSelect';
import SettingsBox from './components/SettingsBox';
import { ARENA_NAMES, PIRATE_NAMES, SHORTHAND_PIRATE_NAMES } from './constants';
import { useBetManagement } from './hooks/useBetManagement';
import { makeEmpty, computeBinaryToPirates, calculatePayoutTables } from './maths';
import {
  useSelectedRound,
  useRoundDataStore,
  useBetManagementStore,
  useCalculationsStatus,
  useArenaRatios,
  useWinningBetBinary,
  useUsedProbabilities,
  useCalculationsStore,
  useBetSetCount,
  useAllBetSetNames,
  useWinnersBinary,
  useCurrentBet,
  useSetCurrentBet,
  useDeleteBetSet,
  useRoundPirates,
  useOptimizedBetsForIndex,
  useOptimizedBetAmountsForIndex,
  useLogitModelSetting,
} from './stores';
import { memoizedCalculations } from './stores/calculationsStore';
import {
  makeEmptyBetAmounts,
  countNonZeroElements,
  shuffleArray,
  generateRandomPirateIndex,
  generateRandomIntegerInRange,
  anyBetsExist,
  makeBetURL,
  isValidRound,
  displayAsPercent,
  makeBetValues,
  makeEmptyBets,
  anyBetAmountsExist,
} from './util';

import { Tooltip } from '@/components/ui/tooltip';

const BuildSetMenu = React.memo((): React.ReactElement => {
  const hasRoundData = useRoundPirates()?.[0]?.[0] !== undefined;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = React.useState(''); // currently can only be "Ten-bet" or "Gambit"
  const [pirateIndices, setPirateIndices] = React.useState(makeEmpty(5)); // indices of the pirates to be included in the set
  const [min, setMin] = React.useState(0); // minimum pirate amount
  const [max, setMax] = React.useState(0); // maximum pirate amount
  const [buildButtonEnabled, setBuildButtonEnabled] = React.useState(false); // whether the build button is enabled, if we're within min/max to do so

  const { generateTenbetSet, generateGambitWithPirates } = useBetManagement();

  const handleChange = useCallback((arenaIndex: number, pirateIndex: number) => {
    setPirateIndices(prevIndices => {
      const newPirateIndices = structuredClone(prevIndices);
      newPirateIndices[arenaIndex] = pirateIndex;
      return newPirateIndices;
    });
  }, []);

  const createOnChangeHandler = useCallback(
    (index: number): ((e: React.ChangeEvent<HTMLSelectElement>) => void) =>
      (e: React.ChangeEvent<HTMLSelectElement>): void => {
        handleChange(index, parseInt(e.target.value));
      },
    [handleChange],
  );

  useEffect(() => {
    // count the amount of non-zero elements in pirateIndices
    const amount = countNonZeroElements(pirateIndices);
    setBuildButtonEnabled(amount >= min && amount <= max);
  }, [pirateIndices, min, max]);

  const handleTenBetClick = useCallback(() => {
    setMode('Ten-bet');
    // reset state
    setMin(1);
    setMax(3);
    setPirateIndices(makeEmpty(5));
    setOpen(true);
  }, []);

  const handleGambitClick = useCallback(() => {
    setMode('Gambit');
    // reset state
    setMin(5);
    setMax(5);
    setPirateIndices(makeEmpty(5));
    setOpen(true);
  }, []);

  const handleBuildClick = useCallback(() => {
    if (mode === 'Ten-bet') {
      generateTenbetSet(pirateIndices);
    } else if (mode === 'Gambit') {
      generateGambitWithPirates(pirateIndices);
    }
    setOpen(false);
  }, [mode, pirateIndices, generateTenbetSet, generateGambitWithPirates]);

  const randomizeIndices = useCallback(() => {
    // generate a full set of random indices
    const newIndices = [
      generateRandomPirateIndex(),
      generateRandomPirateIndex(),
      generateRandomPirateIndex(),
      generateRandomPirateIndex(),
      generateRandomPirateIndex(),
    ];

    // remove random indices as needed
    if (max - min > 0) {
      const indices = [0, 1, 2, 3, 4];
      shuffleArray(indices);
      const rand = generateRandomIntegerInRange(min, max);
      const randomIndices = indices.slice(0, rand);
      // set these indices to 0
      randomIndices.forEach(index => {
        newIndices[index] = 0;
      });
    }

    setPirateIndices(newIndices);
  }, [min, max]);

  const handleClearIndices = useCallback(() => {
    setPirateIndices(makeEmpty(5));
  }, []);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            aria-label="Generate New Bet Set"
            disabled={!hasRoundData}
            data-testid="build-set-button"
            size="sm"
          >
            <FaShapes />
            Build set
            <FaChevronDown />
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item
                value="gambit"
                onClick={handleGambitClick}
                data-testid="build-gambit-set-menuitem"
              >
                Gambit set
              </Menu.Item>
              <Menu.Item
                value="tenbet"
                onClick={handleTenBetClick}
                data-testid="build-tenbet-set-menuitem"
              >
                Ten-bet set
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      <Dialog.Root
        placement="center"
        size="xl"
        lazyMount
        open={open}
        onOpenChange={(e: { open: boolean | ((prevState: boolean) => boolean) }) => setOpen(e.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>Custom {mode} builder</Dialog.Header>
            <Dialog.CloseTrigger data-testid="build-modal-close-button" />
            <Dialog.Body>
              <VStack mb={3}>
                {min === max ? (
                  <Text as={'i'}>Please choose {max} pirates.</Text>
                ) : (
                  <Text as={'i'}>
                    Please choose between {min} and {max} pirates.
                  </Text>
                )}
              </VStack>
              <Wrap justify="center">
                {ARENA_NAMES.map((arena, index) => (
                  <WrapItem key={arena}>
                    <PirateSelect
                      arenaId={index}
                      pirateValue={pirateIndices[index] ?? 0}
                      showArenaName={true}
                      onChange={createOnChangeHandler(index)}
                    />
                  </WrapItem>
                ))}
              </Wrap>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex width="2xl">
                <HStack>
                  <Button onClick={randomizeIndices} data-testid="randomize-button">
                    <FaShuffle />
                    Randomize
                  </Button>
                  <Button
                    onClick={handleClearIndices}
                    data-testid="modal-clear-button"
                    disabled={pirateIndices.every(e => e === 0)}
                  >
                    <FaTrash />
                    Clear
                  </Button>
                </HStack>
                <Spacer />
                <Button
                  disabled={!buildButtonEnabled}
                  variant="surface"
                  colorPalette="gray"
                  onClick={handleBuildClick}
                  data-testid="build-modal-button"
                >
                  Build {mode} set
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
});

BuildSetMenu.displayName = 'BuildSetMenu';

function createMarkdownTable(
  calculations: RoundCalculationResult,
  currentSelectedRound: number,
  roundData: RoundData,
  bets: Bet,
): string | null {
  // specifically meant to not be posted on Neopets, so it includes a URL.
  if (
    !calculations.payoutTables.odds ||
    calculations.calculated === false ||
    !isValidRound({ roundData, currentSelectedRound } as RoundState)
  ) {
    return null;
  }

  let totalTER = 0;
  let betCount = 0;
  const lines: string[] = [];

  // bet table
  lines.push(
    `[${currentSelectedRound}](${window.location.origin}${makeBetURL(
      currentSelectedRound,
      bets,
      {} as BetAmount,
      false,
    )})|Shipwreck|Lagoon|Treasure|Hidden|Harpoon|Odds`,
  );
  lines.push(':-:|-|-|-|-|-|-:');

  for (const [betNum, bet] of bets.entries()) {
    totalTER += calculations.betExpectedRatios.get(betNum) ?? 0;
    if (calculations.betBinaries.get(betNum)) {
      betCount += 1;
      let str = `${betNum}`;
      for (const pirateId of bet) {
        str += '|';
        if (pirateId) {
          str += PIRATE_NAMES.get(pirateId);
        }
      }
      lines.push(`${str}|${calculations.betOdds.get(betNum) ?? 0}:1`);
    }
  }
  lines.push('\n');
  // stats
  lines.push(`TER: ${totalTER.toFixed(3)}`);
  lines.push('\n');
  lines.push('Odds|Probability|Cumulative|Tail');
  lines.push('--:|--:|--:|--:');
  calculations.payoutTables.odds.forEach((item: PayoutData) => {
    lines.push(
      `${item.value}:${betCount}|${displayAsPercent(
        item.probability,
        3,
      )}|${displayAsPercent(item.cumulative, 3)}|${displayAsPercent(item.tail, 3)}`,
    );
  });

  return lines.join('\n');
}

function createHtmlTable(
  calculations: RoundCalculationResult,
  currentSelectedRound: number,
  roundData: RoundData,
  bets: Bet,
): string | null {
  // specifically meant to be posted on Neopets, so it includes the bet hash
  if (
    !calculations.payoutTables.odds ||
    calculations.calculated === false ||
    !isValidRound({ roundData, currentSelectedRound } as RoundState)
  ) {
    return null;
  }

  // bet table
  let html =
    '<table><thead><tr><th>Bet</th><th>Shipwreck</th><th>Lagoon</th><th>Treasure</th><th>Hidden</th><th>Harpoon</th><th>Odds</th></tr></thead><tbody>';

  for (const [betNum, bet] of bets.entries()) {
    if (calculations.betBinaries.get(betNum)) {
      let str = `<tr><td>${betNum}</td>`;
      for (const pirateId of bet) {
        str += '<td>';
        if (pirateId) {
          str += PIRATE_NAMES.get(pirateId);
        }
        str += '</td>';
      }
      html += str;
      html += `<td>${calculations.betOdds.get(betNum)}:1</td>`;
      html += '</tr>';
    }
  }

  const hash = makeBetURL(currentSelectedRound, bets, {} as BetAmount, false);
  html += `</tbody><tfoot><tr><td colspan="7">${hash}</td></tr></tfoot></table>`;

  return html;
}

const BetCopyButtons = React.memo(
  (props: { index: number; [key: string]: unknown }): React.ReactElement => {
    const { index, ...rest } = props;
    const currentSelectedRound = useSelectedRound();
    const roundData = useRoundDataStore(state => state.roundState.roundData);
    const useWebDomain = useRoundDataStore(state => state.roundState.useWebDomain);
    const calculation = useCalculationsStore(state => state.calculations);
    const bets = useOptimizedBetsForIndex(index);
    const betAmounts = useOptimizedBetAmountsForIndex(index);

    const [copiedButton, setCopiedButton] = React.useState<string | null>(null);

    const tableExportDisabled = useMemo(
      () => !calculation.calculated || !anyBetsExist(bets) || !roundData || !currentSelectedRound,
      [calculation.calculated, bets, roundData, currentSelectedRound],
    );

    const markdownTable = useMemo(() => {
      if (tableExportDisabled) {
        return null;
      }
      return createMarkdownTable(calculation, currentSelectedRound, roundData, bets);
    }, [tableExportDisabled, calculation, currentSelectedRound, roundData, bets]);

    const htmlTable = useMemo(() => {
      if (tableExportDisabled) {
        return null;
      }
      return createHtmlTable(calculation, currentSelectedRound, roundData, bets);
    }, [tableExportDisabled, calculation, currentSelectedRound, roundData, bets]);

    const betUrl = useMemo(() => {
      if (tableExportDisabled) {
        return '';
      }
      const url = makeBetURL(currentSelectedRound, bets);
      return useWebDomain ? `${window.location.origin}${url}` : url;
    }, [tableExportDisabled, currentSelectedRound, bets, useWebDomain]);

    // Create memoized URL with bet amounts
    const betUrlWithAmounts = useMemo(() => {
      if (tableExportDisabled) {
        return '';
      }
      const url = makeBetURL(currentSelectedRound, bets, betAmounts, true);
      return useWebDomain ? `${window.location.origin}${url}` : url;
    }, [tableExportDisabled, currentSelectedRound, bets, betAmounts, useWebDomain]);

    const { copy: copyMarkdown } = useClipboard({ value: markdownTable || '' });
    const { copy: copyHtml } = useClipboard({ value: htmlTable || '' });
    const { copy: copyUrl } = useClipboard({ value: betUrl });
    const { copy: copyUrlWithAmounts } = useClipboard({ value: betUrlWithAmounts });

    const handleCopyWithAnimation = useCallback((buttonId: string, copyFn: () => void) => {
      copyFn();
      setCopiedButton(buttonId);
      setTimeout(() => setCopiedButton(null), 1500);
    }, []);

    const handleCopyMarkdown = useCallback(() => {
      handleCopyWithAnimation('markdown', copyMarkdown);
    }, [handleCopyWithAnimation, copyMarkdown]);

    const handleCopyHtml = useCallback(() => {
      handleCopyWithAnimation('html', copyHtml);
    }, [handleCopyWithAnimation, copyHtml]);

    const handleCopyUrl = useCallback(() => {
      handleCopyWithAnimation('url', copyUrl);
    }, [handleCopyWithAnimation, copyUrl]);

    const handleCopyUrlWithAmounts = useCallback(() => {
      handleCopyWithAnimation('urlWithAmounts', copyUrlWithAmounts);
    }, [handleCopyWithAnimation, copyUrlWithAmounts]);

    return (
      <HStack gap={1} {...rest}>
        <Spacer />
        <Heading size="xs" textTransform="uppercase">
          Share:
        </Heading>
        <Spacer />
        <ButtonGroup variant="ghost" gap={1} size="xs">
          <CopyIconButton
            icon={FaLink}
            label="Copy Bet URL"
            onClick={handleCopyUrl}
            ariaLabel="Copy Bet URL"
            disabled={!anyBetsExist(bets)}
            testId="copy-bet-url-button"
            isActive={copiedButton === 'url'}
          />
          <CopyIconButton
            icon={FaSackDollar}
            label="Copy Bet URL with amounts"
            onClick={handleCopyUrlWithAmounts}
            ariaLabel="Copy Bet URL with amounts"
            disabled={!anyBetAmountsExist(betAmounts)}
            testId="copy-bet-url-with-amounts-button"
            isActive={copiedButton === 'urlWithAmounts'}
          />
        </ButtonGroup>

        <ButtonGroup variant="ghost" gap={1} size="xs">
          <CopyIconButton
            icon={FaMarkdown}
            label="Copy Markdown table"
            onClick={handleCopyMarkdown}
            ariaLabel="Copy Markdown table"
            disabled={tableExportDisabled}
            testId="copy-markdown-button"
            isActive={copiedButton === 'markdown'}
          />
          <CopyIconButton
            icon={FaCode}
            label="Copy HTML table"
            onClick={handleCopyHtml}
            ariaLabel="Copy HTML table"
            disabled={tableExportDisabled}
            testId="copy-html-button"
            isActive={copiedButton === 'html'}
          />
        </ButtonGroup>
        <Spacer />
      </HStack>
    );
  },
);

BetCopyButtons.displayName = 'BetCopyButtons';

const CopyIconButton = React.memo(
  ({
    icon: MainIcon,
    label,
    onClick,
    ariaLabel,
    disabled,
    testId,
    isActive,
  }: {
    icon: React.ComponentType;
    label: string;
    onClick: () => void;
    ariaLabel: string;
    disabled: boolean;
    testId: string;
    isActive: boolean;
  }) => (
    <Tooltip content={label} openDelay={600}>
      <IconButton
        onClick={onClick}
        aria-label={ariaLabel}
        disabled={disabled}
        data-testid={testId}
        colorPalette={isActive ? 'green' : 'gray'}
      >
        <Icon
          as={isActive ? FaCheck : MainIcon}
          w="1.5em"
          h="1.5em"
          transition="all 0.2s ease-in-out"
        />
      </IconButton>
    </Tooltip>
  ),
);

CopyIconButton.displayName = 'CopyIconButton';

interface BetFunctionsProps {
  [key: string]: unknown;
}

const BetFunctions = React.memo((props: BetFunctionsProps): React.ReactElement => {
  const { ...rest } = props;

  const {
    newEmptySet,
    cloneSet,
    generateMaxTERSet,
    generateGambitSet,
    generateBustproofSet,
    generateWinningGambitSet,
    generateRandomCrazySet,
  } = useBetManagement();
  const currentBetIndex = useCurrentBet();
  const setCurrentBet = useSetCurrentBet();
  const deleteSet = useDeleteBetSet();

  const roundData = useRoundDataStore(state => state.roundState.roundData);
  const arenaRatios = useArenaRatios();
  const winningBetBinary = useWinningBetBinary();
  const currentSelectedRound = useSelectedRound();

  const betSetCount = useBetSetCount();
  const allNames = useAllBetSetNames();

  const clearOrDeleteSet = useCallback(() => {
    if (betSetCount === 1) {
      // If only one set, clear it instead of deleting
      const store = useBetManagementStore.getState();
      store.updateBet(currentBetIndex, makeEmptyBets(10));
      store.updateBetAmounts(currentBetIndex, makeEmptyBetAmounts(10));
      store.updateBetName(currentBetIndex, '');
    } else {
      // If multiple sets, delete the current one
      deleteSet(currentBetIndex);
    }
  }, [deleteSet, currentBetIndex, betSetCount]);

  const positiveArenas = useMemo(
    () => arenaRatios.filter((x: number) => x > 0).length,
    [arenaRatios],
  );

  const handleCardClick = useCallback(
    (key: number) => (): void => {
      if (key !== currentBetIndex) {
        setCurrentBet(key);
      }
    },
    [currentBetIndex, setCurrentBet],
  );

  const handleEditableSubmit = useCallback(
    (key: number) =>
      function onValueCommit(details: { value: string }): void {
        const store = useBetManagementStore.getState();
        store.updateBetName(key, details.value);
      },
    [],
  );

  const betCards = useMemo(() => {
    if (betSetCount === 0) {
      return null;
    }

    return Array.from(allNames.keys()).map(key => {
      const isCurrent = key === currentBetIndex;
      const currentName = allNames.get(key) || '';

      return (
        <BetCard
          key={key}
          cardKey={key}
          isCurrent={isCurrent}
          currentName={currentName}
          onClick={handleCardClick(key)}
          onValueCommit={handleEditableSubmit(key)}
        />
      );
    });
  }, [betSetCount, allNames, currentBetIndex, handleCardClick, handleEditableSubmit]);

  const clearBets = useCallback(() => {
    clearOrDeleteSet();
    // Only clear probability-related cache since clearing bets affects probabilities
    memoizedCalculations.clearCache('usedProb_');
    memoizedCalculations.clearCache('logitProb_');
    memoizedCalculations.clearCache('legacyProb');
  }, [clearOrDeleteSet]);

  const hasRoundData = isValidRound({ roundData, currentSelectedRound } as RoundState);

  return (
    <SettingsBox p={2} {...rest}>
      <Stack>
        <Wrap>
          <ButtonGroup size="sm" variant="surface">
            <Button onClick={newEmptySet} data-testid="new-set-button">
              <FaPlus />
              New set
            </Button>

            <Button onClick={cloneSet} data-testid="clone-set-button">
              <FaClone />
              Clone
            </Button>
            <Button onClick={clearBets} data-testid="clear-delete-button">
              <FaTrash />
              {betSetCount === 1 ? 'Clear' : 'Delete'}
            </Button>
          </ButtonGroup>

          <Menu.Root>
            <Menu.Trigger asChild>
              <Button data-testid="generate-button" disabled={!hasRoundData} size="sm">
                <FaWandMagicSparkles />
                Generate
                <FaChevronDown />
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    value="maxTer"
                    onClick={generateMaxTERSet}
                    data-testid="max-ter-set-menuitem"
                  >
                    Max TER set
                  </Menu.Item>
                  <Menu.Item
                    value="gambit"
                    onClick={generateGambitSet}
                    data-testid="gambit-set-menuitem"
                  >
                    Gambit set
                  </Menu.Item>
                  <Menu.Item
                    value="winningGambit"
                    hidden={winningBetBinary === 0}
                    onClick={generateWinningGambitSet}
                    data-testid="winning-gambit-set-menuitem"
                  >
                    Winning Gambit set
                  </Menu.Item>
                  <Menu.Item
                    value="randomCrazy"
                    onClick={generateRandomCrazySet}
                    data-testid="random-crazy-set-menuitem"
                  >
                    Random Crazy set
                  </Menu.Item>
                  <Menu.Item
                    value="bustproof"
                    onClick={generateBustproofSet}
                    disabled={positiveArenas === 0}
                    data-testid="bustproof-set-menuitem"
                  >
                    Bustproof Set
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>

          <BuildSetMenu />
        </Wrap>

        <Wrap>{betCards}</Wrap>
      </Stack>
    </SettingsBox>
  );
});

const BetCard = React.memo(
  ({
    cardKey,
    isCurrent,
    currentName,
    onClick,
    onValueCommit,
  }: {
    cardKey: number;
    isCurrent: boolean;
    currentName: string;
    onClick: () => void;
    onValueCommit: (details: { value: string }) => void;
  }) => (
    <WrapItem>
      <Card.Root
        p={1}
        opacity={isCurrent ? 1 : 0.5}
        cursor={isCurrent ? 'default' : 'pointer'}
        onClick={onClick}
        transition="all 0.2s ease-in-out"
        boxShadow={isCurrent ? 'dark-lg' : 'xl'}
        minW="260px"
      >
        <VStack align="stretch" minW="200px" separator={<Separator />}>
          <Editable.Root
            key={`${cardKey}-${currentName}`}
            as={Heading}
            defaultValue={currentName}
            onValueCommit={onValueCommit}
            placeholder="Unnamed Set"
            minW="100%"
          >
            <Editable.Preview minW="100%" />
            <Editable.Input />
          </Editable.Root>
          <BetBadges index={cardKey} />
          {isCurrent && <BetCopyButtons index={cardKey} />}
        </VStack>
      </Card.Root>
    </WrapItem>
  ),
);

BetCard.displayName = 'BetCard';

const BetBadges = React.memo(
  (props: { index: number; [key: string]: unknown }): React.ReactElement => {
    const { index, ...rest } = props;
    const currentSelectedRound = useSelectedRound();
    const roundData = useRoundDataStore(state => state.roundState.roundData);
    const winnersBinary = useWinnersBinary();
    const isRoundOver = winnersBinary > 0;
    const useLogitModel = useLogitModelSetting();

    const usedProbabilities = useUsedProbabilities();
    const odds = useRoundDataStore(state => state.roundState.roundData.currentOdds || []);
    const calculated = useCalculationsStatus();
    const winningBetBinary = useWinningBetBinary();

    const bets = useOptimizedBetsForIndex(index);
    const betAmounts = useOptimizedBetAmountsForIndex(index);

    const betValues = useMemo(
      () => makeBetValues(bets, betAmounts, odds, usedProbabilities),
      [bets, betAmounts, odds, usedProbabilities],
    );

    const { betOdds, betPayoffs, betBinaries } = betValues;

    const payoutTables = useMemo(() => {
      if (!calculated) {
        return { odds: [], winnings: [] };
      }
      return (
        calculatePayoutTables(bets, usedProbabilities, betOdds, betPayoffs) || {
          odds: [],
          winnings: [],
        }
      );
    }, [calculated, bets, usedProbabilities, betOdds, betPayoffs]);

    const betInfo = useMemo(() => {
      const validBets = Array.from(betBinaries.values()).filter(x => x > 0);
      const betCount = validBets.length;
      const hasDuplicateBets = [...new Set(validBets)].length !== validBets.length;

      return {
        betCount,
        hasDuplicateBets,
        validBets,
      };
    }, [betBinaries]);

    const { betCount, hasDuplicateBets } = betInfo;

    const statusBadges = useMemo(() => {
      const result = [];

      // round-over badge
      if (isRoundOver) {
        result.push(
          <Badge key="round-over" colorPalette="red" variant="surface">
            Round {roundData?.round} is over
          </Badge>,
        );
      }

      if (!calculated) {
        result.push(
          <Badge key="no-round-data" colorPalette="red" variant="surface">
            ❌ No data for round {currentSelectedRound}
          </Badge>,
        );
      }

      return result;
    }, [isRoundOver, calculated, roundData?.round, currentSelectedRound]);

    const validationBadges = useMemo(() => {
      const result = [];

      if (hasDuplicateBets) {
        // duplicate bets
        result.push(
          <Badge key="duplicate-bets" colorPalette="red" variant="surface">
            ❌ Contains duplicate bets
          </Badge>,
        );
      }

      const invalidBetAmounts = Array.from(betOdds.entries()).filter(
        ([betIndex, oddsTest]: [number, number]) => {
          const betAmount = betAmounts.get(betIndex) ?? -1000;
          return oddsTest > 0 && betAmount < 1;
        },
      );

      if (invalidBetAmounts.length > 0) {
        result.push(
          <Badge key="invalid-amounts" colorPalette="red" variant="surface">
            ❌ Invalid bet amounts
          </Badge>,
        );
      }

      // bust chance badge
      if (betCount === 0 && calculated) {
        result.push(
          <Badge key="no-bets" colorPalette="red" variant="surface">
            ❌ No pirates selected
          </Badge>,
        );
      }

      return result;
    }, [hasDuplicateBets, betOdds, betAmounts, betCount, calculated]);

    // Strategy badges - only recalculate when bet structure or round data changes
    const strategyBadges: React.ReactElement[] = useMemo(() => {
      const result: React.ReactElement[] = [];
      const isInvalid = hasDuplicateBets || !calculated;

      if (betCount < 2 || isInvalid) {
        return result;
      }

      // gambit badge
      const highest = Math.max(...betBinaries.values());
      const populationCount = highest.toString(2).match(/1/g)?.length ?? 0;
      if (populationCount === 5) {
        const isSubset = Array.from(betBinaries.values()).every(x => (highest & x) === x);
        if (isSubset) {
          const names: string[] = [];
          computeBinaryToPirates(highest).forEach((pirate, pirateIndex) => {
            if (pirate > 0) {
              const pirateId = roundData?.pirates?.[pirateIndex]?.[pirate - 1];
              if (pirateId) {
                names.push(SHORTHAND_PIRATE_NAMES.get(pirateId) ?? '');
              }
            }
          });

          result.push(
            <Badge key="gambit" colorPalette="blue" variant="surface">
              Gambit: {names.join(' x ')}
            </Badge>,
          );
        }
      }

      // tenbet badge
      if (betCount >= 10) {
        const tenbetBinary = Array.from(betBinaries.values()).reduce(
          (accum, current) => accum & current,
        );

        if (tenbetBinary > 0) {
          const names: string[] = [];
          computeBinaryToPirates(tenbetBinary).forEach((pirate, pirateIndex) => {
            if (pirate > 0) {
              const pirateId = roundData?.pirates?.[pirateIndex]?.[pirate - 1];
              if (pirateId) {
                names.push(SHORTHAND_PIRATE_NAMES.get(pirateId) ?? '');
              }
            }
          });

          result.push(
            <Badge key="tenbet" colorPalette="purple" variant="surface">
              Tenbet: {names.join(' x ')}
            </Badge>,
          );
        }
      }

      // crazy badge
      if (betCount >= 10) {
        const isCrazy = Array.from(betBinaries.values()).every(binary =>
          computeBinaryToPirates(binary).every(x => x > 0),
        );

        if (isCrazy) {
          result.push(
            <Badge key="crazy" colorPalette="pink" variant="surface">
              🤪 Crazy
            </Badge>,
          );
        }
      }

      return result;
    }, [betCount, betBinaries, hasDuplicateBets, calculated, roundData?.pirates]);

    const performanceBadges: React.ReactElement[] = useMemo(() => {
      const result: React.ReactElement[] = [];
      const isInvalid = hasDuplicateBets || !calculated;

      if (betCount === 0 || isRoundOver || isInvalid || !payoutTables.odds?.length) {
        return result;
      }

      // bust chance badge
      let bustChance = 0;
      if (payoutTables.odds[0]?.value === 0) {
        bustChance = payoutTables.odds[0]?.probability * 100 || 0;
      }

      if (bustChance === 0) {
        result.push(
          <Badge key="bust-proof" variant="surface">
            🎉 Bust-proof!
          </Badge>,
        );
      } else {
        const bustEmoji = bustChance > 99 ? '💀' : '';
        const beakerEmoji = useLogitModel ? '🧪' : '';
        result.push(
          <Badge key="bust-chance" variant="surface">
            {bustEmoji} {Math.floor(bustChance)}% Bust {beakerEmoji}
          </Badge>,
        );
      }

      // guaranteed profit badge
      let betAmountsTotal = 0;
      betAmounts.forEach((amount: number) => {
        if (amount !== -1000) {
          betAmountsTotal += amount;
        }
      });
      const lowestProfit = payoutTables.winnings[0]?.value ?? 0;
      if (betAmountsTotal < lowestProfit) {
        result.push(
          <Badge key="guaranteed-profit" colorPalette="green" variant="surface">
            💰 Guaranteed profit ({lowestProfit - betAmountsTotal}+ NP)
          </Badge>,
        );
      }

      return result;
    }, [
      betCount,
      isRoundOver,
      hasDuplicateBets,
      calculated,
      payoutTables,
      betAmounts,
      useLogitModel,
    ]);

    const resultsBadges: React.ReactElement[] = useMemo(() => {
      const result: React.ReactElement[] = [];
      const isInvalid = hasDuplicateBets || !calculated;

      if (!isRoundOver || betCount === 0 || isInvalid) {
        return result;
      }

      let unitsWon = 0;
      let npWon = 0;

      if (winningBetBinary > 0) {
        betBinaries.forEach((binary, betIndex) => {
          if (binary > 0 && (winningBetBinary & binary) === binary) {
            unitsWon += betOdds.get(betIndex) ?? 0;
            npWon += Math.min(
              (betOdds.get(betIndex) ?? 0) * (betAmounts.get(betIndex) ?? 0),
              1_000_000,
            );
          }
        });
      }

      if (unitsWon === 0) {
        result.push(
          <Badge key="busted" variant="surface">
            💀 Busted
          </Badge>,
        );
      } else {
        result.push(
          <Badge key="units-won" colorPalette="green" variant="surface">
            Units won: {unitsWon.toLocaleString()}
          </Badge>,
        );

        if (npWon > 0) {
          result.push(
            <Badge key="np-won" colorPalette="green" variant="surface">
              💰 NP won: {npWon.toLocaleString()}
            </Badge>,
          );
        }
      }

      return result;
    }, [
      isRoundOver,
      betCount,
      betBinaries,
      winningBetBinary,
      betOdds,
      betAmounts,
      hasDuplicateBets,
      calculated,
    ]);

    // Combine all badges
    const allBadges = useMemo(
      () => [
        ...statusBadges,
        ...validationBadges,
        ...strategyBadges,
        ...performanceBadges,
        ...resultsBadges,
      ],
      [statusBadges, validationBadges, strategyBadges, performanceBadges, resultsBadges],
    );

    return (
      <VStack gap={1} userSelect="none" {...rest}>
        {allBadges}
      </VStack>
    );
  },
);

BetBadges.displayName = 'BetBadges';

export default BetFunctions;
