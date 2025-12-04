import { Button, ButtonProps } from '@chakra-ui/react';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';

import {
  useBetOdds,
  useBetPayoffs,
  useWinningBetBinary,
  useSpecificBetAmount,
  useRoundPirates,
  useBetBinaries,
} from '../stores';
import { useIsRoundOver } from '../hooks/useIsRoundOver';
import { generateBetLinkUrl, openBetLinkInNewTab } from '../utils/betUtils';

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
    <BetButton colorPalette="red" layerStyle="fill.solid" disabled {...rest}>
      {children}
    </BetButton>
  );
};

interface PlaceThisBetButtonProps {
  bet: number[];
  betNum: number;
}

const PlaceThisBetButton = React.memo(
  (props: PlaceThisBetButtonProps): React.ReactElement => {
    const { bet, betNum } = props;
    const pirates = useRoundPirates();

    const betOdds = useBetOdds();
    const betPayoffs = useBetPayoffs();
    const winningBetBinary = useWinningBetBinary();

    const betAmount = useSpecificBetAmount(betNum);
    const betBinariesMap = useBetBinaries();
    const hasDuplicates = useMemo(() => {
      const binaries = Array.from(betBinariesMap.values()).filter(b => b > 0);
      return new Set(binaries).size !== binaries.length;
    }, [betBinariesMap]);

    const [clicked, setClicked] = useState<boolean>(false);

    useEffect(() => {
      setClicked(false);
    }, [bet, betAmount]);

    const isRoundOver = useIsRoundOver();

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

    const handleClick = useCallback(() => {
      generateBetLink();
      setClicked(true);
    }, [generateBetLink]);

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
      <BetButton
        onClick={handleClick}
        colorPalette="gray"
        layerStyle={clicked ? 'fill.surface' : 'fill.solid'}
      >
        {clicked ? 'Bet placed!' : 'Place bet!'} <FaExternalLinkAlt />
      </BetButton>
    );
  },
  (prevProps, nextProps) =>
    prevProps.betNum === nextProps.betNum &&
    JSON.stringify(prevProps.bet) === JSON.stringify(nextProps.bet),
);

PlaceThisBetButton.displayName = 'PlaceThisBetButton';

export default PlaceThisBetButton;
