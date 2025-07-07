import {
  Flex,
  Text,
  Tooltip,
  useColorModeValue,
  Box,
  Icon,
  Switch,
  IconProps,
} from '@chakra-ui/react';
import { ChangeEvent, MouseEvent, ReactNode, useCallback, useMemo, memo } from 'react';

interface SettingsRowProps {
  icon: React.ElementType;
  label: string;
  colorScheme: string;
  isChecked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLDivElement>) => void;
  isDisabled?: boolean;
  tooltipText?: string;
  iconProps?: IconProps & { baseSize?: string; largeSize?: string };
  children?: ReactNode;
}

const SettingsRow = memo<SettingsRowProps>(
  ({
    icon,
    label,
    isChecked,
    onChange,
    tooltipText,
    colorScheme = 'blue',
    iconProps = {},
    isDisabled = false,
  }) => {
    const baseSize = iconProps.baseSize || '1em';
    const largeSize = iconProps.largeSize || '1.5em';

    const iconSize = useMemo(
      () => (isChecked ? largeSize : baseSize),
      [isChecked, largeSize, baseSize],
    );
    const { baseSize: _, largeSize: _2, ...safeIconProps } = iconProps;

    const bgColorEnabled = useColorModeValue(`${colorScheme}.50`, `${colorScheme}.900`);
    const bgColorDisabled = useColorModeValue(`${colorScheme}.25`, `${colorScheme}.950`);
    const bgColor = useMemo(
      () => (isChecked ? bgColorEnabled : bgColorDisabled),
      [isChecked, bgColorEnabled, bgColorDisabled],
    );

    const handleRowClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (isDisabled) {
          return;
        }
        onChange(e);
      },
      [isDisabled, onChange],
    );

    const handleSwitchChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (isDisabled) {
          return;
        }
        onChange(e);
      },
      [isDisabled, onChange],
    );

    const handleStopPropagation = useCallback((e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
    }, []);

    const rowContent = (
      <Flex
        justify="space-between"
        align="center"
        width="100%"
        as="div"
        opacity={isDisabled ? 0.6 : 1}
        py={2}
        px={2}
        borderRadius="md"
        transition="all 0.2s"
        backgroundColor={bgColor}
        borderWidth="1px"
        borderColor={isChecked ? `${colorScheme}.200` : 'transparent'}
        onClick={handleRowClick}
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        _hover={{ transform: 'none' }}
      >
        <Flex align="center" flex="1" cursor="inherit">
          <Box
            minWidth="24px"
            width="24px"
            height="24px"
            display="flex"
            justifyContent="center"
            alignItems="center"
            mr={2}
          >
            {icon && (
              <Icon
                as={icon}
                color={isChecked ? `${colorScheme}.500` : 'gray.400'}
                w={iconSize}
                h={iconSize}
                maxW="24px"
                maxH="24px"
                style={{
                  transition:
                    'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s',
                  ...safeIconProps.style,
                }}
                {...safeIconProps}
              />
            )}
          </Box>
          <Text>{label}</Text>
        </Flex>
        <Box onClick={handleStopPropagation} position="relative" zIndex={1}>
          <Switch
            isChecked={isChecked}
            colorScheme={colorScheme}
            isDisabled={isDisabled}
            onChange={handleSwitchChange}
            cursor={isDisabled ? 'not-allowed' : 'pointer'}
            size="md"
          />
        </Box>
      </Flex>
    );

    // Always render Tooltip but conditionally disable it to prevent Switch remounting
    return (
      <Tooltip
        label={tooltipText || ''}
        hasArrow
        placement="top"
        openDelay={600}
        isDisabled={!tooltipText} // Disable tooltip when no text provided
      >
        {rowContent}
      </Tooltip>
    );
  },
);

SettingsRow.displayName = 'SettingsRow';

export default SettingsRow;
