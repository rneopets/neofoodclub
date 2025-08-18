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
  IconButton,
  Show,
  AbsoluteCenter,
  InputGroup,
} from '@chakra-ui/react';
import { addYears, differenceInMilliseconds } from 'date-fns';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FaRotate, FaClockRotateLeft, FaPlay, FaMoon, FaSun } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useColorMode } from '../components/ui/color-mode';

import DateFormatter from './components/DateFormatter';
import GlowCard from './components/GlowCard';
import MaxBetLockToggle from './components/MaxBetLockToggle';
import RoundInput from './components/RoundInput';
import { useRoundProgress } from './hooks/useRoundProgress';
import NeopointIcon from './images/np-icon.svg';
import { useRoundDataStore, useTimestampValue, useLastChange, useHasRoundWinners } from './stores';
import { calculateBaseMaxBet, getMaxBet, getMaxBetLocked } from './util';

import {
  NumberInputField,
  NumberInputRoot,
  NumberInputValueChangeDetails,
} from '@/components/ui/number-input';
import { Tooltip } from '@/components/ui/tooltip';

// Add a new selector for error state
const useErrorState = (): string | null => useRoundDataStore(state => state.error);

interface GoToCurrentRoundButtonProps {
  testId?: string;
}

const GoToCurrentRoundButton: React.FC<GoToCurrentRoundButtonProps> = React.memo(
  ({ testId = 'go-to-current-round' }) => {
    const currentRound = useRoundDataStore(state => state.roundState.currentRound);
    const updateSelectedRound = useRoundDataStore(state => state.updateSelectedRound);

    const handleGoToCurrent = useCallback(() => {
      updateSelectedRound(currentRound);
    }, [updateSelectedRound, currentRound]);

    return (
      <Tooltip content={`Go to current round (${currentRound})`} placement="top">
        <Button
          size="xs"
          variant="ghost"
          colorPalette="blue"
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
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);
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
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);
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

  const hasWinners = useHasRoundWinners();

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
  const roundData = useRoundDataStore(state => state.roundState.roundData);
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
    <VStack separator={<Separator />} gap={1}>
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
  const winners = useRoundDataStore(state => state.roundState.roundData.winners);
  const timestamp = useTimestampValue();
  const error = useErrorState();

  const element = useMemo(() => {
    if (error) {
      return <ErrorRoundInfo />;
    } else if ((winners?.[0] ?? 0) > 0) {
      return <PreviousRoundInfo />;
    } else if (timestamp) {
      return <CurrentRoundInfo />;
    }
    return null;
  }, [winners, timestamp, error]);

  return <Box display={display}>{element}</Box>;
});

const MaxBetInput: React.FC = () => {
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);
  const [tempValue, setTempValue] = useState<string>(() =>
    getMaxBet(currentSelectedRound).toString(),
  );

  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => getMaxBetLocked());

  // Update temp value when round changes only
  useEffect(() => {
    const cookieValue = getMaxBet(currentSelectedRound);
    setTempValue(cookieValue.toString());
  }, [currentSelectedRound]);

  useEffect(() => {
    const currentLockState = getMaxBetLocked();
    if (currentLockState !== isLocked) {
      setIsLocked(currentLockState);
    }
  }, [currentSelectedRound, isLocked]);

  const handleChange = useCallback((details: NumberInputValueChangeDetails): void => {
    setTempValue(details.value);
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>): void => {
    e.target.select();
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

      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
  }, [tempValue, currentSelectedRound]);

  return (
    <NumberInputRoot
      data-testid="max-bet-input-field"
      size="xs"
      value={tempValue}
      onValueChange={handleChange}
      min={-1000}
      max={500000}
      clampValueOnBlur={true}
      allowMouseWheel={true}
      showControl={!isLocked}
      readOnly={isLocked}
      color={isLocked ? 'fg.muted' : 'fg'}
      {...(isAnimating && {
        borderColor: 'green.400',
        boxShadow: '0 0 0 1px var(--chakra-colors-green-400)',
      })}
      transition="all 0.3s ease"
    >
      <InputGroup
        startElement={<MaxBetLockToggle onToggle={setIsLocked} />}
        startElementProps={{ pointerEvents: 'auto' }}
      >
        <NumberInputField
          data-testid="max-bet-input-field-input"
          onBlur={handleBlur}
          onFocus={handleFocus}
          cursor={isLocked ? 'not-allowed' : 'text'}
          color={isLocked ? 'fg.muted' : undefined}
        />
      </InputGroup>
    </NumberInputRoot>
  );
};

interface TitleHeadingProps extends ButtonProps {
  [key: string]: unknown;
}

const TitleHeading: React.FC<TitleHeadingProps> = props => {
  const setRoundState = useRoundDataStore(state => state.setRoundState);
  const updateSelectedRound = useRoundDataStore(state => state.updateSelectedRound);
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);
  const currentRound = useRoundDataStore(state => state.roundState.currentRound);

  const handleClick = (): void => {
    setRoundState({ viewMode: false });
    const { scrollY } = window;

    if (scrollY !== 0) {
      // scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentSelectedRound !== currentRound) {
      // TODO MAYBE: add a confirmation dialog?
      updateSelectedRound(currentRound);
    }
  };

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

const ColorModeToggle: React.FC = () => {
  const { colorMode, setColorMode } = useColorMode();
  const cookies = useMemo(() => new Cookies(), []);

  const toggleColorMode = useCallback((): void => {
    const newMode = colorMode === 'light' ? 'dark' : 'light';
    setColorMode(newMode);
    cookies.set('colorMode', newMode);
  }, [colorMode, setColorMode, cookies]);

  return (
    <IconButton
      aria-label="Toggle color mode"
      onClick={toggleColorMode}
      variant="ghost"
      size="md"
      data-testid="color-mode-toggle"
      title={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
    >
      {colorMode === 'light' ? <FaMoon /> : <FaSun />}
    </IconButton>
  );
};

const HeaderContent: React.FC = () => {
  const [isGlowing, setIsGlowing] = useState<boolean>(false);
  const prevTimestampRef = useRef<string | undefined>(undefined);
  const hasWinners = useHasRoundWinners();
  const timestamp = useTimestampValue();
  const error = useErrorState();
  const isRoundSwitching = useRoundDataStore(state => state.isRoundSwitching);
  const roundData = useRoundDataStore(state => state.roundState.roundData);
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);

  const hasValidData = useMemo(() => {
    // If we're switching rounds, don't consider old data as valid
    if (isRoundSwitching) {
      return false;
    }

    return (
      timestamp !== undefined &&
      roundData &&
      roundData.round === currentSelectedRound &&
      roundData.pirates &&
      roundData.pirates.length > 0
    );
  }, [timestamp, roundData, currentSelectedRound, isRoundSwitching]);

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
      <HStack p={4} gap={4}>
        <TitleHeading />
        <Spacer display={{ base: 'none', md: 'block' }} />
        <GlowCard p={2} maxW="lg" animate={isGlowing} mx="auto">
          <HStack>
            <VStack gap={1} maxW="160px">
              <RoundInput />
              <MaxBetInput />
            </VStack>
            {hasValidData && <CurrentRoundProgress />}
            <Show when={hasValidData || error} fallback={<SkeletonText minW="140px" />}>
              <RoundInfo />
            </Show>
          </HStack>
        </GlowCard>
        <Spacer display={{ base: 'none', md: 'block' }} />
        <ColorModeToggle />
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
