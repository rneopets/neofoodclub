import { Text, HStack, Spacer } from '@chakra-ui/react';
import { ChangeEvent, ReactNode, useCallback, memo } from 'react';

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

const SettingsRow = memo<SettingsRowProps>(
  ({
    icon: IconComponent,
    label,
    isChecked,
    onChange,
    colorPalette = 'blue',
    disabled = false,
  }) => {
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
        layerStyle="fill.surface"
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
        <Switch checked={isChecked} colorPalette={color} disabled={disabled} pointerEvents="none" />
      </HStack>
    );

    // Simple version without Tooltip for now
    return content;
  },
);

SettingsRow.displayName = 'SettingsRow';

export default SettingsRow;
