import { Tooltip, TooltipProps } from '@chakra-ui/react';
import React, { ReactNode } from 'react';

// this element is a custom chakra tooltip that simply has an easier way to pass in the text/label

interface TextTooltipProps extends Omit<TooltipProps, 'children'> {
  text: ReactNode;
  label?: string;
}

const TextTooltip = React.memo((props: TextTooltipProps): React.ReactElement => {
  const { text, label, ...rest } = props;
  // Convert label to string to satisfy aria-label requirement
  const ariaLabel = label ? label : typeof text === 'string' ? text : '';

  return (
    <Tooltip label={label || text} aria-label={ariaLabel} {...rest}>
      {text}
    </Tooltip>
  );
});

TextTooltip.displayName = 'TextTooltip';

export default TextTooltip;
