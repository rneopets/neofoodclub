import { Button, ButtonProps } from '@chakra-ui/react';
import React, { useState, useCallback, useMemo } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { useIsRoundOver } from '../../hooks/useIsRoundOver';
import {
  useBetOdds,
  useBetPayoffs,
  useSpecificBetAmount,
  useRoundPirates,
  useBetBinaries,
} from '../../stores';
import { generateBetLinkUrl, openBetLinkInNewTab } from '../../utils/betUtils';

// this element is the "Place Bet" button inside the PayoutTable

interface BetButtonProps extends ButtonProps {
  children: React.ReactNode;
}

const BetButton: React.FC<BetButtonProps> = props => {
  const { children, ...rest } = props;
  return (
    <Button size="sm" w="100%" {...rest}>
      {children}
    </Button>
  );
};

const ErrorBetButton: React.FC<BetButtonProps> = props => {
  const { children, ...rest } = props;

  return (
    <BetButton colorPalette="nfc-red" layerStyle="fill.solid" disabled {...rest}>
      {children}
    </BetButton>
  );
};

interface PlaceThisBetButtonProps {
  bet: number[];
  betNum: number;
}

interface ActivePlaceBetButtonProps {
  bet: number[];
  betAmount: number;
  betNum: number;
  betOdds: ReturnType<typeof useBetOdds>;
  betPayoffs: ReturnType<typeof useBetPayoffs>;
  pirates: ReturnType<typeof useRoundPirates>;
}

const ActivePlaceBetButton = React.memo(
  ({
    bet,
    betAmount,
    betNum,
    betOdds,
    betPayoffs,
    pirates,
  }: ActivePlaceBetButtonProps): React.ReactElement => {
    const [clicked, setClicked] = useState<boolean>(false);

    const generateBetLink = useCallback((): void => {
      const url = generateBetLinkUrl(
        bet,
        betAmount,
        betOdds.get(betNum) || 0,
        betPayoffs.get(betNum) || 0,
        pirates,
      );

      openBetLinkInNewTab(url);
    }, [bet, betAmount, betOdds, betPayoffs, betNum, pirates]);

    const placeBet = useCallback(() => {
      generateBetLink();
      setClicked(true);
    }, [generateBetLink]);

    return (
      <BetButton
        onClick={placeBet}
        colorPalette="nfc-green"
        variant="surface"
        opacity={clicked ? 0.6 : 1}
      >
        {clicked ? 'Bet placed!' : 'Place bet!'} <FaExternalLinkAlt />
      </BetButton>
    );
  },
);

ActivePlaceBetButton.displayName = 'ActivePlaceBetButton';

const PlaceThisBetButton = React.memo(
  (props: PlaceThisBetButtonProps): React.ReactElement => {
    const { bet, betNum } = props;
    const pirates = useRoundPirates();

    const betOdds = useBetOdds();
    const betPayoffs = useBetPayoffs();

    const betAmount = useSpecificBetAmount(betNum);
    const betBinariesMap = useBetBinaries();
    const hasDuplicates = useMemo(() => {
      const binaries = Array.from(betBinariesMap.values()).filter(b => b > 0);
      return new Set(binaries).size !== binaries.length;
    }, [betBinariesMap]);

    const isRoundOver = useIsRoundOver();

    if (isRoundOver) {
      return <ErrorBetButton>Round is over!</ErrorBetButton>;
    }

    if (betAmount < 1) {
      return <ErrorBetButton>Invalid bet amount!</ErrorBetButton>;
    }

    if (hasDuplicates) {
      return <ErrorBetButton>Duplicate bet!</ErrorBetButton>;
    }

    return (
      <ActivePlaceBetButton
        key={`${bet.join(',')}:${betAmount}`}
        bet={bet}
        betAmount={betAmount}
        betNum={betNum}
        betOdds={betOdds}
        betPayoffs={betPayoffs}
        pirates={pirates}
      />
    );
  },
  (prevProps, nextProps) =>
    prevProps.betNum === nextProps.betNum &&
    JSON.stringify(prevProps.bet) === JSON.stringify(nextProps.bet),
);

PlaceThisBetButton.displayName = 'PlaceThisBetButton';

export default PlaceThisBetButton;
