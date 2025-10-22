import { IconButton } from '@chakra-ui/react';
import React, { memo, useCallback } from 'react';

import { Tooltip } from '@/components/ui/tooltip';

interface ToolbarButtonProps {
  icon: React.ElementType;
  isActive: boolean;
  onChange: () => void;
  tooltipLabel: string;
  colorPalette?: string;
  disabled?: boolean;
}

const ToolbarButton = memo(
  ({
    icon,
    isActive,
    onChange,
    tooltipLabel,
    colorPalette = 'gray',
    disabled = false,
  }: ToolbarButtonProps): React.ReactElement => {
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        if (!disabled) {
          onChange();
        }
      },
      [disabled, onChange],
    );

    return (
      <Tooltip content={tooltipLabel} showArrow placement="top" openDelay={600}>
        <IconButton
          aria-label={tooltipLabel}
          onClick={handleClick}
          size="sm"
          variant={isActive ? 'solid' : 'ghost'}
          colorPalette={isActive ? colorPalette : 'gray'}
          disabled={disabled}
          opacity={disabled ? 0.4 : 1}
          cursor={disabled ? 'not-allowed' : 'pointer'}
        >
          {React.createElement(icon)}
        </IconButton>
      </Tooltip>
    );
  },
);

ToolbarButton.displayName = 'ToolbarButton';

export default ToolbarButton;
