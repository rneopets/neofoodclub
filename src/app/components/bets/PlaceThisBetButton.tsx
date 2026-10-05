import { Badge, Button, ButtonProps } from '@chakra-ui/react';
import React, { useState, useMemo } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { useIsRoundOver } from '../../hooks/useIsRoundOver';
import { computePiratesBinary } from '../../maths';
import {
  useAllBets,
  useBetAmount,
  useBetBinaries,
  useCurrentBet,
  useSelectedRound,
} from '../../stores';
import { makeBetURL } from '../../util';
import { generateBetLinkUrl } from '../../utils/betUtils';
import {
  computeDuplicateBetGroupColors,
  DUPLICATE_BET_COLOR_PALETTE,
} from '../../utils/duplicateBetColors';

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

const ActivePlaceBetButton = React.memo((): React.ReactElement => {
  const [clicked, setClicked] = useState<boolean>(false);

  const round = useSelectedRound();
  const currentBet = useCurrentBet();
  const allBets = useAllBets();

  // the link carries the whole bet set, without amounts (the userscript on the Neopets side
  // works out the amount itself) and the neofoodclub userscript fills in the next bet from it
  const href = useMemo(
    () => generateBetLinkUrl(makeBetURL(round, allBets.get(currentBet))),
    [round, currentBet, allBets],
  );

  return (
    <BetButton asChild colorPalette="nfc-green" variant="surface" opacity={clicked ? 0.5 : 1}>
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => setClicked(true)}>
        {clicked ? 'Bet placed!' : 'Place bet!'} <FaExternalLinkAlt />
      </a>
    </BetButton>
  );
});

ActivePlaceBetButton.displayName = 'ActivePlaceBetButton';

const PlaceThisBetButton = React.memo(
  (props: PlaceThisBetButtonProps): React.ReactElement => {
    const { bet, betNum } = props;

    const betAmount = useBetAmount(betNum);
    const betBinariesMap = useBetBinaries();
    const duplicateColors = useMemo(
      () => computeDuplicateBetGroupColors(betBinariesMap),
      [betBinariesMap],
    );
    const hasDuplicates = duplicateColors.size > 0;
    const thisBetBinary = useMemo(() => computePiratesBinary(bet), [bet]);
    const myDuplicateColor = duplicateColors.get(thisBetBinary);

    const isRoundOver = useIsRoundOver();

    if (isRoundOver) {
      return <ErrorBetButton>Round is over!</ErrorBetButton>;
    }

    if (myDuplicateColor) {
      const duplicateGroupNumber =
        DUPLICATE_BET_COLOR_PALETTE.indexOf(
          myDuplicateColor as (typeof DUPLICATE_BET_COLOR_PALETTE)[number],
        ) + 1;

      return (
        <ErrorBetButton>
          Duplicate bet!
          <Badge
            colorPalette={myDuplicateColor}
            variant="solid"
            ml={2}
            borderRadius="full"
            minW="16px"
            h="16px"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            px={1}
            fontSize="xs"
            border="2px solid white"
          >
            {duplicateGroupNumber}
          </Badge>
        </ErrorBetButton>
      );
    }

    if (betAmount < 1) {
      return <ErrorBetButton>Invalid bet amount!</ErrorBetButton>;
    }

    if (hasDuplicates) {
      return (
        <BetButton colorPalette="nfc-green" variant="surface" disabled>
          Place bet! <FaExternalLinkAlt />
        </BetButton>
      );
    }

    return <ActivePlaceBetButton key={`${bet.join(',')}:${betAmount}`} />;
  },
  (prevProps, nextProps) =>
    prevProps.betNum === nextProps.betNum &&
    JSON.stringify(prevProps.bet) === JSON.stringify(nextProps.bet),
);

PlaceThisBetButton.displayName = 'PlaceThisBetButton';

export default PlaceThisBetButton;
