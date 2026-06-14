import { Text, HStack, Spacer } from '@chakra-ui/react';
import { ChangeEvent, ReactNode, useCallback, memo } from 'react';

import { useColorMode } from '@/components/ui/color-mode';
import { Switch } from '@/components/ui/switch';

interface SettingsRowProps {
  icon: React.ElementType;
  label: string;
  colorPalette: string;
  isChecked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  children?: ReactNode;
}

const getSwitchTrackColor = (colorPalette: string, colorMode: string): string | undefined => {
  if (colorMode === 'night') {
    return undefined;
  }

  const color = colorPalette.startsWith('nfc-') ? colorPalette.slice(4) : colorPalette;

  if (colorMode === 'dark') {
    return colorPalette.startsWith('nfc-')
      ? `var(--chakra-colors-nfc-${color})`
      : `var(--chakra-colors-${color}-200)`;
  }

  return `var(--chakra-colors-${color}-500)`;
};

const SettingsRow = memo<SettingsRowProps>(
  ({
    icon: IconComponent,
    label,
    isChecked,
    onChange,
    colorPalette = 'blue',
    disabled = false,
  }) => {
    const { colorMode } = useColorMode();
    const layerStyle = 'fill.surface';
    const switchTrackColor = isChecked ? getSwitchTrackColor(colorPalette, colorMode) : undefined;
    const switchControlProps = switchTrackColor
      ? {
          style: { backgroundColor: switchTrackColor },
          boxShadow: `0 0 0 1px ${switchTrackColor}`,
        }
      : undefined;
    const switchThumbProps = switchTrackColor
      ? {
          style: { backgroundColor: 'white' },
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
        }
      : undefined;

    const handleContainerClick = useCallback(() => {
      if (!disabled) {
        // Create a synthetic event to pass to onChange
        const syntheticEvent = {
          target: { checked: !isChecked },
          currentTarget: { checked: !isChecked },
        } as ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    }, [disabled, isChecked, onChange]);

    const color = isChecked ? colorPalette : 'gray';

    const content = (
      <HStack
        display="flex"
        width="100%"
        layerStyle={layerStyle}
        px="2"
        py="2"
        rounded="l1"
        colorPalette={color}
        onClick={handleContainerClick}
        cursor={disabled ? 'not-allowed' : 'pointer'}
        userSelect="none"
      >
        <IconComponent />
        <Text>{label}</Text>
        <Spacer />
        <Switch
          checked={isChecked}
          colorPalette={color}
          disabled={disabled}
          pointerEvents="none"
          controlProps={switchControlProps}
          thumbProps={switchThumbProps}
        />
      </HStack>
    );

    // Simple version without Tooltip for now
    return content;
  },
);

SettingsRow.displayName = 'SettingsRow';

export default SettingsRow;
