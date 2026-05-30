import { NumberInput as ChakraNumberInput } from '@chakra-ui/react';
import * as React from 'react';

export type NumberInputProps = ChakraNumberInput.RootProps & {
  showControl?: boolean;
  keepWithinRange?: boolean;
  ref?: React.Ref<HTMLDivElement>;
};

export type NumberInputValueChangeDetails = {
  value: string;
  valueAsNumber: number;
};

export function NumberInputRoot(props: NumberInputProps): React.ReactElement {
  const { children, showControl = true, keepWithinRange: _keepWithinRange, ref, ...rest } = props;
  return (
    <ChakraNumberInput.Root ref={ref} variant="outline" {...rest}>
      {children}
      {showControl && (
        <ChakraNumberInput.Control>
          <ChakraNumberInput.IncrementTrigger />
          <ChakraNumberInput.DecrementTrigger />
        </ChakraNumberInput.Control>
      )}
    </ChakraNumberInput.Root>
  );
}

export const NumberInputField = ChakraNumberInput.Input;
export const NumberInputScrubber = ChakraNumberInput.Scrubber;
export const NumberInputLabel = ChakraNumberInput.Label;
