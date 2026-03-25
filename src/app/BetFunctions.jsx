import {
  Flex,
  Button,
  ButtonGroup,
  Editable,
  EditableInput,
  EditablePreview,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalContent,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Wrap,
  Spacer,
  WrapItem,
  Icon,
  useDisclosure,
  VStack,
  Card,
  IconButton,
  Badge,
  Box,
  Divider,
  Heading,
  Input,
  useColorModeValue,
  useClipboard,
  useToast,
  Tooltip,
  HStack,
  Collapse,
} from "@chakra-ui/react";
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
} from "react-icons/fa6";
import React, { useContext, useEffect, useMemo } from "react";
import {
  anyBetsExist,
  cloneArray,
  determineBetAmount,
  getMaxBet,
  getOdds,
  makeEmptyBetAmounts,
  makeEmptyBets,
  shuffleArray,
  sortedIndices,
  generateRandomPirateIndex,
  generateRandomIntegerInRange,
  makeBetValues,
  makeBetURL,
  anyBetsDuplicate,
  displayAsPercent,
} from "./util";
import {
  calculatePayoutTables,
  computeBinaryToPirates,
  computePiratesBinary,
} from "./maths";
import { RoundContext } from "./RoundState";
import PirateSelect from "./components/PirateSelect";
import SettingsBox from "./components/SettingsBox";
import {
  MIN_BET_AMOUNT,
  DEFAULT_BET_AMOUNT,
  PIRATE_NAMES,
  SHORTHAND_PIRATE_NAMES,
} from "./constants";

const cartesian = (...a) =>
  a.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())));

const BuildSetMenu = (props) => {
  const { gambitWithPirates, getPirateBgColor, tenbetSet } = props;
  const { roundState, addNewSet } = useContext(RoundContext);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [mode, setMode] = React.useState(""); // currently can only be "Ten-bet" or "Gambit"
  const [pirateIndices, setPirateIndices] = React.useState([0, 0, 0, 0, 0]); // indices of the pirates to be included in the set
  const [min, setMin] = React.useState(0); // minimum pirate amount
  const [max, setMax] = React.useState(0); // maximum pirate amount
  const [buildButtonEnabled, setBuildButtonEnabled] = React.useState(false); // whether the build button is enabled, if we're within min/max to do so

  const maxBet = getMaxBet(roundState.currentSelectedRound);

  const handleChange = (arenaIndex, pirateIndex) => {
    let newPirateIndices = cloneArray(pirateIndices);
    newPirateIndices[arenaIndex] = pirateIndex;
    setPirateIndices(newPirateIndices);
  };

  useEffect(() => {
    // count the amount of non-zero elements in pirateIndices
    let amount = pirateIndices.reduce((a, b) => a + (b !== 0 ? 1 : 0), 0);
    setBuildButtonEnabled(amount >= min && amount <= max);
  }, [pirateIndices, min, max]);

  const handleTenBetClick = () => {
    setMode("Ten-bet");
    // reset state
    setMin(1);
    setMax(3);
    setPirateIndices([0, 0, 0, 0, 0]);
    onOpen();
  };

  const handleGambitClick = () => {
    setMode("Gambit");
    // reset state
    setMin(5);
    setMax(5);
    setPirateIndices([0, 0, 0, 0, 0]);
    onOpen();
  };

  const handleBuildClick = () => {
    if (mode === "Ten-bet") {
      const { bets, betAmounts } = tenbetSet(pirateIndices);
      addNewSet(`Custom Ten-bet Set (${maxBet} NP)`, bets, betAmounts, true);
    } else if (mode === "Gambit") {
      const { bets, betAmounts } = gambitWithPirates(pirateIndices);

      addNewSet(`Custom Gambit Set (${maxBet} NP)`, bets, betAmounts, true);
    }
    onClose();
  };

  const randomizeIndices = () => {
    // generate a full set of random indices
    let newIndices = [
      generateRandomPirateIndex(),
      generateRandomPirateIndex(),
      generateRandomPirateIndex(),
      generateRandomPirateIndex(),
      generateRandomPirateIndex(),
    ];

    // remove random indices as needed
    if (max - min > 0) {
      let indices = [0, 1, 2, 3, 4];
      shuffleArray(indices);
      let rand = generateRandomIntegerInRange(max - min, max + min);
      let randomIndices = indices.slice(0, rand);
      // set these indices to 0
      randomIndices.forEach((index) => {
        newIndices[index] = 0;
      });
    }

    // this allows us to stay within the boundaries without having per-algorithm functions to do this

    setPirateIndices(newIndices);
  };

  return (
    <>
      <Menu>
        <MenuButton
          as={Button}
          leftIcon={<Icon as={FaShapes} />}
          rightIcon={<Icon as={FaChevronDown} w="0.75em" h="0.75em" />}
          aria-label="Generate New Bet Set"
        >
          Build set
        </MenuButton>
        <MenuList>
          <MenuItem onClick={handleGambitClick}>Gambit set</MenuItem>
          <MenuItem onClick={handleTenBetClick}>Ten-bet set</MenuItem>
        </MenuList>
      </Menu>

      <Modal
        isCentered
        size="2xl"
        isOpen={isOpen}
        onClose={onClose}
        motionPreset="slideInBottom"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Custom {mode} builder</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack mb={3}>
              {min === max ? (
                <Text as={"i"}>Please choose {max} pirates.</Text>
              ) : (
                <Text as={"i"}>
                  Please choose between {min} and {max} pirates.
                </Text>
              )}
            </VStack>
            <Wrap justify="center">
              {[...Array(5)].map((_e, arenaIndex) => {
                return (
                  <WrapItem key={arenaIndex}>
                    <PirateSelect
                      arenaId={arenaIndex}
                      pirateValue={pirateIndices[arenaIndex]}
                      getPirateBgColor={getPirateBgColor}
                      showArenaName={true}
                      onChange={(e) =>
                        handleChange(arenaIndex, parseInt(e.target.value))
                      }
                    />
                  </WrapItem>
                );
              })}
            </Wrap>
          </ModalBody>
          <ModalFooter>
            <Flex width="2xl">
              <Button
                leftIcon={<Icon as={FaShuffle} />}
                mr={3}
                onClick={randomizeIndices}
              >
                Randomize
              </Button>
              {pirateIndices.some((e) => e !== 0) && (
                <Button
                  leftIcon={<Icon as={FaTrash} />}
                  onClick={() => {
                    setPirateIndices([0, 0, 0, 0, 0]);
                  }}
                >
                  Clear
                </Button>
              )}
              <Spacer />
              <Button
                isDisabled={!buildButtonEnabled}
                variant="solid"
                colorScheme="blue"
                mr={3}
                onClick={() => {
                  handleBuildClick();
                }}
              >
                Build {mode} set
              </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

function createMarkdownTable(calculations, roundState, bets) {
  // specifically meant to not be posted on Neopets, so it includes a URL.
  if (
    calculations.payoutTables.odds === undefined ||
    calculations.calculated === false ||
    roundState.roundData === null
  ) {
    return null;
  }

  let totalTER = 0;
  let betCount = 0;
  let lines = [];

  // bet table
  lines.push(
    `[${roundState.currentSelectedRound}](${window.location.origin}${makeBetURL(
      roundState.currentSelectedRound,
      bets,
      null,
      false
    )})|Shipwreck|Lagoon|Treasure|Hidden|Harpoon|Odds`
  );
  lines.push(":-:|-|-|-|-|-|-:");

  for (let betNum in bets) {
    totalTER += calculations.betExpectedRatios[betNum];
    if (calculations.betBinaries[betNum] > 0) {
      betCount += 1;
      let str = `${betNum}`;
      for (let i = 0; i < 5; i++) {
        str += "|";
        let pirateId = roundState.roundData.pirates[i][bets[betNum][i] - 1];
        if (pirateId) {
          str += PIRATE_NAMES[pirateId];
        }
      }
      lines.push(`${str}|${calculations.betOdds[betNum]}:1`);
    }
  }
  lines.push("\n");
  // stats
  lines.push(`TER: ${totalTER.toFixed(3)}`);
  lines.push("\n");
  lines.push("Odds|Probability|Cumulative|Tail");
  lines.push("--:|--:|--:|--:");
  calculations.payoutTables.odds.forEach((item) => {
    lines.push(
      `${item.value}:${betCount}|${displayAsPercent(
        item.probability,
        3
      )}|${displayAsPercent(item.cumulative, 3)}|${displayAsPercent(
        item.tail,
        3
      )}`
    );
  });

  return lines.join("\n");
}

function createHtmlTable(calculations, roundState, bets) {
  // specifically meant to be posted on Neopets, so it includes the bet hash
  if (
    calculations.payoutTables.odds === undefined ||
    calculations.calculated === false ||
    roundState.roundData === null
  ) {
    return null;
  }

  // bet table
  let html =
    "<table><thead><tr><th>Bet</th><th>Shipwreck</th><th>Lagoon</th><th>Treasure</th><th>Hidden</th><th>Harpoon</th><th>Odds</th></tr></thead><tbody>";

  for (let betNum in bets) {
    if (calculations.betBinaries[betNum] > 0) {
      let str = `<tr><td>${betNum}</td>`;
      for (let i = 0; i < 5; i++) {
        str += "<td>";
        let pirateId = roundState.roundData.pirates[i][bets[betNum][i] - 1];
        if (pirateId) {
          str += PIRATE_NAMES[pirateId];
        }
        str += "</td>";
      }
      html += str;
      html += `<td>${calculations.betOdds[betNum]}:1</td>`;
      html += "</tr>";
    }
  }

  const hash = makeBetURL(roundState.currentSelectedRound, bets, null, false);
  html += `</tbody><tfoot><tr><td colspan="7">${hash}</td></tr></tfoot></table>`;

  return html;
}

const BetCopyButtons = (props) => {
  let { index, ...rest } = props;
  const { roundState, calculations, allBets, allBetAmounts } =
    useContext(RoundContext);

  const bets = allBets[index];
  const betAmounts = allBetAmounts[index];

  const toast = useToast();
  const useWebDomain = useMemo(
    () => roundState.useWebDomain,
    [roundState.useWebDomain]
  );

  const origin = useWebDomain ? window.location.origin : "";

  const urlClip = useClipboard(
    origin +
      makeBetURL(roundState.currentSelectedRound, bets, betAmounts, false)
  );
  const urlAmountsClip = useClipboard(
    origin + makeBetURL(roundState.currentSelectedRound, bets, betAmounts, true)
  );

  const markdownClip = useClipboard(
    createMarkdownTable(calculations, roundState, bets)
  );
  const htmlClip = useClipboard(
    createHtmlTable(calculations, roundState, bets)
  );

  let anyBetAmounts = urlAmountsClip.value.includes("&a=");

  const copier = (clip, title) => {
    clip.onCopy();
    toast.closeAll();
    toast({
      title: title,
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <HStack mt={2} {...rest}>
      <Spacer />
      <Heading size="xs" textTransform="uppercase">
        Share:
      </Heading>
      <ButtonGroup variant="solid" isAttached={anyBetAmounts}>
        <Tooltip label="Copy Bet URL" openDelay={600}>
          <IconButton
            icon={<Icon as={FaLink} w="1.5em" h="1.5em" />}
            onClick={() => copier(urlClip, "Bet URL copied!")}
          />
        </Tooltip>
        <Tooltip label="Copy Bet URL with bet amounts" openDelay={600}>
          <IconButton
            icon={<Icon as={FaSackDollar} w="1.5em" h="1.5em" />}
            hidden={!anyBetAmounts}
            onClick={() => copier(urlAmountsClip, "Bet URL + Amounts copied!")}
          />
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup variant="solid" isAttached>
        <Tooltip label="Copy Markdown table" openDelay={600}>
          <IconButton
            icon={<Icon as={FaMarkdown} w="1.5em" h="1.5em" />}
            onClick={() => copier(markdownClip, "Table Markdown copied!")}
          />
        </Tooltip>
        <Tooltip label="Copy HTML table" openDelay={600}>
          <IconButton
            icon={<Icon as={FaCode} w="1.5em" h="1.5em" />}
            onClick={() => copier(htmlClip, "Table HTML copied!")}
          />
        </Tooltip>
      </ButtonGroup>
    </HStack>
  );
};

const calculateBets = (roundState, usedProbabilities, ...pirates) => {
  const maxBet = getMaxBet(roundState.currentSelectedRound);
  let betCaps = {};
  let betOdds = {};
  let pirateCombos = {};

  const odds = getOdds(roundState);
  const probs = usedProbabilities;

  for (let p of cartesian(...pirates)) {
    const [a, b, c, d, e] = p;
    const betBinary = computePiratesBinary(p);

    if (betBinary === 0) {
      // empty bet, SKIP!
      continue;
    }

    const totalOdds =
      odds[0][a] * odds[1][b] * odds[2][c] * odds[3][d] * odds[4][e];
    const winChance =
      probs[0][a] * probs[1][b] * probs[2][c] * probs[3][d] * probs[4][e];
    const betCap = Math.ceil(1_000_000 / totalOdds);
    const winnings = Math.min(maxBet * totalOdds, 1_000_000);

    betCaps[betBinary] = betCap;
    betOdds[betBinary] = totalOdds;
    if (maxBet >= MIN_BET_AMOUNT) {
      // Net expected
      const maxCap = Math.min(betCap, maxBet);
      pirateCombos[betBinary] = ((winChance * winnings) / maxCap - 1) * maxCap;
    } else {
      // Expected return
      pirateCombos[betBinary] = totalOdds * winChance;
    }
  }

  return { betCaps, betOdds, pirateCombos };
};

const BetFunctions = (props) => {
  const { blue, orange, red, green, yellow, gray, getPirateBgColor, ...rest } =
    props;
  const {
    roundState,
    calculations,
    addNewSet,
    currentBet,
    setCurrentBet,
    allNames,
    setAllNames,
    allBets,
    setAllBets,
    allBetAmounts,
    setAllBetAmounts,
  } = useContext(RoundContext);
  const { usedProbabilities, arenaRatios, betBinaries } = calculations;
  const previewHover = useColorModeValue("gray.200", "gray.600");

  const hasDuplicates = anyBetsDuplicate(betBinaries);

  const winningPiratesBinary = computePiratesBinary(
    roundState.roundData?.winners || [0, 0, 0, 0, 0]
  );

  const positiveArenas = arenaRatios.filter((x) => x > 0).length;

  const newEmptySet = () => {
    const amountOfBets = Object.keys(allBets[currentBet]).length;
    addNewSet(
      "New Set",
      makeEmptyBets(amountOfBets),
      makeEmptyBetAmounts(amountOfBets)
    );
  };

  const cloneSet = () => {
    addNewSet(
      `${allNames[currentBet]} (Clone)`,
      allBets[currentBet],
      allBetAmounts[currentBet]
    );
  };

  const deleteSet = () => {
    const currentIndex = Object.keys(allBets).indexOf(currentBet);
    let useIndex = currentIndex - 1;
    if (useIndex < 0) {
      useIndex = currentIndex + 1;
    }

    if (Object.keys(allBets).length === 1) {
      useIndex = 0;
    }
    const previousElement = Object.keys(allBets)[useIndex];

    const allBetsCopy = { ...allBets };
    const allBetAmountsCopy = { ...allBetAmounts };
    const allNamesCopy = { ...allNames };

    delete allBetsCopy[currentBet];
    delete allBetAmountsCopy[currentBet];
    delete allNamesCopy[currentBet];

    if (Object.keys(allBetsCopy).length === 0) {
      allBetsCopy[currentBet] = makeEmptyBets(10);
      allBetAmountsCopy[currentBet] = makeEmptyBetAmounts(10);
      allNamesCopy[currentBet] = "Starting Set";
    }

    setAllBets({ ...allBetsCopy });
    setAllBetAmounts({ ...allBetAmountsCopy });
    setAllNames({ ...allNamesCopy });
    setCurrentBet(previousElement);
  };

  const merSet = () => {
    const maxBet = getMaxBet(roundState.currentSelectedRound);

    const { betCaps, pirateCombos } = calculateBets(
      roundState,
      usedProbabilities,
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4]
    );

    let topRatios = Object.entries(pirateCombos).map(([k, v]) => [k, v]);
    topRatios.sort((a, b) => b[1] - a[1]);

    let newBets = {};
    let newBetAmounts = {};
    for (let bet = 0; bet < Object.keys(allBets[currentBet]).length; bet++) {
      const pirateBinary = topRatios[bet][0];
      newBets[bet + 1] = computeBinaryToPirates(pirateBinary);
      newBetAmounts[bet + 1] = determineBetAmount(
        maxBet,
        betCaps[pirateBinary]
      );
    }

    addNewSet(`Max TER Set (${maxBet} NP)`, newBets, newBetAmounts, true);
  };

  const tenbetSet = (tenbetIndices) => {
    const maxBet = getMaxBet(roundState.currentSelectedRound);
    const tenbetBinary = computePiratesBinary(tenbetIndices);

    const { betCaps, pirateCombos } = calculateBets(
      roundState,
      usedProbabilities,
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4]
    );

    let topRatios = Object.entries(pirateCombos).map(([k, v]) => [k, v]);
    topRatios.sort((a, b) => b[1] - a[1]);

    let bets = {};
    let betAmounts = {};
    let bet = 0;
    while (Object.keys(bets).length < Object.keys(allBets[currentBet]).length) {
      const pirateBinary = topRatios[bet][0];
      if ((pirateBinary & tenbetBinary) === tenbetBinary) {
        const index = Object.keys(bets).length + 1;

        bets[index] = computeBinaryToPirates(pirateBinary);

        betAmounts[index] = determineBetAmount(maxBet, betCaps[pirateBinary]);
      }
      bet += 1;
    }
    return { bets, betAmounts };
  };

  const gambitSet = () => {
    const maxBet = getMaxBet(roundState.currentSelectedRound);

    const { pirateCombos } = calculateBets(
      roundState,
      usedProbabilities,
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4]
    );

    let topRatios = Object.entries(pirateCombos).map(([k, v]) => [k, v]);
    topRatios.sort((a, b) => b[1] - a[1]);

    // get best full bet
    const best = computeBinaryToPirates(topRatios[0][0]);

    // generate a set based on those 5 pirates
    const { bets, betAmounts } = gambitWithPirates(best);

    addNewSet(`Gambit Set (${maxBet} NP)`, bets, betAmounts, true);
  };

  const bustproofSet = () => {
    const maxBet = getMaxBet(roundState.currentSelectedRound);
    const { betOdds } = calculateBets(
      roundState,
      usedProbabilities,
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4]
    );

    let bets = makeEmptyBets(10);
    let betAmounts = makeEmptyBetAmounts(10);

    // reverse it, because it's least -> greatest
    const bestArenas = sortedIndices(arenaRatios).reverse();
    const [bestArena, secondBestArena, thirdBestArena] = bestArenas;

    const getBestPirates = (arenaIndex) => {
      return sortedIndices(
        roundState.roundData.currentOdds[arenaIndex]
      ).reverse();
    };

    if (positiveArenas === 1) {
      // If only one arena is positive, we place 1 bet on each of the pirates of that arena. Total bets = 4.

      for (let x = 1; x < 5; x++) {
        bets[x][bestArena] = x;
      }
    } else if (positiveArenas === 2) {
      // If two arenas are positive, we place 1 bet on each of the three worst pirates of the best arena and
      // 1 bet on each of the pirates of the second arena + the best pirate of the best arena. Total bets = 7

      const bestPiratesInBestArena = getBestPirates(bestArena);

      const [fourthBestInBest, thirdBestInBest, secondBestInBest, bestInBest] =
        bestPiratesInBestArena;

      bets[1][bestArena] = secondBestInBest;
      bets[2][bestArena] = thirdBestInBest;
      bets[3][bestArena] = fourthBestInBest;

      for (let x = 1; x < 5; x++) {
        bets[x + 3][bestArena] = bestInBest;
        bets[x + 3][secondBestArena] = x;
      }
    } else {
      // If three arenas are positive, we place 1 bet on each of the three worst pirates of the best arena,
      // If four or more arenas are positive, we only play the three best arenas, seen below
      // 1 bet on each of the three worst pirates of the second arena + the best pirate of the best arena,
      // and 1 bet on each of the pirates of the third arena + the best pirate of the best arena + the best pirate
      // of the second arena. Total bets = 10.

      const bestPiratesInBestArena = getBestPirates(bestArena);

      const [fourthBestInBest, thirdBestInBest, secondBestInBest, bestInBest] =
        bestPiratesInBestArena;

      bets[1][bestArena] = secondBestInBest;
      bets[2][bestArena] = thirdBestInBest;
      bets[3][bestArena] = fourthBestInBest;

      //

      const bestPiratesInSecondBestArena = getBestPirates(secondBestArena);

      for (let [index, value] of bestPiratesInSecondBestArena
        .slice(0, 3)
        .entries()) {
        bets[index + 4][bestArena] = bestInBest;
        bets[index + 4][secondBestArena] = value;
      }

      //
      const bestInSecondBest = bestPiratesInSecondBestArena[3];

      for (let x = 1; x < 5; x++) {
        bets[x + 6][bestArena] = bestInBest;
        bets[x + 6][secondBestArena] = bestInSecondBest;
        bets[x + 6][thirdBestArena] = x;
      }
    }

    // make per-bet maxbets
    if (maxBet >= MIN_BET_AMOUNT) {
      let odds = [];
      let bins = [];
      for (const pirates of Object.values(bets)) {
        let bin = computePiratesBinary(pirates);
        if (bin === 0) {
          continue;
        }
        odds.push(betOdds[bin]);
        bins.push(bin);
      }

      let lowestOdds = Math.min(...odds);

      for (let [index, value] of bins.entries()) {
        betAmounts[index + 1] = Math.floor(
          (maxBet * lowestOdds) / betOdds[value]
        );
      }
    }

    addNewSet(
      `Bustproof Set (round ${roundState.currentSelectedRound})`,
      bets,
      betAmounts,
      true
    );
  };

  const winningGambitSet = () => {
    if (winningPiratesBinary === 0) {
      return;
    }

    // generate a set based on winning pirates
    const { bets } = gambitWithPirates(roundState.roundData.winners);

    // don't use bet amounts here since this round is definitely over, so this set is just for show really
    const betAmounts = makeEmptyBetAmounts(Object.keys(bets).length);

    addNewSet(
      `Winning Gambit Set (round ${roundState.currentSelectedRound})`,
      bets,
      betAmounts,
      true
    );
  };

  const gambitWithPirates = (pirates) => {
    const maxBet = getMaxBet(roundState.currentSelectedRound);
    const { betCaps, betOdds } = calculateBets(
      roundState,
      usedProbabilities,
      [0, pirates[0]],
      [0, pirates[1]],
      [0, pirates[2]],
      [0, pirates[3]],
      [0, pirates[4]]
    );

    let topRatios = Object.entries(betOdds).map(([k, v]) => [k, v]);
    topRatios.sort((a, b) => b[1] - a[1]);

    let bets = {};
    let betAmounts = {};
    for (let bet = 0; bet < Object.keys(allBets[currentBet]).length; bet++) {
      const pirateBinary = topRatios[bet][0];
      bets[bet + 1] = computeBinaryToPirates(pirateBinary);
      betAmounts[bet + 1] = determineBetAmount(maxBet, betCaps[pirateBinary]);
    }

    return { bets, betAmounts };
  };

  const randomCrazySet = () => {
    const maxBet = getMaxBet(roundState.currentSelectedRound);

    const { betCaps, betOdds } = calculateBets(
      roundState,
      usedProbabilities,
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4]
    );

    let allFullBets = Object.keys(betOdds);
    shuffleArray(allFullBets);

    let newBets = {};
    let newBetAmounts = {};
    for (let bet = 0; bet < Object.keys(allBets[currentBet]).length; bet++) {
      const pirateBinary = allFullBets[bet];
      newBets[bet + 1] = computeBinaryToPirates(pirateBinary);
      newBetAmounts[bet + 1] = determineBetAmount(
        maxBet,
        betCaps[pirateBinary]
      );
    }

    addNewSet(`Crazy Set (${maxBet} NP)`, newBets, newBetAmounts, true);
  };

  return (
    <SettingsBox {...rest}>
      <Stack p={4}>
        <Wrap>
          <WrapItem>
            <Button
              bgColor={gray}
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FaPlus} />}
              aria-label=""
              onClick={newEmptySet}
            >
              New set
            </Button>

            <ButtonGroup
              size="sm"
              isAttached
              variant="outline"
              bgColor={gray}
              ml={2}
            >
              <Button
                leftIcon={<Icon as={FaClone} />}
                aria-label="Clone Current Bet Set"
                onClick={cloneSet}
              >
                Clone
              </Button>

              <Button
                leftIcon={<Icon as={FaTrash} />}
                aria-label="Delete Current Bet Set"
                onClick={deleteSet}
              >
                {Object.keys(allBets).length === 1 ? "Clear" : "Delete"}
              </Button>
            </ButtonGroup>
          </WrapItem>

          <WrapItem>
            <ButtonGroup
              size="sm"
              isAttached
              variant="outline"
              bgColor={gray}
              isDisabled={!roundState.roundData}
            >
              <Menu>
                <MenuButton
                  as={Button}
                  leftIcon={<Icon as={FaWandMagicSparkles} />}
                  rightIcon={<Icon as={FaChevronDown} w="0.75em" h="0.75em" />}
                  aria-label="Generate New Bet Set"
                >
                  Generate set
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={merSet}>Max TER set</MenuItem>
                  <MenuItem onClick={gambitSet}>Gambit set</MenuItem>
                  <MenuItem
                    hidden={winningPiratesBinary === 0}
                    onClick={winningGambitSet}
                  >
                    Winning Gambit set
                  </MenuItem>
                  <MenuItem onClick={randomCrazySet}>Random Crazy set</MenuItem>
                  <MenuItem
                    onClick={bustproofSet}
                    isDisabled={positiveArenas === 0}
                  >
                    Bustproof Set
                  </MenuItem>
                </MenuList>
              </Menu>

              <BuildSetMenu
                gambitWithPirates={gambitWithPirates}
                getPirateBgColor={getPirateBgColor}
                tenbetSet={tenbetSet}
              />
            </ButtonGroup>
          </WrapItem>
        </Wrap>

        <Wrap mt={2}>
          {Object.keys(allBets).map((key) => {
            let isCurrent = key === currentBet;
            let anyBets = anyBetsExist(allBets[key]);

            return (
              <WrapItem key={key}>
                <Card
                  p={2}
                  opacity={isCurrent ? 1 : 0.5}
                  cursor={isCurrent ? "default" : "pointer"}
                  onClick={() => {
                    if (isCurrent) {
                      return;
                    }
                    setCurrentBet(key);
                  }}
                  transition="opacity 0.2s ease-in-out"
                  boxShadow={isCurrent ? "dark-lg" : "xl"}
                  minW={250}
                >
                  <Box>
                    <Heading
                      as={Editable}
                      isDisabled={!isCurrent}
                      size="md"
                      minW="100%"
                      value={allNames[key]}
                      onChange={(value) =>
                        setAllNames({
                          ...allNames,
                          [key]: value,
                        })
                      }
                      onSubmit={(newValue) => {
                        setAllNames({
                          ...allNames,
                          [key]: newValue || "Unnamed Set",
                        });
                      }}
                    >
                      <EditablePreview
                        px={4}
                        py={2}
                        cursor={isCurrent ? "text" : "pointer"}
                        _hover={{
                          background: isCurrent ? previewHover : null,
                        }}
                      />
                      <Input py={2} px={4} as={EditableInput} />
                    </Heading>
                    <Divider />
                    <BetBadges pt={1} index={key} />

                    <Collapse
                      in={isCurrent && anyBets && !hasDuplicates}
                      animateOpacity
                    >
                      <Box mt={2}>
                        <Divider />
                        <BetCopyButtons index={key} />
                      </Box>
                    </Collapse>
                  </Box>
                </Card>
              </WrapItem>
            );
          })}
        </Wrap>
      </Stack>
    </SettingsBox>
  );
};

const BetBadges = (props) => {
  const { index, ...rest } = props;
  const { calculations, roundState, allBets, allBetAmounts } =
    useContext(RoundContext);
  const { usedProbabilities, odds, calculated, winningBetBinary } =
    calculations;

  if (odds === undefined) {
    return null;
  }

  let bets = allBets[index];
  let betAmounts = allBetAmounts[index];

  let { betOdds, betPayoffs, betBinaries, betExpectedRatios } = makeBetValues(
    bets,
    betAmounts,
    odds,
    usedProbabilities
  );

  let payoutTables = {};

  if (calculated) {
    payoutTables = calculatePayoutTables(
      bets,
      usedProbabilities,
      betOdds,
      betPayoffs
    );
  }

  let badges = [];
  let validBets = Object.values(betBinaries).filter((x) => x > 0);
  let betCount = validBets.length;
  let uniqueBetBinaries = [...new Set(validBets)];
  let isRoundOver = roundState.roundData?.winners[0] !== 0;

  // invalid badges
  let isInvalid = false;
  if (uniqueBetBinaries.length !== betCount) {
    // duplicate bets
    badges.push(
      <Badge colorScheme="red" variant="subtle">
        ❌ Contains duplicate bets
      </Badge>
    );
    isInvalid = true;
  }

  const invalidBetAmounts = Object.values(betOdds).filter((odds, index) => {
    if (odds > 0 && betAmounts) {
      let betAmount = betAmounts[index + 1];
      return betAmount !== DEFAULT_BET_AMOUNT && betAmount < MIN_BET_AMOUNT;
    }
    return false;
  });

  if (invalidBetAmounts.length > 0) {
    badges.push(
      <Badge colorScheme="red" variant="subtle">
        ❌ Invalid bet amounts
      </Badge>
    );
    isInvalid = true;
  }

  if (betCount > 0 && roundState.roundData) {
    let totalTer = 0;
    for (let betIndex in betBinaries) {
      if (betBinaries[betIndex] > 0) {
        totalTer += betExpectedRatios[betIndex];
      }
    }
    badges.push(
      <Badge colorScheme="teal" variant="subtle">
        TER: {totalTer.toFixed(3)}
      </Badge>
    );
  }

  // round-over badges
  if (isRoundOver && roundState.roundData) {
    // round-over badge
    badges.push(
      <Badge colorScheme="red" variant="subtle">
        Round {roundState.roundData.round} is over
      </Badge>
    );

    // units won, and np won badges
    if (betCount > 0 && !isInvalid) {
      let unitsWon = 0;
      let npWon = 0;
      Object.values(betBinaries).forEach((binary, index) => {
        if (betAmounts && (winningBetBinary & binary) === binary) {
          unitsWon += betOdds[index + 1];
          npWon += Math.min(
            betOdds[index + 1] * betAmounts[index + 1],
            1_000_000
          );
        }
      });

      if (unitsWon === 0) {
        badges.push(<Badge variant="subtle">💀 Busted</Badge>);
      } else {
        badges.push(
          <Badge colorScheme="green" variant="subtle">
            Units won: {unitsWon.toLocaleString()}
          </Badge>
        );
      }

      if (npWon > 0) {
        badges.push(
          <Badge colorScheme="green" variant="subtle">
            💰 NP won: {npWon.toLocaleString()}
          </Badge>
        );
      }
    }
  }

  // bust chance badge
  if (betCount > 0 && roundState.roundData && !isRoundOver) {
    let bustChance = 0;
    let bustEmoji = "";

    if (
      payoutTables.odds !== undefined &&
      Object.keys(payoutTables.odds).length > 1 &&
      payoutTables.odds[0]["value"] === 0
    ) {
      bustChance = payoutTables.odds[0]["probability"] * 100;
    }

    if (bustChance > 99) {
      bustEmoji = "💀";
    }

    if (bustChance === 0) {
      badges.push(<Badge variant="subtle">🎉 Bust-proof!</Badge>);
    } else {
      const beakerEmoji = roundState.advanced.useLogitModel ? "🧪" : "";
      badges.push(
        <Badge variant="subtle">
          {bustEmoji} {Math.floor(bustChance)}% Bust {beakerEmoji}
        </Badge>
      );
    }
  }

  // guaranteed profit badge
  if (
    betCount > 0 &&
    roundState.roundData &&
    !isRoundOver &&
    !isInvalid &&
    betAmounts
  ) {
    let betAmountsTotal = 0;
    Object.values(betAmounts).forEach((amount) => {
      if (amount !== DEFAULT_BET_AMOUNT) {
        betAmountsTotal += amount;
      }
    });
    let lowestProfit = payoutTables.winnings[0].value;
    if (betAmountsTotal < lowestProfit) {
      badges.push(
        <Badge colorScheme="green" variant="subtle">
          💰 Guaranteed profit ({lowestProfit - betAmountsTotal}+ NP)
        </Badge>
      );
    }
  }

  // gambit badge
  if (betCount >= 2 && roundState.roundData) {
    let highest = Math.max(...Object.values(betBinaries));
    let populationCount = highest.toString(2).match(/1/g).length;
    if (populationCount === 5) {
      let isSubset = Object.values(betBinaries).every(
        (x) => (highest & x) === x
      );
      if (isSubset) {
        let names = [];
        computeBinaryToPirates(highest).forEach((pirate, index) => {
          if (pirate > 0) {
            let pirateId = roundState.roundData.pirates[index][pirate - 1];
            names.push(SHORTHAND_PIRATE_NAMES[pirateId]);
          }
        });

        badges.push(
          <Badge colorScheme="blue" variant="subtle">
            Gambit: {names.join(" x ")}
          </Badge>
        );
      }
    }
  }

  // tenbet badge
  if (betCount >= 10 && roundState.roundData) {
    let tenbetBinary = Object.values(betBinaries).reduce(
      (accum, current) => accum & current
    );

    if (tenbetBinary > 0) {
      let names = [];
      computeBinaryToPirates(tenbetBinary).forEach((pirate, index) => {
        if (pirate > 0) {
          let pirateId = roundState.roundData.pirates[index][pirate - 1];
          names.push(SHORTHAND_PIRATE_NAMES[pirateId]);
        }
      });

      badges.push(
        <Badge colorScheme="purple" variant="subtle">
          Tenbet: {names.join(" x ")}
        </Badge>
      );
    }
  }

  // crazy badge
  if (betCount >= 10 && roundState.roundData) {
    let isCrazy = Object.values(betBinaries).every((binary) =>
      computeBinaryToPirates(binary).every((x) => x > 0)
    );

    if (isCrazy) {
      badges.push(
        <Badge colorScheme="pink" variant="subtle">
          🤪 Crazy
        </Badge>
      );
    }
  }

  return (
    <VStack spacing={1} style={{ userSelect: "none" }} {...rest}>
      {badges.map((badge, index) => {
        return <Box key={index}>{badge}</Box>;
      })}
    </VStack>
  );
};

export default BetFunctions;
