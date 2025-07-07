import {
  Box,
  Center,
  Stack,
  Text,
  Heading,
  Divider,
  Link,
  Container,
  useColorModeValue,
  SimpleGrid,
  Flex,
  BoxProps,
  TextProps,
} from '@chakra-ui/react';
import * as React from 'react';

import { GitCommit } from './components/GitCommit';
import { VercelCredit } from './components/VercelCredit';
import NeopointIcon from './images/np-icon.svg';

const Logo: React.FC = () => (
  <Stack direction="row">
    <Box as="img" src={NeopointIcon} height="1.5em" width="1.5em" />
    <Heading as="h1" fontFamily="heading" fontWeight="bold" fontSize="xl">
      NeoFoodClub
    </Heading>
  </Stack>
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
    <Link href="https://ko-fi.com/dice" isExternal>
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
    <Divider />
    <Box
      bg={useColorModeValue('gray.50', 'gray.900')}
      color={useColorModeValue('gray.700', 'gray.200')}
      {...props}
    >
      <Container as={Stack} maxW={'6xl'} py={10}>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={8}>
          <Stack align={'flex-start'}>
            <ListHeader>Food Club Links</ListHeader>
            <Link isExternal href="https://www.neopets.com/pirates/foodclub.phtml?type=bet">
              Place Bets
            </Link>
            <Link
              isExternal
              href="https://www.neopets.com/pirates/foodclub.phtml?type=current_bets"
            >
              Current Bets
            </Link>
            <Link isExternal href="https://www.neopets.com/pirates/foodclub.phtml?type=collect">
              Collect Winnings
            </Link>
            <Link isExternal href="https://www.neopets.com/gamescores.phtml?game_id=88">
              High Score List
            </Link>
          </Stack>

          <Stack align={'flex-start'}>
            <ListHeader>NeoFoodClub Stuff</ListHeader>
            <Link isExternal href="https://foodclub.neocities.org/">
              Classic NeoFoodClub
            </Link>
            <Link isExternal href="https://github.com/diceroll123/neofoodclub">
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
        <Flex
          align={'center'}
          _before={{
            content: '""',
            borderBottom: '1px solid',
            borderColor: useColorModeValue('gray.200', 'gray.700'),
            flexGrow: 1,
            mr: 8,
          }}
          _after={{
            content: '""',
            borderBottom: '1px solid',
            borderColor: useColorModeValue('gray.200', 'gray.700'),
            flexGrow: 1,
            ml: 8,
          }}
        >
          <Logo />
        </Flex>
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
