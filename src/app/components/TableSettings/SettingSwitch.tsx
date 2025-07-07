import { Box, Flex, Switch, Icon, Tooltip, IconProps } from '@chakra-ui/react';
import React, { ChangeEvent, MouseEvent, useCallback, memo } from 'react';

/**
 * Reusable setting switch component with indicator line
 */
interface SettingSwitchProps {
  icon?: React.ElementType;
  isChecked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLDivElement>) => void;
  tooltipLabel?: string;
  color?: string;
  iconProps?: IconProps & { baseSize?: unknown; largeSize?: unknown };
  isDisabled?: boolean;
}

const SettingSwitch = memo(
  ({
    icon,
    isChecked,
    onChange,
    tooltipLabel,
    color = 'blue',
    iconProps = {},
    isDisabled = false,
  }: SettingSwitchProps): React.ReactElement => {
    const iconSize = '1em';
    const { baseSize: _, largeSize: _2, ...safeIconProps } = iconProps;

    const handleSwitchChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>): void => {
        e.stopPropagation();
        if (isDisabled) {
          return;
        }
        onChange(e);
      },
      [isDisabled, onChange],
    );

    const handleIconClick = useCallback(
      (e: MouseEvent<SVGElement>): void => {
        if (isDisabled) {
          return;
        }
        onChange(e as unknown as MouseEvent<HTMLDivElement>);
      },
      [isDisabled, onChange],
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
          opacity={isDisabled ? 0.6 : 1}
        >
          {icon && (
            <Icon
              as={icon}
              color={isChecked ? `${color}.500` : 'gray.400'}
              w={iconSize}
              h={iconSize}
              cursor={isDisabled ? 'not-allowed' : 'pointer'}
              onClick={handleIconClick}
              style={{
                transition: 'color 0.2s',
                ...safeIconProps.style,
              }}
              {...safeIconProps}
            />
          )}
          <Box onClick={handleStopPropagation} position="relative" zIndex={1}>
            <Switch
              size="md"
              colorScheme={color}
              isChecked={isChecked}
              onChange={handleSwitchChange}
              isDisabled={isDisabled}
              cursor={isDisabled ? 'not-allowed' : 'pointer'}
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
          bg={isChecked ? `${color}.500` : 'gray.600'}
          transition="background-color 0.2s"
          borderRadius="full"
        />
      </Box>
    );

    return (
      <Tooltip
        label={tooltipLabel || ''}
        hasArrow
        placement="top"
        openDelay={600}
        isDisabled={!tooltipLabel}
      >
        {content}
      </Tooltip>
    );
  },
);

SettingSwitch.displayName = 'SettingSwitch';

export default SettingSwitch;
