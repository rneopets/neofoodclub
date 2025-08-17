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

import { GitCommit } from './components/GitCommit';
import { VercelCredit } from './components/VercelCredit';
import NeopointIcon from './images/np-icon.svg';

const Logo: React.FC = () => (
  <HStack>
    <Image src={NeopointIcon} alt="Neopoint Icon" height="1.5em" width="1.5em" fit="contain" />
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

const Footer: React.FC<FooterProps> = props => (
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
            <Link href="https://foodclub.neocities.org/" target="_blank" rel="noopener noreferrer">
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
          <Logo />
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
  </>
);

export default Footer;
