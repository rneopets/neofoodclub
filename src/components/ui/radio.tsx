import { RadioGroup as ChakraRadioGroup } from '@chakra-ui/react';
import * as React from 'react';

export interface RadioProps extends ChakraRadioGroup.ItemProps {
  ref?: React.Ref<HTMLInputElement>;
  rootRef?: React.RefObject<HTMLDivElement | null>;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  children?: React.ReactNode;
}

export function Radio(props: RadioProps): React.ReactElement {
  const { children, inputProps, ref, rootRef, cursor, disabled, ...rest } = props;
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
}

export const RadioGroup = ChakraRadioGroup.Root;
