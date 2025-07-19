import {
  Box,
  Button,
  Center,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Heading,
  HStack,
  Icon,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
  SkeletonText,
  Spacer,
  StackDivider,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
  BoxProps,
  ButtonProps,
  Input,
  IconButton,
  useColorMode,
} from '@chakra-ui/react';
import { addYears, differenceInMilliseconds } from 'date-fns';
import { useScroll } from 'framer-motion';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FaRotate, FaClockRotateLeft, FaPlay, FaMoon, FaSun } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import DateFormatter from './components/DateFormatter';
import GlowCard from './components/GlowCard';
import MaxBetLockToggle from './components/MaxBetLockToggle';
import RoundInput from './components/RoundInput';
import { useRoundProgress } from './hooks/useRoundProgress';
import NeopointIcon from './images/np-icon.svg';
import { useRoundDataStore, useTimestampValue, useLastChange, useHasRoundWinners } from './stores';
import { calculateBaseMaxBet, getMaxBet, getMaxBetLocked } from './util';

const PreviousRoundInfo: React.FC = React.memo(() => {
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);
  const currentRound = useRoundDataStore(state => state.roundState.currentRound);
  const updateSelectedRound = useRoundDataStore(state => state.updateSelectedRound);
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

  const handleGoToCurrent = useCallback(() => {
    updateSelectedRound(currentRound);
  }, [updateSelectedRound, currentRound]);

  return (
    <Text as={Box} fontSize="xs">
      <VStack spacing={0}>
        <>Round {currentSelectedRound} ended</>
        <>{formattedDate}</>
        <Tooltip label={`Go to current round (${currentRound})`} placement="top">
          <Button
            leftIcon={<Icon as={FaPlay} boxSize={2} />}
            size="xs"
            variant="link"
            colorScheme="blue"
            onClick={handleGoToCurrent}
            fontSize="xs"
            height="auto"
            minH="auto"
            p={0}
            data-testid="go-to-current-round"
          >
            Go to current round
          </Button>
        </Tooltip>
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
        <CircularProgress size="38px" isIndeterminate capIsRound />
      ) : (
        <CircularProgress size="38px" value={roundPercentOver} capIsRound>
          <CircularProgressLabel>{Math.floor(roundPercentOver)}%</CircularProgressLabel>
        </CircularProgress>
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
    <VStack divider={<StackDivider />} spacing={1} minW={{ sm: '140px' }} overflow="hidden">
      <HStack>
        <Tooltip label="Last Update">
          <div>
            <Icon as={FaRotate} />
          </div>
        </Tooltip>
        <Text fontSize="xs" as={element} minW={{ base: 'auto', sm: '100px' }} isTruncated>
          {formattedLastUpdate}
        </Text>
      </HStack>
      {showLastChange && (
        <HStack>
          <Tooltip label="Last Change">
            <div>
              <Icon as={FaClockRotateLeft} />
            </div>
          </Tooltip>
          <Text fontSize="xs" minW={{ base: 'auto', sm: '100px' }} isTruncated>
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

  const element = useMemo(() => {
    if ((winners?.[0] ?? 0) > 0) {
      return <PreviousRoundInfo />;
    } else if (timestamp) {
      return <CurrentRoundInfo />;
    }
    return null;
  }, [winners, timestamp]);

  return <Box display={display}>{element}</Box>;
});

const MaxBetInput: React.FC = () => {
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);
  const [hasFocus, setHasFocus] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Always sync with cookie when not focused
  useEffect(() => {
    if (!hasFocus) {
      const cookieValue = getMaxBet(currentSelectedRound);
      const valueStr = cookieValue.toString();
      setInputValue(valueStr);

      // Force the HTML input to show the correct value
      if (inputRef.current) {
        inputRef.current.value = valueStr;
      }
    }
  }, [currentSelectedRound, hasFocus]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>): void => {
    setHasFocus(true);
    e.target.select();
  }, []);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>): void => {
      setHasFocus(false);

      const rawValue = e.target.value;
      const currentValue = getMaxBet(currentSelectedRound);

      let value = parseInt(rawValue);
      if (isNaN(value) || value < 1) {
        value = -1000;
      }
      value = Math.min(value, 500_000);

      // Always update input to processed value
      const valueStr = value.toString();
      setInputValue(valueStr);
      if (inputRef.current) {
        inputRef.current.value = valueStr;
      }

      // Save to cookie if changed
      if (value !== currentValue) {
        const cookies = new Cookies();
        const isLocked = getMaxBetLocked();

        if (isLocked) {
          // When locked, save the actual max bet value
          cookies.set('lockedMaxBet', value, {
            expires: addYears(new Date(), 100),
          });
        } else {
          // When unlocked, save the base max bet for round calculations
          const baseMaxBet = calculateBaseMaxBet(value, currentSelectedRound);
          cookies.set('baseMaxBet', baseMaxBet, {
            expires: addYears(new Date(), 100),
          });
        }

        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
      }
    },
    [currentSelectedRound],
  );

  return (
    <InputGroup size="xs" w="100%">
      <InputLeftAddon children="Max Bet" />
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        type="number"
        min={-1000}
        max={500000}
        data-testid="max-bet-input-field"
        {...(isAnimating && {
          borderColor: 'green.400',
          boxShadow: '0 0 0 1px var(--chakra-colors-green-400)',
        })}
        transition="all 0.3s ease"
      />
      <InputRightElement width="24px" pr={1}>
        <MaxBetLockToggle />
      </InputRightElement>
    </InputGroup>
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
        p={2}
        data-testid="title-heading"
        {...props}
      >
        <Center>
          <Box
            as="img"
            src={NeopointIcon}
            height="1.5em"
            width="1.5em"
            display={{ base: 'none', md: 'inline-block' }}
            mr={2}
          />
          <Heading
            as={'h1'}
            fontFamily="heading"
            fontWeight="bold"
            fontSize="xl"
            display={{ base: 'none', lg: 'inline-block' }}
          >
            NeoFoodClub
          </Heading>
          <Heading
            as={'h1'}
            fontFamily="heading"
            fontWeight="bold"
            fontSize="xl"
            display={{
              base: 'none',
              md: 'inline-block',
              lg: 'none',
            }}
          >
            NFC
          </Heading>
        </Center>
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
    <Tooltip
      label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
      placement="bottom"
    >
      <IconButton
        aria-label="Toggle color mode"
        icon={<Icon as={colorMode === 'light' ? FaMoon : FaSun} />}
        onClick={toggleColorMode}
        variant="ghost"
        size="md"
        data-testid="color-mode-toggle"
      />
    </Tooltip>
  );
};

const HeaderContent: React.FC = () => {
  const [isGlowing, setIsGlowing] = useState<boolean>(false);
  const prevTimestampRef = useRef<string | undefined>(undefined);
  const hasWinners = useHasRoundWinners();
  const timestamp = useTimestampValue();
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
      <HStack p={4} spacing={4} as={Flex}>
        <TitleHeading />
        <Spacer display={{ base: 'none', md: 'block' }} />
        <GlowCard p={2} maxW="lg" animate={isGlowing} mx="auto">
          <Flex h="100%" gap={2} align="center">
            <VStack spacing={1} maxW="160px">
              <RoundInput />
              <MaxBetInput />
            </VStack>
            <SkeletonText isLoaded={!isRoundSwitching && hasValidData} minW="140px">
              <Flex align="center" justify="center" gap={2}>
                <CurrentRoundProgress />
                <RoundInfo />
              </Flex>
            </SkeletonText>
          </Flex>
        </GlowCard>
        <Spacer display={{ base: 'none', md: 'block' }} />
        <ColorModeToggle />
      </HStack>
    </>
  );
};

type HeaderProps = BoxProps;

const Header: React.FC<HeaderProps> = props => {
  const bg = useColorModeValue('rgba(255, 255, 255, 0.7)', 'rgba(26, 32, 44, 0.7)');
  const [y, setY] = useState<number>(0);

  const { scrollY } = useScroll();
  useEffect(() => {
    scrollY.on('change', () => setY(scrollY.get()));
  }, [scrollY]);

  return (
    <Box
      as={'header'}
      shadow={y > 0 ? 'lg' : ''}
      transition="box-shadow 0.2s"
      pos="fixed"
      top="0"
      zIndex="2"
      bg={bg}
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
