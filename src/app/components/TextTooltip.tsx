import { Text } from '@chakra-ui/react';
import React, { ReactNode } from 'react';

import { Tooltip, TooltipProps } from '@/components/ui/tooltip';

// this element is a custom chakra tooltip that simply has an easier way to pass in the text/label

interface TextTooltipProps extends Omit<TooltipProps, 'children'> {
  text: ReactNode;
  content?: string;
}

const TextTooltip = React.memo((props: TextTooltipProps): React.ReactElement => {
  const { text, content, ...rest } = props;
  // Convert label to string to satisfy aria-label requirement
  const ariaLabel = content ? content : typeof text === 'string' ? text : '';

  return (
    <Tooltip content={content || text} aria-label={ariaLabel} {...rest}>
      <Text>{text}</Text>
    </Tooltip>
  );
});

TextTooltip.displayName = 'TextTooltip';

export default TextTooltip;
