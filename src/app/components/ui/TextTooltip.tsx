import { Text } from '@chakra-ui/react';
import React, { ReactNode } from 'react';

import { Tooltip, TooltipProps } from '@/components/ui/tooltip';

// this element is a custom chakra tooltip that simply has an easier way to pass in the text/label

interface TextTooltipProps extends Omit<TooltipProps, 'children' | 'content'> {
  text: ReactNode;
  label?: string;
  content?: ReactNode;
  cursor?: string;
  textDecoration?: string;
}

const TextTooltip = React.memo((props: TextTooltipProps): React.ReactElement => {
  const { text, label, content, cursor, textDecoration, ...rest } = props;
  // Convert label to string to satisfy aria-label requirement
  const tooltipContent = content ?? label ?? text;
  const ariaLabel = typeof tooltipContent === 'string' ? tooltipContent : '';

  return (
    <Tooltip content={tooltipContent} aria-label={ariaLabel} {...rest}>
      <Text cursor={cursor} textDecoration={textDecoration}>
        {text}
      </Text>
    </Tooltip>
  );
});

TextTooltip.displayName = 'TextTooltip';

export default TextTooltip;
