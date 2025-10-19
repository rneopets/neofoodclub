import { Box, Flex } from '@chakra-ui/react';
import React, { ChangeEvent, MouseEvent, useCallback, memo } from 'react';

import { Switch } from '@/components/ui/switch';
import { Tooltip } from '@/components/ui/tooltip';

/**
 * Reusable setting switch component with indicator line
 */
interface SettingSwitchProps {
  icon?: React.ElementType;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLDivElement>) => void;
  tooltipLabel?: string;
  colorPalette?: string;
  iconProps?: { style?: React.CSSProperties; [key: string]: unknown };
  disabled?: boolean;
}

const SettingSwitch = memo(
  ({
    icon,
    checked: isChecked,
    onChange,
    tooltipLabel,
    colorPalette = 'gray',
    iconProps = {},
    disabled = false,
  }: SettingSwitchProps): React.ReactElement => {
    const iconSize = '1em';
    const { baseSize: _, largeSize: _2, ...safeIconProps } = iconProps;

    const handleSwitchChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>): void => {
        e.stopPropagation();
        if (disabled) {
          return;
        }
        onChange(e);
      },
      [disabled, onChange],
    );

    const handleIconClick = useCallback(
      (e: MouseEvent<HTMLDivElement>): void => {
        if (disabled) {
          return;
        }
        onChange(e as unknown as MouseEvent<HTMLDivElement>);
      },
      [disabled, onChange],
    );

    const handleStopPropagation = useCallback((e: MouseEvent<HTMLDivElement>): void => {
      e.stopPropagation();
    }, []);

    const content = (
      <Box display="inline-block" position="relative">
        <Flex
          gap={1.5}
          align="center"
          p={1}
          borderRadius="md"
          minW="32px"
          opacity={disabled ? 0.6 : 1}
        >
          {icon && (
            <Box
              cursor={disabled ? 'not-allowed' : 'pointer'}
              onClick={handleIconClick}
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                as={icon}
                color={isChecked ? `${colorPalette}.400` : 'gray.400'}
                width={iconSize}
                height={iconSize}
                style={{
                  transition: 'color 0.2s',
                  fontSize: iconSize,
                  ...((safeIconProps.style as React.CSSProperties) || {}),
                }}
              />
            </Box>
          )}
          <Box onClick={handleStopPropagation} position="relative" zIndex={1}>
            <Switch
              checked={isChecked}
              onChange={handleSwitchChange}
              disabled={disabled}
              colorPalette={colorPalette}
              size="sm"
            />
          </Box>
        </Flex>

        <Box
          position="absolute"
          bottom="-5px"
          left="50%"
          transform="translateX(-50%)"
          width="60%"
          height="1px"
          bg={isChecked ? `${colorPalette}.400` : 'gray.600'}
          transition="background-color 0.2s"
          borderRadius="full"
        />
      </Box>
    );

    return (
      <Tooltip
        content={tooltipLabel || ''}
        showArrow
        placement="top"
        openDelay={600}
        disabled={!tooltipLabel}
      >
        {content}
      </Tooltip>
    );
  },
);

SettingSwitch.displayName = 'SettingSwitch';

export default SettingSwitch;
