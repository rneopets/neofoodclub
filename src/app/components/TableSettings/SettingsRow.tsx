import { Flex, Text, Box } from '@chakra-ui/react';
import { ChangeEvent, MouseEvent, ReactNode, useCallback, memo } from 'react';

import { useColorModeValue } from '@/components/ui/color-mode';
import { Switch } from '@/components/ui/switch';

interface SettingsRowProps {
  icon: React.ElementType;
  label: string;
  colorPalette: string;
  isChecked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  children?: ReactNode;
}

const SettingsRow = memo<SettingsRowProps>(
  ({
    icon: IconComponent,
    label,
    isChecked,
    onChange,
    colorPalette = 'blue',
    disabled = false,
  }) => {
    const bgColorEnabled = useColorModeValue(`${colorPalette}.50`, `${colorPalette}.900`);
    const bgColorDisabled = useColorModeValue(`${colorPalette}.25`, `${colorPalette}.950`);
    const bgColor = isChecked ? bgColorEnabled : bgColorDisabled;

    const handleRowClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (!disabled) {
          onChange(e);
        }
      },
      [disabled, onChange],
    );

    const handleSwitchChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (!disabled) {
          onChange(e);
        }
      },
      [disabled, onChange],
    );

    const handleStopPropagation = useCallback((e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
    }, []);

    const content = (
      <Flex
        justify="space-between"
        align="center"
        width="100%"
        as="div"
        opacity={disabled ? 0.6 : 1}
        py={2}
        px={2}
        borderRadius="md"
        transition="all 0.2s"
        backgroundColor={bgColor}
        borderWidth="1px"
        borderColor={isChecked ? `${colorPalette}.200` : 'transparent'}
        onClick={handleRowClick}
        cursor={disabled ? 'not-allowed' : 'pointer'}
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
            {IconComponent && (
              <IconComponent
                style={{
                  color: isChecked
                    ? `var(--chakra-colors-${colorPalette}-500)`
                    : 'var(--chakra-colors-gray-400)',
                  width: '1em',
                  height: '1em',
                  maxWidth: '24px',
                  maxHeight: '24px',
                  transition: 'color 0.2s',
                }}
              />
            )}
          </Box>
          <Text>{label}</Text>
        </Flex>
        <Box onClick={handleStopPropagation} position="relative" zIndex={1}>
          <Switch
            checked={isChecked}
            colorPalette={colorPalette}
            disabled={disabled}
            onChange={handleSwitchChange}
            cursor={disabled ? 'not-allowed' : 'pointer'}
            size="md"
          />
        </Box>
      </Flex>
    );

    // Simple version without Tooltip for now
    return content;
  },
);

SettingsRow.displayName = 'SettingsRow';

export default SettingsRow;
