import { Box, HStack, SegmentGroup, Spacer, Text } from '@chakra-ui/react';
import type { ElementType, ReactElement, ReactNode } from 'react';

interface SegmentedSettingsOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedSettingsRowProps<T extends string> {
  icon: ElementType;
  label: string;
  value: T;
  options: SegmentedSettingsOption<T>[];
  onChange: (value: T) => void;
  testId?: string;
}

export function SegmentedSettingsRow<T extends string>({
  icon: IconComponent,
  label,
  value,
  options,
  onChange,
  testId,
}: SegmentedSettingsRowProps<T>): ReactElement {
  return (
    <HStack
      display="flex"
      width="full"
      layerStyle="fill.surface"
      px="2"
      py="2"
      rounded="l1"
      colorPalette="gray"
    >
      <IconComponent />
      <Text>{label}</Text>
      <Spacer />
      <Box flexShrink={0}>
        <SegmentGroup.Root
          value={value}
          onValueChange={({ value: nextValue }: { value: string }) => onChange(nextValue as T)}
          size="sm"
          data-testid={testId}
          css={{
            bg: 'bg.subtle',
            borderWidth: '1px',
            borderColor: 'border',
            '& [data-state=unchecked]': {
              color: 'fg.muted',
            },
            '& [data-state=checked]': {
              color: 'fg',
              fontWeight: 'semibold',
            },
            _dark: {
              borderColor: 'border.emphasized',
              '& [data-state=unchecked]': {
                color: 'fg.subtle',
              },
            },
            '& [data-part=indicator]': {
              borderWidth: '1px',
              borderColor: 'border',
              bg: { base: 'bg', _dark: 'bg.emphasized' },
              shadow: 'sm',
            },
          }}
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={options} />
        </SegmentGroup.Root>
      </Box>
    </HStack>
  );
}
