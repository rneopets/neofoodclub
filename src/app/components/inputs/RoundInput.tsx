import { Group, Text, chakra } from '@chakra-ui/react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import { useDebouncedRoundInput } from '../../hooks/useDebouncedRoundInput';
import { useSelectOnFocus } from '../../hooks/useSelectOnFocus';
import { useRoundStore } from '../../stores';

import {
  NumberInputRoot,
  NumberInputField,
  NumberInputValueChangeDetails,
} from '@/components/ui/number-input';

// Hook to get error state from the store
const useErrorState = (): string | null => useRoundStore(state => state.error);

interface RoundInputProps {
  /** Displayed round; falls back to the store's `currentSelectedRound` when omitted. */
  selectedRound?: number;
  /** Round to revert to on empty/invalid input; falls back to the store's `currentRound`. */
  referenceRound?: number;
  /** Called with the debounced-commit round instead of the store's `updateSelectedRound`. */
  onRoundChange?: (round: number) => void;
  /** Falls back to the store's error state when omitted. */
  hasError?: boolean;
}

// Full-height left/right stepper buttons (replacing the old tiny up/down control) for
// easier tapping on mobile. Each carries a full 1px border; the attached Group overlaps
// adjacent borders via negative margins so the whole control reads as one rounded box.
const StepperButton = chakra('button', {
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    h: '8',
    w: '7',
    flexShrink: 0,
    fontSize: 'sm',
    lineHeight: '1',
    color: 'fg.muted',
    bg: 'bg.subtle',
    borderWidth: '1px',
    cursor: 'pointer',
    userSelect: 'none',
    transitionProperty: 'common',
    _hover: { bg: 'bg.muted' },
    _active: { bg: 'bg.emphasized' },
  },
});

// this element is the number input to say which round's data you're viewing

const RoundInput: React.FC<RoundInputProps> = ({
  selectedRound,
  referenceRound,
  onRoundChange,
  hasError: hasErrorProp,
}) => {
  const storeSelectedRound = useRoundStore(state => state.currentSelectedRound);
  const storeCurrentRound = useRoundStore(state => state.currentRound);
  const updateSelectedRound = useRoundStore(state => state.updateSelectedRound);
  const storeError = useErrorState();

  const currentSelectedRound = selectedRound ?? storeSelectedRound;
  const currentRound = referenceRound ?? storeCurrentRound;
  const commitRound = onRoundChange ?? updateSelectedRound;

  const initialRoundNumber = useMemo(() => currentSelectedRound || 0, [currentSelectedRound]);

  const [tempValue, setTempValue] = useState<string>(() => initialRoundNumber.toString());

  // Check if there's an error related to the current round
  const hasError = hasErrorProp ?? Boolean(storeError);

  // Use custom hook to handle debouncing with cancellation on external changes
  useDebouncedRoundInput(
    tempValue,
    currentSelectedRound.toString(),
    400,
    useCallback(
      (debouncedValue: string) => {
        const trimmedValue = debouncedValue.trim();
        if (trimmedValue === '') {
          return;
        }

        const roundNumber = parseInt(trimmedValue, 10);
        if (isNaN(roundNumber) || roundNumber === 0) {
          return;
        }

        const isSameRound = roundNumber === currentSelectedRound;
        if (isSameRound) {
          return;
        }

        commitRound(roundNumber);
      },
      [currentSelectedRound, commitRound],
    ),
  );

  // Sync temp value when currentSelectedRound changes externally
  useEffect(() => {
    setTempValue((currentSelectedRound || 0).toString());
  }, [currentSelectedRound]);

  const selectRoundInput = useSelectOnFocus();

  const handleChange = useCallback((details: NumberInputValueChangeDetails): void => {
    setTempValue(details.value);
  }, []);

  const commitRoundInput = useCallback((): void => {
    const trimmedValue = tempValue.trim();

    // If input is empty, set to current round
    if (trimmedValue === '') {
      setTempValue(currentRound.toString());
      return;
    }

    const roundNumber = parseInt(trimmedValue, 10);

    // If invalid number, revert to current round
    if (isNaN(roundNumber) || roundNumber < 1) {
      setTempValue(currentRound.toString());
      return;
    }

    // Update the display value to the parsed number
    setTempValue(roundNumber.toString());
  }, [tempValue, currentRound]);

  // Step the displayed round by +/-1 (clamped at min 1, matching NumberInputRoot's min).
  // Steps from whatever is currently displayed, falling back to the selected round when
  // empty/invalid. Like typing, this flows through tempValue + the debounced commit.
  const stepRoundInput = useCallback(
    (delta: number): void => {
      const displayed = parseInt(tempValue, 10);
      const base = isNaN(displayed) ? currentSelectedRound || 0 : displayed;
      setTempValue(Math.max(1, base + delta).toString());
    },
    [tempValue, currentSelectedRound],
  );

  const stepperButtonProps = {
    borderColor: hasError ? 'border.error' : 'border',
    rounded: 0,
  } as const;

  return (
    <Group attached w="full" gap={0} alignItems="stretch">
      <Text
        fontSize="xs"
        lineHeight="1"
        fontWeight="medium"
        color="fg.muted"
        bg="bg.muted"
        borderWidth="1px"
        borderEndWidth="0"
        borderColor={hasError ? 'border.error' : 'border'}
        roundedStart="md"
        roundedEnd={0}
        px="2"
        display="flex"
        alignItems="center"
        whiteSpace="nowrap"
        userSelect="none"
      >
        Round
      </Text>
      <StepperButton
        {...stepperButtonProps}
        type="button"
        aria-label="Previous round"
        data-testid="round-input-decrement"
        onClick={(): void => stepRoundInput(-1)}
      >
        <FaChevronLeft />
      </StepperButton>
      <NumberInputRoot
        value={tempValue}
        min={1}
        allowMouseWheel
        showControl={false}
        onValueChange={handleChange}
        name="round-input"
        data-testid="round-input"
        size="xs"
        invalid={hasError}
        flex="1"
        minW="0"
      >
        <NumberInputField
          onFocus={selectRoundInput}
          onBlur={commitRoundInput}
          name="round-input-field"
          data-testid="round-input-field"
          rounded={0}
          pe="2"
        />
      </NumberInputRoot>
      <StepperButton
        {...stepperButtonProps}
        type="button"
        aria-label="Next round"
        data-testid="round-input-increment"
        roundedEnd="md"
        onClick={(): void => stepRoundInput(1)}
      >
        <FaChevronRight />
      </StepperButton>
    </Group>
  );
};

export default RoundInput;
