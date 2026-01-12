import { RadioGroup as ChakraRadioGroup } from '@chakra-ui/react';
import * as React from 'react';

export interface RadioProps extends ChakraRadioGroup.ItemProps {
  rootRef?: React.RefObject<HTMLDivElement | null>;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  children?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(function Radio(props, ref) {
  const { children, inputProps, rootRef, cursor, disabled, ...rest } = props;
  const resolvedCursor = disabled ? 'not-allowed' : (cursor ?? 'pointer');
  return (
    <ChakraRadioGroup.Item ref={rootRef} {...rest} disabled={disabled} cursor={resolvedCursor}>
      <ChakraRadioGroup.ItemHiddenInput ref={ref} {...inputProps} />
      <ChakraRadioGroup.ItemIndicator cursor={resolvedCursor} />
      {children && (
        <ChakraRadioGroup.ItemText cursor={resolvedCursor}>{children}</ChakraRadioGroup.ItemText>
      )}
    </ChakraRadioGroup.Item>
  );
});

export const RadioGroup = ChakraRadioGroup.Root;
