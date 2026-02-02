import {
  Box,
  Button,
  ProgressCircle,
  Image,
  Heading,
  HStack,
  SkeletonText,
  Spacer,
  Separator,
  Text,
  VStack,
  BoxProps,
  ButtonProps,
  Show,
  AbsoluteCenter,
  Group,
  NumberInputControl,
} from '@chakra-ui/react';
import { addYears, differenceInMilliseconds } from 'date-fns';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FaRotate, FaClockRotateLeft, FaPlay } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useColorMode } from '../components/ui/color-mode';

import MaxBetLockToggle from './components/bets/MaxBetLockToggle';
import DateFormatter from './components/format/DateFormatter';
import RoundInput from './components/inputs/RoundInput';
import GlowCard from './components/ui/GlowCard';
import { useIsRoundOver } from './hooks/useIsRoundOver';
import { useRoundProgress } from './hooks/useRoundProgress';
import NeopointIcon from './images/np-icon.svg';
import { useRoundStore, useTimestampValue, useLastChange, useSetMaxBet } from './stores';
import { calculateBaseMaxBet, getMaxBet, getMaxBetLocked } from './util';

import {
  NumberInputField,
  NumberInputRoot,
  NumberInputValueChangeDetails,
} from '@/components/ui/number-input';
import { Tooltip } from '@/components/ui/tooltip';

// Add a new selector for error state
const useErrorState = (): string | null => useRoundStore(state => state.error);

interface GoToCurrentRoundButtonProps {
  testId?: string;
}

const GoToCurrentRoundButton: React.FC<GoToCurrentRoundButtonProps> = React.memo(
  ({ testId = 'go-to-current-round' }) => {
    const currentRound = useRoundStore(state => state.currentRound);
    const updateSelectedRound = useRoundStore(state => state.updateSelectedRound);

    const handleGoToCurrent = useCallback(() => {
      updateSelectedRound(currentRound);
    }, [updateSelectedRound, currentRound]);

    return (
      <Tooltip content={`Go to current round (${currentRound})`} placement="top">
        <Button
          size="xs"
          variant="ghost"
          colorPalette="gray"
          onClick={handleGoToCurrent}
          fontSize="xs"
          height="auto"
          minH="auto"
          p={1}
          data-testid={testId}
        >
          <FaPlay style={{ fontSize: '8px' }} />
          Go to current round
        </Button>
      </Tooltip>
    );
  },
);

const PreviousRoundInfo: React.FC = React.memo(() => {
  const currentSelectedRound = useRoundStore(state => state.currentSelectedRound);
  const timestamp = useTimestampValue();

  const formattedDate = useMemo(() => {
    if (!timestamp) {
      return null;
    }

    const now = new Date();
    const timestampDate = new Date(timestamp);
    const isSameYear = now.getFullYear() === timestampDate.getFullYear();

    return (
      <DateFormatter
        format={isSameYear ? 'MMM D, h:mm A [NST]' : 'MMM D YYYY, h:mm A [NST]'}
        date={timestamp}
        tz="America/Los_Angeles"
      />
    );
  }, [timestamp]);

  return (
    <Text as={Box} fontSize="xs">
      <VStack gap={0}>
        <>Round {currentSelectedRound} ended</>
        <>{formattedDate}</>
        <GoToCurrentRoundButton testId="go-to-current-round" />
      </VStack>
    </Text>
  );
});

const ErrorRoundInfo: React.FC = React.memo(() => {
  const currentSelectedRound = useRoundStore(state => state.currentSelectedRound);
  const error = useErrorState();

  const isNotFoundError = useMemo(
    () => error && (error.includes('404') || error.includes('not found')),
    [error],
  );

  return (
    <Text as={Box} fontSize="xs">
      <VStack gap={0}>
        <>
          {isNotFoundError
            ? `No data for round ${currentSelectedRound}`
            : `Error loading round ${currentSelectedRound}`}
        </>
        <GoToCurrentRoundButton testId="go-to-current-round-error" />
      </VStack>
    </Text>
  );
});

const CurrentRoundProgress = React.memo((): React.ReactElement | null => {
  const roundPercentOver = useRoundProgress();

  const hasWinners = useIsRoundOver();

  if (hasWinners) {
    return null;
  }

  return (
    <>
      {roundPercentOver === 100 ? (
        <ProgressCircle.Root value={null}>
          <ProgressCircle.Circle css={{ '--thickness': '3px' }}>
            <ProgressCircle.Track />
            <ProgressCircle.Range strokeLinecap="round" />
          </ProgressCircle.Circle>
        </ProgressCircle.Root>
      ) : (
        <ProgressCircle.Root value={roundPercentOver}>
          <ProgressCircle.Circle css={{ '--thickness': '3px' }}>
            <ProgressCircle.Track />
            <ProgressCircle.Range strokeLinecap="round" />
          </ProgressCircle.Circle>
          <AbsoluteCenter>
            <ProgressCircle.ValueText />
          </AbsoluteCenter>
        </ProgressCircle.Root>
      )}
    </>
  );
});

const CurrentRoundInfo: React.FC = React.memo(() => {
  const roundData = useRoundStore(state => state.roundData);
  const timestamp = useTimestampValue();
  const lastChange = useLastChange();

  const timestampDate = useMemo(() => (timestamp ? new Date(timestamp) : new Date()), [timestamp]);

  const element = useMemo(() => {
    if (differenceInMilliseconds(new Date(), timestampDate) > 3e5) {
      // highlight the current last update if it hasn't been updated in 30+s
      return 'mark';
    }
    return 'span';
  }, [timestampDate]);

  const showLastChange = useMemo(
    () => lastChange && roundData.start !== lastChange,
    [lastChange, roundData.start],
  );

  const formattedLastUpdate = timestamp ? (
    <DateFormatter
      date={timestamp}
      tz={'America/Los_Angeles'}
      fromNow
      withTitle
      titleFormat="LLL [NST]"
      interval={1}
    />
  ) : null;

  const formattedLastChange = lastChange ? (
    <DateFormatter
      date={lastChange}
      tz={'America/Los_Angeles'}
      fromNow
      withTitle
      titleFormat="LLL [NST]"
      interval={1}
    />
  ) : null;

  return (
    <VStack separator={<Separator width="100%" />} gap={1}>
      <HStack>
        <Tooltip content="Last Update">
          <FaRotate />
        </Tooltip>
        <Text fontSize="xs" as={element} minW={{ base: 'auto', sm: '100px' }} truncate>
          {formattedLastUpdate}
        </Text>
      </HStack>
      {showLastChange && (
        <HStack>
          <Tooltip content="Last Change">
            <FaClockRotateLeft />
          </Tooltip>
          <Text fontSize="xs" minW={{ base: 'auto', sm: '100px' }} truncate>
            {formattedLastChange}
          </Text>
        </HStack>
      )}
    </VStack>
  );
});

interface RoundInfoProps {
  display?: BoxProps['display'];
}

const RoundInfo: React.FC<RoundInfoProps> = React.memo(({ display = 'block' }: RoundInfoProps) => {
  const winners = useRoundStore(state => state.roundData.winners);
  const timestamp = useTimestampValue();
  const error = useErrorState();
  const isLoading = useRoundStore(state => state.isLoading);
  const isInitializing = useRoundStore(state => state.isInitializing);

  const element = useMemo(() => {
    // Don't show error while loading or during initial load - wait for the fetch to complete
    if (error && !isLoading && !isInitializing) {
      return <ErrorRoundInfo />;
    } else if ((winners?.[0] ?? 0) > 0) {
      return <PreviousRoundInfo />;
    } else if (timestamp) {
      return <CurrentRoundInfo />;
    }
    return null;
  }, [winners, timestamp, error, isLoading, isInitializing]);

  return <Box display={display}>{element}</Box>;
});

const MaxBetInput: React.FC = () => {
  const currentSelectedRound = useRoundStore(state => state.currentSelectedRound);
  const setMaxBet = useSetMaxBet();
  const [tempValue, setTempValue] = useState<string>(() =>
    getMaxBet(currentSelectedRound).toString(),
  );

  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => getMaxBetLocked());
  const [isNumberInputFocused, setIsNumberInputFocused] = useState<boolean>(false);

  // Update temp value when round changes only
  useEffect(() => {
    const cookieValue = getMaxBet(currentSelectedRound);
    setTempValue(cookieValue.toString());
    setMaxBet(cookieValue);
  }, [currentSelectedRound, setMaxBet]);

  useEffect(() => {
    const currentLockState = getMaxBetLocked();
    if (currentLockState !== isLocked) {
      setIsLocked(currentLockState);
    }
  }, [currentSelectedRound, isLocked]);

  const handleChange = useCallback((details: NumberInputValueChangeDetails): void => {
    setTempValue(details.value);
  }, []);

  const handleBlur = useCallback((): void => {
    let numValue = parseInt(tempValue) || -1000;
    if (numValue < 1) {
      numValue = -1000;
    }

    const currentMaxBet = getMaxBet(currentSelectedRound);

    // Always update tempValue to the processed value
    const processedValue = numValue.toString();
    setTempValue(processedValue);

    if (numValue !== currentMaxBet) {
      const cookies = new Cookies();
      const currentIsLocked = getMaxBetLocked();

      if (currentIsLocked) {
        cookies.set('lockedMaxBet', numValue, {
          expires: addYears(new Date(), 100),
        });
      } else {
        const baseMaxBet = calculateBaseMaxBet(numValue, currentSelectedRound);
        cookies.set('baseMaxBet', baseMaxBet, {
          expires: addYears(new Date(), 100),
        });
      }

      setMaxBet(numValue);

      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
  }, [tempValue, currentSelectedRound, setMaxBet]);

  const handleLockClick = useCallback((): void => {
    if (isLocked) {
      return;
    }

    const cookies = new Cookies();
    const currentMaxBet = getMaxBet(currentSelectedRound);

    if (currentMaxBet > 0) {
      cookies.set('lockedMaxBet', currentMaxBet, {
        expires: addYears(new Date(), 100),
      });
    }

    cookies.set('maxBetLocked', true);
    setIsLocked(true);
  }, [isLocked, currentSelectedRound]);

  const handleUnlockClick = useCallback((): void => {
    if (!isLocked) {
      return;
    }

    const cookies = new Cookies();
    const currentMaxBet = getMaxBet(currentSelectedRound);

    if (currentMaxBet > 0) {
      const baseMaxBet = calculateBaseMaxBet(currentMaxBet, currentSelectedRound);
      cookies.set('baseMaxBet', baseMaxBet, {
        expires: addYears(new Date(), 100),
      });
    }

    cookies.set('maxBetLocked', false);
    setIsLocked(false);
  }, [isLocked, currentSelectedRound]);

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>): void => {
      if (isLocked) {
        handleUnlockClick();
      }
      e.target.select();
    },
    [isLocked, handleUnlockClick],
  );

  const handleLockToggle = useCallback(
    (newLocked: boolean): void => {
      if (newLocked) {
        handleLockClick();
      } else {
        handleUnlockClick();
      }
    },
    [handleLockClick, handleUnlockClick],
  );

  return (
    <Group
      attached
      w="full"
      gap={0}
      alignItems="stretch"
      rounded="md"
      transition="all 0.5s ease"
      {...(isAnimating && {
        boxShadow: '0 0 0 1px var(--chakra-colors-green-400)',
        borderColor: 'green.400',
      })}
    >
      <Text
        fontSize="xs"
        lineHeight="1"
        fontWeight="medium"
        color="fg.muted"
        bg="bg.muted"
        borderWidth="1px"
        borderEndWidth="0"
        borderColor="border"
        roundedStart="md"
        roundedEnd={0}
        px="2"
        display="flex"
        alignItems="center"
        whiteSpace="nowrap"
        userSelect="none"
      >
        Max bet
      </Text>
      <NumberInputRoot
        data-testid="max-bet-input-field"
        size="xs"
        value={tempValue}
        onValueChange={handleChange}
        min={-1000}
        max={500000}
        clampValueOnBlur={true}
        allowMouseWheel={true}
        showControl={isNumberInputFocused && !isLocked}
        readOnly={isLocked}
        color={isLocked ? 'fg.muted' : 'fg'}
      >
        <NumberInputField
          data-testid="max-bet-input-field-input"
          onBlur={(): void => {
            handleBlur();
            setIsNumberInputFocused(false);
          }}
          onFocus={(e: React.FocusEvent<HTMLInputElement>): void => {
            handleFocus(e);
            setIsNumberInputFocused(true);
          }}
          cursor={isLocked ? 'pointer' : 'text'}
          rounded={0}
        />
        <NumberInputControl
          hidden={!isNumberInputFocused || isLocked}
          onFocus={(): void => setIsNumberInputFocused(true)}
          onBlur={(): void => setIsNumberInputFocused(false)}
        />
      </NumberInputRoot>
      <Box
        borderWidth="1px"
        borderStartWidth={0}
        borderColor="border"
        roundedEnd="md"
        roundedStart={0}
        display="flex"
        alignItems="center"
        px="1"
        bg="transparent"
      >
        <MaxBetLockToggle
          key={isLocked ? 'locked' : 'unlocked'}
          isLocked={isLocked}
          onToggle={handleLockToggle}
          maxBet={parseInt(tempValue)}
        />
      </Box>
    </Group>
  );
};

interface TitleHeadingProps extends ButtonProps {
  [key: string]: unknown;
}

const TitleHeading: React.FC<TitleHeadingProps> = props => {
  const isRoundOver = useIsRoundOver();

  const handleClick = useCallback((): void => {
    const { scrollY } = window;

    if (scrollY !== 0) {
      // Scroll to top if scrolled down
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Get fresh values from store to avoid stale closures
      const roundState = useRoundStore.getState();

      // Only fetch currentRound if the selected round is over (as a guardrail)
      // If viewing an active round, we don't need to fetch since we're already on it
      if (isRoundOver) {
        roundState.fetchCurrentRound().then(() => {
          const updatedState = useRoundStore.getState();
          const freshCurrentRound = updatedState.currentRound;
          // Only navigate if rounds differ and we're still at the top
          if (
            freshCurrentRound > 0 &&
            updatedState.currentSelectedRound !== freshCurrentRound &&
            window.scrollY === 0
          ) {
            updatedState.updateSelectedRound(freshCurrentRound);
          }
        });
      }
    }
  }, [isRoundOver]);

  return (
    <>
      <Button
        display={{ base: 'none', md: 'block' }}
        cursor={'pointer'}
        userSelect={'none'}
        variant="ghost"
        width="auto"
        height="auto"
        onClick={handleClick}
        px={2}
        py={1}
        data-testid="title-heading"
        {...props}
      >
        <HStack>
          <Image
            src={NeopointIcon}
            alt="Neopoint Icon"
            height="1.5em"
            width="1.5em"
            fit="contain"
          />
          <Heading display={{ base: 'none', lg: 'inline-block' }}>NeoFoodClub</Heading>
          <Heading display={{ base: 'none', md: 'inline-block', lg: 'none' }}>NFC</Heading>
        </HStack>
      </Button>
    </>
  );
};

const HeaderContent: React.FC = () => {
  const [isGlowing, setIsGlowing] = useState<boolean>(false);
  const prevTimestampRef = useRef<string | undefined>(undefined);
  const hasWinners = useIsRoundOver();
  const timestamp = useTimestampValue();
  const error = useErrorState();
  const roundData = useRoundStore(state => state.roundData);
  const currentSelectedRound = useRoundStore(state => state.currentSelectedRound);

  // Check if round is switching by comparing roundData.round to currentSelectedRound
  const isRoundSwitching = roundData.round !== currentSelectedRound;

  const hasValidData = useMemo(
    () =>
      !isRoundSwitching &&
      timestamp !== undefined &&
      roundData.pirates &&
      roundData.pirates.length > 0,
    [timestamp, roundData.pirates, isRoundSwitching],
  );

  useEffect(() => {
    // Don't trigger glow effects during round switching
    if (isRoundSwitching || hasWinners || prevTimestampRef.current === timestamp) {
      setIsGlowing(false);
      return;
    }

    setIsGlowing(true);
    const timer = setTimeout(() => setIsGlowing(false), 4000);
    return (): void => clearTimeout(timer);
  }, [timestamp, hasWinners, isRoundSwitching]);

  useEffect(() => {
    prevTimestampRef.current = timestamp;
  }, [timestamp]);

  return (
    <>
      <HStack p={4} gap={{ base: 1.5, md: 4 }} alignItems="center">
        <TitleHeading />
        <Spacer display={{ base: 'none', md: 'block' }} />
        <GlowCard
          p={{ base: 1.5, md: 2 }}
          maxW={{ base: '100%', sm: 'lg' }}
          animate={isGlowing}
          mx="auto"
          flexShrink={1}
        >
          <HStack gap={{ base: 1, md: 2 }} alignItems="center" flexWrap="nowrap">
            <VStack gap={1} w="170px" flexShrink={0}>
              <RoundInput />
              <MaxBetInput />
            </VStack>
            <Box display={{ base: 'none', md: 'block' }}>
              <Show when={hasValidData}>
                <CurrentRoundProgress />
              </Show>
            </Box>

            <Show
              when={hasValidData || error}
              fallback={<SkeletonText minW={{ base: '100px', md: '140px' }} />}
            >
              <Box flexShrink={1} minW={0} pl={1}>
                <RoundInfo />
              </Box>
            </Show>
          </HStack>
        </GlowCard>
        <Spacer display={{ base: 'none', md: 'block' }} />
      </HStack>
    </>
  );
};

type HeaderProps = BoxProps;

const Header: React.FC<HeaderProps> = props => {
  const [y, setY] = useState<number>(0);

  useEffect(() => {
    const handleScroll = (): void => setY(window.scrollY);

    window.addEventListener('scroll', handleScroll);
    return (): void => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Box
      as={'header'}
      shadow={y > 0 ? 'lg' : ''}
      transition="box-shadow 0.2s;"
      pos="fixed"
      top="0"
      zIndex={'docked'}
      bg={y > 0 ? 'bg.subtle/70' : 'bg'}
      style={{ backdropFilter: 'saturate(180%) blur(5px)' }}
      left="0"
      right="0"
      width="full"
      {...props}
    >
      <HeaderContent />
    </Box>
  );
};

export default Header;
