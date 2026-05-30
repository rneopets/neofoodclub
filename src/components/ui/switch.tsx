import { Switch as ChakraSwitch } from '@chakra-ui/react';
import * as React from 'react';

export interface SwitchProps extends ChakraSwitch.RootProps {
  controlProps?: React.ComponentProps<typeof ChakraSwitch.Control> | undefined;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  ref?: React.Ref<HTMLInputElement>;
  rootRef?: React.RefObject<HTMLLabelElement | null>;
  thumbProps?: React.ComponentProps<typeof ChakraSwitch.Thumb> | undefined;
  trackLabel?: { on: React.ReactNode; off: React.ReactNode };
  thumbLabel?: { on: React.ReactNode; off: React.ReactNode };
}

export function Switch(props: SwitchProps): React.ReactElement {
  const {
    controlProps,
    inputProps,
    children,
    ref,
    rootRef,
    thumbProps,
    trackLabel,
    thumbLabel,
    ...rest
  } = props;

  return (
    <ChakraSwitch.Root ref={rootRef} {...rest}>
      <ChakraSwitch.HiddenInput ref={ref} {...inputProps} />
      <ChakraSwitch.Control {...controlProps}>
        <ChakraSwitch.Thumb {...thumbProps}>
          {thumbLabel && (
            <ChakraSwitch.ThumbIndicator fallback={thumbLabel?.off}>
              {thumbLabel?.on}
            </ChakraSwitch.ThumbIndicator>
          )}
        </ChakraSwitch.Thumb>
        {trackLabel && (
          <ChakraSwitch.Indicator fallback={trackLabel.off}>{trackLabel.on}</ChakraSwitch.Indicator>
        )}
      </ChakraSwitch.Control>
      {children !== null && <ChakraSwitch.Label>{children}</ChakraSwitch.Label>}
    </ChakraSwitch.Root>
  );
}
