import {
  Box,
  Center,
  Stack,
  Text,
  Heading,
  Separator,
  Link,
  Container,
  SimpleGrid,
  TextProps,
  Image,
  HStack,
  BoxProps,
} from '@chakra-ui/react';
import * as React from 'react';

import { DevModeDrawer } from './components/dev/DevModeDrawer';
import { GitCommit } from './components/ui/GitCommit';
import { VercelCredit } from './components/ui/VercelCredit';
import NeopointIcon from './images/np-icon.svg';
import { useSelectedRound, useCurrentBet, useAllBets, useAllBetAmounts } from './stores';
import { makeBetURL } from './util';

interface LogoProps {
  rotation: number;
}

const Logo: React.FC<LogoProps> = ({ rotation }) => (
  <HStack>
    <Image
      src={NeopointIcon}
      alt="Neopoint Icon"
      height="1.5em"
      width="1.5em"
      fit="contain"
      transition="transform 0.5s ease"
      transform={`rotate(${rotation}deg)`}
    />
    <Heading>NeoFoodClub</Heading>
  </HStack>
);

interface ListHeaderProps extends TextProps {
  children: React.ReactNode;
}

const ListHeader: React.FC<ListHeaderProps> = ({ children, ...props }) => (
  <Text fontWeight={'500'} fontSize={'lg'} mb={2} {...props}>
    {children}
  </Text>
);

const KoFiButton: React.FC = () => (
  <>
    <Link href="https://ko-fi.com/dice" target="_blank" rel="noopener noreferrer">
      <img
        height="36"
        style={{ border: '0px', height: '36px' }}
        src="https://storage.ko-fi.com/cdn/kofi1.png?v=3"
        alt="Buy Me a Coffee at ko-fi.com"
      />
    </Link>
  </>
);

type FooterProps = BoxProps;

const Footer: React.FC<FooterProps> = props => {
  const [isDevModeOpen, setIsDevModeOpen] = React.useState(false);
  const [, setClickCount] = React.useState(0);
  const [rotation, setRotation] = React.useState(0);
  const clickTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasOpenedBefore = React.useRef<boolean>(
    // eslint-disable-next-line no-undef
    typeof localStorage !== 'undefined' && localStorage.getItem('devModeOpened') === 'true',
  );

  const currentSelectedRound = useSelectedRound();
  const currentBet = useCurrentBet();
  const allBets = useAllBets();
  const allBetAmounts = useAllBetAmounts();

  const classicHref = React.useMemo(() => {
    const baseUrl = 'https://foodclub.neocities.org';

    if (!currentSelectedRound) {
      return baseUrl;
    }

    const betPathHash = makeBetURL(
      currentSelectedRound,
      allBets.get(currentBet),
      allBetAmounts.get(currentBet),
      true,
    );
    return `${baseUrl}${betPathHash}`;
  }, [currentSelectedRound, currentBet, allBets, allBetAmounts]);

  const handleLogoClick = React.useCallback(() => {
    // Trigger spin animation - increment rotation by 360 degrees
    setRotation(prev => prev + 360);

    // If dev mode was opened before, open on first click
    if (hasOpenedBefore.current) {
      setIsDevModeOpen(true);
      return;
    }

    setClickCount(prev => {
      const newCount = prev + 1;

      // Clear existing timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      // Reset click count after 2 seconds of no clicks
      clickTimeoutRef.current = setTimeout(() => {
        setClickCount(0);
      }, 2000);

      // Open dev mode on 5th click
      if (newCount >= 5) {
        setIsDevModeOpen(true);
        setClickCount(0);
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        // Mark that dev mode has been opened
        if (typeof localStorage !== 'undefined') {
          // eslint-disable-next-line no-undef
          localStorage.setItem('devModeOpened', 'true');
          hasOpenedBefore.current = true;
        }
      }

      return newCount;
    });
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(
    () => (): void => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <>
      <Separator />
      <Box bg="bg.subtle" color="fg.muted" {...props}>
        <Container as={Stack} maxW={'6xl'} py={10}>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={8}>
            <Stack align={'flex-start'}>
              <ListHeader>Food Club Links</ListHeader>
              <Link
                href="https://www.neopets.com/pirates/foodclub.phtml?type=bet"
                target="_blank"
                rel="noopener noreferrer"
              >
                Place Bets
              </Link>
              <Link
                href="https://www.neopets.com/pirates/foodclub.phtml?type=current_bets"
                target="_blank"
                rel="noopener noreferrer"
              >
                Current Bets
              </Link>
              <Link
                href="https://www.neopets.com/pirates/foodclub.phtml?type=collect"
                target="_blank"
                rel="noopener noreferrer"
              >
                Collect Winnings
              </Link>
              <Link
                href="https://www.neopets.com/gamescores.phtml?game_id=88"
                target="_blank"
                rel="noopener noreferrer"
              >
                High Score List
              </Link>
            </Stack>

            <Stack align={'flex-start'}>
              <ListHeader>NeoFoodClub Stuff</ListHeader>
              <Link href={classicHref} target="_blank" rel="noopener noreferrer">
                Classic NeoFoodClub
              </Link>
              <Link
                href="https://github.com/diceroll123/neofoodclub"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source Code
              </Link>
            </Stack>

            <Stack align={'flex-start'}>
              <ListHeader>Support us</ListHeader>
              <KoFiButton />
            </Stack>
          </SimpleGrid>
        </Container>
        <Box py={10}>
          <HStack>
            <Separator flex="1" />
            <Box onClick={handleLogoClick} cursor="pointer" userSelect="none">
              <Logo rotation={rotation} />
            </Box>
            <Separator flex="1" />
          </HStack>
          <Text pt={6} fontSize={'sm'} textAlign={'center'}>
            Website, design, and code &copy; neofood.club
            <br />
            This is an unofficial Neopets fansite with no affiliation/endorsement with Neopets.
            <br /> Images/Names &copy; Neopets, Inc. All rights reserved. Used With Permission.
          </Text>
          <Center>
            <VercelCredit />
          </Center>
          <Center mt={3}>
            <GitCommit />
          </Center>
        </Box>
      </Box>
      <DevModeDrawer isOpen={isDevModeOpen} onClose={() => setIsDevModeOpen(false)} />
    </>
  );
};

export default Footer;
